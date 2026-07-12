-- Migration: Chat message notifications + attendance notification
-- Round 5 — push notifications for chat and attendance

-- Trigger: New chat message → notify other conversation members
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
DECLARE
  member_id UUID;
  sender_name TEXT;
  conv_name TEXT;
BEGIN
  -- Get sender's name
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  -- Get conversation name (project name for project chats, or 'Direct Message')
  SELECT COALESCE(
    (SELECT p.name FROM projects p JOIN conversations c ON c.project_id = p.id WHERE c.id = NEW.conversation_id),
    'Direct Message'
  ) INTO conv_name;

  -- Notify all other members of this conversation
  FOR member_id IN
    SELECT cm.profile_id FROM conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.profile_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
    VALUES (
      member_id,
      'chat',
      COALESCE(sender_name, 'Someone') || ' sent a message',
      LEFT(NEW.body, 100),
      'messages',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_message_notify ON messages;
CREATE TRIGGER trg_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Trigger: New leave request → notify admins
CREATE OR REPLACE FUNCTION notify_new_leave_request()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
  requester_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO requester_name FROM profiles WHERE id = NEW.profile_id;

    FOR admin_id IN
      SELECT id FROM profiles WHERE role IN ('owner', 'hr') AND status = 'active'
    LOOP
      INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id, important)
      VALUES (
        admin_id,
        'approval_pending',
        'New Leave Request',
        COALESCE(requester_name, 'An employee') || ' requested leave (' || NEW.leave_type || ').',
        'leave_requests',
        NEW.id,
        true
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_leave_request_notify ON leave_requests;
CREATE TRIGGER trg_new_leave_request_notify
  AFTER INSERT ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_leave_request();

-- Trigger: New material request → notify admins
CREATE OR REPLACE FUNCTION notify_new_material_request()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
  requester_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    SELECT full_name INTO requester_name FROM profiles WHERE id = NEW.requested_by;

    FOR admin_id IN
      SELECT id FROM profiles WHERE role IN ('owner', 'project_manager') AND status = 'active'
    LOOP
      INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id, important)
      VALUES (
        admin_id,
        'approval_pending',
        'Material Request',
        COALESCE(requester_name, 'A team member') || ' requested ' || NEW.material_name || ' (' || NEW.quantity || ' ' || COALESCE(NEW.unit, 'units') || ').',
        'material_requests',
        NEW.id,
        true
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_material_request_notify ON material_requests;
CREATE TRIGGER trg_new_material_request_notify
  AFTER INSERT ON material_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_material_request();

-- Trigger: Document uploaded → notify relevant users
CREATE OR REPLACE FUNCTION notify_document_upload()
RETURNS trigger AS $$
DECLARE
  admin_id UUID;
  uploader_name TEXT;
BEGIN
  SELECT full_name INTO uploader_name FROM profiles WHERE id = NEW.uploaded_by;

  -- Notify admins when non-admin uploads a document
  IF (SELECT role FROM profiles WHERE id = NEW.uploaded_by) NOT IN ('owner', 'project_manager') THEN
    FOR admin_id IN
      SELECT id FROM profiles WHERE role IN ('owner', 'project_manager') AND status = 'active'
    LOOP
      INSERT INTO notifications (recipient_id, kind, title, body, ref_table, ref_id)
      VALUES (
        admin_id,
        'document_upload',
        'Document Uploaded',
        COALESCE(uploader_name, 'Someone') || ' uploaded "' || COALESCE(NEW.title, 'a document') || '".',
        'documents',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_document_upload_notify ON documents;
CREATE TRIGGER trg_document_upload_notify
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_upload();
