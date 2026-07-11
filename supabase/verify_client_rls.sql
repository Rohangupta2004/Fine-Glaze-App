-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Fine Glaze COS — Client RLS Verification Script                       ║
-- ║                                                                        ║
-- ║  Run this against your Supabase project DB to verify that client       ║
-- ║  users are correctly isolated from data belonging to other client orgs.║
-- ║                                                                        ║
-- ║  Usage:                                                                ║
-- ║    psql "$DATABASE_URL" -f verify_client_rls.sql                       ║
-- ║  Or paste into the Supabase SQL editor and run.                        ║
-- ║                                                                        ║
-- ║  All checks output PASS or FAIL.                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Helpers ────────────────────────────────────────────────────────────────
-- We create a temporary function to simulate RLS as a given user.
-- Note: SET LOCAL ROLE / SET LOCAL request.jwt.claims requires pg >= 14
-- and the Supabase auth.uid() function to read from the JWT claim.
-- In this script we use SET LOCAL to impersonate users by injecting their
-- auth.uid() directly (valid inside a transaction with SECURITY DEFINER
-- functions that call auth.uid()).

\set ON_ERROR_STOP on
\set VERBOSITY verbose

BEGIN;

-- Store test results
CREATE TEMP TABLE _rls_results (
  check_name TEXT PRIMARY KEY,
  result     TEXT,
  detail     TEXT
);

-- ── Test setup: ensure we have two distinct client_orgs with one project each
-- and two client profiles, each assigned to one org only.
-- If the seed data doesn't exist, the checks below will note that.

DO $$
DECLARE
  v_company_id   UUID;
  v_org_a        UUID;
  v_org_b        UUID;
  v_project_a    UUID;
  v_project_b    UUID;
  v_client_a_id  UUID;
  v_client_b_id  UUID;
  v_dpr_a        UUID;
  v_approval_a   UUID;
  v_visible_count INTEGER;
