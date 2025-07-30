-- Add missing columns to lease_pricing table for staging environment

-- Add ownership_fee column
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS ownership_fee DECIMAL(10, 2);

-- Add overage_fee_per_km column
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS overage_fee_per_km DECIMAL(10, 2);

-- Add maintenance and service columns
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS large_maintenance_included BOOLEAN DEFAULT false;

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS small_maintenance_included BOOLEAN DEFAULT false;

ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS replacement_car_included BOOLEAN DEFAULT false;

-- Add insurance_included column
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT false;

-- Add tire_included column
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS tire_included BOOLEAN DEFAULT false;

-- Verify all columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lease_pricing'
ORDER BY ordinal_position;