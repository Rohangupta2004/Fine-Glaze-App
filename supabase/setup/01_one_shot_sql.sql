-- ════════════════════════════════════════════════════════════════════
-- FINE GLAZE COS — ONE-SHOT SUPABASE SETUP
-- ════════════════════════════════════════════════════════════════════
-- Open Supabase Dashboard on your phone → SQL Editor → New query
-- Paste this entire file → Run
--
-- This bundles THREE migrations + TWO cron schedules in dependency order.
-- Idempotent — safe to run multiple times.
--
-- After running this, also paste the Edge Function code separately
-- (see SETUP.md for phone-paste instructions).
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- PART 1: Profile payslip columns (bank/PAN/UAN/ESI)
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS esi_number TEXT;

COMMENT ON COLUMN profiles.bank_account IS 'Employee bank account number for salary credit';
COMMENT ON COLUMN profiles.bank_ifsc IS 'IFSC code of employee bank branch';
COMMENT ON COLUMN profiles.pan IS 'Permanent Account Number (income tax)';
COMMENT ON COLUMN profiles.uan IS 'Universal Account Number (EPFO)';
COMMENT ON COLUMN profiles.esi_number IS 'ESI insurance number (if eligible)';

CREATE INDEX IF NOT EXISTS idx_profiles_pan ON profiles(pan) WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_uan ON profiles(uan) WHERE uan IS NOT NULL;


-- ────────────────────────────────────────────────────────────────────
-- PART 2: Notification dispatch + new triggers
-- Wires DB triggers to actually push notifications (was missing before)
-- ────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Dispatch function: AFTER INSERT on notifications → HTTP POST to Edge Function
CREATE OR REPLACE FUNCTION dispatch_notification()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_dispatch_notification ON notifications;
CREATE TRIGGER trg_dispatch_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION dispatch_notification();


-- Trigger: New payment milestone → notify client
CREATE OR REPLACE FUNCTION notify_payment_created()
RETURNS trigger AS $$
DECLARE
  client_id UUID;
  proj_name TEXT;
BEGIN
  SELECT name INTO proj_name FROM projects WHERE id = NEW.project_id;

  FOR client_id IN
    SELECT p.id FROM profiles p
    JOIN client_orgs co ON co.id = (SELECT client_org_id FROM projects WHERE id = NEW.project_id)
    WHERE p.role = 'client' AND p.status = 'active'
  LOOP
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_created_notify ON payments;
CREATE TRIGGER trg_payment_created_notify
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_created();


-- Trigger: Task assignment → notify assignee
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS trigger AS $$
DECLARE
  task_title TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF OLD.assigned_to IS NOT NULL AND OLD.assigned_to = NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  task_title := COALESCE(NEW.title, 'A task');

  INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_assigned_notify ON tasks;
CREATE TRIGGER trg_task_assigned_notify
  AFTER INSERT OR UPDATE OF assigned_to ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();


-- Trigger: Document upload → notify project members
-- Drop any pre-existing notify_document_upload() (no "d") to avoid dupes
DROP FUNCTION IF EXISTS notify_document_upload() CASCADE;
DROP TRIGGER IF EXISTS trg_document_upload_notify ON documents;
DROP TRIGGER IF EXISTS trg_document_uploaded_notify ON documents;

CREATE OR REPLACE FUNCTION notify_document_uploaded()
RETURNS trigger AS $$
DECLARE
  member_id UUID;
  proj_name TEXT;
  doc_name TEXT;
BEGIN
  SELECT name INTO proj_name FROM projects WHERE id = NEW.project_id;
  doc_name := COALESCE(NEW.title, NEW.file_name, 'A document');

  FOR member_id IN
    SELECT a.profile_id FROM assignments a
    WHERE a.project_id = NEW.project_id
    UNION
    SELECT id FROM profiles WHERE role = 'owner' AND status = 'active'
  LOOP
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      member_id,
      'document_uploaded',
      'New Document Uploaded',
      '"' || doc_name || '" was uploaded to ' || COALESCE(proj_name, 'a project') || '.',
      'documents',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_document_uploaded_notify ON documents;
CREATE TRIGGER trg_document_uploaded_notify
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_uploaded();


-- Trigger: Client approval requested → notify client
CREATE OR REPLACE FUNCTION notify_client_approval_requested()
RETURNS trigger AS $$
DECLARE
  client_id UUID;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  FOR client_id IN
    SELECT p.id FROM profiles p
    JOIN client_orgs co ON co.id = (SELECT client_org_id FROM projects WHERE id = NEW.project_id)
    WHERE p.role = 'client' AND p.status = 'active'
  LOOP
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id, important)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_approval_request_notify ON client_approvals;
CREATE TRIGGER trg_client_approval_request_notify
  AFTER INSERT ON client_approvals
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_approval_requested();


-- Trigger: Client approval decision → notify requester
CREATE OR REPLACE FUNCTION notify_client_approval_decided()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_approval_decided_notify ON client_approvals;
CREATE TRIGGER trg_client_approval_decided_notify
  AFTER UPDATE OF status ON client_approvals
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_approval_decided();


