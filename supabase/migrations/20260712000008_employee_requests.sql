-- ═══════════════════════════════════════════════════════════════════════
-- Employee Requests — supervisor requests staff from admin (no scope
-- beyond what the owner explicitly asked for in the round-4b checklist).
-- Approving a request does not auto-create an account; admin still uses
-- the existing Add Employee wizard — this only tracks the ask/decision.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employee_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES profiles(id),
  role_needed   TEXT NOT NULL CHECK (role_needed IN ('worker', 'supervisor', 'helper')),
  headcount     INTEGER NOT NULL DEFAULT 1 CHECK (headcount > 0),
  needed_by     DATE,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by    UUID REFERENCES profiles(id),
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_requests_company ON employee_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_project ON employee_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_status ON employee_requests(status);

ALTER TABLE employee_requests ENABLE ROW LEVEL SECURITY;

-- Supervisors see and create requests for sites they're assigned to.
DROP POLICY IF EXISTS "Supervisor create employee requests" ON employee_requests;
CREATE POLICY "Supervisor create employee requests" ON employee_requests
  FOR INSERT WITH CHECK (
    company_id = my_company_id()
    AND requested_by = auth.uid()
    AND my_role() = 'supervisor'
    AND is_assigned_to_project(project_id)
  );

-- Admin-experience roles see every request in their company; supervisors see their own.
DROP POLICY IF EXISTS "See employee requests" ON employee_requests;
CREATE POLICY "See employee requests" ON employee_requests
  FOR SELECT USING (
    company_id = my_company_id()
    AND (is_admin_role() OR requested_by = auth.uid())
  );

-- Only admin-experience roles decide (approve/reject).
DROP POLICY IF EXISTS "Admin decide employee requests" ON employee_requests;
CREATE POLICY "Admin decide employee requests" ON employee_requests
  FOR UPDATE USING (company_id = my_company_id() AND is_admin_role());
