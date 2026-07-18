-- Migration: Static security audit remediations
BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 1  HARDEN helper functions with search_path and qualified names
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('owner','project_manager','hr','accounts') FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_project(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.assignments
    WHERE project_id = p_id AND profile_id = auth.uid() AND active = true
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 2  PROFILE FINANCIALS separation and profile table updates
-- ══════════════════════════════════════════════════════════════════════════════

-- Create profile_financials table
CREATE TABLE IF NOT EXISTS public.profile_financials (
  id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_rate    NUMERIC(10,2),
  bank_details  JSONB,
  bank_account  TEXT,
  bank_ifsc     TEXT,
  pan           TEXT,
  uan           TEXT,
  esi_number    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_financials ENABLE ROW LEVEL SECURITY;

-- SELECT: only own row, or admins of the same company
DROP POLICY IF EXISTS "Select profile financials" ON public.profile_financials;
CREATE POLICY "Select profile financials" ON public.profile_financials
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.is_admin_role() 
      AND (SELECT company_id FROM public.profiles WHERE id = profile_financials.id) = public.my_company_id()
    )
  );

-- INSERT/UPDATE: admins of the same company
DROP POLICY IF EXISTS "Manage profile financials" ON public.profile_financials;
CREATE POLICY "Manage profile financials" ON public.profile_financials
  FOR ALL TO authenticated
  USING (
    public.is_admin_role() 
    AND (SELECT company_id FROM public.profiles WHERE id = profile_financials.id) = public.my_company_id()
  );

