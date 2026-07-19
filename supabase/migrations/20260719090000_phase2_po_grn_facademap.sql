-- Phase 2: Purchase Orders, Goods Received Notes, and interactive Facade Map

-- 1. Create Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id             UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id            UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number              TEXT NOT NULL UNIQUE,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'sent', 'partially_received', 'fully_received', 'closed', 'cancelled')),
  total_amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_delivery_date DATE,
  delivery_address       TEXT,
  currency               TEXT DEFAULT 'INR',
  remarks                TEXT,
  terms_conditions       TEXT,
  revision_number        INT DEFAULT 0,
  created_at             TIMESTAMPTZ DEFAULT now(),
  created_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at             TIMESTAMPTZ DEFAULT now(),
  updated_by             UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. Create Purchase Order Line Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id  UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_master_id UUID NOT NULL REFERENCES material_master(id) ON DELETE RESTRICT,
  qty_ordered        NUMERIC(10,2) NOT NULL CHECK (qty_ordered > 0),
  qty_received       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  rate               NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  amount             NUMERIC(12,2) GENERATED ALWAYS AS (qty_ordered * rate) STORED
);

-- 3. Create Goods Received Notes (GRN) Table
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  purchase_order_id  UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  grn_number         TEXT NOT NULL UNIQUE,
  received_date      DATE NOT NULL DEFAULT current_date,
  received_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  delivery_challan   TEXT,
  invoice_number     TEXT,
  vehicle_number     TEXT,
  driver_name        TEXT,
  driver_phone       TEXT,
  inspection_status  TEXT NOT NULL DEFAULT 'passed' CHECK (inspection_status IN ('passed', 'failed', 'partial')),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Goods Received Note Line Items Table
CREATE TABLE IF NOT EXISTS goods_received_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_received_note_id UUID NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  qty_received           NUMERIC(10,2) NOT NULL CHECK (qty_received > 0),
  qty_accepted           NUMERIC(10,2) NOT NULL CHECK (qty_accepted >= 0),
  qty_rejected           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (qty_rejected >= 0),
  rejection_reason       TEXT,
  batch_number           TEXT NOT NULL,
  CONSTRAINT chk_grn_qtys CHECK (qty_accepted + qty_rejected = qty_received)
);

-- 5. Create Facade drawings Table
CREATE TABLE IF NOT EXISTS facade_drawings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  image_path  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Facade map zones Table
CREATE TABLE IF NOT EXISTS facade_map_zones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facade_drawing_id UUID NOT NULL REFERENCES facade_drawings(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  polygon_points    JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  floor             TEXT,
  elevation         TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 7. Create Facade zone BOQ items Table
CREATE TABLE IF NOT EXISTS facade_zone_boq_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     UUID NOT NULL REFERENCES facade_map_zones(id) ON DELETE CASCADE,
  boq_item_id UUID NOT NULL REFERENCES project_boq_items(id) ON DELETE CASCADE,
  UNIQUE(zone_id, boq_item_id)
);

-- 8. Auto-GRN Ledger Insertion Trigger Function
CREATE OR REPLACE FUNCTION trg_grn_receipt_ledger_insert_func()
RETURNS TRIGGER AS $$
DECLARE
  v_po_id UUID;
  v_project_id UUID;
  v_mat_id UUID;
  v_supplier_id UUID;
  v_po_number TEXT;
  v_mat_name TEXT;
  v_notes TEXT;
  v_total_ordered NUMERIC;
  v_total_received NUMERIC;
