-- Add processed image fields to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS processed_image_grid TEXT,
ADD COLUMN IF NOT EXISTS processed_image_detail TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Update the full_listing_view to include new fields
-- Note: This assumes full_listing_view exists. If it's a complex view, 
-- you may need to adjust this based on your actual view definition
CREATE OR REPLACE VIEW full_listing_view AS
SELECT 
  l.*,
  l.processed_image_grid,
  l.processed_image_detail,
  l.images,
  -- Include all other fields from the original view
  -- This is a placeholder - adjust based on your actual view
  lp.monthly_price,
  lp.first_payment,
  lp.period_months,
  lp.mileage_per_year,
  s.name as seller_name,
  s.phone as seller_phone,
  s.location as seller_location
FROM listings l
LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
LEFT JOIN sellers s ON l.seller_id = s.id;

-- Add comment explaining the new fields
COMMENT ON COLUMN listings.processed_image_grid IS 'Background-removed image optimized for grid view (800x500px)';
COMMENT ON COLUMN listings.processed_image_detail IS 'Background-removed image optimized for detail view (1600x800px)';
COMMENT ON COLUMN listings.images IS 'Array of all image URLs for the listing';