-- Update get_dealer_existing_listings to remove total_price from offers array
-- This implements the total price calculation consistency fix
-- Total price is now calculated dynamically by the system instead of being extracted/stored

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
      -- Aggregate all offers for this listing from lease_pricing table (4 elements only)
      COALESCE(
        (
          SELECT json_agg(
            json_build_array(
              lp.monthly_price,
              COALESCE(lp.first_payment, 0),
              COALESCE(lp.period_months, 36),
              COALESCE(lp.mileage_per_year, 15000)
            )
            ORDER BY lp.monthly_price ASC
          )
          FROM lease_pricing lp 
          WHERE lp.listing_id = l.id
        ),
        -- Fallback for direct pricing data from full_listing_view (4 elements only)
        json_build_array(
          json_build_array(
            l.monthly_price,
            COALESCE(l.first_payment, 0),
            COALESCE(l.period_months, 36),
            COALESCE(l.mileage_per_year, 15000)
          )
        )
      ) as offers
    FROM full_listing_view l
    WHERE l.seller_id = seller_id_param
  ) as listing_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment to reflect the change
COMMENT ON FUNCTION get_dealer_existing_listings IS 'Gets all existing listings for a dealer/seller with complete offer arrays. Updated in 20250724 to return consistent offers format [monthly_price, down_payment, months, km_per_year] without total_price. Total price is calculated dynamically by the system to ensure consistency and eliminate calculation discrepancies between AI extraction and database.';