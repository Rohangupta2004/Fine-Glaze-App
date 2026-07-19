-- 20260719100000_audit_remediations.sql
-- Fixes critical vulnerabilities, bottlenecks, and data integrity bugs identified in backend audit (Revised)

-- 1. Fix DB Check Constraint for transaction_type
ALTER TABLE public.inventory_ledger DROP CONSTRAINT IF EXISTS inventory_ledger_transaction_type_check;
ALTER TABLE public.inventory_ledger ADD CONSTRAINT inventory_ledger_transaction_type_check 
  CHECK (transaction_type IN ('opening', 'received', 'used', 'adjustment', 'return', 'transfer', 'wastage', 'scrap'));

-- 2. Fix Admin Login Routing (Profiles RLS Infinite Recursion)
-- The old policy used get_user_company_id() which queried profiles, causing infinite recursion.
-- We replace it with a direct query that bypasses RLS using a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_my_company_id_safe()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = public.get_my_company_id_safe());

-- Ensure the other duplicate policies don't conflict
DROP POLICY IF EXISTS "See profiles in company" ON public.profiles;

-- Fix infinite recursion caused by the write policy applying to ALL commands
DROP POLICY IF EXISTS "profiles_write_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Secure SECURITY DEFINER functions with search_path = '' and schema qualifications
CREATE OR REPLACE FUNCTION public.add_material_alias(p_material_id UUID, p_new_alias TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.material_master
  SET aliases = array_append(aliases, p_new_alias)
  WHERE id = p_material_id
    AND NOT (aliases @> ARRAY[p_new_alias]);
END;
$$;

-- 4. Add bulk alias learning RPC to fix frontend N+1 problem
CREATE OR REPLACE FUNCTION public.add_material_aliases_bulk(p_aliases jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_aliases)
  LOOP
    UPDATE public.material_master
    SET aliases = array_append(aliases, v_item->>'alias')
    WHERE id = (v_item->>'id')::UUID
      AND NOT (aliases @> ARRAY[v_item->>'alias']);
  END LOOP;
END;
$$;

-- 5. Add WITH CHECK clauses to vulnerable UPDATE policies
-- Company Updates
DROP POLICY IF EXISTS "company_update_policy" ON public.companies;
CREATE POLICY "company_update_policy" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_my_company_id_safe())
  WITH CHECK (id = public.get_my_company_id_safe());

-- Employee Requests Updates
DROP POLICY IF EXISTS "employee_requests_update_policy" ON public.employee_requests;
CREATE POLICY "employee_requests_update_policy" ON public.employee_requests FOR UPDATE TO authenticated
  USING (company_id = public.get_my_company_id_safe())
  WITH CHECK (company_id = public.get_my_company_id_safe());

-- 6. Add Missing Composite Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_proj_mat ON public.inventory_ledger(project_id, material_master_id);

-- 7. Strict FIFO Deduction with Pessimistic Locking
CREATE OR REPLACE FUNCTION public.trg_dpr_approval_inventory_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    PERFORM public.log_project_event(
      NEW.project_id,
      'DPR_APPROVED',
      'Daily Progress Report approved for ' || NEW.date,
      NEW.submitted_by
    );

    FOR r_item IN
      SELECT dbi.quantity_reported, pbi.material_master_id, pbi.item_name
      FROM public.dpr_boq_items dbi
      JOIN public.project_boq_items pbi ON pbi.id = dbi.project_boq_item_id
      WHERE dbi.dpr_id = NEW.id AND pbi.material_master_id IS NOT NULL
    LOOP
      FOR r_rule IN
        SELECT consumed_material_id, consumption_per_unit
        FROM public.material_consumption_rules
        WHERE installed_material_id = r_item.material_master_id
      LOOP
        v_req_qty := r_item.quantity_reported * r_rule.consumption_per_unit;
        v_notes := 'Auto-deducted from progress: ' || r_item.quantity_reported || ' units of ' || r_item.item_name || ' installed';
        
        -- Pessimistic lock on the ledger rows for this material/project to prevent race conditions
        FOR r_batch IN
          SELECT batch_number, SUM(quantity) as received_qty, MIN(created_at) as first_received
          FROM public.inventory_ledger
          WHERE project_id = NEW.project_id 
            AND material_master_id = r_rule.consumed_material_id
            AND transaction_type IN ('opening', 'received')
            AND batch_number IS NOT NULL
          GROUP BY batch_number
          ORDER BY first_received ASC
          FOR UPDATE
        LOOP
          EXIT WHEN v_req_qty <= 0;
          
          SELECT COALESCE(SUM(quantity), 0) INTO v_batch_avail
          FROM public.inventory_ledger
          WHERE project_id = NEW.project_id
            AND material_master_id = r_rule.consumed_material_id
            AND transaction_type = 'used'
            AND batch_number = r_batch.batch_number;
            
          v_batch_avail := r_batch.received_qty - v_batch_avail;
          
          IF v_batch_avail > 0 THEN
            v_deduct := LEAST(v_req_qty, v_batch_avail);
            
            INSERT INTO public.inventory_ledger (
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
        
        -- STRICT VALIDATION: If still required quantity left, throw error!
        IF v_req_qty > 0 THEN
          RAISE EXCEPTION 'Cannot approve DPR. Material: %. Required: %. Available: %. Please complete a Goods Received Note (GRN) or adjust the DPR quantities before approval.', r_item.item_name, r_item.quantity_reported * r_rule.consumption_per_unit, (r_item.quantity_reported * r_rule.consumption_per_unit) - v_req_qty;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
