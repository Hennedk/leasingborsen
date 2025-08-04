#!/bin/bash

echo "🚀 Setting up images storage bucket in staging environment"
echo "======================================================="
echo ""

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase CLI"
    echo ""
    echo "Please login first:"
    echo "supabase login"
    exit 1
fi

PROJECT_REF="lpbtgtpgbnybjqcpsrrf"

echo "📦 Creating storage bucket via Supabase dashboard SQL..."
echo ""
echo "Since Supabase CLI doesn't support direct bucket creation,"
echo "we'll generate the SQL for you to run in the dashboard."
echo ""

# Create the SQL file
cat > setup-staging-storage-complete.sql << 'EOF'
-- Complete setup for images storage bucket in staging
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Create the images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images', 
  'images', 
  true,  -- Public bucket for car images
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 2: Create RLS policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public to view images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update images" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete images" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

  CREATE POLICY "Allow public to view images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'images');

  CREATE POLICY "Allow authenticated users to update images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'images');

  CREATE POLICY "Allow authenticated users to delete images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'images');
END $$;

-- Step 3: Verify the bucket was created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'images';

-- Step 4: Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%images%'
ORDER BY policyname;

-- Expected folder structure (created automatically when files are uploaded):
-- /images/
--   /background-removal/
--     /originals/
--     /processed/
--     /grid/
--     /detail/
--   /listings/
--   /sellers/
EOF

echo "✅ SQL file created: setup-staging-storage-complete.sql"
echo ""
echo "📋 Instructions:"
echo "1. Go to https://app.supabase.com/project/$PROJECT_REF/sql/new"
echo "2. Copy and paste the contents of setup-staging-storage-complete.sql"
echo "3. Click 'Run' to execute the SQL"
echo ""
echo "🔍 After running the SQL, you should see:"
echo "- 1 row showing the 'images' bucket details"
echo "- 4 rows showing the RLS policies"
echo ""
echo "📱 Alternative: Direct link to SQL editor"
echo "https://app.supabase.com/project/$PROJECT_REF/sql/new"
echo ""
echo "After setup, you can test with:"
echo "node test-remove-bg.js test-car.jpg"