-- Owners/admin roles can update company settings
DROP POLICY IF EXISTS "Admin update company" ON companies;
CREATE POLICY "Admin update company" ON companies
  FOR UPDATE USING (id = my_company_id() AND is_admin_role());
