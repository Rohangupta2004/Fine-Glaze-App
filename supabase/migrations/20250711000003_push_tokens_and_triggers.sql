-- Migration: Push tokens and notification triggers
-- PRD §10 — Push notification infrastructure

-- Add push_token column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- ══════════════════════════════════════════════════════════════════════
-- Notification triggers — fire on key events per PRD notification matrix
-- These insert into the notifications table; the send-notification
-- Edge Function handles push delivery.
-- ══════════════════════════════════════════════════════════════════════

-- Trigger: DPR status change → notify submitter
CREATE OR REPLACE FUNCTION notify_dpr_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.submitted_by,
      'dpr_approved',
      'DPR Approved',
      'Your daily progress report has been approved.',
      'dprs',
      NEW.id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_dpr_status_notify ON dprs;
CREATE TRIGGER trg_dpr_status_notify
  AFTER UPDATE OF status ON dprs
  FOR EACH ROW
  EXECUTE FUNCTION notify_dpr_status_change();

-- Trigger: Leave request decided → notify requester
CREATE OR REPLACE FUNCTION notify_leave_decided()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.profile_id,
      'leave_' || NEW.status,
      'Leave ' || INITCAP(NEW.status),
      'Your leave request has been ' || NEW.status || '.',
      'leave_requests',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_leave_decided_notify ON leave_requests;
CREATE TRIGGER trg_leave_decided_notify
  AFTER UPDATE OF status ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_decided();

-- Trigger: Advance request decided → notify requester
CREATE OR REPLACE FUNCTION notify_advance_decided()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.profile_id,
      'advance_' || NEW.status,
      'Advance ' || INITCAP(NEW.status),
      'Your advance request of ₹' || NEW.amount || ' has been ' || NEW.status || '.',
      'advance_requests',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_advance_decided_notify ON advance_requests;
CREATE TRIGGER trg_advance_decided_notify
  AFTER UPDATE OF status ON advance_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_advance_decided();

-- Trigger: Material request status → notify requester
CREATE OR REPLACE FUNCTION notify_material_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      NEW.requested_by,
      'material_' || NEW.status,
      'Material Request ' || INITCAP(NEW.status),
      NEW.material_name || ' request has been ' || NEW.status || '.',
      'material_requests',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_material_status_notify ON material_requests;
CREATE TRIGGER trg_material_status_notify
  AFTER UPDATE OF status ON material_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_material_status();

-- Trigger: New DPR submitted → notify admins
CREATE OR REPLACE FUNCTION notify_new_dpr()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
BEGIN
  IF NEW.status = 'submitted' THEN
    FOR admin_id IN
      SELECT id FROM profiles WHERE role IN ('owner', 'project_manager') AND status = 'active'
    LOOP
      INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id, important)
      VALUES (
        admin_id,
        'dpr_submitted',
        'New DPR Submitted',
        'A new daily progress report needs your review.',
        'dprs',
        NEW.id,
        true
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_dpr_notify ON dprs;
CREATE TRIGGER trg_new_dpr_notify
  AFTER INSERT ON dprs
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_dpr();

-- Trigger: Payment marked paid → notify admin + client
CREATE OR REPLACE FUNCTION notify_payment_received()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
  client_id UUID;
  proj_name TEXT;
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'pending' THEN
    SELECT name INTO proj_name FROM projects WHERE id = NEW.project_id;

    -- Notify admins
    FOR admin_id IN
      SELECT id FROM profiles WHERE role IN ('owner', 'accounts') AND status = 'active'
    LOOP
      INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
      VALUES (
        admin_id,
        'payment_received',
        'Payment Received',
        'Payment for ' || COALESCE(proj_name, 'project') || ' — ' || NEW.milestone_name || ' (₹' || NEW.amount || ') has been marked as paid.',
        'payments',
        NEW.id
      );
    END LOOP;

    -- Notify client
    FOR client_id IN
      SELECT p.id FROM profiles p
      JOIN client_orgs co ON co.id = (SELECT client_org_id FROM projects WHERE id = NEW.project_id)
      WHERE p.role = 'client' AND p.status = 'active'
    LOOP
      INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
      VALUES (
        client_id,
        'payment_received',
        'Payment Received',
        '₹' || NEW.amount || ' received for ' || COALESCE(proj_name, 'your project') || '.',
        'payments',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_received_notify ON payments;
CREATE TRIGGER trg_payment_received_notify
  AFTER UPDATE OF status ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_received();
