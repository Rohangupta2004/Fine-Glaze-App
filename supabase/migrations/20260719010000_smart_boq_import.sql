-- Drop old task-based progress trigger & function
DROP TRIGGER IF EXISTS trg_update_project_progress ON public.tasks;
DROP FUNCTION IF EXISTS public.update_project_progress();

-- Create material_master table
CREATE TABLE IF NOT EXISTS public.material_master (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT,
  unit           TEXT NOT NULL,
  aliases        TEXT[] DEFAULT '{}'::text[],
  min_stock      NUMERIC(10,2) DEFAULT 0,
  current_stock  NUMERIC(10,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Enable RLS on material_master
ALTER TABLE public.material_master ENABLE ROW LEVEL SECURITY;

-- Create policies for material_master
DROP POLICY IF EXISTS "Select material master" ON public.material_master;
CREATE POLICY "Select material master" ON public.material_master
  FOR SELECT TO authenticated
  USING (company_id = public.my_company_id());

DROP POLICY IF EXISTS "Manage material master" ON public.material_master;
CREATE POLICY "Manage material master" ON public.material_master
  FOR ALL TO authenticated
  USING (
    public.is_admin_role() AND company_id = public.my_company_id()
  );

-- Create project_boq_items table
CREATE TABLE IF NOT EXISTS public.project_boq_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  material_master_id  UUID REFERENCES public.material_master(id) ON DELETE SET NULL,
  item_name           TEXT NOT NULL,
  description         TEXT,
  quantity            NUMERIC(10,2) NOT NULL,
  unit                TEXT NOT NULL,
  rate                NUMERIC(10,2),
  amount              NUMERIC(10,2),
  work_done           BOOLEAN DEFAULT false NOT NULL,
  excel_row           INT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on project_boq_items
ALTER TABLE public.project_boq_items ENABLE ROW LEVEL SECURITY;

-- Create policies for project_boq_items
DROP POLICY IF EXISTS "Select project BOQ items" ON public.project_boq_items;
CREATE POLICY "Select project BOQ items" ON public.project_boq_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_boq_items.project_id
        AND p.company_id = public.my_company_id()
    )
  );

DROP POLICY IF EXISTS "Manage project BOQ items" ON public.project_boq_items;
CREATE POLICY "Manage project BOQ items" ON public.project_boq_items
  FOR ALL TO authenticated
  USING (
    public.is_admin_role()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_boq_items.project_id
        AND p.company_id = public.my_company_id()
    )
  );

-- Create function to update project progress from BOQ
CREATE OR REPLACE FUNCTION public.update_project_progress_from_boq()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_total INT;
  v_completed INT;
  v_progress INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  IF v_project_id IS NOT NULL THEN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE work_done = true)
    INTO v_total, v_completed
    FROM public.project_boq_items
    WHERE project_id = v_project_id;

    IF v_total > 0 THEN
      v_progress := (v_completed * 100) / v_total;
    ELSE
      v_progress := 0;
    END IF;

    UPDATE public.projects
    SET progress_pct = v_progress
    WHERE id = v_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on project_boq_items
DROP TRIGGER IF EXISTS trg_update_project_progress_from_boq ON public.project_boq_items;
CREATE TRIGGER trg_update_project_progress_from_boq
  AFTER INSERT OR UPDATE OF work_done OR DELETE ON public.project_boq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_progress_from_boq();

-- Auto-learning helper function to dynamically append new alias
CREATE OR REPLACE FUNCTION public.add_material_alias(p_material_id UUID, p_new_alias TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.material_master
  SET aliases = array_append(aliases, p_new_alias)
  WHERE id = p_material_id
    AND NOT (aliases @> ARRAY[p_new_alias]);
END;
$$;

-- Insert standard materials into material_master for default company
-- (Assuming default company_id is '00000000-0000-0000-0000-000000000001')
INSERT INTO public.material_master (company_id, name, category, unit, aliases, min_stock, current_stock)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Glass 12mm', 'Glass', 'sqm', ARRAY['toughened glass', 'tg 12', '12mm tg', 'glass toughened 12mm', 'tg12'], 100, 150),
  ('00000000-0000-0000-0000-000000000001', 'Glass 10mm', 'Glass', 'sqm', ARRAY['10mm glass', 'tg 10', '10mm tg', 'tg10'], 50, 80),
  ('00000000-0000-0000-0000-000000000001', 'ACP Sheet', 'Cladding', 'sqm', ARRAY['acp', 'aluminium composite panel', 'acp 4mm'], 200, 300),
  ('00000000-0000-0000-0000-000000000001', 'Aluminium Section', 'Metal', 'kg', ARRAY['aluminium profile', 'alu section', 'alu channel', 'alu ch-45'], 500, 1200),
  ('00000000-0000-0000-0000-000000000001', 'Silicone Sealant', 'Adhesive', 'no', ARRAY['silicone', 'sealant', 'silicon tube'], 100, 250)
ON CONFLICT (company_id, name) DO NOTHING;
