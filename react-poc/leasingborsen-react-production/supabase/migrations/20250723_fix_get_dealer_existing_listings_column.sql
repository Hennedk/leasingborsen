-- Fix column reference in get_dealer_existing_listings function
-- Change flv.listing_id to flv.id to match the actual column in full_listing_view
-- This fixes the "column flv.listing_id does not exist" error during PDF extraction

CREATE OR REPLACE FUNCTION get_dealer_existing_listings(seller_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'existing_listings', json_agg(
      json_build_object(
        'listing_id', flv.id,
        'make', flv.make,
        'model', flv.model,
        'variant', flv.variant,
        'horsepower', flv.horsepower,
        'fuel_type', flv.fuel_type,
        'transmission', flv.transmission,
        'body_type', flv.body_type,
        'monthly_price', flv.monthly_price,
        'year', flv.year,
        'wltp', flv.wltp,
        'co2_emission', flv.co2_emission
      ) ORDER BY flv.make, flv.model, flv.variant
    )
  ) INTO result
  FROM full_listing_view flv
  WHERE flv.seller_id = seller_id_param;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_dealer_existing_listings TO authenticated, service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION get_dealer_existing_listings IS 'Gets all existing listings for a dealer/seller. Fixed in 20250723 to use flv.id instead of flv.listing_id to match the actual column structure in full_listing_view.';