BEGIN
  -- Resolve Purchase Order details
  SELECT po.id, po.project_id, po.supplier_id, po.po_number, poi.material_master_id
  INTO v_po_id, v_project_id, v_supplier_id, v_po_number, v_mat_id
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.id = NEW.purchase_order_item_id;

  -- Update received quantity on PO item
  UPDATE purchase_order_items
  SET qty_received = qty_received + NEW.qty_accepted
  WHERE id = NEW.purchase_order_item_id;

  SELECT name INTO v_mat_name FROM material_master WHERE id = v_mat_id;
  v_notes := 'Received via GRN: ' || (SELECT grn_number FROM goods_received_notes WHERE id = NEW.goods_received_note_id) || ' for PO: ' || v_po_number;

  -- Insert into inventory_ledger (Only Accepted quantity enters stock!)
  IF NEW.qty_accepted > 0 THEN
    INSERT INTO inventory_ledger (
      project_id,
      material_master_id,
      transaction_type,
      quantity,
      reference_type,
      reference_id,
      notes,
      batch_number,
      supplier_id
    ) VALUES (
      v_project_id,
      v_mat_id,
      'PURCHASE_RECEIVED',
      NEW.qty_accepted,
      'delivery',
      NEW.goods_received_note_id,
      v_notes,
      NEW.batch_number,
      v_supplier_id
    );
  END IF;

  -- Recalculate Purchase Order status
  SELECT COALESCE(SUM(qty_ordered), 0), COALESCE(SUM(qty_received), 0)
  INTO v_total_ordered, v_total_received
  FROM purchase_order_items
  WHERE purchase_order_id = v_po_id;

  IF v_total_received >= v_total_ordered THEN
    UPDATE purchase_orders SET status = 'fully_received' WHERE id = v_po_id;
  ELSIF v_total_received > 0 THEN
    UPDATE purchase_orders SET status = 'partially_received' WHERE id = v_po_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grn_receipt_ledger_insert ON goods_received_items;
CREATE TRIGGER trg_grn_receipt_ledger_insert
  AFTER INSERT ON goods_received_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_grn_receipt_ledger_insert_func();

-- 9. Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_goods_received_notes_po_id ON goods_received_notes(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_facade_map_zones_drawing_id ON facade_map_zones(facade_drawing_id);

-- 10. Enable Row Level Security (RLS) on all tables
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE facade_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE facade_map_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE facade_zone_boq_items ENABLE ROW LEVEL SECURITY;

-- 11. Define Multi-Tenant RLS Policies
DROP POLICY IF EXISTS "purchase_orders_policy" ON purchase_orders;
CREATE POLICY "purchase_orders_policy" ON purchase_orders FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "purchase_order_items_policy" ON purchase_order_items;
CREATE POLICY "purchase_order_items_policy" ON purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_orders WHERE id = purchase_order_items.purchase_order_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders WHERE id = purchase_order_items.purchase_order_id AND company_id = get_user_company_id()));

DROP POLICY IF EXISTS "goods_received_notes_policy" ON goods_received_notes;
CREATE POLICY "goods_received_notes_policy" ON goods_received_notes FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "goods_received_items_policy" ON goods_received_items;
CREATE POLICY "goods_received_items_policy" ON goods_received_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM goods_received_notes WHERE id = goods_received_items.goods_received_note_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM goods_received_notes WHERE id = goods_received_items.goods_received_note_id AND company_id = get_user_company_id()));

DROP POLICY IF EXISTS "facade_drawings_policy" ON facade_drawings;
CREATE POLICY "facade_drawings_policy" ON facade_drawings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = facade_drawings.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = facade_drawings.project_id AND company_id = get_user_company_id()));

DROP POLICY IF EXISTS "facade_map_zones_policy" ON facade_map_zones;
CREATE POLICY "facade_map_zones_policy" ON facade_map_zones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM facade_drawings WHERE id = facade_map_zones.facade_drawing_id AND EXISTS (SELECT 1 FROM projects WHERE id = facade_drawings.project_id AND company_id = get_user_company_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM facade_drawings WHERE id = facade_map_zones.facade_drawing_id AND EXISTS (SELECT 1 FROM projects WHERE id = facade_drawings.project_id AND company_id = get_user_company_id())));

DROP POLICY IF EXISTS "facade_zone_boq_items_policy" ON facade_zone_boq_items;
CREATE POLICY "facade_zone_boq_items_policy" ON facade_zone_boq_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM facade_map_zones WHERE id = facade_zone_boq_items.zone_id AND EXISTS (SELECT 1 FROM facade_drawings WHERE id = facade_map_zones.facade_drawing_id AND EXISTS (SELECT 1 FROM projects WHERE id = facade_drawings.project_id AND company_id = get_user_company_id()))))
  WITH CHECK (EXISTS (SELECT 1 FROM facade_map_zones WHERE id = facade_zone_boq_items.zone_id AND EXISTS (SELECT 1 FROM facade_drawings WHERE id = facade_map_zones.facade_drawing_id AND EXISTS (SELECT 1 FROM projects WHERE id = facade_drawings.project_id AND company_id = get_user_company_id()))));
