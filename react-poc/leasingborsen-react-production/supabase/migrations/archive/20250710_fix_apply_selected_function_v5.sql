-- Fix apply_selected_extraction_changes function to properly handle errors and complete updates
-- Removes the EXCEPTION handler inside the loop that was silently catching errors

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
  v_existing_make_id UUID;
  error_count INTEGER := 0;
  error_details JSONB := '[]'::JSONB;
  v_error_msg TEXT;
BEGIN
  -- First, mark selected changes as 'applied' and non-selected as 'discarded'
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
    
    -- Initialize error flag for this iteration
    v_error_msg := NULL;
    
    BEGIN  -- Begin block for each change
      -- Process CREATE changes
      IF change_record.change_type = 'create' THEN
        -- Look up reference IDs from text values
        IF extraction_data ? 'make' AND extraction_data->>'make' IS NOT NULL THEN
          SELECT id INTO v_make_id FROM makes WHERE LOWER(name) = LOWER(extraction_data->>'make');
        END IF;
        
        IF extraction_data ? 'model' AND extraction_data->>'model' IS NOT NULL AND v_make_id IS NOT NULL THEN
          SELECT id INTO v_model_id FROM models WHERE LOWER(name) = LOWER(extraction_data->>'model') AND make_id = v_make_id;
        END IF;
        
        IF extraction_data ? 'body_type' AND extraction_data->>'body_type' IS NOT NULL THEN
          SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(name) = LOWER(extraction_data->>'body_type');
        END IF;
        
        IF extraction_data ? 'fuel_type' AND extraction_data->>'fuel_type' IS NOT NULL THEN
          SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(name) = LOWER(extraction_data->>'fuel_type');
        END IF;
        
        IF extraction_data ? 'transmission' AND extraction_data->>'transmission' IS NOT NULL THEN
          SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(name) = LOWER(extraction_data->>'transmission');
        END IF;
        
        -- Skip if we couldn't find required references
        IF v_make_id IS NULL OR v_model_id IS NULL THEN
          v_error_msg := format('Could not find make or model for %s %s', extraction_data->>'make', extraction_data->>'model');
          RAISE EXCEPTION 'Missing required references: %', v_error_msg;
        END IF;
        
        -- Insert new listing
        INSERT INTO listings (
          seller_id,
          make_id,
          model_id,
          variant,
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
            period_months,
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
          FROM jsonb_array_elements(extraction_data->'offers') AS offer
          ON CONFLICT (listing_id, monthly_price, period_months, mileage_per_year)
          DO UPDATE SET
            first_payment = EXCLUDED.first_payment,
            updated_at = NOW();
        END IF;
        
        applied_creates := applied_creates + 1;
        
      -- Process UPDATE changes
      ELSIF change_record.change_type = 'update' AND existing_listing_id IS NOT NULL THEN
        -- Get the current make_id from the existing listing for model lookup
        SELECT make_id INTO v_existing_make_id FROM listings WHERE id = existing_listing_id;
        
        -- Look up reference IDs if they are being updated
        IF extraction_data ? 'make' AND extraction_data->>'make' IS NOT NULL THEN
          SELECT id INTO v_make_id FROM makes WHERE LOWER(name) = LOWER(extraction_data->>'make');
        END IF;
        
        -- For model lookup, use the new make_id if make was updated, otherwise use existing
        IF extraction_data ? 'model' AND extraction_data->>'model' IS NOT NULL THEN
          SELECT id INTO v_model_id FROM models 
          WHERE LOWER(name) = LOWER(extraction_data->>'model') 
            AND make_id = COALESCE(v_make_id, v_existing_make_id);
        END IF;
        
        IF extraction_data ? 'body_type' AND extraction_data->>'body_type' IS NOT NULL THEN
          SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(name) = LOWER(extraction_data->>'body_type');
        END IF;
        
        IF extraction_data ? 'fuel_type' AND extraction_data->>'fuel_type' IS NOT NULL THEN
          SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(name) = LOWER(extraction_data->>'fuel_type');
        END IF;
        
        IF extraction_data ? 'transmission' AND extraction_data->>'transmission' IS NOT NULL THEN
          SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(name) = LOWER(extraction_data->>'transmission');
        END IF;
        
        -- Update existing listing
        UPDATE listings SET
          make_id = COALESCE(v_make_id, make_id),
          model_id = COALESCE(v_model_id, model_id),
          variant = CASE WHEN extraction_data ? 'variant' THEN extraction_data->>'variant' ELSE variant END,
          horsepower = CASE WHEN extraction_data ? 'horsepower' AND extraction_data->>'horsepower' IS NOT NULL 
            THEN (extraction_data->>'horsepower')::INTEGER 
            ELSE horsepower END,
          fuel_type_id = COALESCE(v_fuel_type_id, fuel_type_id),
          transmission_id = COALESCE(v_transmission_id, transmission_id),
          body_type_id = COALESCE(v_body_type_id, body_type_id),
          seats = CASE WHEN extraction_data ? 'seats' AND extraction_data->>'seats' IS NOT NULL 
            THEN (extraction_data->>'seats')::INTEGER 
            ELSE seats END,
          doors = CASE WHEN extraction_data ? 'doors' AND extraction_data->>'doors' IS NOT NULL 
            THEN (extraction_data->>'doors')::INTEGER 
            ELSE doors END,
          year = CASE WHEN extraction_data ? 'year' AND extraction_data->>'year' IS NOT NULL 
            THEN (extraction_data->>'year')::INTEGER 
            ELSE year END,
          mileage = CASE WHEN extraction_data ? 'mileage' AND extraction_data->>'mileage' IS NOT NULL 
            THEN (extraction_data->>'mileage')::INTEGER 
            ELSE mileage END,
          colour = CASE WHEN extraction_data ? 'colour' THEN extraction_data->>'colour' ELSE colour END,
          updated_at = NOW()
        WHERE id = existing_listing_id;
        
        -- Update offers if present
        IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
          -- Delete existing lease pricing
          DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
          
          -- Insert new lease pricing
          INSERT INTO lease_pricing (
            listing_id,
            monthly_price,
            first_payment,
            period_months,
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
          FROM jsonb_array_elements(extraction_data->'offers') AS offer
          ON CONFLICT (listing_id, monthly_price, period_months, mileage_per_year)
          DO UPDATE SET
            first_payment = EXCLUDED.first_payment,
            updated_at = NOW();
        END IF;
        
        applied_updates := applied_updates + 1;
        
      -- Process DELETE changes
      ELSIF change_record.change_type = 'delete' AND existing_listing_id IS NOT NULL THEN
        -- Delete all references to this listing first
        
        -- Delete any extraction_listing_changes that reference this listing
        DELETE FROM extraction_listing_changes 
        WHERE existing_listing_id = change_record.existing_listing_id 
          AND id != change_record.id;
        
        -- Delete price change logs if they exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_change_log') THEN
          DELETE FROM price_change_log WHERE listing_id = existing_listing_id;
        END IF;
        
        -- Delete lease pricing data
        DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
        
        -- Delete the listing
        DELETE FROM listings WHERE id = existing_listing_id;
        
        applied_deletes := applied_deletes + 1;
      END IF;
      
    EXCEPTION 
      WHEN OTHERS THEN
        -- Capture error for this specific change
        error_count := error_count + 1;
        v_error_msg := SQLERRM;
        
        -- Add error to error details array
        error_details := error_details || jsonb_build_object(
          'change_id', change_record.id,
          'change_type', change_record.change_type,
          'error', v_error_msg,
          'listing_id', COALESCE(existing_listing_id::TEXT, 'new')
        );
        
        -- Mark this change as having an error
        UPDATE extraction_listing_changes
        SET 
          change_status = 'error',
          review_notes = COALESCE(review_notes || E'\n', '') || 'Apply error: ' || v_error_msg
        WHERE id = change_record.id;
        
        -- Continue with next change
    END;  -- End block for each change
  END LOOP;
  
  -- Update the session status
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'extraction_sessions' 
    AND column_name = 'applied_by'
  ) THEN
    UPDATE extraction_sessions 
    SET 
      status = CASE 
        WHEN error_count = 0 THEN 'completed'
        WHEN error_count < total_processed THEN 'completed_with_errors'
        ELSE 'failed'
      END,
      applied_at = NOW(),
      applied_by = p_applied_by
    WHERE id = p_session_id;
  ELSE
    UPDATE extraction_sessions 
    SET 
      status = CASE 
        WHEN error_count = 0 THEN 'completed'
        WHEN error_count < total_processed THEN 'completed_with_errors'
        ELSE 'failed'
      END,
      applied_at = NOW()
    WHERE id = p_session_id;
  END IF;
  
  -- Return detailed summary
  result := json_build_object(
    'applied_creates', applied_creates,
    'applied_updates', applied_updates,
    'applied_deletes', applied_deletes,
    'discarded_count', discarded_count,
    'total_processed', total_processed,
    'error_count', error_count,
    'errors', error_details,
    'session_id', p_session_id,
    'applied_by', p_applied_by,
    'applied_at', NOW()
  );
  
  RETURN result;
  
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION apply_selected_extraction_changes IS 'Apply selected changes from extraction session with proper error handling. Returns detailed results including any errors encountered.';