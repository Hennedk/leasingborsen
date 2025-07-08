-- Fixed function to detect deletions after extraction (without colour column)
CREATE OR REPLACE FUNCTION detect_extraction_deletions(
  p_session_id UUID,
  p_seller_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  deletion_count INTEGER := 0;
  listing_record RECORD;
BEGIN
  -- Find all active listings for the seller that were NOT matched in this extraction
  FOR listing_record IN
    SELECT 
      l.id as listing_id,
      m.name as make,
      mo.name as model,
      l.variant,
      l.horsepower,
      ft.name as fuel_type,
      t.name as transmission,
      bt.name as body_type,
      l.seats,
      l.doors,
      l.year,
      l.mileage,
      lp.monthly_price
    FROM listings l
    LEFT JOIN makes m ON l.make_id = m.id
    LEFT JOIN models mo ON l.model_id = mo.id
    LEFT JOIN fuel_types ft ON l.fuel_type_id = ft.id
    LEFT JOIN transmissions t ON l.transmission_id = t.id
    LEFT JOIN body_types bt ON l.body_type_id = bt.id
    LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
    WHERE l.seller_id = p_seller_id
      AND NOT EXISTS (
        SELECT 1 
        FROM extraction_listing_changes elc
        WHERE elc.session_id = p_session_id
          AND elc.existing_listing_id = l.id
      )
  LOOP
    -- Create a delete change for each unmatched listing
    INSERT INTO extraction_listing_changes (
      session_id,
      existing_listing_id,
      change_type,
      change_status,
      extracted_data,
      change_summary,
      created_at
    ) VALUES (
      p_session_id,
      listing_record.listing_id,
      'delete',
      'pending',
      json_build_object(
        'make', listing_record.make,
        'model', listing_record.model,
        'variant', listing_record.variant,
        'horsepower', listing_record.horsepower,
        'fuel_type', listing_record.fuel_type,
        'transmission', listing_record.transmission,
        'body_type', listing_record.body_type,
        'seats', listing_record.seats,
        'doors', listing_record.doors,
        'year', listing_record.year,
        'mileage', listing_record.mileage,
        'monthly_price', listing_record.monthly_price
      ),
      'Listing not found in extraction - marked for deletion',
      NOW()
    );
    
    deletion_count := deletion_count + 1;
  END LOOP;
  
  RETURN deletion_count;
END;
$$ LANGUAGE plpgsql;

-- Now run the detection
SELECT detect_extraction_deletions(
  '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'::uuid, 
  (SELECT seller_id FROM extraction_sessions WHERE id = '01ed5ac1-d5cf-40de-8521-4aa23f915f5d'::uuid)
);