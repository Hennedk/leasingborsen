-- Add missing administrative_fee column to lease_pricing table

-- Add the administrative_fee column if it doesn't exist
ALTER TABLE lease_pricing 
ADD COLUMN IF NOT EXISTS administrative_fee DECIMAL(10, 2);

-- Update the full_listing_view to include the new column
-- This ensures the view reflects the updated schema
DROP VIEW IF EXISTS full_listing_view;

-- Recreate the view with all columns including administrative_fee
-- (This will need to be adjusted based on your exact view definition)
-- The view creation should match your existing view structure

-- Note: You may need to recreate the full_listing_view with the exact definition
-- from your production database. This is a placeholder to indicate the need.