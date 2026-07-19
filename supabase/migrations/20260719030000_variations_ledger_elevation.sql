-- Variations, Inventory Ledger, and Facade Elevation Progress Map migration

-- 1. Variation / Change Orders
CREATE TABLE IF NOT EXISTS project_variations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number       INT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  extra_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by  UUID REFERENCES profiles(id),
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_variation_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id       UUID NOT NULL REFERENCES project_variations(id) ON DELETE CASCADE,
  material_master_id UUID REFERENCES material_master(id) ON DELETE SET NULL,
  item_name          TEXT NOT NULL,
  quantity           NUMERIC(10,2) NOT NULL,
  unit               TEXT NOT NULL,
  rate               NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount             NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED
);

-- RLS for variations
ALTER TABLE project_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_variation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access variations" ON project_variations;
CREATE POLICY "Admin full access variations" ON project_variations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin full access variation items" ON project_variation_items;
CREATE POLICY "Admin full access variation items" ON project_variation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read variations" ON project_variations;
CREATE POLICY "Project members read variations" ON project_variations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assignments WHERE project_id = project_variations.project_id AND profile_id = auth.uid() AND active = true));

DROP POLICY IF EXISTS "Project members read variation items" ON project_variation_items;
CREATE POLICY "Project members read variation items" ON project_variation_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM project_variations pv
    JOIN assignments a ON a.project_id = pv.project_id
    WHERE pv.id = variation_id AND a.profile_id = auth.uid() AND a.active = true
  ));

-- 2. Inventory Ledger
CREATE TABLE IF NOT EXISTS inventory_ledger (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_master_id UUID NOT NULL REFERENCES material_master(id) ON DELETE CASCADE,
  transaction_type   TEXT NOT NULL CHECK (transaction_type IN ('opening', 'received', 'used', 'adjustment')),
  quantity           NUMERIC(10,2) NOT NULL,
  reference_type     TEXT CHECK (reference_type IN ('dpr', 'delivery', 'variation', 'manual')),
  reference_id       UUID,
  notes              TEXT,
  created_by         UUID REFERENCES profiles(id),
  created_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access inventory_ledger" ON inventory_ledger;
CREATE POLICY "Admin full access inventory_ledger" ON inventory_ledger FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read inventory_ledger" ON inventory_ledger;
CREATE POLICY "Project members read inventory_ledger" ON inventory_ledger FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assignments WHERE project_id = inventory_ledger.project_id AND profile_id = auth.uid() AND active = true));

DROP POLICY IF EXISTS "Project members insert inventory_ledger" ON inventory_ledger;
CREATE POLICY "Project members insert inventory_ledger" ON inventory_ledger FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM assignments WHERE project_id = inventory_ledger.project_id AND profile_id = auth.uid() AND active = true));

-- 3. Facade Elevation Progress Map
CREATE TABLE IF NOT EXISTS facade_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  polygon_pts JSONB, -- coordinates: [{"x": 10, "y": 10}, ...]
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE facade_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access facade_sections" ON facade_sections;
CREATE POLICY "Admin full access facade_sections" ON facade_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Project members read facade_sections" ON facade_sections;
CREATE POLICY "Project members read facade_sections" ON facade_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM assignments WHERE project_id = facade_sections.project_id AND profile_id = auth.uid() AND active = true));

DROP POLICY IF EXISTS "Project members update facade_sections" ON facade_sections;
CREATE POLICY "Project members update facade_sections" ON facade_sections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM assignments WHERE project_id = facade_sections.project_id AND profile_id = auth.uid() AND active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM assignments WHERE project_id = facade_sections.project_id AND profile_id = auth.uid() AND active = true));
