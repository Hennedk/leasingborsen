-- Create missing PostgreSQL function for applying selected extraction changes
-- This function is required for the MVP streamlined workflow in ExtractionSessionReview

CREATE OR REPLACE FUNCTION apply_selected_extraction_changes(
  p_session_id UUID,
  p_selected_change_ids UUID[],
  p_applied_by TEXT DEFAULT 'admin'
)
RETURNS JSON AS $$
DECLARE
  change_record RECORD;
  applied_creates INTEGER := 0;
  applied_updates INTEGER := 0;
  applied_deletes INTEGER := 0;
  discarded_count INTEGER := 0;
  total_processed INTEGER := 0;
  extraction_data JSONB;
  existing_listing_id UUID;
  new_listing_id UUID;
  result JSON;
BEGIN
  -- Update selected changes to 'applied' status
  UPDATE extraction_listing_changes 
  SET 
    change_status = 'applied',
    reviewed_at = NOW(),
    applied_by = p_applied_by
  WHERE session_id = p_session_id 
    AND id = ANY(p_selected_change_ids)
    AND change_status = 'pending';
  
  -- Update non-selected changes to 'discarded' status
  UPDATE extraction_listing_changes 
  SET 
    change_status = 'discarded',
    reviewed_at = NOW(),
    applied_by = p_applied_by
  WHERE session_id = p_session_id 
    AND NOT (id = ANY(p_selected_change_ids))
    AND change_status = 'pending';
  
  GET DIAGNOSTICS discarded_count = ROW_COUNT;
  
  -- Process each selected change
  FOR change_record IN 
    SELECT * FROM extraction_listing_changes 
    WHERE session_id = p_session_id 
      AND id = ANY(p_selected_change_ids)
      AND change_status = 'applied'
  LOOP
    total_processed := total_processed + 1;
    extraction_data := change_record.extracted_data;
    existing_listing_id := change_record.existing_listing_id;
    
    -- Process CREATE changes
    IF change_record.change_type = 'create' THEN
      -- Insert new listing
      INSERT INTO listings (
        seller_id,
        make,
        model,
        variant,
        engine_info,
        horsepower,
        fuel_type,
        transmission,
        body_type,
        seats,
        doors,
        year,
        wltp,
        co2_emission,
        consumption_l_100km,
        consumption_kwh_100km,
        co2_tax_half_year,
        created_at,
        updated_at
      )
      SELECT 
        (SELECT seller_id FROM extraction_sessions WHERE id = p_session_id),
        extraction_data->>'make',
        extraction_data->>'model',
        extraction_data->>'variant',
        extraction_data->>'engine_info',
        CASE WHEN extraction_data->>'horsepower' IS NOT NULL 
          THEN (extraction_data->>'horsepower')::INTEGER 
          ELSE NULL END,
        extraction_data->>'fuel_type',
        extraction_data->>'transmission',
        extraction_data->>'body_type',
        CASE WHEN extraction_data->>'seats' IS NOT NULL 
          THEN (extraction_data->>'seats')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'doors' IS NOT NULL 
          THEN (extraction_data->>'doors')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'year' IS NOT NULL 
          THEN (extraction_data->>'year')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'wltp' IS NOT NULL 
          THEN (extraction_data->>'wltp')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'co2_emission' IS NOT NULL 
          THEN (extraction_data->>'co2_emission')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'consumption_l_100km' IS NOT NULL 
          THEN (extraction_data->>'consumption_l_100km')::DECIMAL 
          ELSE NULL END,
        CASE WHEN extraction_data->>'consumption_kwh_100km' IS NOT NULL 
          THEN (extraction_data->>'consumption_kwh_100km')::DECIMAL 
          ELSE NULL END,
        CASE WHEN extraction_data->>'co2_tax_half_year' IS NOT NULL 
          THEN (extraction_data->>'co2_tax_half_year')::DECIMAL 
          ELSE NULL END,
        NOW(),
        NOW()
      RETURNING id INTO new_listing_id;
      
      -- Insert offers for new listing
      IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
        INSERT INTO listing_offers (
          listing_id,
          monthly_price,
          first_payment,
          period_months,
          mileage_per_year,
          created_at
        )
        SELECT 
          new_listing_id,
          (offer->>'monthly_price')::DECIMAL,
          CASE WHEN offer->>'first_payment' IS NOT NULL 
            THEN (offer->>'first_payment')::DECIMAL 
            ELSE NULL END,
          CASE WHEN offer->>'period_months' IS NOT NULL 
            THEN (offer->>'period_months')::INTEGER 
            ELSE NULL END,
          CASE WHEN offer->>'mileage_per_year' IS NOT NULL 
            THEN (offer->>'mileage_per_year')::INTEGER 
            ELSE NULL END,
          NOW()
        FROM jsonb_array_elements(extraction_data->'offers') AS offer;
      END IF;
      
      applied_creates := applied_creates + 1;
      
    -- Process UPDATE changes
    ELSIF change_record.change_type = 'update' AND existing_listing_id IS NOT NULL THEN
      -- Update existing listing
      UPDATE listings SET
        make = COALESCE(extraction_data->>'make', make),
        model = COALESCE(extraction_data->>'model', model),
        variant = COALESCE(extraction_data->>'variant', variant),
        engine_info = COALESCE(extraction_data->>'engine_info', engine_info),
        horsepower = CASE WHEN extraction_data->>'horsepower' IS NOT NULL 
          THEN (extraction_data->>'horsepower')::INTEGER 
          ELSE horsepower END,
        fuel_type = COALESCE(extraction_data->>'fuel_type', fuel_type),
        transmission = COALESCE(extraction_data->>'transmission', transmission),
        body_type = COALESCE(extraction_data->>'body_type', body_type),
        seats = CASE WHEN extraction_data->>'seats' IS NOT NULL 
          THEN (extraction_data->>'seats')::INTEGER 
          ELSE seats END,
        doors = CASE WHEN extraction_data->>'doors' IS NOT NULL 
          THEN (extraction_data->>'doors')::INTEGER 
          ELSE doors END,
        year = CASE WHEN extraction_data->>'year' IS NOT NULL 
          THEN (extraction_data->>'year')::INTEGER 
          ELSE year END,
        wltp = CASE WHEN extraction_data->>'wltp' IS NOT NULL 
          THEN (extraction_data->>'wltp')::INTEGER 
          ELSE wltp END,
        co2_emission = CASE WHEN extraction_data->>'co2_emission' IS NOT NULL 
          THEN (extraction_data->>'co2_emission')::INTEGER 
          ELSE co2_emission END,
        consumption_l_100km = CASE WHEN extraction_data->>'consumption_l_100km' IS NOT NULL 
          THEN (extraction_data->>'consumption_l_100km')::DECIMAL 
          ELSE consumption_l_100km END,
        consumption_kwh_100km = CASE WHEN extraction_data->>'consumption_kwh_100km' IS NOT NULL 
          THEN (extraction_data->>'consumption_kwh_100km')::DECIMAL 
          ELSE consumption_kwh_100km END,
        co2_tax_half_year = CASE WHEN extraction_data->>'co2_tax_half_year' IS NOT NULL 
          THEN (extraction_data->>'co2_tax_half_year')::DECIMAL 
          ELSE co2_tax_half_year END,
        updated_at = NOW()
      WHERE id = existing_listing_id;
      
      -- Update offers (replace all existing offers)
      IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
        -- Delete existing offers
        DELETE FROM listing_offers WHERE listing_id = existing_listing_id;
        
        -- Insert new offers
        INSERT INTO listing_offers (
          listing_id,
          monthly_price,
          first_payment,
          period_months,
          mileage_per_year,
          created_at
        )
        SELECT 
          existing_listing_id,
          (offer->>'monthly_price')::DECIMAL,
          CASE WHEN offer->>'first_payment' IS NOT NULL 
            THEN (offer->>'first_payment')::DECIMAL 
            ELSE NULL END,
          CASE WHEN offer->>'period_months' IS NOT NULL 
            THEN (offer->>'period_months')::INTEGER 
            ELSE NULL END,
          CASE WHEN offer->>'mileage_per_year' IS NOT NULL 
            THEN (offer->>'mileage_per_year')::INTEGER 
            ELSE NULL END,
          NOW()
        FROM jsonb_array_elements(extraction_data->'offers') AS offer;
      END IF;
      
      applied_updates := applied_updates + 1;
      
    -- Process DELETE changes
    ELSIF change_record.change_type = 'delete' AND existing_listing_id IS NOT NULL THEN
      -- Delete the listing (offers will be deleted by CASCADE)
      DELETE FROM listings WHERE id = existing_listing_id;
      applied_deletes := applied_deletes + 1;
    END IF;
  END LOOP;
  
  -- Update the session status
  UPDATE extraction_sessions 
  SET 
    status = 'completed',
    applied_at = NOW(),
    applied_by = p_applied_by
  WHERE id = p_session_id;
  
  -- Return summary
  result := json_build_object(
    'applied_creates', applied_creates,
    'applied_updates', applied_updates,
    'applied_deletes', applied_deletes,
    'discarded_count', discarded_count,
    'total_processed', total_processed,
    'session_id', p_session_id,
    'applied_by', p_applied_by,
    'applied_at', NOW()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error and return failure info
  RAISE NOTICE 'Error applying selected changes: %', SQLERRM;
  
  result := json_build_object(
    'error', SQLERRM,
    'applied_creates', applied_creates,
    'applied_updates', applied_updates,
    'applied_deletes', applied_deletes,
    'discarded_count', discarded_count,
    'total_processed', total_processed
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION apply_selected_extraction_changes IS 'Apply only selected changes from an extraction session and mark others as discarded';