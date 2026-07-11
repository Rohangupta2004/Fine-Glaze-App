-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Fine Glaze COS — Row Level Security Policies                      ║
-- ║  Run AFTER schema.sql. All tables company-scoped.                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Helper function: get user's profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: get user's company_id
CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: get user's role
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: check if user is admin-experience (owner/pm/hr/accounts)
CREATE OR REPLACE FUNCTION is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role IN ('owner','project_manager','hr','accounts') FROM profiles WHERE id = auth.uid();
$$;

-- Helper: is user assigned to this project?
CREATE OR REPLACE FUNCTION is_assigned_to_project(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM assignments
    WHERE project_id = p_id AND profile_id = auth.uid() AND active = true
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dprs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpr_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════
-- COMPANIES — same company only
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "Users see own company" ON companies
  FOR SELECT USING (id = my_company_id());

-- ═══════════════════════════════════════════════════════════════════════
-- PROFILES — company-scoped, salary/bank self-only or admin
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See profiles in company" ON profiles
  FOR SELECT USING (company_id = my_company_id());

-- Workers can update their own profile (name, avatar, address)
CREATE POLICY "Update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile in company
CREATE POLICY "Admin update profiles" ON profiles
  FOR UPDATE USING (is_admin_role() AND company_id = my_company_id());

-- Admin can insert (create employees)
CREATE POLICY "Admin insert profiles" ON profiles
  FOR INSERT WITH CHECK (is_admin_role() AND company_id = my_company_id());

-- ═══════════════════════════════════════════════════════════════════════
-- PROJECTS — company-scoped; clients see only their org's projects
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See projects in company" ON projects
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "Admin manage projects" ON projects
  FOR ALL USING (is_admin_role() AND company_id = my_company_id());

-- ═══════════════════════════════════════════════════════════════════════
-- ASSIGNMENTS — company-scoped
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See assignments" ON assignments
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM projects WHERE id = project_id AND company_id = my_company_id())
  );

CREATE POLICY "Admin manage assignments" ON assignments
  FOR ALL USING (
    is_admin_role() AND EXISTS(SELECT 1 FROM projects WHERE id = project_id AND company_id = my_company_id())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- ATTENDANCE — own records or admin/supervisor view
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See own attendance" ON attendance
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admin see all attendance" ON attendance
  FOR SELECT USING (
    is_admin_role() AND EXISTS(SELECT 1 FROM projects WHERE id = project_id AND company_id = my_company_id())
  );

CREATE POLICY "Supervisor see project attendance" ON attendance
  FOR SELECT USING (
    my_role() = 'supervisor' AND is_assigned_to_project(project_id)
  );

CREATE POLICY "Insert own attendance" ON attendance
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Update own attendance" ON attendance
  FOR UPDATE USING (profile_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- TASKS — assigned or admin
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See assigned tasks" ON tasks
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR is_admin_role()
    OR (my_role() = 'supervisor' AND is_assigned_to_project(project_id))
  );

CREATE POLICY "Admin/supervisor manage tasks" ON tasks
  FOR ALL USING (
    is_admin_role() OR (my_role() = 'supervisor' AND is_assigned_to_project(project_id))
  );

-- ═══════════════════════════════════════════════════════════════════════
-- DPRs — submit own, admin/supervisor see project DPRs
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See own dprs" ON dprs
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Admin see dprs" ON dprs
  FOR SELECT USING (is_admin_role());

CREATE POLICY "Supervisor see project dprs" ON dprs
  FOR SELECT USING (my_role() = 'supervisor' AND is_assigned_to_project(project_id));

-- Clients see approved DPRs only (for photo timeline)
CREATE POLICY "Client see approved dprs" ON dprs
  FOR SELECT USING (my_role() = 'client' AND status = 'approved');

CREATE POLICY "Insert own dpr" ON dprs
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Update own draft dpr" ON dprs
  FOR UPDATE USING (submitted_by = auth.uid() AND status = 'draft');

CREATE POLICY "Admin review dprs" ON dprs
  FOR UPDATE USING (is_admin_role());

-- DPR media follows DPR access
CREATE POLICY "See dpr media" ON dpr_media
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM dprs WHERE id = dpr_id AND (
      submitted_by = auth.uid() OR is_admin_role()
      OR (my_role() = 'supervisor' AND is_assigned_to_project(project_id))
      OR (my_role() = 'client' AND status = 'approved')
    ))
  );

