-- Migration: Notification dispatch + remaining gaps
-- PRD §10 — Wire DB triggers to the send-notification Edge Function so
-- notifications actually get pushed, not just stored in the table.
--
-- Also adds:
--   • payment_insert trigger (notify client when admin creates a new milestone)
--   • task_assignment trigger (notify worker when task is assigned)
--   • document_upload trigger (notify project members)
--   • client_approval_request trigger (notify client)
--
-- Strategy: an AFTER INSERT trigger on `notifications` calls the
-- send-notification Edge Function via the pg_net extension. If pg_net
-- is unavailable, the notification stays in the table for a fallback
-- cron to pick up.

-- ── Enable pg_net if available ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Notification dispatch function ─────────────────────────────────────────
-- Called by AFTER INSERT trigger on notifications. Sends HTTP POST to
-- the send-notification Edge Function which handles push delivery via
-- Expo Push API.
--
-- IMPORTANT: sends `x-trigger-dispatch: 1` header so the Edge Function
-- knows to SKIP the insert (the row already exists). Without this header,
-- the function would insert another notification row → trigger fires
-- again → infinite recursion.
CREATE OR REPLACE FUNCTION dispatch_notification()
RETURNS trigger AS $$
DECLARE
  edge_url TEXT;
  service_role TEXT;
BEGIN
  edge_url := current_setting('app.edge_function_url', true);
  service_role := current_setting('app.service_role_key', true);

  IF edge_url IS NULL OR service_role IS NULL THEN
    -- Configuration missing — silent skip. Notification stays in table.
    RETURN NEW;
  END IF;

  -- Fire-and-forget HTTP POST to send-notification Edge Function.
  -- x-trigger-dispatch header tells the function this is a trigger callback,
  -- so it should NOT insert into notifications (would cause recursion).
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

-- ── Trigger: New payment milestone created → notify client ────────────────
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

-- ── Trigger: Task assignment → notify assignee ────────────────────────────
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

-- ── Trigger: Document upload → notify project members ───────────────────
-- Note: if a pre-existing `notify_document_upload()` (without the trailing
-- "d") trigger exists from a previous deployment, drop it first to avoid
-- duplicate notifications to owners.
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

-- ── Trigger: Client approval request → notify client ──────────────────────
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

-- ── Trigger: Client approval decision → notify requester ──────────────────
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

-- ── Trigger: Employee request (supervisor → admin) ────────────────────────
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

-- ── Helpful index for unread notification queries ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, read_at)
  WHERE read_at IS NULL;
