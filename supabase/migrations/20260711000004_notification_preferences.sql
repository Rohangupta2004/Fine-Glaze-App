CREATE TABLE IF NOT EXISTS notification_preferences (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  task_updates BOOLEAN NOT NULL DEFAULT true,
  dpr_updates BOOLEAN NOT NULL DEFAULT true,
  leave_updates BOOLEAN NOT NULL DEFAULT true,
  material_updates BOOLEAN NOT NULL DEFAULT true,
  payment_updates BOOLEAN NOT NULL DEFAULT true,
  chat_updates BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage own notification preferences" ON notification_preferences;
CREATE POLICY "Manage own notification preferences" ON notification_preferences
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
