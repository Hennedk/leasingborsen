-- Fix full_listing_view to properly aggregate lease_pricing data
-- This resolves the comparison bug where identical extractions are detected as updates
-- because the view returns multiple rows per listing instead of aggregating pricing data

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
  -- Aggregate lease pricing data into JSON array
  COALESCE(
    json_agg(
      json_build_object(
        'monthly_price', lp.monthly_price,
        'first_payment', lp.first_payment,
        'period_months', lp.period_months,
        'mileage_per_year', lp.mileage_per_year
      ) ORDER BY lp.monthly_price
    ) FILTER (WHERE lp.listing_id IS NOT NULL),
    '[]'::json
  ) as lease_pricing,
  -- Keep the first pricing record's fields for backward compatibility
  -- but these should not be used for comparison - use lease_pricing array instead
  MIN(lp.monthly_price) as monthly_price,
  (array_agg(lp.first_payment ORDER BY lp.monthly_price))[1] as first_payment,
  (array_agg(lp.period_months ORDER BY lp.monthly_price))[1] as period_months,
  (array_agg(lp.mileage_per_year ORDER BY lp.monthly_price))[1] as mileage_per_year,
  -- Seller information
  s.name as seller_name,
  s.phone as seller_phone,
  s.address as seller_location
FROM listings l
LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
LEFT JOIN sellers s ON l.seller_id = s.id
GROUP BY 
  l.id, 
  l.make, 
  l.model, 
  l.variant, 
  l.year, 
  l.horsepower, 
  l.fuel_type, 
  l.transmission, 
  l.body_type, 
  l.doors, 
  l.seats, 
  l.wltp, 
  l.co2_emission, 
  l.consumption_l_100km, 
  l.consumption_kwh_100km, 
  l.co2_tax_half_year, 
  l.seller_id, 
  l.created_at, 
  l.updated_at,
  l.processed_image_grid,
  l.processed_image_detail,
  l.images,
  l.retail_price,
  l.lease_score,
  l.lease_score_calculated_at,
  l.lease_score_breakdown,
  s.name,
  s.phone,
  s.address;

-- Add comment explaining the fix
COMMENT ON VIEW full_listing_view IS 'Denormalized view of listings with aggregated lease pricing data as JSON array. This prevents duplicate rows per listing that were causing comparison function bugs where identical data was detected as updates.';

-- Test the fix by verifying a known listing returns exactly 1 row
-- This should return 1 row with a lease_pricing array containing all pricing options
DO $$
DECLARE
  test_listing_id UUID := '9bf521d2-1d52-4d86-ae1a-ef9f59276e48';
  row_count INTEGER;
  pricing_count INTEGER;
BEGIN
  -- Count rows returned for test listing
  SELECT COUNT(*) INTO row_count
  FROM full_listing_view 
  WHERE id = test_listing_id;
  
  -- Count pricing options in the aggregated array
  SELECT json_array_length(lease_pricing) INTO pricing_count
  FROM full_listing_view 
  WHERE id = test_listing_id;
  
  -- Verify the fix
  IF row_count = 1 THEN
    RAISE NOTICE 'SUCCESS: full_listing_view returns exactly 1 row for listing %', test_listing_id;
  ELSE
    RAISE EXCEPTION 'FAILED: full_listing_view returns % rows instead of 1 for listing %', row_count, test_listing_id;
  END IF;
  
  IF pricing_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Aggregated % pricing options in lease_pricing array', pricing_count;
  ELSE
    RAISE WARNING 'No pricing options found in lease_pricing array for listing %', test_listing_id;
  END IF;
  
  RAISE NOTICE 'full_listing_view fix applied successfully!';
END $$;