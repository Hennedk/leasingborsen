-- Check current database schema
-- Run this in your Supabase SQL Editor to see what exists

-- 1. Check if tables exist
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('listings', 'lease_pricing');

-- 2. Check current columns in listings table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'listings'
ORDER BY ordinal_position;

-- 3. Check current columns in lease_pricing table (if exists)
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lease_pricing'
ORDER BY ordinal_position;

-- 4. Check if full_listing_view exists
SELECT 
  table_name, 
  table_type
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'full_listing_view'; 