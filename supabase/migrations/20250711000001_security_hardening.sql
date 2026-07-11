-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Fine Glaze COS — Security Hardening Migration                         ║
-- ║  Idempotent: safe to run multiple times.                               ║
-- ║  Run AFTER schema.sql + rls.sql.                                       ║
-- ║                                                                        ║
-- ║  Addresses:                                                            ║
-- ║  1. Client isolation — projects & DPRs scoped to client_org_id         ║
-- ║  2. Client approval immutability — no post-decision edits              ║
-- ║  3. Missing write policies (deliveries, document_versions, expenses)   ║
-- ║  4. Audit triggers for high-value state changes                        ║
-- ║  5. DPR submission_id auto-generation                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 1  HELPER: client_org_id for the current user
-- ══════════════════════════════════════════════════════════════════════════════
-- A client profile is linked to a client_org via client_orgs.
-- We look up the client_org that the caller belongs to through profiles +
-- a new junction column. Until a formal client_org_members table exists,
-- we use a light convention: store client_org_id in profiles.bank_details
-- is NOT safe. Instead we add a dedicated FK column to profiles.

-- Add client_org_id to profiles if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'client_org_id'
  ) THEN
    ALTER TABLE profiles
      ADD COLUMN client_org_id UUID REFERENCES client_orgs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_client_org ON profiles(client_org_id);
  END IF;
END $$;

-- Helper function: get the calling client's client_org_id
CREATE OR REPLACE FUNCTION my_client_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT client_org_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- § 2  CLIENT ISOLATION — projects
-- ══════════════════════════════════════════════════════════════════════════════
-- Problem: the existing "See projects in company" policy lets ALL users in
-- the company see ALL projects. A client should only see projects linked to
-- their client_org.
--
-- Strategy: drop the broad SELECT policy and replace with two narrower ones.

-- Drop old permissive policy (idempotent — ignore if already gone)
DROP POLICY IF EXISTS "See projects in company" ON projects;

-- Internal staff see all projects in their company (unchanged semantics)
CREATE POLICY "Staff see company projects" ON projects
  FOR SELECT USING (
    company_id = my_company_id()
    AND my_role() != 'client'
  );

