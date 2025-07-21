-- Update full_listing_view to include lease score fields
-- This migration adds the lease score fields that were added to the listings table in 20250107_add_lease_score.sql

CREATE OR REPLACE VIEW full_listing_view AS
SELECT 
  l.*,
  l.processed_image_grid,
  l.processed_image_detail,
  l.images,
  l.retail_price,
  l.lease_score,
  l.lease_score_calculated_at,
  l.lease_score_breakdown,
  -- Include all other fields from the original view
  lp.monthly_price,
  lp.first_payment,
  lp.period_months,
  lp.mileage_per_year,
  s.name as seller_name,
  s.phone as seller_phone,
  s.address as seller_location
FROM listings l
LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
LEFT JOIN sellers s ON l.seller_id = s.id;

-- Add comment explaining the lease score fields in the view
COMMENT ON VIEW full_listing_view IS 'Denormalized view of listings with lease pricing and seller information, including lease score fields for performance optimization';