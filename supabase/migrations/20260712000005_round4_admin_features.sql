-- Round 4: admin features — company docs, chat creation, materials management
-- 1. Company-level documents
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_owner_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_owner_type_check
  CHECK (owner_type IN ('profile','project','company'));

-- 2. Conversations: allow creating direct/project chats + adding members.
--    Also fix self-referencing member policy with a SECURITY DEFINER helper.
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND profile_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "See own conversations" ON conversations;
CREATE POLICY "See own conversations" ON conversations
  FOR SELECT USING (is_conversation_member(id));

DROP POLICY IF EXISTS "Create conversations" ON conversations;
CREATE POLICY "Create conversations" ON conversations
  FOR INSERT WITH CHECK (company_id = my_company_id());

DROP POLICY IF EXISTS "See conversation members" ON conversation_members;
CREATE POLICY "See conversation members" ON conversation_members
  FOR SELECT USING (is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Add conversation members" ON conversation_members;
CREATE POLICY "Add conversation members" ON conversation_members
  FOR INSERT WITH CHECK (
    -- you can add yourself, or add others to a conversation you belong to
    profile_id = auth.uid() OR is_conversation_member(conversation_id)
  );

DROP POLICY IF EXISTS "Leave conversation" ON conversation_members;
CREATE POLICY "Leave conversation" ON conversation_members
  FOR DELETE USING (profile_id = auth.uid());

-- 3. Materials: admins manage stock; supervisors manage stock on assigned sites
DROP POLICY IF EXISTS "Manage materials" ON materials;
CREATE POLICY "Manage materials" ON materials
  FOR ALL USING (
    is_admin_role()
    OR (my_role() = 'supervisor' AND is_assigned_to_project(project_id))
  );

-- Supervisors can log deliveries for their sites (admin policy already exists)
DROP POLICY IF EXISTS "Supervisor manage deliveries" ON deliveries;
CREATE POLICY "Supervisor manage deliveries" ON deliveries
  FOR ALL USING (
    my_role() = 'supervisor' AND is_assigned_to_project(project_id)
  );

-- 4. Helpful index for direct-chat lookups
CREATE INDEX IF NOT EXISTS idx_conversation_members_profile
  ON conversation_members(profile_id);
