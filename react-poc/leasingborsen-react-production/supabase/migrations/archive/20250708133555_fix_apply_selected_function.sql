-- Fix the apply_selected_extraction_changes function to properly handle the listings table structure
-- The listings table uses ID references (make_id, model_id) not text values

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
  v_make_id UUID;
  v_model_id UUID;
  v_body_type_id UUID;
  v_fuel_type_id UUID;
  v_transmission_id UUID;
BEGIN
  -- Check if applied_by column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'extraction_listing_changes' 
    AND column_name = 'applied_by'
  ) THEN
    -- Update selected changes to 'applied' status with applied_by
    UPDATE extraction_listing_changes 
    SET 
      change_status = 'applied',
      reviewed_at = NOW(),
      applied_by = p_applied_by
    WHERE session_id = p_session_id 
      AND id = ANY(p_selected_change_ids)
      AND change_status = 'pending';
    
    -- Update non-selected changes to 'discarded' status with applied_by
    UPDATE extraction_listing_changes 
    SET 
      change_status = 'discarded',
      reviewed_at = NOW(),
      applied_by = p_applied_by
    WHERE session_id = p_session_id 
      AND NOT (id = ANY(p_selected_change_ids))
      AND change_status = 'pending';
  ELSE
    -- Update without applied_by column
    UPDATE extraction_listing_changes 
    SET 
      change_status = 'applied',
      reviewed_at = NOW()
    WHERE session_id = p_session_id 
      AND id = ANY(p_selected_change_ids)
      AND change_status = 'pending';
    
    UPDATE extraction_listing_changes 
    SET 
      change_status = 'discarded',
      reviewed_at = NOW()
    WHERE session_id = p_session_id 
      AND NOT (id = ANY(p_selected_change_ids))
      AND change_status = 'pending';
  END IF;
  
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
      -- Look up reference IDs from text values
      SELECT id INTO v_make_id FROM makes WHERE LOWER(name) = LOWER(extraction_data->>'make');
      SELECT id INTO v_model_id FROM models WHERE LOWER(name) = LOWER(extraction_data->>'model') AND make_id = v_make_id;
      SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(name) = LOWER(extraction_data->>'body_type');
      SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(name) = LOWER(extraction_data->>'fuel_type');
      SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(name) = LOWER(extraction_data->>'transmission');
      
      -- Insert new listing with ID references
      INSERT INTO listings (
        seller_id,
        make_id,
        model_id,
        variant,
        engine_info,
        horsepower,
        fuel_type_id,
        transmission_id,
        body_type_id,
        seats,
        doors,
        year,
        mileage,
        colour,
        created_at,
        updated_at
      )
      SELECT 
        (SELECT seller_id FROM extraction_sessions WHERE id = p_session_id),
        v_make_id,
        v_model_id,
        extraction_data->>'variant',
        extraction_data->>'engine_info',
        CASE WHEN extraction_data->>'horsepower' IS NOT NULL 
          THEN (extraction_data->>'horsepower')::INTEGER 
          ELSE NULL END,
        v_fuel_type_id,
        v_transmission_id,
        v_body_type_id,
        CASE WHEN extraction_data->>'seats' IS NOT NULL 
          THEN (extraction_data->>'seats')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'doors' IS NOT NULL 
          THEN (extraction_data->>'doors')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'year' IS NOT NULL 
          THEN (extraction_data->>'year')::INTEGER 
          ELSE NULL END,
        CASE WHEN extraction_data->>'mileage' IS NOT NULL 
          THEN (extraction_data->>'mileage')::INTEGER 
          ELSE NULL END,
        extraction_data->>'colour',
        NOW(),
        NOW()
      RETURNING id INTO new_listing_id;
      
      -- Insert lease pricing data if available
      IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
        INSERT INTO lease_pricing (
          listing_id,
          monthly_price,
          first_payment,
          duration_months,
          mileage_per_year,
          created_at,
          updated_at
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
          NOW(),
          NOW()
        FROM jsonb_array_elements(extraction_data->'offers') AS offer;
      END IF;
      
      applied_creates := applied_creates + 1;
      
    -- Process UPDATE changes
    ELSIF change_record.change_type = 'update' AND existing_listing_id IS NOT NULL THEN
      -- Look up reference IDs if they are being updated
      IF extraction_data ? 'make' THEN
        SELECT id INTO v_make_id FROM makes WHERE LOWER(name) = LOWER(extraction_data->>'make');
      END IF;
      IF extraction_data ? 'model' THEN
        SELECT id INTO v_model_id FROM models WHERE LOWER(name) = LOWER(extraction_data->>'model') 
          AND make_id = COALESCE(v_make_id, (SELECT make_id FROM listings WHERE id = existing_listing_id));
      END IF;
      IF extraction_data ? 'body_type' THEN
        SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(name) = LOWER(extraction_data->>'body_type');
      END IF;
      IF extraction_data ? 'fuel_type' THEN
        SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(name) = LOWER(extraction_data->>'fuel_type');
      END IF;
      IF extraction_data ? 'transmission' THEN
        SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(name) = LOWER(extraction_data->>'transmission');
      END IF;
      
      -- Update existing listing
      UPDATE listings SET
        make_id = COALESCE(v_make_id, make_id),
        model_id = COALESCE(v_model_id, model_id),
        variant = COALESCE(extraction_data->>'variant', variant),
        engine_info = COALESCE(extraction_data->>'engine_info', engine_info),
        horsepower = CASE WHEN extraction_data->>'horsepower' IS NOT NULL 
          THEN (extraction_data->>'horsepower')::INTEGER 
          ELSE horsepower END,
        fuel_type_id = COALESCE(v_fuel_type_id, fuel_type_id),
        transmission_id = COALESCE(v_transmission_id, transmission_id),
        body_type_id = COALESCE(v_body_type_id, body_type_id),
        seats = CASE WHEN extraction_data->>'seats' IS NOT NULL 
          THEN (extraction_data->>'seats')::INTEGER 
          ELSE seats END,
        doors = CASE WHEN extraction_data->>'doors' IS NOT NULL 
          THEN (extraction_data->>'doors')::INTEGER 
          ELSE doors END,
        year = CASE WHEN extraction_data->>'year' IS NOT NULL 
          THEN (extraction_data->>'year')::INTEGER 
          ELSE year END,
        mileage = CASE WHEN extraction_data->>'mileage' IS NOT NULL 
          THEN (extraction_data->>'mileage')::INTEGER 
          ELSE mileage END,
        colour = COALESCE(extraction_data->>'colour', colour),
        updated_at = NOW()
      WHERE id = existing_listing_id;
      
      -- Update offers (replace all existing offers)
      IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
        -- Delete existing lease pricing
        DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
        
        -- Insert new lease pricing
        INSERT INTO lease_pricing (
          listing_id,
          monthly_price,
          first_payment,
          duration_months,
          mileage_per_year,
          created_at,
          updated_at
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
          NOW(),
          NOW()
        FROM jsonb_array_elements(extraction_data->'offers') AS offer;
      END IF;
      
      applied_updates := applied_updates + 1;
      
    -- Process DELETE changes
    ELSIF change_record.change_type = 'delete' AND existing_listing_id IS NOT NULL THEN
      -- IMPORTANT: Delete all references to this listing first to avoid foreign key constraint violations
      
      -- Delete any extraction_listing_changes that reference this listing
      -- (except the current record which we're processing)
      DELETE FROM extraction_listing_changes 
      WHERE existing_listing_id = change_record.existing_listing_id 
        AND id != change_record.id;
      
      -- Delete price change logs if they exist
      DELETE FROM price_change_log WHERE listing_id = existing_listing_id;
      
      -- Delete lease pricing data
      DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
      
      -- Delete the listing
      DELETE FROM listings WHERE id = existing_listing_id;
      
      applied_deletes := applied_deletes + 1;
    END IF;
  END LOOP;
  
  -- Update the session status with applied_by if column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'extraction_sessions' 
    AND column_name = 'applied_by'
  ) THEN
    UPDATE extraction_sessions 
    SET 
      status = 'completed',
      applied_at = NOW(),
      applied_by = p_applied_by
    WHERE id = p_session_id;
  ELSE
    UPDATE extraction_sessions 
    SET 
      status = 'completed',
      applied_at = NOW()
    WHERE id = p_session_id;
  END IF;
  
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
COMMENT ON FUNCTION apply_selected_extraction_changes IS 'Apply only selected changes from an extraction session and mark others as discarded. Properly handles ID lookups for reference tables and foreign key constraints when deleting listings.';