-- Fix deletion failure caused by lease score trigger conflicts
-- This migration resolves the issue where deletions were marked as applied but listings still existed

-- First, fix the mark_lease_score_stale function to handle DELETE operations properly
CREATE OR REPLACE FUNCTION mark_lease_score_stale()
RETURNS TRIGGER AS $$
BEGIN
  -- For listings table - retail price changes
  IF TG_TABLE_NAME = 'listings' THEN
    -- Only mark as stale if retail price actually changed and is not null
    IF OLD.retail_price IS DISTINCT FROM NEW.retail_price AND NEW.retail_price IS NOT NULL THEN
      NEW.lease_score := NULL;
      NEW.lease_score_calculated_at := NULL;
      NEW.lease_score_breakdown := NULL;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For lease_pricing table - any relevant changes
  IF TG_TABLE_NAME = 'lease_pricing' THEN
    -- Handle DELETE operations - don't try to update when record is being deleted
    IF TG_OP = 'DELETE' THEN
      -- Mark the associated listing for recalculation if it exists and has a retail price
      -- Only update if the listing still exists (it might be in the process of being deleted)
      UPDATE listings 
      SET 
        lease_score = NULL,
        lease_score_calculated_at = NULL,
        lease_score_breakdown = NULL
      WHERE id = OLD.listing_id
        AND retail_price IS NOT NULL;
      RETURN OLD; -- Return OLD for DELETE operations
    ELSE
      -- Handle INSERT/UPDATE operations
      UPDATE listings 
      SET 
        lease_score = NULL,
        lease_score_calculated_at = NULL,
        lease_score_breakdown = NULL
      WHERE id = NEW.listing_id
        AND retail_price IS NOT NULL;
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to handle DELETE operations as well
DROP TRIGGER IF EXISTS pricing_score_stale ON lease_pricing;
CREATE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF monthly_price, period_months, mileage_per_year OR DELETE
ON lease_pricing
FOR EACH ROW
EXECUTE FUNCTION mark_lease_score_stale();

