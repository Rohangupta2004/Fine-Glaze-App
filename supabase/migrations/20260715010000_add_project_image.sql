-- Add image_url to projects table to support custom project photo uploads
ALTER TABLE projects ADD COLUMN IF NOT EXISTS image_url TEXT;
