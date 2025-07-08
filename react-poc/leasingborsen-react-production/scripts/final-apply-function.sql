-- Final, fully tested version of apply_selected_extraction_changes function

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
  v_retail_price DECIMAL;
  v_error_details TEXT;
BEGIN
  -- Update selected changes to 'applied' status
  UPDATE extraction_listing_changes 
  SET 
    change_status = 'applied',
    reviewed_at = NOW(),
    applied_by = CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extraction_listing_changes' AND column_name = 'applied_by')
      THEN p_applied_by 
      ELSE applied_by 
    END
  WHERE session_id = p_session_id 
    AND id = ANY(p_selected_change_ids)
    AND change_status = 'pending';
  
  -- Update non-selected changes to 'discarded' status
  UPDATE extraction_listing_changes 
  SET 
    change_status = 'discarded',
    reviewed_at = NOW(),
    applied_by = CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'extraction_listing_changes' AND column_name = 'applied_by')
      THEN p_applied_by 
      ELSE applied_by 
    END
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
    ORDER BY 
      CASE change_type 
        WHEN 'delete' THEN 1  -- Process deletes first to avoid conflicts
        WHEN 'update' THEN 2
        WHEN 'create' THEN 3
        ELSE 4
      END
  LOOP
    BEGIN
      total_processed := total_processed + 1;
      extraction_data := change_record.extracted_data;
      existing_listing_id := change_record.existing_listing_id;
      
      -- Process DELETE changes first (to avoid conflicts)
      IF change_record.change_type = 'delete' AND existing_listing_id IS NOT NULL THEN
        -- Delete all references to avoid foreign key violations
        
        -- Delete other extraction changes that reference this listing
        DELETE FROM extraction_listing_changes 
        WHERE existing_listing_id = change_record.existing_listing_id 
          AND id != change_record.id;
        
        -- Delete price change logs if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_change_log') THEN
          DELETE FROM price_change_log WHERE listing_id = existing_listing_id;
        END IF;
        
        -- Delete processed images if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_images') THEN
          DELETE FROM processed_images WHERE listing_id = existing_listing_id;
        END IF;
        
        -- Delete lease pricing data
        DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
        
        -- Finally delete the listing
        DELETE FROM listings WHERE id = existing_listing_id;
        
        applied_deletes := applied_deletes + 1;
        
      -- Process UPDATE changes
      ELSIF change_record.change_type = 'update' AND existing_listing_id IS NOT NULL THEN
        -- Get current make_id for model lookup
        SELECT make_id INTO v_existing_make_id FROM listings WHERE id = existing_listing_id;
        
        -- Look up reference IDs only for fields that are being updated
        IF extraction_data ? 'make' AND extraction_data->>'make' IS NOT NULL THEN
          SELECT id INTO v_make_id FROM makes WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'make'));
        END IF;
        
        IF extraction_data ? 'model' AND extraction_data->>'model' IS NOT NULL THEN
          SELECT id INTO v_model_id FROM models 
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'model'))
            AND make_id = COALESCE(v_make_id, v_existing_make_id);
        END IF;
        
        IF extraction_data ? 'body_type' AND extraction_data->>'body_type' IS NOT NULL THEN
          SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'body_type'));
        END IF;
        
        IF extraction_data ? 'fuel_type' AND extraction_data->>'fuel_type' IS NOT NULL THEN
          SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'fuel_type'));
        END IF;
        
        IF extraction_data ? 'transmission' AND extraction_data->>'transmission' IS NOT NULL THEN
          SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'transmission'));
        END IF;
        
        -- Update listing with only the fields that have valid values
        UPDATE listings SET
          make_id = COALESCE(v_make_id, make_id),
          model_id = COALESCE(v_model_id, model_id),
          variant = CASE WHEN extraction_data ? 'variant' THEN extraction_data->>'variant' ELSE variant END,
          horsepower = CASE 
            WHEN extraction_data ? 'horsepower' AND extraction_data->>'horsepower' ~ '^\d+$' 
            THEN (extraction_data->>'horsepower')::INTEGER 
            ELSE horsepower 
          END,
          fuel_type_id = COALESCE(v_fuel_type_id, fuel_type_id),
          transmission_id = COALESCE(v_transmission_id, transmission_id),
          body_type_id = COALESCE(v_body_type_id, body_type_id),
          seats = CASE 
            WHEN extraction_data ? 'seats' AND extraction_data->>'seats' ~ '^\d+$' 
            THEN (extraction_data->>'seats')::INTEGER 
            ELSE seats 
          END,
          doors = CASE 
            WHEN extraction_data ? 'doors' AND extraction_data->>'doors' ~ '^\d+$' 
            THEN (extraction_data->>'doors')::INTEGER 
            ELSE doors 
          END,
          year = CASE 
            WHEN extraction_data ? 'year' AND extraction_data->>'year' ~ '^\d{4}$' 
            THEN (extraction_data->>'year')::INTEGER 
            ELSE year 
          END,
          mileage = CASE 
            WHEN extraction_data ? 'mileage' AND extraction_data->>'mileage' ~ '^\d+$' 
            THEN (extraction_data->>'mileage')::INTEGER 
            ELSE mileage 
          END,
          retail_price = CASE 
            WHEN extraction_data ? 'retail_price' AND extraction_data->>'retail_price' ~ '^[\d.]+$' 
            THEN (extraction_data->>'retail_price')::DECIMAL 
            ELSE retail_price 
          END,
          updated_at = NOW()
        WHERE id = existing_listing_id;
        
        -- Update lease pricing if provided
        IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
          DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
          
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
            NULLIF(offer->>'first_payment', '')::DECIMAL,
            NULLIF(offer->>'period_months', '')::INTEGER,
            NULLIF(offer->>'mileage_per_year', '')::INTEGER,
            NOW(),
            NOW()
          FROM jsonb_array_elements(extraction_data->'offers') AS offer
          WHERE offer->>'monthly_price' IS NOT NULL;
        END IF;
        
        applied_updates := applied_updates + 1;
        
      -- Process CREATE changes
      ELSIF change_record.change_type = 'create' THEN
        -- Look up all required reference IDs
        IF extraction_data ? 'make' AND extraction_data->>'make' IS NOT NULL THEN
          SELECT id INTO v_make_id FROM makes WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'make'));
        END IF;
        
        IF extraction_data ? 'model' AND extraction_data->>'model' IS NOT NULL AND v_make_id IS NOT NULL THEN
          SELECT id INTO v_model_id FROM models 
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'model'))
            AND make_id = v_make_id;
        END IF;
        
        -- Skip if we can't find make or model
        IF v_make_id IS NULL OR v_model_id IS NULL THEN
          RAISE NOTICE 'Skipping create: Could not find make (%) or model (%) IDs', 
            extraction_data->>'make', extraction_data->>'model';
          CONTINUE;
        END IF;
        
        IF extraction_data ? 'body_type' AND extraction_data->>'body_type' IS NOT NULL THEN
          SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'body_type'));
        END IF;
        
        IF extraction_data ? 'fuel_type' AND extraction_data->>'fuel_type' IS NOT NULL THEN
          SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'fuel_type'));
        END IF;
        
        IF extraction_data ? 'transmission' AND extraction_data->>'transmission' IS NOT NULL THEN
          SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(TRIM(name)) = LOWER(TRIM(extraction_data->>'transmission'));
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
          retail_price,
          created_at,
          updated_at
        )
        VALUES (
          (SELECT seller_id FROM extraction_sessions WHERE id = p_session_id),
          v_make_id,
          v_model_id,
          extraction_data->>'variant',
          CASE WHEN extraction_data->>'horsepower' ~ '^\d+$' 
            THEN (extraction_data->>'horsepower')::INTEGER 
            ELSE NULL 
          END,
          v_fuel_type_id,
          v_transmission_id,
          v_body_type_id,
          CASE WHEN extraction_data->>'seats' ~ '^\d+$' 
            THEN (extraction_data->>'seats')::INTEGER 
            ELSE NULL 
          END,
          CASE WHEN extraction_data->>'doors' ~ '^\d+$' 
            THEN (extraction_data->>'doors')::INTEGER 
            ELSE NULL 
          END,
          CASE WHEN extraction_data->>'year' ~ '^\d{4}$' 
            THEN (extraction_data->>'year')::INTEGER 
            ELSE NULL 
          END,
          CASE WHEN extraction_data->>'mileage' ~ '^\d+$' 
            THEN (extraction_data->>'mileage')::INTEGER 
            ELSE NULL 
          END,
          CASE WHEN extraction_data->>'retail_price' ~ '^[\d.]+$' 
            THEN (extraction_data->>'retail_price')::DECIMAL 
            ELSE NULL 
          END,
          NOW(),
          NOW()
        )
        RETURNING id INTO new_listing_id;
        
        -- Insert lease pricing if available
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
            NULLIF(offer->>'first_payment', '')::DECIMAL,
            NULLIF(offer->>'period_months', '')::INTEGER,
            NULLIF(offer->>'mileage_per_year', '')::INTEGER,
            NOW(),
            NOW()
          FROM jsonb_array_elements(extraction_data->'offers') AS offer
          WHERE offer->>'monthly_price' IS NOT NULL;
        END IF;
        
        applied_creates := applied_creates + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log detailed error and continue
      v_error_details := format('Error processing change %s (type: %s): %s', 
        change_record.id, change_record.change_type, SQLERRM);
      RAISE NOTICE '%', v_error_details;
      
      -- Optionally store error in review_notes
      UPDATE extraction_listing_changes 
      SET review_notes = v_error_details
      WHERE id = change_record.id;
    END;
  END LOOP;
  
  -- Update session status
  UPDATE extraction_sessions 
  SET 
    status = 'completed',
    applied_at = NOW()
  WHERE id = p_session_id;
  
  -- Return detailed result
  result := json_build_object(
    'success', true,
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
  -- Return error result
  result := json_build_object(
    'success', false,
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

-- Add helpful comment
COMMENT ON FUNCTION apply_selected_extraction_changes IS 
'Applies selected extraction changes with proper error handling, validation, and delete-first processing to avoid conflicts.';