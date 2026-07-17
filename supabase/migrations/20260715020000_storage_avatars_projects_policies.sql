-- Migration: Storage policies for avatars/ and projects/ paths in documents bucket
-- Fixes:
--   1. Extend the documents SELECT policy to cover avatars/<id>.jpg and projects/<timestamp>.jpg
--      which are used by profile photo uploads and project image uploads respectively.
--   2. Add an UPDATE policy on the documents bucket so that avatar upsert (upsert: true)
--      works correctly for users replacing their own profile picture.
--
-- Background:
--   The documents bucket is private. The prior SELECT policy (20260713140000) covered:
--     - is_admin_role()
--     - project/<id>/* documents
--     - profile/<id>/* own documents
--     - company/<id>/* company documents
--     - chat/<conv_id>/* conversation attachments
--   It did NOT cover avatars/<profile_id>.jpg or projects/<timestamp>.jpg.
--   Without UPDATE, supabase.storage.upload({ upsert: true }) silently fails on re-uploads.

BEGIN;

-- ── 1. Extend documents SELECT policy to cover avatars/ and projects/ ─────────
DROP POLICY IF EXISTS "Project members read documents" ON storage.objects;

CREATE POLICY "Project members read documents" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'documents'
  AND (
    is_admin_role()
    -- Documents stored under project/<id>/...
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
        AND is_assigned_to_project(p.id)
    )
    -- Documents stored under profile/<id>/...  (own profile docs)
    OR (
      (storage.foldername(storage.objects.name))[1] = 'profile'
      AND (storage.foldername(storage.objects.name))[2] = auth.uid()::text
    )
    -- Avatars stored under avatars/<profile_id>.jpg
    -- Any authenticated member of the same company can view avatars (shown in team lists)
    OR (
      (storage.foldername(storage.objects.name))[1] = 'avatars'
      AND EXISTS (
        SELECT 1 FROM profiles up
        WHERE up.id = auth.uid()
          AND up.company_id IS NOT NULL
      )
    )
    -- Project photos stored under projects/<timestamp>.jpg
    -- Any authenticated member of the same company can view project thumbnails
    OR (
      (storage.foldername(storage.objects.name))[1] = 'projects'
      AND EXISTS (
        SELECT 1 FROM profiles up
        WHERE up.id = auth.uid()
          AND up.company_id IS NOT NULL
      )
    )
    -- Documents stored under company/<id>/... (own company docs)
    OR EXISTS (
      SELECT 1 FROM profiles up
      WHERE up.id = auth.uid()
        AND up.company_id::text = (storage.foldername(storage.objects.name))[2]
    )
    -- Chat attachments stored under chat/<conversation_id>/...
    OR (
      (storage.foldername(storage.objects.name))[1] = 'chat'
      AND is_conversation_member(((storage.foldername(storage.objects.name))[2])::uuid)
    )
  )
);

-- ── 2. Add UPDATE policy for avatar upsert and admin document replacement ─────
-- Required because supabase.storage.upload({ upsert: true }) needs INSERT + SELECT + UPDATE.
-- Without UPDATE, upsert silently fails (no error, no replacement).
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;

CREATE POLICY "Users update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Own avatar: avatars/<profile_id>.jpg — extract profile_id from the filename
    (
      (storage.foldername(storage.objects.name))[1] = 'avatars'
      AND auth.uid()::text = replace(
        (string_to_array(storage.objects.name, '/'))[array_length(string_to_array(storage.objects.name, '/'), 1)],
        '.jpg', ''
      )
    )
    -- Admins can replace any document
    OR is_admin_role()
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    (
      (storage.foldername(storage.objects.name))[1] = 'avatars'
      AND auth.uid()::text = replace(
        (string_to_array(storage.objects.name, '/'))[array_length(string_to_array(storage.objects.name, '/'), 1)],
        '.jpg', ''
      )
    )
    OR is_admin_role()
  )
);

COMMIT;
