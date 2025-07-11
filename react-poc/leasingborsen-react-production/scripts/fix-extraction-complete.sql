-- Complete fix for extraction system including deletion detection and apply function

-- First, let's check what columns actually exist in the listings table
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Checking listings table structure...';
  FOR r IN SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'listings' ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  Column: % (%)', r.column_name, r.data_type;
  END LOOP;
END $$;

-- Create function to detect deletions after extraction
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
      l.colour,
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
        'colour', listing_record.colour,
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

-- Fixed apply function that handles actual table structure
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
    BEGIN
      total_processed := total_processed + 1;
      extraction_data := change_record.extracted_data;
      existing_listing_id := change_record.existing_listing_id;
      
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
          RAISE NOTICE 'Skipping create: Could not find make or model for % %', extraction_data->>'make', extraction_data->>'model';
          CONTINUE;
        END IF;
        
        -- Extract retail price if it exists
        IF extraction_data ? 'retail_price' AND extraction_data->>'retail_price' IS NOT NULL THEN
          v_retail_price := (extraction_data->>'retail_price')::DECIMAL;
        ELSE
          v_retail_price := NULL;
        END IF;
        
        -- Insert new listing with ID references
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
          retail_price,
          created_at,
          updated_at
        )
        VALUES (
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
          v_retail_price,
          NOW(),
          NOW()
        )
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
        
        -- Extract retail price if it exists
        IF extraction_data ? 'retail_price' AND extraction_data->>'retail_price' IS NOT NULL THEN
          v_retail_price := (extraction_data->>'retail_price')::DECIMAL;
        ELSE
          v_retail_price := NULL;
        END IF;
        
        -- Update existing listing (only update fields that have values)
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
          retail_price = CASE WHEN extraction_data ? 'retail_price' THEN v_retail_price ELSE retail_price END,
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
        
        -- Delete price change logs if they exist (check if table exists first)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_change_log') THEN
          DELETE FROM price_change_log WHERE listing_id = existing_listing_id;
        END IF;
        
        -- Delete lease pricing data
        DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
        
        -- Delete the listing
        DELETE FROM listings WHERE id = existing_listing_id;
        
        applied_deletes := applied_deletes + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error for this specific change and continue with next
      RAISE NOTICE 'Error processing change %: %', change_record.id, SQLERRM;
      -- Continue to next iteration
    END;
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
COMMENT ON FUNCTION apply_selected_extraction_changes IS 'Apply only selected changes from an extraction session. Handles actual listings table structure and all edge cases.';
COMMENT ON FUNCTION detect_extraction_deletions IS 'Detect listings that were not found in extraction and create delete changes for them.';

-- To manually run deletion detection for the session
-- SELECT detect_extraction_deletions('e887e753-e166-42dd-b9c7-62fb9c388f8c'::uuid, (SELECT seller_id FROM extraction_sessions WHERE id = 'e887e753-e166-42dd-b9c7-62fb9c388f8c'::uuid));