-- Database security hardening, RLS policies, check constraints, and performance indexes

-- 1. Helper function to fetch authenticated user company_id without recursion
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Multi-tenant company_id setup and index additions
ALTER TABLE projects ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE material_master ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_material_master_company_id ON material_master(company_id);

CREATE INDEX IF NOT EXISTS idx_project_boq_items_project_id ON project_boq_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_project_id ON project_events(project_id);
CREATE INDEX IF NOT EXISTS idx_project_events_event_type ON project_events(event_type);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_project_id ON inventory_ledger(project_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_batch_number ON inventory_ledger(batch_number);
CREATE INDEX IF NOT EXISTS idx_material_stock_project_id ON material_stock(project_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_project_id ON material_requests(project_id);

-- 3. Enforce CHECK constraints
ALTER TABLE project_boq_items DROP CONSTRAINT IF EXISTS chk_project_boq_qty_rate;
ALTER TABLE project_boq_items ADD CONSTRAINT chk_project_boq_qty_rate CHECK (quantity >= 0 AND rate >= 0 AND completed_quantity <= quantity);

ALTER TABLE material_stock DROP CONSTRAINT IF EXISTS chk_material_stock_nonnegative;
ALTER TABLE material_stock ADD CONSTRAINT chk_material_stock_nonnegative CHECK (current_quantity >= 0 AND reserved_quantity >= 0 AND available_quantity >= 0 AND minimum_stock >= 0);

ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS chk_suppliers_rating;
ALTER TABLE suppliers ADD CONSTRAINT chk_suppliers_rating CHECK (rating BETWEEN 1.0 AND 5.0);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dprs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_request_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_variation_items ENABLE ROW LEVEL SECURITY;

-- 5. Define Multi-Tenant RLS Policies
-- Profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_write_policy" ON profiles;
CREATE POLICY "profiles_write_policy" ON profiles FOR ALL TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Companies
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
CREATE POLICY "companies_select_policy" ON companies FOR SELECT TO authenticated
  USING (id = get_user_company_id());

-- Projects
DROP POLICY IF EXISTS "projects_policy" ON projects;
CREATE POLICY "projects_policy" ON projects FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Material Master
DROP POLICY IF EXISTS "material_master_policy" ON material_master;
CREATE POLICY "material_master_policy" ON material_master FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Suppliers
DROP POLICY IF EXISTS "suppliers_policy" ON suppliers;
CREATE POLICY "suppliers_policy" ON suppliers FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Project BOQ Items (inherits from projects)
DROP POLICY IF EXISTS "project_boq_items_policy" ON project_boq_items;
CREATE POLICY "project_boq_items_policy" ON project_boq_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_boq_items.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_boq_items.project_id AND company_id = get_user_company_id()));

-- DPRs
DROP POLICY IF EXISTS "dprs_policy" ON dprs;
CREATE POLICY "dprs_policy" ON dprs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = dprs.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = dprs.project_id AND company_id = get_user_company_id()));

-- DPR BOQ Items
DROP POLICY IF EXISTS "dpr_boq_items_policy" ON dpr_boq_items;
CREATE POLICY "dpr_boq_items_policy" ON dpr_boq_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM dprs WHERE id = dpr_boq_items.dpr_id AND EXISTS (SELECT 1 FROM projects WHERE id = dprs.project_id AND company_id = get_user_company_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM dprs WHERE id = dpr_boq_items.dpr_id AND EXISTS (SELECT 1 FROM projects WHERE id = dprs.project_id AND company_id = get_user_company_id())));

-- Inventory Ledger
DROP POLICY IF EXISTS "inventory_ledger_policy" ON inventory_ledger;
CREATE POLICY "inventory_ledger_policy" ON inventory_ledger FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = inventory_ledger.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = inventory_ledger.project_id AND company_id = get_user_company_id()));

-- Material Stock
DROP POLICY IF EXISTS "material_stock_policy" ON material_stock;
CREATE POLICY "material_stock_policy" ON material_stock FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = material_stock.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = material_stock.project_id AND company_id = get_user_company_id()));

-- Material Requests
DROP POLICY IF EXISTS "material_requests_policy" ON material_requests;
CREATE POLICY "material_requests_policy" ON material_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = material_requests.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = material_requests.project_id AND company_id = get_user_company_id()));

-- Material Request Batches
DROP POLICY IF EXISTS "material_request_batches_policy" ON material_request_batches;
CREATE POLICY "material_request_batches_policy" ON material_request_batches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM material_requests WHERE id = material_request_batches.material_request_id AND EXISTS (SELECT 1 FROM projects WHERE id = material_requests.project_id AND company_id = get_user_company_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM material_requests WHERE id = material_request_batches.material_request_id AND EXISTS (SELECT 1 FROM projects WHERE id = material_requests.project_id AND company_id = get_user_company_id())));

-- Project Events
DROP POLICY IF EXISTS "project_events_policy" ON project_events;
CREATE POLICY "project_events_policy" ON project_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_events.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_events.project_id AND company_id = get_user_company_id()));

-- Project Variations
DROP POLICY IF EXISTS "project_variations_policy" ON project_variations;
CREATE POLICY "project_variations_policy" ON project_variations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM projects WHERE id = project_variations.project_id AND company_id = get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE id = project_variations.project_id AND company_id = get_user_company_id()));

-- Project Variation Items
DROP POLICY IF EXISTS "project_variation_items_policy" ON project_variation_items;
CREATE POLICY "project_variation_items_policy" ON project_variation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM project_variations WHERE id = project_variation_items.variation_id AND EXISTS (SELECT 1 FROM projects WHERE id = project_variations.project_id AND company_id = get_user_company_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM project_variations WHERE id = project_variation_items.variation_id AND EXISTS (SELECT 1 FROM projects WHERE id = project_variations.project_id AND company_id = get_user_company_id())));
