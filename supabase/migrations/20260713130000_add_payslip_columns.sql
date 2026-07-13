-- Migration: Add payslip-relevant columns to profiles
-- Needed for export-payslip Edge Function to generate Indian-compliant payslips.
-- All columns are nullable — admin fills them per employee as needed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS esi_number TEXT;

-- Helpful comment for future DBAs
COMMENT ON COLUMN profiles.bank_account IS 'Employee bank account number for salary credit';
COMMENT ON COLUMN profiles.bank_ifsc IS 'IFSC code of employee bank branch';
COMMENT ON COLUMN profiles.pan IS 'Permanent Account Number (income tax)';
COMMENT ON COLUMN profiles.uan IS 'Universal Account Number (EPFO)';
COMMENT ON COLUMN profiles.esi_number IS 'ESI insurance number (if eligible)';

-- Optional: index on PAN/UAN for compliance reporting
CREATE INDEX IF NOT EXISTS idx_profiles_pan ON profiles(pan) WHERE pan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_uan ON profiles(uan) WHERE uan IS NOT NULL;
