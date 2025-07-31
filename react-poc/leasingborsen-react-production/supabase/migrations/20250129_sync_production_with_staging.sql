-- Migration to sync production with staging environment
-- IMPORTANT: Review carefully before applying to production!

-- ============================================
-- 1. LEASE_PRICING TABLE - Add missing columns
-- ============================================

-- Add administrative and fee columns
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS administrative_fee DECIMAL(10, 2);

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS ownership_fee DECIMAL(10, 2);

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS overage_fee_per_km DECIMAL(10, 2);

-- Add service inclusion columns
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS large_maintenance_included BOOLEAN DEFAULT false;

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS small_maintenance_included BOOLEAN DEFAULT false;

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS replacement_car_included BOOLEAN DEFAULT false;

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT false;

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS tire_included BOOLEAN DEFAULT false;

-- ============================================
-- 2. SELLERS TABLE - Add updated_at column
-- ============================================

ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to set updated_at
UPDATE sellers 
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

-- ============================================
-- 3. TRIGGERS - Add missing trigger
-- ============================================

-- Ensure the trigger function exists (it should already exist in production)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the missing trigger for sellers
DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at
    BEFORE UPDATE ON sellers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. CLEAN UP - Remove duplicate triggers
-- ============================================

-- Check for duplicate pricing_score_stale triggers
DO $$
DECLARE
    trigger_count INTEGER;
    trigger_rec RECORD;
BEGIN
    -- Count duplicate triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'pricing_score_stale'
      AND event_object_table = 'lease_pricing'
      AND trigger_schema = 'public';
    
    -- If more than one exists, drop all and recreate one
    IF trigger_count > 1 THEN
        -- Drop all instances
        FOR trigger_rec IN 
            SELECT trigger_name, event_manipulation, action_timing
            FROM information_schema.triggers
            WHERE trigger_name = 'pricing_score_stale'
              AND event_object_table = 'lease_pricing'
              AND trigger_schema = 'public'
        LOOP
            EXECUTE format('DROP TRIGGER IF EXISTS pricing_score_stale ON lease_pricing');
        END LOOP;
        
        -- Note: You'll need to recreate the single trigger here if needed
        -- The exact trigger definition depends on your lease score implementation
    END IF;
END $$;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Verify lease_pricing columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lease_pricing'
  AND column_name IN (
    'administrative_fee', 'ownership_fee', 'overage_fee_per_km',
    'large_maintenance_included', 'small_maintenance_included',
    'replacement_car_included', 'insurance_included', 'tire_included'
  )
ORDER BY column_name;

-- Verify sellers updated_at column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'sellers'
  AND column_name = 'updated_at';

-- Verify triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('update_sellers_updated_at', 'pricing_score_stale')
ORDER BY trigger_name;