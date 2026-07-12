-- Round 4b: document upload for staff & clients, client material visibility

-- Staff (non-client) can add documents & versions in their company
DROP POLICY IF EXISTS "Staff insert documents" ON documents;
CREATE POLICY "Staff insert documents" ON documents
  FOR INSERT WITH CHECK (
    company_id = my_company_id() AND my_role() <> 'client'
  );

-- Clients can upload documents to their own org's projects
DROP POLICY IF EXISTS "Client insert project documents" ON documents;
CREATE POLICY "Client insert project documents" ON documents
  FOR INSERT WITH CHECK (
    my_role() = 'client'
    AND company_id = my_company_id()
    AND owner_type = 'project'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = owner_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  );

-- Anyone in the company can add a version to a document they can see
-- (documents SELECT policy already scopes to company)
DROP POLICY IF EXISTS "Insert document versions" ON document_versions;
CREATE POLICY "Insert document versions" ON document_versions
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_id AND d.company_id = my_company_id()
    )
  );

-- Clients can view material requests & deliveries on their org's projects (read-only)
DROP POLICY IF EXISTS "Client see project material requests" ON material_requests;
CREATE POLICY "Client see project material requests" ON material_requests
  FOR SELECT USING (
    my_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Client see project deliveries" ON deliveries;
CREATE POLICY "Client see project deliveries" ON deliveries
  FOR SELECT USING (
    my_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Client see project materials" ON materials;
CREATE POLICY "Client see project materials" ON materials
  FOR SELECT USING (
    my_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.client_org_id = my_client_org_id()
        AND my_client_org_id() IS NOT NULL
    )
  );
