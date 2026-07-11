-- Fine Glaze COS — Storage buckets + offline media idempotency
BEGIN;

ALTER TABLE dprs ADD COLUMN IF NOT EXISTS offline_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dprs_offline_id ON dprs(offline_id) WHERE offline_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_dpr_media_path ON dpr_media(dpr_id, storage_path);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('attendance-selfies', 'attendance-selfies', false, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('dpr-media', 'dpr-media', true, 26214400, ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']),
  ('documents', 'documents', false, 26214400, NULL),
  ('chat-attachments', 'chat-attachments', false, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own attendance selfies" ON storage.objects;
CREATE POLICY "Users upload own attendance selfies" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'attendance-selfies'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own attendance selfies" ON storage.objects;
CREATE POLICY "Users read own attendance selfies" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'attendance-selfies'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin_role())
);

DROP POLICY IF EXISTS "Assigned users upload DPR media" ON storage.objects;
CREATE POLICY "Assigned users upload DPR media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'dpr-media'
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (is_admin_role() OR is_assigned_to_project(p.id))
  )
);

DROP POLICY IF EXISTS "Authenticated read DPR media" ON storage.objects;
CREATE POLICY "Authenticated read DPR media" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'dpr-media');

DROP POLICY IF EXISTS "Authenticated upload documents" ON storage.objects;
CREATE POLICY "Authenticated upload documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;
CREATE POLICY "Authenticated read documents" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated upload chat attachments" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Authenticated read chat attachments" ON storage.objects;
CREATE POLICY "Authenticated read chat attachments" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'chat-attachments');

COMMIT;
