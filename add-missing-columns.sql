-- Migration: Add Missing Columns for Admin Tool
-- Run this in your Supabase SQL Editor

-- First, let's check what we have
SELECT 'Current listings columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'listings'
ORDER BY ordinal_position;

-- Add missing columns to listings table (if they don't exist)
-- Using IF NOT EXISTS equivalent for PostgreSQL

-- Add body_type column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'body_type') THEN
        ALTER TABLE listings ADD COLUMN body_type VARCHAR(50) DEFAULT 'Sedan';
        RAISE NOTICE 'Added body_type column';
    END IF;
END $$;

-- Add drive_type column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'drive_type') THEN
        ALTER TABLE listings ADD COLUMN drive_type VARCHAR(50) DEFAULT 'Forhjulstræk';
        RAISE NOTICE 'Added drive_type column';
    END IF;
END $$;

-- Add seats column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'seats') THEN
        ALTER TABLE listings ADD COLUMN seats INTEGER DEFAULT 5;
        RAISE NOTICE 'Added seats column';
    END IF;
END $$;

-- Add horsepower column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'horsepower') THEN
        ALTER TABLE listings ADD COLUMN horsepower INTEGER DEFAULT 0;
        RAISE NOTICE 'Added horsepower column';
    END IF;
END $$;

-- Add image_url column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'image_url') THEN
        ALTER TABLE listings ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column';
    END IF;
END $$;

-- Add description column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'description') THEN
        ALTER TABLE listings ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;
END $$;

-- Check if lease_pricing table exists, if not create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'lease_pricing') THEN
        CREATE TABLE lease_pricing (
            pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            listing_id UUID REFERENCES listings(listing_id) ON DELETE CASCADE,
            monthly_price INTEGER NOT NULL,
            first_payment INTEGER DEFAULT 0,
            mileage_per_year INTEGER DEFAULT 20000,
            period_months INTEGER DEFAULT 36,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        RAISE NOTICE 'Created lease_pricing table';
    END IF;
END $$;

-- Create or update the full_listing_view
CREATE OR REPLACE VIEW full_listing_view AS
SELECT 
  l.*,
  lp.monthly_price,
  lp.first_payment,
  lp.mileage_per_year,
  lp.period_months
FROM listings l
LEFT JOIN lease_pricing lp ON l.listing_id = lp.listing_id;

-- Ensure RLS policies exist (won't error if they already exist)
DO $$ 
BEGIN
    -- Enable RLS on listings
    ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
    
    -- Try to create policy, ignore if exists
    BEGIN
        EXECUTE 'CREATE POLICY "Allow all operations on listings" ON listings FOR ALL USING (true) WITH CHECK (true)';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy already exists on listings table';
    END;
    
    -- Enable RLS on lease_pricing if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'lease_pricing') THEN
        ALTER TABLE lease_pricing ENABLE ROW LEVEL SECURITY;
        
        BEGIN
            EXECUTE 'CREATE POLICY "Allow all operations on lease_pricing" ON lease_pricing FOR ALL USING (true) WITH CHECK (true)';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Policy already exists on lease_pricing table';
        END;
    END IF;
END $$;

-- Final verification
SELECT 'Migration complete! Updated schema:' as status;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'listings'
ORDER BY ordinal_position; 