CREATE POLICY "Insert dpr media" ON dpr_media
  FOR INSERT WITH CHECK (
    EXISTS(SELECT 1 FROM dprs WHERE id = dpr_id AND submitted_by = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- LEAVE & ADVANCE REQUESTS — own or admin
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See own leave" ON leave_requests
  FOR SELECT USING (profile_id = auth.uid() OR is_admin_role());

CREATE POLICY "Insert own leave" ON leave_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin decide leave" ON leave_requests
  FOR UPDATE USING (is_admin_role());

CREATE POLICY "See own advance" ON advance_requests
  FOR SELECT USING (profile_id = auth.uid() OR is_admin_role());

CREATE POLICY "Insert own advance" ON advance_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin decide advance" ON advance_requests
  FOR UPDATE USING (is_admin_role());

-- ═══════════════════════════════════════════════════════════════════════
-- MATERIALS, REQUESTS, DELIVERIES — project-scoped
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See project materials" ON materials
  FOR SELECT USING (
    is_assigned_to_project(project_id) OR is_admin_role()
  );

CREATE POLICY "See material requests" ON material_requests
  FOR SELECT USING (
    requested_by = auth.uid() OR is_admin_role()
    OR (my_role() = 'supervisor' AND is_assigned_to_project(project_id))
  );

CREATE POLICY "Insert material request" ON material_requests
  FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admin decide material" ON material_requests
  FOR UPDATE USING (is_admin_role());

CREATE POLICY "See deliveries" ON deliveries
  FOR SELECT USING (
    is_assigned_to_project(project_id) OR is_admin_role()
  );

-- ═══════════════════════════════════════════════════════════════════════
-- DOCUMENTS & VERSIONS — company-scoped, client sees project docs only
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See documents" ON documents
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "Admin manage documents" ON documents
  FOR ALL USING (is_admin_role() AND company_id = my_company_id());

CREATE POLICY "See document versions" ON document_versions
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM documents WHERE id = document_id AND company_id = my_company_id())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- PAYMENTS & CLIENT APPROVALS
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See payments" ON payments
  FOR SELECT USING (
    is_admin_role() OR is_assigned_to_project(project_id) OR my_role() = 'client'
  );

CREATE POLICY "Admin manage payments" ON payments
  FOR ALL USING (is_admin_role());

CREATE POLICY "See client approvals" ON client_approvals
  FOR SELECT USING (
    is_admin_role() OR my_role() = 'client'
  );

CREATE POLICY "Admin create approvals" ON client_approvals
  FOR INSERT WITH CHECK (is_admin_role());

CREATE POLICY "Client decide approval" ON client_approvals
  FOR UPDATE USING (my_role() = 'client' AND status = 'pending');

-- ═══════════════════════════════════════════════════════════════════════
-- CONVERSATIONS & MESSAGES
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See own conversations" ON conversations
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id = id AND profile_id = auth.uid())
  );

CREATE POLICY "See conversation members" ON conversation_members
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.profile_id = auth.uid())
  );

CREATE POLICY "See messages in my conversations" ON messages
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid())
  );

CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS — own only
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "See own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- SAFETY, AUDIT, MISC
-- ═══════════════════════════════════════════════════════════════════════
CREATE POLICY "Insert own safety check" ON safety_checks
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "See safety checks" ON safety_checks
  FOR SELECT USING (
    profile_id = auth.uid() OR is_admin_role()
    OR (my_role() = 'supervisor' AND is_assigned_to_project(project_id))
  );

CREATE POLICY "Admin see audit log" ON audit_log
  FOR SELECT USING (is_admin_role() AND company_id = my_company_id());

CREATE POLICY "Insert audit log" ON audit_log
  FOR INSERT WITH CHECK (company_id = my_company_id());

CREATE POLICY "See role permissions" ON role_permissions
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "Owner manage permissions" ON role_permissions
  FOR ALL USING (my_role() = 'owner' AND company_id = my_company_id());

CREATE POLICY "See client orgs" ON client_orgs
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "Admin manage client orgs" ON client_orgs
  FOR ALL USING (is_admin_role() AND company_id = my_company_id());

CREATE POLICY "See expenses" ON expenses
  FOR SELECT USING (is_admin_role() OR is_assigned_to_project(project_id));

CREATE POLICY "Admin manage expenses" ON expenses
  FOR ALL USING (is_admin_role());

CREATE POLICY "See templates" ON project_templates
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "Owner manage templates" ON project_templates
  FOR ALL USING (my_role() = 'owner' AND company_id = my_company_id());

CREATE POLICY "See recurring tasks" ON recurring_tasks
  FOR SELECT USING (company_id = my_company_id());

CREATE POLICY "Admin manage recurring tasks" ON recurring_tasks
  FOR ALL USING (is_admin_role() AND company_id = my_company_id());
