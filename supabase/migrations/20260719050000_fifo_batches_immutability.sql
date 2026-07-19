-- FIFO batches ledger and immutable events triggers

-- 1. Extend Inventory Ledger & Material Requests tables
ALTER TABLE inventory_ledger ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE inventory_ledger ADD COLUMN IF NOT EXISTS supplier_name TEXT;

ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS approved_qty NUMERIC(10,2);
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS issued_qty NUMERIC(10,2);
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS issued_batch_number TEXT;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

-- 2. Enforce strict event types on project_events
-- Delete old invalid event records to avoid constraint violations
DELETE FROM project_events WHERE event_type NOT IN (
  'BOQ_IMPORTED',
  'DPR_SUBMITTED',
  'DPR_APPROVED',
  'VARIATION_APPROVED',
  'QA_PASSED',
  'SNAG_CREATED',
  'MATERIAL_ISSUED',
  'STOCK_RECEIVED'
);

ALTER TABLE project_events DROP CONSTRAINT IF EXISTS chk_project_event_type;
ALTER TABLE project_events ADD CONSTRAINT chk_project_event_type CHECK (
  event_type IN (
    'BOQ_IMPORTED',
    'DPR_SUBMITTED',
    'DPR_APPROVED',
    'VARIATION_APPROVED',
    'QA_PASSED',
    'SNAG_CREATED',
    'MATERIAL_ISSUED',
    'STOCK_RECEIVED'
  )
);

-- 3. Immutability trigger for project_events
CREATE OR REPLACE FUNCTION trg_prevent_project_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Project Event records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_project_events ON project_events;
CREATE TRIGGER trg_immutable_project_events
  BEFORE UPDATE OR DELETE ON project_events
  FOR EACH ROW
  EXECUTE FUNCTION trg_prevent_project_events_mutation();

-- 4. Update DPR approval auto-deductions trigger with FIFO logic
CREATE OR REPLACE FUNCTION trg_dpr_approval_inventory_deduction()
RETURNS TRIGGER AS $$
DECLARE
  r_item RECORD;
  r_rule RECORD;
  r_batch RECORD;
  v_notes TEXT;
  v_req_qty NUMERIC;
  v_batch_avail NUMERIC;
  v_deduct NUMERIC;
BEGIN
  -- When status changes to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Log Project Event
    PERFORM log_project_event(
      NEW.project_id,
      'DPR_APPROVED',
      'Daily Progress Report approved for ' || NEW.date || ' (submitted by ' || COALESCE((SELECT full_name FROM profiles WHERE id = NEW.submitted_by), 'Supervisor') || ')',
      NEW.submitted_by
    );

    -- For each reported BOQ item in this DPR
    FOR r_item IN
      SELECT dbi.quantity_reported, pbi.material_master_id, pbi.item_name
      FROM dpr_boq_items dbi
      JOIN project_boq_items pbi ON pbi.id = dbi.project_boq_item_id
      WHERE dbi.dpr_id = NEW.id AND pbi.material_master_id IS NOT NULL
    LOOP
      
      -- For each consumption rule linked to the installed material
      FOR r_rule IN
        SELECT consumed_material_id, consumption_per_unit
        FROM material_consumption_rules
        WHERE installed_material_id = r_item.material_master_id
      LOOP
        
        v_req_qty := r_item.quantity_reported * r_rule.consumption_per_unit;
        v_notes := 'Auto-deducted from progress: ' || r_item.quantity_reported || ' units of ' || r_item.item_name || ' installed';
        
        -- FIFO Deduction Loop
        -- Query all distinct batches received for this material, oldest first
        FOR r_batch IN
          SELECT batch_number, SUM(quantity) as received_qty, MIN(created_at) as first_received
          FROM inventory_ledger
          WHERE project_id = NEW.project_id 
            AND material_master_id = r_rule.consumed_material_id
            AND transaction_type IN ('opening', 'received')
            AND batch_number IS NOT NULL
          GROUP BY batch_number
          ORDER BY first_received ASC
        LOOP
          EXIT WHEN v_req_qty <= 0;
          
          -- Find already consumed qty for this batch
          SELECT COALESCE(SUM(quantity), 0) INTO v_batch_avail
          FROM inventory_ledger
          WHERE project_id = NEW.project_id
            AND material_master_id = r_rule.consumed_material_id
            AND transaction_type = 'used'
            AND batch_number = r_batch.batch_number;
            
          v_batch_avail := r_batch.received_qty - v_batch_avail;
          
          IF v_batch_avail > 0 THEN
            v_deduct := LEAST(v_req_qty, v_batch_avail);
            
            INSERT INTO inventory_ledger (
              project_id,
              material_master_id,
              transaction_type,
              quantity,
              reference_type,
              reference_id,
              notes,
              batch_number
            ) VALUES (
              NEW.project_id,
              r_rule.consumed_material_id,
              'used',
              v_deduct,
              'dpr',
              NEW.id,
              v_notes || ' (Batch: ' || r_batch.batch_number || ')',
              r_batch.batch_number
            );
            
            v_req_qty := v_req_qty - v_deduct;
          END IF;
        END LOOP;
        
        -- Fallback: If still required quantity left (no batches or insufficient batch stock)
        IF v_req_qty > 0 THEN
          INSERT INTO inventory_ledger (
            project_id,
            material_master_id,
            transaction_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            batch_number
          ) VALUES (
            NEW.project_id,
            r_rule.consumed_material_id,
            'used',
            v_req_qty,
            'dpr',
            NEW.id,
            v_notes || ' (Fallback: Default batch)',
            'DEFAULT'
          );
        END IF;

      END LOOP;
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

-- 5. Helper function to publish event for BOQ imported
CREATE OR REPLACE FUNCTION trg_boq_import_event()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM project_boq_items WHERE project_id = NEW.project_id;
  -- Log event when first item is inserted or count reaches a new set
  IF TG_OP = 'INSERT' AND v_count = 1 THEN
    PERFORM log_project_event(
      NEW.project_id,
      'BOQ_IMPORTED',
      'Initial BOQ list imported successfully from Excel template',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_boq_import_events ON project_boq_items;
CREATE TRIGGER trg_boq_import_events
  AFTER INSERT ON project_boq_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_boq_import_event();