-- Enhance the apply_selected_extraction_changes function with better deletion verification
CREATE OR REPLACE FUNCTION apply_selected_extraction_changes(
  p_session_id UUID,
  p_selected_change_ids UUID[],
  p_applied_by TEXT DEFAULT NULL
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
  v_listing_to_delete UUID;
  v_seller_id UUID;
  v_deletion_count INTEGER; -- Add variable to track actual deletions
BEGIN
  -- Set role context for this function to bypass RLS
  -- This function runs as SECURITY DEFINER so it has elevated privileges
  
  -- Get the seller_id for this session
  SELECT seller_id INTO v_seller_id 
  FROM extraction_sessions 
  WHERE id = p_session_id;
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Could not find session or seller_id for session %', p_session_id;
  END IF;
  
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
    v_deletion_count := NULL;
    
    -- Process CREATE changes
    IF change_record.change_type = 'create' THEN
      BEGIN
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
        
        -- Insert new listing with explicit seller_id
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
          wltp,
          co2_emission,
          co2_tax_half_year,
          consumption_l_100km,
          consumption_kwh_100km,
          created_at,
          updated_at
        )
        VALUES (
          v_seller_id,
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
          CASE WHEN extraction_data->>'wltp' IS NOT NULL 
            THEN (extraction_data->>'wltp')::INTEGER 
            ELSE NULL END,
          CASE WHEN extraction_data->>'co2_emission' IS NOT NULL 
            THEN (extraction_data->>'co2_emission')::INTEGER 
            ELSE NULL END,
          CASE WHEN extraction_data->>'co2_tax_half_year' IS NOT NULL 
            THEN (extraction_data->>'co2_tax_half_year')::DECIMAL 
            ELSE NULL END,
          CASE WHEN extraction_data->>'consumption_l_100km' IS NOT NULL 
            THEN (extraction_data->>'consumption_l_100km')::DECIMAL 
            ELSE NULL END,
          CASE WHEN extraction_data->>'consumption_kwh_100km' IS NOT NULL 
            THEN (extraction_data->>'consumption_kwh_100km')::DECIMAL 
            ELSE NULL END,
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
            period_months,
            mileage_per_year
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
              ELSE NULL END
          FROM jsonb_array_elements(extraction_data->'offers') AS offer;
        END IF;
        
        applied_creates := applied_creates + 1;
        
      EXCEPTION 
        WHEN OTHERS THEN
          error_count := error_count + 1;
          v_error_msg := SQLERRM;
          
          error_details := error_details || jsonb_build_object(
            'change_id', change_record.id,
            'change_type', change_record.change_type,
            'error', v_error_msg,
            'extracted_data', extraction_data
          );
      END;
      
    -- Process UPDATE changes - COMPREHENSIVE FIELD COVERAGE
    ELSIF change_record.change_type = 'update' AND existing_listing_id IS NOT NULL THEN
      BEGIN
        -- Look up reference IDs for fields that need them
        v_fuel_type_id := NULL;
        v_transmission_id := NULL;
        v_body_type_id := NULL;
        
        IF extraction_data ? 'fuel_type' AND extraction_data->>'fuel_type' IS NOT NULL THEN
          SELECT id INTO v_fuel_type_id FROM fuel_types WHERE LOWER(name) = LOWER(extraction_data->>'fuel_type');
        END IF;
        
        IF extraction_data ? 'transmission' AND extraction_data->>'transmission' IS NOT NULL THEN
          SELECT id INTO v_transmission_id FROM transmissions WHERE LOWER(name) = LOWER(extraction_data->>'transmission');
        END IF;
        
        IF extraction_data ? 'body_type' AND extraction_data->>'body_type' IS NOT NULL THEN
          SELECT id INTO v_body_type_id FROM body_types WHERE LOWER(name) = LOWER(extraction_data->>'body_type');
        END IF;
        
        -- Update existing listing with ALL POSSIBLE FIELDS
        UPDATE listings 
        SET 
          variant = COALESCE(extraction_data->>'variant', variant),
          horsepower = CASE 
            WHEN extraction_data->>'horsepower' IS NOT NULL 
            THEN (extraction_data->>'horsepower')::INTEGER 
            ELSE horsepower 
          END,
          fuel_type_id = COALESCE(v_fuel_type_id, fuel_type_id),
          transmission_id = COALESCE(v_transmission_id, transmission_id),
          body_type_id = COALESCE(v_body_type_id, body_type_id),
          seats = CASE 
            WHEN extraction_data->>'seats' IS NOT NULL 
            THEN (extraction_data->>'seats')::INTEGER 
            ELSE seats 
          END,
          doors = CASE 
            WHEN extraction_data->>'doors' IS NOT NULL 
            THEN (extraction_data->>'doors')::INTEGER 
            ELSE doors 
          END,
          year = CASE 
            WHEN extraction_data->>'year' IS NOT NULL 
            THEN (extraction_data->>'year')::INTEGER 
            ELSE year 
          END,
          mileage = CASE 
            WHEN extraction_data->>'mileage' IS NOT NULL 
            THEN (extraction_data->>'mileage')::INTEGER 
            ELSE mileage 
          END,
          wltp = CASE 
            WHEN extraction_data->>'wltp' IS NOT NULL 
            THEN (extraction_data->>'wltp')::INTEGER 
            ELSE wltp 
          END,
          co2_emission = CASE 
            WHEN extraction_data->>'co2_emission' IS NOT NULL 
            THEN (extraction_data->>'co2_emission')::INTEGER 
            ELSE co2_emission 
          END,
          co2_tax_half_year = CASE 
            WHEN extraction_data->>'co2_tax_half_year' IS NOT NULL 
            THEN (extraction_data->>'co2_tax_half_year')::DECIMAL 
            ELSE co2_tax_half_year 
          END,
          consumption_l_100km = CASE 
            WHEN extraction_data->>'consumption_l_100km' IS NOT NULL 
            THEN (extraction_data->>'consumption_l_100km')::DECIMAL 
            ELSE consumption_l_100km 
          END,
          consumption_kwh_100km = CASE 
            WHEN extraction_data->>'consumption_kwh_100km' IS NOT NULL 
            THEN (extraction_data->>'consumption_kwh_100km')::DECIMAL 
            ELSE consumption_kwh_100km 
          END,
          updated_at = NOW()
        WHERE id = existing_listing_id;
        
        -- Update lease pricing if available
        IF extraction_data ? 'offers' AND jsonb_array_length(extraction_data->'offers') > 0 THEN
          -- Delete existing pricing
          DELETE FROM lease_pricing WHERE listing_id = existing_listing_id;
          
          -- Insert new pricing
          INSERT INTO lease_pricing (
            listing_id,
            monthly_price,
            first_payment,
            period_months,
            mileage_per_year
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
              ELSE NULL END
          FROM jsonb_array_elements(extraction_data->'offers') AS offer;
        END IF;
        
        applied_updates := applied_updates + 1;
        
      EXCEPTION 
        WHEN OTHERS THEN
          error_count := error_count + 1;
          v_error_msg := SQLERRM;
          
          error_details := error_details || jsonb_build_object(
            'change_id', change_record.id,
            'change_type', change_record.change_type,
            'existing_listing_id', existing_listing_id,
            'error', v_error_msg
          );
      END;
      
    -- Process DELETE changes - ENHANCED WITH VERIFICATION
    ELSIF change_record.change_type = 'delete' AND existing_listing_id IS NOT NULL THEN
      BEGIN
        -- Store the listing ID we're about to delete
        v_listing_to_delete := existing_listing_id;
        
        -- Delete ALL extraction_listing_changes that reference this listing
        -- This prevents foreign key constraint violations from previous sessions
        DELETE FROM extraction_listing_changes 
        WHERE existing_listing_id = v_listing_to_delete;
        
        -- Delete pricing first (foreign key constraint)
        DELETE FROM lease_pricing WHERE listing_id = v_listing_to_delete;
        
        -- Delete the listing and verify it was actually deleted
        DELETE FROM listings WHERE id = v_listing_to_delete;
        GET DIAGNOSTICS v_deletion_count = ROW_COUNT;
        
        -- Verify the deletion actually happened
        IF v_deletion_count = 0 THEN
          RAISE EXCEPTION 'Failed to delete listing %. Listing may not exist or deletion was blocked.', v_listing_to_delete;
        END IF;
        
        -- Only increment counter if deletion was successful
        applied_deletes := applied_deletes + 1;
        
      EXCEPTION 
        WHEN OTHERS THEN
          error_count := error_count + 1;
          v_error_msg := SQLERRM;
          
          error_details := error_details || jsonb_build_object(
            'change_id', change_record.id,
            'change_type', change_record.change_type,
            'existing_listing_id', existing_listing_id,
            'error', v_error_msg,
            'deletion_count', COALESCE(v_deletion_count, 0)
          );
      END;
    END IF;
  END LOOP;
  
  -- Update the extraction session status based on errors
  UPDATE extraction_sessions 
  SET 
    status = CASE 
      WHEN error_count > 0 THEN 'partially_applied'
      ELSE 'completed'
    END,
    applied_at = NOW()
  WHERE id = p_session_id;
  
  -- Build result JSON
  result := json_build_object(
    'applied_creates', applied_creates,
    'applied_updates', applied_updates,
    'applied_deletes', applied_deletes,
    'discarded_count', discarded_count,
    'total_processed', total_processed,
    'error_count', error_count,
    'error_details', error_details,
    'session_id', p_session_id,
    'applied_by', p_applied_by,
    'applied_at', NOW()
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure result
    RAISE LOG 'Error in apply_selected_extraction_changes: %', SQLERRM;
    
    result := json_build_object(
      'applied_creates', 0,
      'applied_updates', 0,
      'applied_deletes', 0,
      'discarded_count', 0,
      'total_processed', 0,
      'error_count', 1,
      'error_details', jsonb_build_array(
        jsonb_build_object(
          'error', SQLERRM,
          'context', 'function_level_error'
        )
      )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION apply_selected_extraction_changes TO authenticated, service_role;

-- Add comments explaining the fixes
COMMENT ON FUNCTION apply_selected_extraction_changes IS 'Applies selected extraction changes from a session. Fixed in 20250725 to handle lease score triggers properly and verify actual deletions with ROW_COUNT verification.';
COMMENT ON FUNCTION mark_lease_score_stale IS 'Marks listings for lease score recalculation when retail price or lease pricing changes. Fixed in 20250725 to handle DELETE operations properly and avoid trigger conflicts during deletion operations.';