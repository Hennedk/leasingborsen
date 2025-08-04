-- Setup storage buckets for staging environment
-- Run this in the Supabase dashboard SQL editor for the staging project

-- Create the images bucket (public access for car images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images', 
  'images', 
  true,  -- Public bucket
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the images bucket
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

-- Allow public to view images
CREATE POLICY "Allow public to view images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');

-- Allow authenticated users to update their own images
CREATE POLICY "Allow authenticated users to update images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'images');

-- Create folder structure
-- Note: Folders in Supabase Storage are created automatically when files are uploaded
-- These are just placeholders to show the expected structure:
-- /images/
--   /background-removal/
--     /originals/
--     /processed/
--     /grid/
--     /detail/
--   /listings/
--   /sellers/