-- Explore the existing normalized database structure
-- Run this in Supabase SQL Editor to understand the current schema

-- 1. Check the structure of main tables
SELECT 'LISTINGS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'listings'
ORDER BY ordinal_position;

SELECT 'LEASE_PRICING TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'lease_pricing'
ORDER BY ordinal_position;

-- 2. Check reference tables
SELECT 'MAKES TABLE:' as info;
SELECT * FROM makes LIMIT 10;

SELECT 'MODELS TABLE:' as info;
SELECT * FROM models LIMIT 10;

SELECT 'BODY_TYPES TABLE:' as info;
SELECT * FROM body_types LIMIT 10;

SELECT 'FUEL_TYPES TABLE:' as info;
SELECT * FROM fuel_types LIMIT 10;

SELECT 'TRANSMISSIONS TABLE:' as info;
SELECT * FROM transmissions LIMIT 10;

-- 3. Check the full_listing_view structure
SELECT 'FULL_LISTING_VIEW STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'full_listing_view'
ORDER BY ordinal_position;

-- 4. Sample data from full_listing_view
SELECT 'SAMPLE DATA FROM FULL_LISTING_VIEW:' as info;
SELECT * FROM full_listing_view LIMIT 3;

-- 5. Check foreign key relationships
SELECT 'FOREIGN KEY RELATIONSHIPS:' as info;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('listings', 'lease_pricing'); 