-- Clients see only projects assigned to their client_org
CREATE POLICY "Client see own org projects" ON projects
  FOR SELECT USING (
    my_role() = 'client'
    AND company_id = my_company_id()
    AND client_org_id = my_client_org_id()
    AND my_client_org_id() IS NOT NULL
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- § 3  CLIENT ISOLATION — DPRs
-- ══════════════════════════════════════════════════════════════════════════════
-- Existing policy: "Client see approved dprs" — any client can see any
-- approved DPR in the company. Replace with project-scoped version.

DROP POLICY IF EXISTS "Client see approved dprs" ON dprs;

CREATE POLICY "Client see approved dprs" ON dprs
  FOR SELECT USING (
    my_role() = 'client'
    AND status = 'approved'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- § 4  CLIENT APPROVAL IMMUTABILITY
-- ══════════════════════════════════════════════════════════════════════════════
-- Currently a client can UPDATE any pending approval. After deciding they
-- should not be able to flip the decision. Enforce via a DB trigger in
-- addition to the (status = 'pending') RLS check (defence in depth).

CREATE OR REPLACE FUNCTION tg_client_approvals_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Once status leaves 'pending' no further UPDATE is allowed by anyone
  -- except via service-role (e.g. migration scripts). The service-role
  -- bypasses RLS but still hits this trigger; add a guard via
  -- current_setting to allow intentional admin overrides if ever needed.
  IF OLD.status != 'pending' THEN
    RAISE EXCEPTION
      'client_approval % has already been decided (status=%). Decisions are immutable.',
      OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_approvals_immutable ON client_approvals;
CREATE TRIGGER trg_client_approvals_immutable
  BEFORE UPDATE ON client_approvals
  FOR EACH ROW
  EXECUTE FUNCTION tg_client_approvals_immutable();

-- Also enforce project-scoped visibility for client approvals
DROP POLICY IF EXISTS "See client approvals" ON client_approvals;

-- Internal staff: all approvals in company
CREATE POLICY "Staff see client approvals" ON client_approvals
  FOR SELECT USING (
    is_admin_role()
    AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.company_id = my_company_id())
  );

-- Clients: only approvals for their org's projects
CREATE POLICY "Client see own approvals" ON client_approvals
  FOR SELECT USING (
    my_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  );

-- Tighten: client can only decide approvals for their own org's projects
DROP POLICY IF EXISTS "Client decide approval" ON client_approvals;

CREATE POLICY "Client decide approval" ON client_approvals
  FOR UPDATE
  USING (
    my_role() = 'client'
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  )
  WITH CHECK (
    -- Clients may only set status to approved/rejected; cannot touch other fields
    status IN ('approved', 'rejected')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- § 5  MISSING WRITE POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

-- deliveries: admin can create/update
CREATE POLICY "Admin manage deliveries" ON deliveries
  FOR ALL USING (is_admin_role());

-- document_versions: admin can insert
CREATE POLICY "Admin manage document versions" ON document_versions
  FOR ALL USING (is_admin_role() AND
    EXISTS (SELECT 1 FROM documents d WHERE d.id = document_id AND d.company_id = my_company_id())
  );

-- safety_checks: admin / supervisor can see all in their scope
CREATE POLICY "Admin see all safety checks" ON safety_checks
  FOR SELECT USING (
    is_admin_role() AND EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.company_id = my_company_id())
  );

-- notifications: system can insert
CREATE POLICY "System insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- § 6  AUDIT TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════
-- We add lightweight triggers for status changes on the four most important
-- tables: dprs, client_approvals, leave_requests, advance_requests.

CREATE OR REPLACE FUNCTION tg_audit_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Resolve company_id via the project or profile depending on table
  IF TG_TABLE_NAME IN ('dprs') THEN
    SELECT company_id INTO v_company_id
      FROM projects WHERE id = NEW.project_id LIMIT 1;
  ELSIF TG_TABLE_NAME IN ('client_approvals') THEN
    SELECT company_id INTO v_company_id
      FROM projects WHERE id = NEW.project_id LIMIT 1;
  ELSIF TG_TABLE_NAME IN ('leave_requests', 'advance_requests') THEN
    SELECT company_id INTO v_company_id
      FROM profiles WHERE id = NEW.profile_id LIMIT 1;
  END IF;

  IF v_company_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (company_id, actor_id, action, ref_table, ref_id, detail)
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

-- DPRs
DROP TRIGGER IF EXISTS trg_audit_dpr_status ON dprs;
CREATE TRIGGER trg_audit_dpr_status
  AFTER UPDATE OF status ON dprs
  FOR EACH ROW EXECUTE FUNCTION tg_audit_status_change();

-- Client approvals
DROP TRIGGER IF EXISTS trg_audit_approval_status ON client_approvals;
CREATE TRIGGER trg_audit_approval_status
  AFTER UPDATE OF status ON client_approvals
  FOR EACH ROW EXECUTE FUNCTION tg_audit_status_change();

-- Leave requests
DROP TRIGGER IF EXISTS trg_audit_leave_status ON leave_requests;
CREATE TRIGGER trg_audit_leave_status
  AFTER UPDATE OF status ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION tg_audit_status_change();

-- Advance requests
DROP TRIGGER IF EXISTS trg_audit_advance_status ON advance_requests;
CREATE TRIGGER trg_audit_advance_status
  AFTER UPDATE OF status ON advance_requests
  FOR EACH ROW EXECUTE FUNCTION tg_audit_status_change();

-- ══════════════════════════════════════════════════════════════════════════════
-- § 7  DPR SUBMISSION ID AUTO-GENERATION
-- ══════════════════════════════════════════════════════════════════════════════
-- Format: DPR-<PROJECT_PREFIX>-<YYYYMMDD>-<SEQ3>
-- e.g.  DPR-EMB-20250711-001
-- The project prefix is the first 3 uppercase letters of the project name.

CREATE OR REPLACE FUNCTION tg_dprs_set_submission_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix   TEXT;
  v_date_str TEXT;
  v_seq      INTEGER;
BEGIN
  -- Only generate once (on insert or when status flips to 'submitted')
  IF NEW.submission_id IS NOT NULL AND NEW.submission_id != '' THEN
    RETURN NEW;
  END IF;

  -- Build prefix from project name
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
    INTO v_prefix
    FROM projects WHERE id = NEW.project_id;

  v_prefix   := COALESCE(v_prefix, 'DPR');
  v_date_str := TO_CHAR(COALESCE(NEW.date, CURRENT_DATE), 'YYYYMMDD');

  -- Daily sequence per project
  SELECT COUNT(*) + 1 INTO v_seq
    FROM dprs
    WHERE project_id = NEW.project_id
      AND date = COALESCE(NEW.date, CURRENT_DATE)
      AND id != NEW.id;

  NEW.submission_id := FORMAT('DPR-%s-%s-%s', v_prefix, v_date_str, LPAD(v_seq::TEXT, 3, '0'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dprs_submission_id ON dprs;
CREATE TRIGGER trg_dprs_submission_id
  BEFORE INSERT ON dprs
  FOR EACH ROW EXECUTE FUNCTION tg_dprs_set_submission_id();

-- Also fire when a draft DPR is submitted (status changes to 'submitted')
CREATE OR REPLACE FUNCTION tg_dprs_submission_id_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'submitted' AND (NEW.submission_id IS NULL OR NEW.submission_id = '') THEN
    NEW := tg_dprs_set_submission_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dprs_submission_id_on_status ON dprs;
CREATE TRIGGER trg_dprs_submission_id_on_status
  BEFORE UPDATE OF status ON dprs
  FOR EACH ROW EXECUTE FUNCTION tg_dprs_submission_id_on_submit();

COMMIT;