-- Create trigger on profiles to automatically create profile_financials row on insert
CREATE OR REPLACE FUNCTION public.tg_create_profile_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile_financials (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_profile_financials ON public.profiles;
CREATE TRIGGER trg_create_profile_financials
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_create_profile_financials();

-- Migrate existing financial data from profiles to profile_financials
INSERT INTO public.profile_financials (id, daily_rate, bank_details, bank_account, bank_ifsc, pan, uan, esi_number)
SELECT id, daily_rate, bank_details, bank_account, bank_ifsc, pan, uan, esi_number FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
  daily_rate = EXCLUDED.daily_rate,
  bank_details = EXCLUDED.bank_details,
  bank_account = EXCLUDED.bank_account,
  bank_ifsc = EXCLUDED.bank_ifsc,
  pan = EXCLUDED.pan,
  uan = EXCLUDED.uan,
  esi_number = EXCLUDED.esi_number;

-- Drop indices that reference pan or uan on profiles table, then recreate on profile_financials
DROP INDEX IF EXISTS public.idx_profiles_pan;
DROP INDEX IF EXISTS public.idx_profiles_uan;

CREATE INDEX IF NOT EXISTS idx_profile_financials_pan ON public.profile_financials(pan) WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profile_financials_uan ON public.profile_financials(uan) WHERE uan IS NOT NULL;

-- Drop financial columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS daily_rate;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_details;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_account;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bank_ifsc;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pan;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS uan;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS esi_number;

-- Add password_reset_required column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT true;

-- For existing users, set password_reset_required to false so we do not disrupt active accounts
UPDATE public.profiles SET password_reset_required = false;

-- Recreate monthly_salary view
CREATE OR REPLACE VIEW public.monthly_salary AS
WITH attendance_agg AS (
  SELECT
    a.profile_id,
    date_trunc('month', a.date) AS month,
    COUNT(*) FILTER (WHERE a.status = 'present') AS present_days,
    COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_days,
    COALESCE(SUM(a.ot_min) FILTER (WHERE a.status IN ('present','half_day')), 0) / 60.0 AS ot_hours
  FROM public.attendance a
  GROUP BY a.profile_id, date_trunc('month', a.date)
),
advances_agg AS (
  SELECT
    ar.profile_id,
    date_trunc('month', ar.decided_at) AS month,
    SUM(ar.amount) AS advances_taken
  FROM public.advance_requests ar
  WHERE ar.status = 'approved'
  GROUP BY ar.profile_id, date_trunc('month', ar.decided_at)
)
SELECT
  p.id AS profile_id,
  p.company_id,
  p.full_name,
  pf.daily_rate,
  aa.month,
  aa.present_days,
  aa.half_days,
  aa.ot_hours,
  COALESCE(adv.advances_taken, 0) AS advances_taken,
  -- Computed payable
  (aa.present_days * pf.daily_rate)
  + (aa.half_days * 0.5 * pf.daily_rate)
  + (aa.ot_hours * (pf.daily_rate / 8.0))
  - COALESCE(adv.advances_taken, 0) AS payable
FROM public.profiles p
JOIN public.profile_financials pf ON pf.id = p.id
JOIN attendance_agg aa ON aa.profile_id = p.id
LEFT JOIN advances_agg adv ON adv.profile_id = p.id AND adv.month = aa.month
WHERE pf.daily_rate IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 3  PROFILES SELF-UPDATE field-level protection trigger
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.tg_profiles_self_update_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If updating their own profile and NOT an admin-level user, block modifications of protected columns
  IF NEW.id = auth.uid() AND NOT public.is_admin_role() THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR
       NEW.company_id IS DISTINCT FROM OLD.company_id OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.client_org_id IS DISTINCT FROM OLD.client_org_id OR
       NEW.worker_id IS DISTINCT FROM OLD.worker_id OR
       NEW.reporting_to IS DISTINCT FROM OLD.reporting_to OR
       NEW.password_reset_required IS DISTINCT FROM OLD.password_reset_required
    THEN
      RAISE EXCEPTION 'Not authorized to update protected profile fields (role, company_id, status, client_org_id, worker_id, reporting_to, password_reset_required)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_self_update_restrictions ON public.profiles;
CREATE TRIGGER trg_profiles_self_update_restrictions
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_profiles_self_update_restrictions();

-- ══════════════════════════════════════════════════════════════════════════════
-- § 4  ATTENDANCE geofencing & write integrity trigger
-- ══════════════════════════════════════════════════════════════════════════════

-- Haversine distance calculator
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
AS $$
DECLARE
  r double precision := 6371000; -- Earth radius in meters
  phi1 double precision;
  phi2 double precision;
  dphi double precision;
  dlambda double precision;
  a double precision;
  c double precision;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  phi1 := radians(lat1);
  phi2 := radians(lat2);
  dphi := radians(lat2 - lat1);
  dlambda := radians(lon2 - lon1);
  
  a := sin(dphi / 2) * sin(dphi / 2) + cos(phi1) * cos(phi2) * sin(dlambda / 2) * sin(dlambda / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN r * c;
END;
$$;

-- Attendance integrity & geofencing trigger function
CREATE OR REPLACE FUNCTION public.tg_attendance_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj_lat double precision;
  v_proj_lng double precision;
  v_proj_radius integer;
  v_dist double precision;
BEGIN
  -- ── On INSERT:
  IF TG_OP = 'INSERT' THEN
    -- 1. Ensure worker inserts for themselves
    IF NEW.profile_id != auth.uid() AND NOT public.is_admin_role() THEN
      RAISE EXCEPTION 'Cannot insert attendance for another user' USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Ensure worker is actively assigned to the project
    IF NOT public.is_admin_role() AND NOT public.is_assigned_to_project(NEW.project_id) THEN
      RAISE EXCEPTION 'You are not assigned to this project' USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 3. Geo-distance check for location verification
    SELECT lat, lng, geofence_radius_m INTO v_proj_lat, v_proj_lng, v_proj_radius
    FROM public.projects WHERE id = NEW.project_id;

    IF v_proj_lat IS NOT NULL AND v_proj_lng IS NOT NULL AND NEW.check_in_lat IS NOT NULL AND NEW.check_in_lng IS NOT NULL THEN
      v_dist := public.calculate_distance(NEW.check_in_lat, NEW.check_in_lng, v_proj_lat, v_proj_lng);
      -- If within the project geofence radius, verify location
      IF v_dist IS NOT NULL AND v_dist <= COALESCE(v_proj_radius, 100) THEN
        NEW.location_verified := true;
      ELSE
        NEW.location_verified := false;
      END IF;
    ELSE
      NEW.location_verified := false;
    END IF;
  END IF;

  -- ── On UPDATE:
  IF TG_OP = 'UPDATE' THEN
    -- If updating as a worker (non-admin), block changing of immutable fields
    IF NOT public.is_admin_role() THEN
      IF NEW.profile_id IS DISTINCT FROM OLD.profile_id OR
         NEW.project_id IS DISTINCT FROM OLD.project_id OR
         NEW.date IS DISTINCT FROM OLD.date OR
         NEW.check_in_at IS DISTINCT FROM OLD.check_in_at OR
         NEW.check_in_lat IS DISTINCT FROM OLD.check_in_lat OR
         NEW.check_in_lng IS DISTINCT FROM OLD.check_in_lng OR
         NEW.check_in_selfie_url IS DISTINCT FROM OLD.check_in_selfie_url OR
         NEW.location_verified IS DISTINCT FROM OLD.location_verified OR
         NEW.ot_min IS DISTINCT FROM OLD.ot_min OR
         NEW.status IS DISTINCT FROM OLD.status
      THEN
        RAISE EXCEPTION 'Not authorized to modify protected attendance fields (profile, project, check-in, status, location_verified, ot_min)'
          USING ERRCODE = 'insufficient_privilege';
      END IF;

      -- Check-out must be after check-in
      IF NEW.check_out_at IS NOT NULL AND NEW.check_out_at < OLD.check_in_at THEN
        RAISE EXCEPTION 'Check-out time cannot be before check-in time' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_integrity ON public.attendance;
CREATE TRIGGER trg_attendance_integrity
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_attendance_integrity();

-- ══════════════════════════════════════════════════════════════════════════════
-- § 5  CORRECT CLIENT SCOPING in notification triggers
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_payment_created()
RETURNS trigger AS $$
DECLARE
  client_id UUID;
  proj_name TEXT;
BEGIN
  SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;

  FOR client_id IN
    SELECT p.id FROM public.profiles p
    JOIN public.projects proj ON proj.client_org_id = p.client_org_id
    WHERE proj.id = NEW.project_id AND p.role = 'client' AND p.status = 'active'
  LOOP
    INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      client_id,
      'payment_milestone_added',
      'New Payment Milestone',
      'A new milestone "' || NEW.milestone_name || '" for ₹' || NEW.amount ||
      ' has been added to ' || COALESCE(proj_name, 'your project') || '.',
      'payments',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_client_approval_requested()
RETURNS trigger AS $$
DECLARE
  client_id UUID;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  FOR client_id IN
    SELECT p.id FROM public.profiles p
    JOIN public.projects proj ON proj.client_org_id = p.client_org_id
    WHERE proj.id = NEW.project_id AND p.role = 'client' AND p.status = 'active'
  LOOP
    INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id, important)
    VALUES (
      client_id,
      'approval_requested',
      'Approval Needed',
      NEW.title || ' — your approval is requested.',
      'client_approvals',
      NEW.id,
      true
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_document_uploaded()
RETURNS trigger AS $$
DECLARE
  member_id UUID;
  proj_name TEXT;
  doc_name TEXT;
  v_project_id UUID := NULL;
BEGIN
  doc_name := COALESCE(NEW.title, 'A document');

  -- Case A: Project owner document
  IF NEW.owner_type = 'project' THEN
    v_project_id := NEW.owner_id;
    SELECT name INTO proj_name FROM public.projects WHERE id = v_project_id;
    
    FOR member_id IN
      SELECT a.profile_id FROM public.assignments a
      WHERE a.project_id = v_project_id AND a.active = true
      UNION
      SELECT id FROM public.profiles WHERE role = 'owner' AND status = 'active' AND company_id = NEW.company_id
    LOOP
      INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
      VALUES (
        member_id,
        'document_uploaded',
        'New Document Uploaded',
        '"' || doc_name || '" was uploaded to ' || COALESCE(proj_name, 'a project') || '.',
        'documents',
        NEW.id
      );
    END LOOP;

  -- Case B: Profile-linked document (e.g. employee credentials)
  ELSIF NEW.owner_type = 'profile' THEN
    FOR member_id IN
      -- owners/admins/HR/accounts in the same company
      SELECT id FROM public.profiles 
      WHERE role IN ('owner', 'hr', 'accounts', 'project_manager') AND status = 'active' AND company_id = NEW.company_id
      UNION
      -- the profile owner employee themselves
      SELECT NEW.owner_id
    LOOP
      IF member_id != NEW.uploaded_by THEN
        INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
        VALUES (
          member_id,
          'document_uploaded',
          'New Profile Document',
          '"' || doc_name || '" was uploaded for employee files.',
          'documents',
          NEW.id
        );
      END IF;
    END LOOP;

  -- Case C: Company wide general document
  ELSIF NEW.owner_type = 'company' THEN
    FOR member_id IN
      SELECT id FROM public.profiles 
      WHERE role IN ('owner', 'hr', 'accounts', 'project_manager') AND status = 'active' AND company_id = NEW.company_id
    LOOP
      IF member_id != NEW.uploaded_by THEN
        INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
        VALUES (
          member_id,
          'document_uploaded',
          'New Company Document',
          '"' || doc_name || '" was uploaded to company vault.',
          'documents',
          NEW.id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-establish trigger on documents table with correct function
DROP TRIGGER IF EXISTS trg_document_uploaded_notify ON public.documents;
CREATE TRIGGER trg_document_uploaded_notify
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_uploaded();

-- Harden remaining notification trigger functions with search_path
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger AS $$
DECLARE
  task_title TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF OLD.assigned_to IS NOT NULL AND OLD.assigned_to = NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  task_title := COALESCE(NEW.title, 'A task');

  INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
  VALUES (
    NEW.assigned_to,
    'task_assigned',
    'New Task Assigned',
    task_title || ' has been assigned to you.',
    'tasks',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_client_approval_decided()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.requested_by,
      'approval_' || NEW.status,
      'Approval ' || INITCAP(NEW.status),
      'Client has ' || NEW.status || ' your request: ' || NEW.title,
      'client_approvals',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_employee_request()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
BEGIN
  FOR admin_id IN
    SELECT id FROM public.profiles WHERE role IN ('owner', 'hr') AND status = 'active'
  LOOP
    INSERT INTO public.notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      admin_id,
      'employee_request',
      'New Employee Request',
      'A supervisor has requested a new employee. Review pending requests.',
      'employee_requests',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.dispatch_notification()
RETURNS trigger AS $$
DECLARE
  edge_url TEXT;
  service_role TEXT;
BEGIN
  edge_url := current_setting('app.edge_function_url', true);
  service_role := current_setting('app.service_role_key', true);

  IF edge_url IS NULL OR service_role IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role,
      'x-trigger-dispatch', '1'
    ),
    body := jsonb_build_object(
      'recipientId', NEW.recipient_id,
      'kind', NEW.kind,
      'title', NEW.title,
      'body', NEW.body,
      'refTable', NEW.ref_table,
      'refId', NEW.ref_id,
      'important', NEW.important
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 6  REMOVE permissive notification RLS policy
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 7  STORAGE read policies updates
-- ══════════════════════════════════════════════════════════════════════════════

-- Re-scope Client view approved DPR media policy on storage.objects
DROP POLICY IF EXISTS "Project members read DPR media" ON storage.objects;
CREATE POLICY "Project members read DPR media" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'dpr-media'
  AND (
    public.is_admin_role()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
        AND public.is_assigned_to_project(p.id)
    )
    OR EXISTS (
      -- Client can view approved DPR media for their project
      SELECT 1 FROM public.projects p
      JOIN public.profiles up ON up.id = auth.uid()
      WHERE p.id::text = (storage.foldername(storage.objects.name))[1]
        AND up.role = 'client'
        AND up.client_org_id = p.client_org_id
    )
  )
);

COMMIT;