-- Trigger: Employee request → notify admins
CREATE OR REPLACE FUNCTION notify_employee_request()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
BEGIN
  FOR admin_id IN
    SELECT id FROM profiles WHERE role IN ('owner', 'hr') AND status = 'active'
  LOOP
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_employee_request_notify ON employee_requests;
CREATE TRIGGER trg_employee_request_notify
  AFTER INSERT ON employee_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_request();


-- Helpful index for unread notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, read_at)
  WHERE read_at IS NULL;


-- ────────────────────────────────────────────────────────────────────
-- PART 3: Storage security hardening (signed URLs)
-- Makes dpr-media private, tightens documents/chat-attachments read access
-- ────────────────────────────────────────────────────────────────────

BEGIN;

-- Make dpr-media bucket private (was public)
UPDATE storage.buckets SET public = false WHERE id = 'dpr-media';

-- Tighten DPR media read: only admins / project members / project client
DROP POLICY IF EXISTS "Authenticated read DPR media" ON storage.objects;
DROP POLICY IF EXISTS "Project members read DPR media" ON storage.objects;

CREATE POLICY "Project members read DPR media" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'dpr-media'
  AND (
    is_admin_role()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND is_assigned_to_project(p.id)
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN client_orgs co ON co.id = p.client_org_id
      JOIN profiles up ON up.id = auth.uid()
      WHERE p.id::text = (storage.foldername(name))[1]
        AND up.role = 'client'
        AND up.company_id = co.id
    )
  )
);

-- Tighten documents read: admins / project members / own profile / own company
DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;
DROP POLICY IF EXISTS "Project members read documents" ON storage.objects;

CREATE POLICY "Project members read documents" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'documents'
  AND (
    is_admin_role()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND is_assigned_to_project(p.id)
    )
    OR ((storage.foldername(name))[1] = 'profile'
        AND (storage.foldername(name))[2] = auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM profiles up
      WHERE up.id = auth.uid()
        AND up.company_id::text = (storage.foldername(name))[2]
    )
  )
);

-- Tighten chat-attachments: admins / conversation members only
DROP POLICY IF EXISTS "Authenticated read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Conversation members read chat attachments" ON storage.objects;

CREATE POLICY "Conversation members read chat attachments" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'chat-attachments'
  AND (
    is_admin_role()
    OR EXISTS (
      SELECT 1
      FROM conversation_members cm
      WHERE cm.conversation_id::text = (storage.foldername(name))[1]
        AND cm.profile_id = auth.uid()
    )
  )
);

COMMIT;


-- ────────────────────────────────────────────────────────────────────
-- PART 4: App settings for trigger dispatch
-- Replace these placeholders with YOUR actual values (see SETUP.md step 3)
-- ────────────────────────────────────────────────────────────────────
--
-- Replace YOUR-PROJECT-REF with vxpkihnovotlwdbnuirt (from your dashboard URL)
-- Replace YOUR-SERVICE-ROLE-KEY with the real key (Project Settings → API → service_role)

-- UNCOMMENT THESE TWO LINES AFTER REPLACING PLACEHOLDERS:
-- ALTER DATABASE postgres SET app.edge_function_url = 'https://vxpkihnovotlwdbnuirt.functions.supabase.co/send-notification';
-- ALTER DATABASE postgres SET app.service_role_key = 'YOUR-SERVICE-ROLE-KEY';


-- ────────────────────────────────────────────────────────────────────
-- PART 5: Schedule daily crons (evening site reminder + recurring tasks)
-- ────────────────────────────────────────────────────────────────────
--
-- These require pg_cron + pg_net extensions (already enabled in Part 2).
-- Times in UTC. 13:00 UTC = 18:30 IST, 00:00 UTC = 05:30 IST.
--
-- UNCOMMENT AFTER REPLACING PLACEHOLDERS:

-- SELECT cron.schedule(
--   'evening-site-reminder',
--   '0 13 * * *',
--   $$SELECT net.http_post(
--     url := 'https://vxpkihnovotlwdbnuirt.functions.supabase.co/evening-site-reminder',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   )$$
-- );

-- SELECT cron.schedule(
--   'materialize-recurring-tasks',
--   '0 0 * * *',
--   $$SELECT net.http_post(
--     url := 'https://vxpkihnovotlwdbnuirt.functions.supabase.co/materialize-recurring-tasks',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   )$$
-- );


-- ────────────────────────────────────────────────────────────────────
-- ✅ DONE! All migrations applied. Now paste Edge Function code (see SETUP.md)
-- ────────────────────────────────────────────────────────────────────

-- Verification queries (run to confirm everything works):

-- Check profiles columns:
-- SELECT bank_account, pan, uan FROM profiles WHERE role = 'worker' LIMIT 3;

-- Check triggers:
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%_notify' OR tgname = 'trg_dispatch_notification';

-- Check bucket is private:
-- SELECT id, public FROM storage.buckets WHERE id = 'dpr-media';

-- Check cron jobs:
-- SELECT jobname, schedule FROM cron.job;
