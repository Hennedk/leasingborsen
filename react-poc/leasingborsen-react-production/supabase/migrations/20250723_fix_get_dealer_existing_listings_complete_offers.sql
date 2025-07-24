-- Fix get_dealer_existing_listings to return complete offer arrays
-- This fixes the AI extraction issue where offers were being switched around
-- The AI expects offers in format: [monthly_price, down_payment, months, km_per_year, total_price]
-- Previously the function was returning [monthly_price, null, null, null, null] which confused the AI

CREATE OR REPLACE FUNCTION get_dealer_existing_listings(seller_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'existing_listings', json_agg(
      json_build_object(
        'listing_id', listing_data.id,
        'make', listing_data.make,
        'model', listing_data.model,
        'variant', listing_data.variant,
        'horsepower', listing_data.horsepower,
        'fuel_type', listing_data.fuel_type,
        'transmission', listing_data.transmission,
        'body_type', listing_data.body_type,
        'year', listing_data.year,
        'wltp', listing_data.wltp,
        'co2_emission', listing_data.co2_emission,
        'offers', listing_data.offers
      ) ORDER BY listing_data.make, listing_data.model, listing_data.variant
    )
  ) INTO result
  FROM (
    SELECT DISTINCT ON (l.id)
      l.id, l.make, l.model, l.variant, l.horsepower, l.fuel_type, l.transmission, 
      l.body_type, l.year, l.wltp, l.co2_emission,
      -- Aggregate all offers for this listing from lease_pricing table
      COALESCE(
        (
          SELECT json_agg(
            json_build_array(
              lp.monthly_price,
              COALESCE(lp.first_payment, 0),
              COALESCE(lp.period_months, 36),
              COALESCE(lp.mileage_per_year, 15000),
              CASE 
                WHEN lp.monthly_price IS NOT NULL AND lp.period_months IS NOT NULL 
                THEN (lp.monthly_price * lp.period_months) + COALESCE(lp.first_payment, 0)
                ELSE NULL
              END
            )
            ORDER BY lp.monthly_price ASC
          )
          FROM lease_pricing lp 
          WHERE lp.listing_id = l.id
        ),
        -- Fallback for direct pricing data from full_listing_view
        json_build_array(
          json_build_array(
            l.monthly_price,
            COALESCE(l.first_payment, 0),
            COALESCE(l.period_months, 36),
            COALESCE(l.mileage_per_year, 15000),
            CASE 
              WHEN l.monthly_price IS NOT NULL AND l.period_months IS NOT NULL 
              THEN (l.monthly_price * l.period_months) + COALESCE(l.first_payment, 0)
              ELSE NULL
            END
          )
        )
      ) as offers
    FROM full_listing_view l
    WHERE l.seller_id = seller_id_param
  ) as listing_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_dealer_existing_listings TO authenticated, service_role;

-- Add comment explaining the complete fix
COMMENT ON FUNCTION get_dealer_existing_listings IS 'Gets all existing listings for a dealer/seller with complete offer arrays. Fixed in 20250723 to return proper offers format [monthly_price, down_payment, months, km_per_year, total_price] instead of incomplete data with nulls. This prevents AI from switching around offers during extraction.';