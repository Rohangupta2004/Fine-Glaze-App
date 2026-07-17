-- Make project_id optional for personal tasks assigned by admins
ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;
