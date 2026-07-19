-- Quantity-based BOQ tracking & DPR integration migration

-- 1. Drop old trigger to remove dependencies before altering columns
DROP TRIGGER IF EXISTS trg_update_project_progress_from_boq ON project_boq_items;

-- 2. Alter project_boq_items to support completed quantities
ALTER TABLE project_boq_items DROP COLUMN IF EXISTS work_done;
ALTER TABLE project_boq_items ADD COLUMN IF NOT EXISTS completed_quantity NUMERIC DEFAULT 0 NOT NULL;
ALTER TABLE project_boq_items ADD CONSTRAINT chk_completed_qty CHECK (completed_quantity >= 0);

-- 3. Recalculate project progress based on completed quantity weights
CREATE OR REPLACE FUNCTION calculate_project_progress_from_boq()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_total_val NUMERIC := 0;
  v_comp_val NUMERIC := 0;
  v_progress_pct INT := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  -- Calculate weighted progress based on amount (quantity * rate)
  -- If sum of amounts is > 0, use financial weights.
  -- Else fallback to simple average of progress percentages of each item.
  SELECT 
    COALESCE(SUM(quantity * rate), 0),
    COALESCE(SUM(completed_quantity * rate), 0)
  INTO v_total_val, v_comp_val
  FROM project_boq_items
  WHERE project_id = v_project_id;

  IF v_total_val > 0 THEN
    v_progress_pct := ROUND((v_comp_val * 100.0) / v_total_val);
  ELSE
    -- Fallback: average of (completed_quantity / quantity) for each item
    SELECT 
      COALESCE(ROUND(AVG(LEAST(completed_quantity * 100.0 / NULLIF(quantity, 0), 100.0))), 0)
    INTO v_progress_pct
    FROM project_boq_items
    WHERE project_id = v_project_id;
  END IF;

  -- Ensure progress is bound between 0 and 100
  v_progress_pct := GREATEST(0, LEAST(100, v_progress_pct));

  -- Update project
  UPDATE projects 
  SET progress_pct = v_progress_pct
  WHERE id = v_project_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on project_boq_items
CREATE TRIGGER trg_update_project_progress_from_boq
  AFTER INSERT OR UPDATE OF quantity, rate, completed_quantity OR DELETE
  ON project_boq_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_project_progress_from_boq();

-- 4. Create dpr_boq_items table to link reported progress to DPR submissions
CREATE TABLE IF NOT EXISTS dpr_boq_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dpr_id              UUID NOT NULL REFERENCES dprs(id) ON DELETE CASCADE,
  project_boq_item_id UUID NOT NULL REFERENCES project_boq_items(id) ON DELETE CASCADE,
  quantity_reported   NUMERIC NOT NULL CHECK (quantity_reported >= 0),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE dpr_boq_items ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for dpr_boq_items
CREATE POLICY "Admin full access dpr_boq_items" 
  ON dpr_boq_items FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Supervisor insert dpr_boq_items" 
  ON dpr_boq_items FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dprs d 
      JOIN assignments a ON a.project_id = d.project_id
      WHERE d.id = dpr_id AND a.profile_id = auth.uid() AND a.active = true
    )
  );

CREATE POLICY "Project members read dpr_boq_items" 
  ON dpr_boq_items FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM dprs d
      JOIN assignments a ON a.project_id = d.project_id
      WHERE d.id = dpr_id AND a.profile_id = auth.uid() AND a.active = true
    )
  );

-- 5. Trigger to automatically increment completed_quantity upon DPR approval
CREATE OR REPLACE FUNCTION trg_approve_dpr_boq_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to approved, add reported quantities to completed_quantity
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE project_boq_items pbi
    SET completed_quantity = LEAST(pbi.quantity, pbi.completed_quantity + dbi.quantity_reported)
    FROM dpr_boq_items dbi
    WHERE dbi.dpr_id = NEW.id AND dbi.project_boq_item_id = pbi.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dpr_approval_update_boq ON dprs;
CREATE TRIGGER trg_dpr_approval_update_boq
  AFTER UPDATE OF status ON dprs
  FOR EACH ROW
  EXECUTE FUNCTION trg_approve_dpr_boq_quantities();