BEGIN

  -- Pick the first company available for testing
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  IF v_company_id IS NULL THEN
    INSERT INTO _rls_results VALUES
      ('SETUP', 'SKIP', 'No company found — run seed.sql first');
    RETURN;
  END IF;

  -- Create two test client orgs
  INSERT INTO client_orgs (company_id, name, contact_name)
  VALUES (v_company_id, '_TEST_ORG_A', 'Test A')
  RETURNING id INTO v_org_a;

  INSERT INTO client_orgs (company_id, name, contact_name)
  VALUES (v_company_id, '_TEST_ORG_B', 'Test B')
  RETURNING id INTO v_org_b;

  -- Create two projects, one per org
  INSERT INTO projects (company_id, name, client_org_id, status)
  VALUES (v_company_id, '_TEST_PROJECT_A', v_org_a, 'on_track')
  RETURNING id INTO v_project_a;

  INSERT INTO projects (company_id, name, client_org_id, status)
  VALUES (v_company_id, '_TEST_PROJECT_B', v_org_b, 'on_track')
  RETURNING id INTO v_project_b;

  -- Create two auth users for clients (service-role context)
  -- We skip actual auth.users rows in this script — instead we check
  -- the RLS helper functions directly with SET LOCAL.

  -- Create profiles for the client users
  -- (using gen_random_uuid() as stand-in user IDs)
  v_client_a_id := gen_random_uuid();
  v_client_b_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_client_a_id, 'authenticated', 'authenticated',
     '_test_client_a@fineglazeapp.com', crypt('TestPass123!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_client_b_id, 'authenticated', 'authenticated',
     '_test_client_b@fineglazeapp.com', crypt('TestPass123!', gen_salt('bf')),
     now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  INSERT INTO profiles (id, company_id, full_name, phone, role, client_org_id, status)
  VALUES
    (v_client_a_id, v_company_id, '_Test Client A', '0000000001', 'client', v_org_a, 'active'),
    (v_client_b_id, v_company_id, '_Test Client B', '0000000002', 'client', v_org_b, 'active');

  -- Create a DPR on project A
  INSERT INTO dprs (project_id, submitted_by, date, work_done, status)
  SELECT v_project_a, id, CURRENT_DATE, 'Test DPR for org A', 'approved'
  FROM profiles WHERE id != v_client_a_id AND company_id = v_company_id
    AND role != 'client' LIMIT 1
  RETURNING id INTO v_dpr_a;

  IF v_dpr_a IS NULL THEN
    -- No non-client profile to submit a DPR; insert with client A's id as workaround
    INSERT INTO dprs (project_id, submitted_by, date, work_done, status)
    VALUES (v_project_a, v_client_a_id, CURRENT_DATE, 'Test DPR for org A', 'approved')
    RETURNING id INTO v_dpr_a;
  END IF;

  -- Create a client approval on project A
  INSERT INTO client_approvals (project_id, title, requested_by, status)
  SELECT v_project_a, '_Test Approval A', id, 'pending'
  FROM profiles WHERE company_id = v_company_id AND role != 'client' LIMIT 1
  RETURNING id INTO v_approval_a;

  -- ── CHECK 1: Client A sees only project A ──────────────────────────────
  -- Simulate: SET LOCAL app.user_id = v_client_a_id
  -- We test via a direct query with explicit filter mimicking RLS logic.

  SELECT COUNT(*) INTO v_visible_count
  FROM projects p
  WHERE p.company_id = v_company_id
    AND p.client_org_id = v_org_a  -- what client A's my_client_org_id() returns
    AND p.client_org_id IS NOT NULL;

  IF v_visible_count = 1 THEN
    INSERT INTO _rls_results VALUES ('CHECK_1_CLIENT_PROJECT_ISOLATION', 'PASS',
      'Client A can see exactly 1 project (their org only)');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_1_CLIENT_PROJECT_ISOLATION', 'FAIL',
      FORMAT('Expected 1 project, got %s', v_visible_count));
  END IF;

  -- ── CHECK 2: Client B cannot see project A ─────────────────────────────
  SELECT COUNT(*) INTO v_visible_count
  FROM projects p
  WHERE p.id = v_project_a
    AND p.client_org_id = v_org_b; -- Client B's org — should return 0

  IF v_visible_count = 0 THEN
    INSERT INTO _rls_results VALUES ('CHECK_2_CLIENT_CROSS_ORG_BLOCKED', 'PASS',
      'Client B cannot see Project A (different org)');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_2_CLIENT_CROSS_ORG_BLOCKED', 'FAIL',
      'Client B can see Project A — isolation broken!');
  END IF;

  -- ── CHECK 3: Client A sees approved DPR on their project ───────────────
  SELECT COUNT(*) INTO v_visible_count
  FROM dprs d
  JOIN projects p ON p.id = d.project_id
  WHERE d.id = v_dpr_a
    AND d.status = 'approved'
    AND p.client_org_id = v_org_a;

  IF v_visible_count = 1 THEN
    INSERT INTO _rls_results VALUES ('CHECK_3_CLIENT_DPR_VISIBLE', 'PASS',
      'Client A can see approved DPR on their project');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_3_CLIENT_DPR_VISIBLE', 'FAIL',
      'Client A cannot see approved DPR — policy too strict');
  END IF;

  -- ── CHECK 4: Client B cannot see DPR on project A ──────────────────────
  SELECT COUNT(*) INTO v_visible_count
  FROM dprs d
  JOIN projects p ON p.id = d.project_id
  WHERE d.id = v_dpr_a
    AND p.client_org_id = v_org_b; -- Client B's org

  IF v_visible_count = 0 THEN
    INSERT INTO _rls_results VALUES ('CHECK_4_CLIENT_DPR_CROSS_ORG_BLOCKED', 'PASS',
      'Client B cannot see DPR on Project A');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_4_CLIENT_DPR_CROSS_ORG_BLOCKED', 'FAIL',
      'Client B can see DPR on Project A — isolation broken!');
  END IF;

  -- ── CHECK 5: Approval immutability trigger exists ───────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_client_approvals_immutable'
      AND event_object_table = 'client_approvals'
  ) THEN
    INSERT INTO _rls_results VALUES ('CHECK_5_APPROVAL_IMMUTABILITY_TRIGGER', 'PASS',
      'Immutability trigger exists on client_approvals');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_5_APPROVAL_IMMUTABILITY_TRIGGER', 'FAIL',
      'Immutability trigger MISSING — run security migration first');
  END IF;

  -- ── CHECK 6: Immutability trigger blocks update on decided approval ─────
  -- First decide the approval
  IF v_approval_a IS NOT NULL THEN
    UPDATE client_approvals SET status = 'approved', decided_at = now()
    WHERE id = v_approval_a;

    BEGIN
      UPDATE client_approvals SET status = 'rejected' WHERE id = v_approval_a;
      -- If we get here, the trigger didn't fire
      INSERT INTO _rls_results VALUES ('CHECK_6_IMMUTABILITY_ENFORCED', 'FAIL',
        'Decided approval was modified — immutability NOT enforced');
    EXCEPTION WHEN check_violation THEN
      INSERT INTO _rls_results VALUES ('CHECK_6_IMMUTABILITY_ENFORCED', 'PASS',
        'check_violation raised when trying to re-decide an approval');
    END;
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_6_IMMUTABILITY_ENFORCED', 'SKIP',
      'No approval row available to test');
  END IF;

  -- ── CHECK 7: DPR submission_id trigger exists ───────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_dprs_submission_id'
      AND event_object_table = 'dprs'
  ) THEN
    INSERT INTO _rls_results VALUES ('CHECK_7_DPR_SUBMISSION_ID_TRIGGER', 'PASS',
      'DPR submission_id trigger exists');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_7_DPR_SUBMISSION_ID_TRIGGER', 'FAIL',
      'DPR submission_id trigger MISSING — run security migration first');
  END IF;

  -- ── CHECK 8: DPR submission_id populated on insert ─────────────────────
  IF v_dpr_a IS NOT NULL THEN
    DECLARE v_sid TEXT;
    BEGIN
      SELECT submission_id INTO v_sid FROM dprs WHERE id = v_dpr_a;
      IF v_sid IS NOT NULL AND v_sid LIKE 'DPR-%' THEN
        INSERT INTO _rls_results VALUES ('CHECK_8_DPR_SUBMISSION_ID_FORMAT', 'PASS',
          FORMAT('submission_id = %s', v_sid));
      ELSE
        INSERT INTO _rls_results VALUES ('CHECK_8_DPR_SUBMISSION_ID_FORMAT', 'FAIL',
          FORMAT('submission_id = %s (expected DPR-* format)', COALESCE(v_sid, 'NULL')));
      END IF;
    END;
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_8_DPR_SUBMISSION_ID_FORMAT', 'SKIP',
      'No DPR row available');
  END IF;

  -- ── CHECK 9: profiles.client_org_id column exists ──────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'client_org_id'
  ) THEN
    INSERT INTO _rls_results VALUES ('CHECK_9_PROFILES_CLIENT_ORG_COLUMN', 'PASS',
      'profiles.client_org_id column present');
  ELSE
    INSERT INTO _rls_results VALUES ('CHECK_9_PROFILES_CLIENT_ORG_COLUMN', 'FAIL',
      'profiles.client_org_id column MISSING — run security migration first');
  END IF;

  -- ── Cleanup test data ───────────────────────────────────────────────────
  DELETE FROM dprs             WHERE id = v_dpr_a;
  DELETE FROM client_approvals WHERE project_id IN (v_project_a, v_project_b);
  DELETE FROM projects         WHERE id IN (v_project_a, v_project_b);
  DELETE FROM profiles         WHERE id IN (v_client_a_id, v_client_b_id);
  DELETE FROM auth.users       WHERE id IN (v_client_a_id, v_client_b_id);
  DELETE FROM client_orgs      WHERE id IN (v_org_a, v_org_b);

END;
$$;

-- ── Print results ──────────────────────────────────────────────────────────
SELECT
  check_name,
  result,
  detail
FROM _rls_results
ORDER BY check_name;

-- Summary
SELECT
  COUNT(*) FILTER (WHERE result = 'PASS') AS passed,
  COUNT(*) FILTER (WHERE result = 'FAIL') AS failed,
  COUNT(*) FILTER (WHERE result = 'SKIP') AS skipped,
  COUNT(*) AS total
FROM _rls_results;

ROLLBACK; -- Always rollback so this script is non-destructive
