-- FIFO batches, suppliers, request junction, and material stock summary tables

-- 1. Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access suppliers" ON suppliers;
CREATE POLICY "Admin full access suppliers" ON suppliers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read suppliers" ON suppliers;
CREATE POLICY "Project members read suppliers" ON suppliers FOR SELECT TO authenticated USING (true);

-- Populate a default supplier to prevent issues
INSERT INTO suppliers (company_id, name)
SELECT id, 'Saint-Gobain' FROM companies LIMIT 1
ON CONFLICT DO NOTHING;

-- 2. Modify Inventory Ledger
ALTER TABLE inventory_ledger ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE inventory_ledger ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE inventory_ledger DROP COLUMN IF EXISTS supplier_name;

-- 3. Create Material Stock Summary Table
CREATE TABLE IF NOT EXISTS material_stock (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id        UUID NOT NULL REFERENCES material_master(id) ON DELETE CASCADE,
  current_quantity   NUMERIC(10,2) NOT NULL DEFAULT 0,
  reserved_quantity  NUMERIC(10,2) NOT NULL DEFAULT 0,
  available_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(project_id, material_id)
);

ALTER TABLE material_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access material_stock" ON material_stock;
CREATE POLICY "Admin full access material_stock" ON material_stock FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read material_stock" ON material_stock;
CREATE POLICY "Project members read material_stock" ON material_stock FOR SELECT TO authenticated USING (true);

-- 4. Extend Material Requests Table
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS material_master_id UUID REFERENCES material_master(id) ON DELETE SET NULL;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS approved_qty NUMERIC(10,2);
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS issued_qty NUMERIC(10,2);
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE material_requests DROP COLUMN IF EXISTS issued_batch_number;

-- 5. Material Request Batch Junction Table
CREATE TABLE IF NOT EXISTS material_request_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  inventory_ledger_id UUID NOT NULL REFERENCES inventory_ledger(id) ON DELETE CASCADE,
  batch_number        TEXT NOT NULL,
  issued_quantity     NUMERIC(10,2) NOT NULL CHECK (issued_quantity > 0)
);

ALTER TABLE material_request_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access material_request_batches" ON material_request_batches;
CREATE POLICY "Admin full access material_request_batches" ON material_request_batches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read material_request_batches" ON material_request_batches;
CREATE POLICY "Project members read material_request_batches" ON material_request_batches FOR SELECT TO authenticated USING (true);

-- 6. Trigger to maintain material_stock summary current quantities from inventory_ledger
CREATE OR REPLACE FUNCTION trg_update_material_stock_from_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_mat_id UUID;
  v_current NUMERIC;
  v_reserved NUMERIC := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    v_mat_id := OLD.material_master_id;
  ELSE
    v_project_id := NEW.project_id;
    v_mat_id := NEW.material_master_id;
  END IF;

  -- 1. Compute current stock from ledger transactions
  SELECT COALESCE(
    SUM(CASE 
      WHEN transaction_type IN ('opening', 'received', 'adjustment') THEN quantity 
      WHEN transaction_type = 'used' THEN -quantity 
      ELSE 0 
    END), 0) INTO v_current
  FROM inventory_ledger
  WHERE project_id = v_project_id AND material_master_id = v_mat_id;

  -- 2. Compute reserved stock from pending material requests
  SELECT COALESCE(SUM(qty), 0) INTO v_reserved
  FROM material_requests
  WHERE project_id = v_project_id AND material_master_id = v_mat_id AND status = 'pending';

  -- 3. Upsert into material_stock
  INSERT INTO material_stock (project_id, material_id, current_quantity, reserved_quantity, available_quantity)
  VALUES (v_project_id, v_mat_id, v_current, v_reserved, v_current - v_reserved)
  ON CONFLICT (project_id, material_id)
  DO UPDATE SET 
    current_quantity = EXCLUDED.current_quantity,
    reserved_quantity = EXCLUDED.reserved_quantity,
    available_quantity = EXCLUDED.current_quantity - EXCLUDED.reserved_quantity;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_update_stock ON inventory_ledger;
CREATE TRIGGER trg_ledger_update_stock
  AFTER INSERT OR UPDATE OR DELETE ON inventory_ledger
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_material_stock_from_ledger();

-- 7. Trigger to maintain material_stock reserved quantities from material_requests
CREATE OR REPLACE FUNCTION trg_update_material_stock_from_requests()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_mat_id UUID;
  v_current NUMERIC := 0;
  v_reserved NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
    v_mat_id := OLD.material_master_id;
  ELSE
    v_project_id := NEW.project_id;
    v_mat_id := NEW.material_master_id;
  END IF;

  IF v_mat_id IS NOT NULL THEN
    -- 1. Compute current stock from ledger transactions
    SELECT COALESCE(
      SUM(CASE 
        WHEN transaction_type IN ('opening', 'received', 'adjustment') THEN quantity 
        WHEN transaction_type = 'used' THEN -quantity 
        ELSE 0 
      END), 0) INTO v_current
    FROM inventory_ledger
    WHERE project_id = v_project_id AND material_master_id = v_mat_id;

    -- 2. Compute reserved stock from pending material requests
    SELECT COALESCE(SUM(qty), 0) INTO v_reserved
    FROM material_requests
    WHERE project_id = v_project_id AND material_master_id = v_mat_id AND status = 'pending';

    -- 3. Upsert into material_stock
    INSERT INTO material_stock (project_id, material_id, current_quantity, reserved_quantity, available_quantity)
    VALUES (v_project_id, v_mat_id, v_current, v_reserved, v_current - v_reserved)
    ON CONFLICT (project_id, material_id)
    DO UPDATE SET 
      current_quantity = EXCLUDED.current_quantity,
      reserved_quantity = EXCLUDED.reserved_quantity,
      available_quantity = EXCLUDED.current_quantity - EXCLUDED.reserved_quantity;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_requests_update_stock ON material_requests;
CREATE TRIGGER trg_requests_update_stock
  AFTER INSERT OR UPDATE OR DELETE ON material_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_material_stock_from_requests();

-- 8. Re-insert initial summary values for existing materials
INSERT INTO material_stock (project_id, material_id, current_quantity, reserved_quantity, available_quantity)
SELECT 
  il.project_id, 
  il.material_master_id, 
  SUM(CASE WHEN il.transaction_type IN ('opening', 'received', 'adjustment') THEN il.quantity WHEN il.transaction_type = 'used' THEN -il.quantity ELSE 0 END),
  0,
  SUM(CASE WHEN il.transaction_type IN ('opening', 'received', 'adjustment') THEN il.quantity WHEN il.transaction_type = 'used' THEN -il.quantity ELSE 0 END)
FROM inventory_ledger il
GROUP BY il.project_id, il.material_master_id
ON CONFLICT (project_id, material_id) DO NOTHING;

-- 9. Update DPR approval auto-deductions trigger with Non-Negative FIFO logic
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
  v_total_avail NUMERIC;
  v_mat_name TEXT;
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
        
        -- Check total available stock first. Reject if insufficient
        SELECT COALESCE(available_quantity, 0) INTO v_total_avail
        FROM material_stock
        WHERE project_id = NEW.project_id AND material_id = r_rule.consumed_material_id;
        
        IF v_total_avail < v_req_qty THEN
          SELECT name INTO v_mat_name FROM material_master WHERE id = r_rule.consumed_material_id;
          RAISE EXCEPTION 'Insufficient stock in inventory for material % to approve DPR. Required: %, Available: %', 
            v_mat_name, v_req_qty, v_total_avail;
        END IF;

        -- FIFO Deduction Loop
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
