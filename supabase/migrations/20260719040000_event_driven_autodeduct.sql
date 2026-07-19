-- Event-driven architecture & auto-deductions migration

-- 1. Create Project Events table
CREATE TABLE IF NOT EXISTS project_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,
  description  TEXT NOT NULL,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access project_events" ON project_events;
CREATE POLICY "Admin full access project_events" ON project_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read project_events" ON project_events;
CREATE POLICY "Project members read project_events" ON project_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assignments WHERE project_id = project_events.project_id AND profile_id = auth.uid() AND active = true));

-- Helper function to log project events
CREATE OR REPLACE FUNCTION log_project_event(
  p_project_id UUID,
  p_event_type TEXT,
  p_description TEXT,
  p_created_by UUID
) RETURNS VOID AS $$
BEGIN
  INSERT INTO project_events (project_id, event_type, description, created_by)
  VALUES (p_project_id, p_event_type, p_description, p_created_by);
END;
$$ LANGUAGE plpgsql;

-- 2. Create Material Consumption Rules table
CREATE TABLE IF NOT EXISTS material_consumption_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installed_material_id UUID NOT NULL REFERENCES material_master(id) ON DELETE CASCADE,
  consumed_material_id  UUID NOT NULL REFERENCES material_master(id) ON DELETE CASCADE,
  consumption_per_unit  NUMERIC(10,4) NOT NULL CHECK (consumption_per_unit > 0),
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (installed_material_id, consumed_material_id)
);

ALTER TABLE material_consumption_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access material_consumption_rules" ON material_consumption_rules;
CREATE POLICY "Admin full access material_consumption_rules" ON material_consumption_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read material_consumption_rules" ON material_consumption_rules;
CREATE POLICY "Project members read material_consumption_rules" ON material_consumption_rules FOR SELECT TO authenticated
  USING (true);

-- 3. Trigger to auto-deduct inventory upon DPR approval
CREATE OR REPLACE FUNCTION trg_dpr_approval_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
  r_item RECORD;
  r_rule RECORD;
  v_notes TEXT;
BEGIN
  -- When status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Log Project Event
    PERFORM log_project_event(
      NEW.project_id,
      'dpr_approved',
      'Daily Progress Report approved for ' || NEW.date || ' (submitted by ' || COALESCE((SELECT full_name FROM profiles WHERE id = NEW.submitted_by), 'Supervisor') || ')',
      NEW.submitted_by
    );

    -- For each reported BOQ item in this DPR
    FOR r_item IN (
      SELECT dbi.quantity_reported, pbi.material_master_id, pbi.item_name
      FROM dpr_boq_items dbi
      JOIN project_boq_items pbi ON pbi.id = dbi.project_boq_item_id
      WHERE dbi.dpr_id = NEW.id AND pbi.material_master_id IS NOT NULL
    ) LOOP
      
      -- For each consumption rule linked to the installed material
      FOR r_rule IN (
        SELECT consumed_material_id, consumption_per_unit
        FROM material_consumption_rules
        WHERE installed_material_id = r_item.material_master_id
      ) LOOP
        
        v_notes := 'Auto-deducted from progress: ' || r_item.quantity_reported || ' units of ' || r_item.item_name || ' installed';
        
        -- Insert 'used' ledger transaction
        INSERT INTO inventory_ledger (
          project_id,
          material_master_id,
          transaction_type,
          quantity,
          reference_type,
          reference_id,
          notes
        ) VALUES (
          NEW.project_id,
          r_rule.consumed_material_id,
          'used',
          r_item.quantity_reported * r_rule.consumption_per_unit,
          'dpr',
          NEW.id,
          v_notes
        );

      END FOR;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dpr_approval_deductions ON dprs;
CREATE TRIGGER trg_dpr_approval_deductions
  AFTER UPDATE OF status ON dprs
  FOR EACH ROW
  EXECUTE FUNCTION trg_dpr_approval_inventory_deduction();

-- 4. Triggers to publish events automatically on variation approvals
CREATE OR REPLACE FUNCTION trg_variation_publish_events()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM log_project_event(
      NEW.project_id,
      'variation_' || NEW.status,
      'Variation #' || NEW.number || ' ("' || NEW.title || '") was ' || NEW.status || 
      COALESCE(' (by ' || (SELECT full_name FROM profiles WHERE id = NEW.approved_by) || ')', ''),
      NEW.approved_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_variation_events ON project_variations;
CREATE TRIGGER trg_variation_events
  AFTER UPDATE OF status ON project_variations
  FOR EACH ROW
  EXECUTE FUNCTION trg_variation_publish_events();
