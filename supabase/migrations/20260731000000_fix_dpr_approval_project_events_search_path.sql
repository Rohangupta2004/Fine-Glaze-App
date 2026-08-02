-- Migration: Fix DPR Approval relation project_events search_path error
-- Author: Antigravity AI
-- Date: 2026-07-31

-- 1. Fix log_project_event function to explicitly set search_path TO 'public' and qualify table reference
CREATE OR REPLACE FUNCTION public.log_project_event(
  p_project_id UUID, 
  p_event_type TEXT, 
  p_description TEXT, 
  p_created_by UUID
)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.project_events (project_id, event_type, description, created_by)
  VALUES (p_project_id, p_event_type, p_description, p_created_by);
END;
$$;

-- 2. Fix notify_dpr_status_change function
CREATE OR REPLACE FUNCTION public.notify_dpr_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.submitted_by,
      'dpr_approved',
      'DPR Approved',
      'Your daily progress report has been approved.',
      'dprs',
      NEW.id
    );
  ELSIF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.submitted_by,
      'dpr_rejected',
      'DPR Rejected',
      COALESCE('DPR rejected: ' || NEW.review_note, 'Your DPR has been rejected. Please review and resubmit.'),
      'dprs',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Fix trg_approve_dpr_boq_quantities function
CREATE OR REPLACE FUNCTION public.trg_approve_dpr_boq_quantities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.project_boq_items pbi
    SET completed_quantity = LEAST(pbi.quantity, pbi.completed_quantity + dbi.quantity_reported)
    FROM public.dpr_boq_items dbi
    WHERE dbi.dpr_id = NEW.id AND dbi.project_boq_item_id = pbi.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Fix tg_audit_status_change function
CREATE OR REPLACE FUNCTION public.tg_audit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF TG_TABLE_NAME IN ('dprs') THEN
    SELECT company_id INTO v_company_id
      FROM public.projects WHERE id = NEW.project_id LIMIT 1;
  ELSIF TG_TABLE_NAME IN ('client_approvals') THEN
    SELECT company_id INTO v_company_id
      FROM public.projects WHERE id = NEW.project_id LIMIT 1;
  ELSIF TG_TABLE_NAME IN ('leave_requests', 'advance_requests') THEN
    SELECT company_id INTO v_company_id
      FROM public.profiles WHERE id = NEW.profile_id LIMIT 1;
  END IF;

  IF v_company_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (company_id, actor_id, action, ref_table, ref_id, detail)
    VALUES (
      v_company_id,
      auth.uid(),
      'status_change',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Fix trg_dpr_approval_inventory_deduction function
CREATE OR REPLACE FUNCTION public.trg_dpr_approval_inventory_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
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
        
        IF v_req_qty > 0 THEN
          RAISE EXCEPTION 'Cannot approve DPR. Material: %. Required: %. Available: %. Please complete a Goods Received Note (GRN) or adjust the DPR quantities before approval.', r_item.item_name, r_item.quantity_reported * r_rule.consumption_per_unit, (r_item.quantity_reported * r_rule.consumption_per_unit) - v_req_qty;
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
