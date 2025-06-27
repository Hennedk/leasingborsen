-- Update the apply_extraction_session_changes function to handle offers_replacement
-- This allows complete replacement of all offers when any difference is detected

CREATE OR REPLACE FUNCTION apply_extraction_session_changes(p_session_id UUID, p_applied_by TEXT)
RETURNS TABLE (
  applied_creates INTEGER,
  applied_updates INTEGER,
  applied_deletes INTEGER,
  errors JSONB[]
) AS $$
DECLARE
  v_change RECORD;
  v_applied_creates INTEGER := 0;
  v_applied_updates INTEGER := 0;
  v_applied_deletes INTEGER := 0;
  v_errors JSONB[] := ARRAY[]::JSONB[];
  v_new_listing_id UUID;
  v_has_offers_replacement BOOLEAN;
BEGIN
  -- Start transaction
  BEGIN
    -- Process each approved change
    FOR v_change IN 
      SELECT * FROM extraction_listing_changes 
      WHERE session_id = p_session_id 
        AND change_status = 'approved'
        AND change_type IN ('create', 'update', 'delete')
      ORDER BY change_type -- Process deletes last
    LOOP
      BEGIN
        CASE v_change.change_type
          WHEN 'create' THEN
            -- Create new listing from extracted data
            INSERT INTO listings (
              make_id,
              model_id,
              variant,
              seller_id,
              body_type_id,
              fuel_type_id,
              transmission_id,
              horsepower,
              seats,
              doors,
              year,
              co2_emission,
              co2_tax_half_year,
              wltp,
              consumption_l_100km,
              consumption_kwh_100km,
              description,
              extraction_method,
              extraction_timestamp
            )
            SELECT 
              (v_change.extracted_data->>'make_id')::UUID,
              (v_change.extracted_data->>'model_id')::UUID,
              v_change.extracted_data->>'variant',
              (SELECT seller_id FROM extraction_sessions WHERE id = p_session_id),
              (v_change.extracted_data->>'body_type_id')::UUID,
              (v_change.extracted_data->>'fuel_type_id')::UUID,
              (v_change.extracted_data->>'transmission_id')::UUID,
              (v_change.extracted_data->>'horsepower')::INTEGER,
              (v_change.extracted_data->>'seats')::INTEGER,
              (v_change.extracted_data->>'doors')::INTEGER,
              (v_change.extracted_data->>'year')::INTEGER,
              (v_change.extracted_data->>'co2_emission')::INTEGER,
              (v_change.extracted_data->>'co2_tax_half_year')::INTEGER,
              (v_change.extracted_data->>'wltp')::INTEGER,
              (v_change.extracted_data->>'consumption_l_100km')::NUMERIC,
              (v_change.extracted_data->>'consumption_kwh_100km')::NUMERIC,
              v_change.extracted_data->>'description',
              'ai_update',
              NOW()
            RETURNING id INTO v_new_listing_id;
            
            -- Create lease pricing offers
            IF v_change.extracted_data->'offers' IS NOT NULL THEN
              INSERT INTO lease_pricing (
                listing_id,
                monthly_price,
                first_payment,
                period_months,
                mileage_per_year
              )
              SELECT 
                v_new_listing_id,
                (offer->>'monthly_price')::NUMERIC,
                (offer->>'first_payment')::NUMERIC,
                (offer->>'period_months')::INTEGER,
                (offer->>'mileage_per_year')::INTEGER
              FROM jsonb_array_elements(v_change.extracted_data->'offers') AS offer;
            END IF;
            
            v_applied_creates := v_applied_creates + 1;
            
          WHEN 'update' THEN
            -- Check if this is an offers_replacement update
            v_has_offers_replacement := v_change.field_changes ? 'offers_replacement';
            
            -- Update existing listing with changed fields
            UPDATE listings
            SET 
              variant = COALESCE(v_change.extracted_data->>'variant', variant),
              body_type_id = COALESCE((v_change.extracted_data->>'body_type_id')::UUID, body_type_id),
              fuel_type_id = COALESCE((v_change.extracted_data->>'fuel_type_id')::UUID, fuel_type_id),
              transmission_id = COALESCE((v_change.extracted_data->>'transmission_id')::UUID, transmission_id),
              horsepower = COALESCE((v_change.extracted_data->>'horsepower')::INTEGER, horsepower),
              seats = COALESCE((v_change.extracted_data->>'seats')::INTEGER, seats),
              doors = COALESCE((v_change.extracted_data->>'doors')::INTEGER, doors),
              year = COALESCE((v_change.extracted_data->>'year')::INTEGER, year),
              co2_emission = COALESCE((v_change.extracted_data->>'co2_emission')::INTEGER, co2_emission),
              co2_tax_half_year = COALESCE((v_change.extracted_data->>'co2_tax_half_year')::INTEGER, co2_tax_half_year),
              wltp = COALESCE((v_change.extracted_data->>'wltp')::INTEGER, wltp),
              consumption_l_100km = COALESCE((v_change.extracted_data->>'consumption_l_100km')::NUMERIC, consumption_l_100km),
              consumption_kwh_100km = COALESCE((v_change.extracted_data->>'consumption_kwh_100km')::NUMERIC, consumption_kwh_100km),
              description = COALESCE(v_change.extracted_data->>'description', description),
              extraction_method = 'ai_update',
              extraction_timestamp = NOW(),
              updated_at = NOW()
            WHERE id = v_change.existing_listing_id;
            
            -- Handle offers replacement or update
            IF v_change.extracted_data->'offers' IS NOT NULL THEN
              IF v_has_offers_replacement THEN
                -- Complete replacement: Delete ALL existing offers and insert ALL new ones
                DELETE FROM lease_pricing WHERE listing_id = v_change.existing_listing_id;
                
                -- Insert all new offers from extracted_data
                INSERT INTO lease_pricing (
                  listing_id,
                  monthly_price,
                  first_payment,
                  period_months,
                  mileage_per_year
                )
                SELECT 
                  v_change.existing_listing_id,
                  (offer->>'monthly_price')::NUMERIC,
                  (offer->>'first_payment')::NUMERIC,
                  (offer->>'period_months')::INTEGER,
                  (offer->>'mileage_per_year')::INTEGER
                FROM jsonb_array_elements(v_change.extracted_data->'offers') AS offer;
              ELSE
                -- Legacy behavior: Replace all offers (backward compatibility)
                DELETE FROM lease_pricing WHERE listing_id = v_change.existing_listing_id;
                
                INSERT INTO lease_pricing (
                  listing_id,
                  monthly_price,
                  first_payment,
                  period_months,
                  mileage_per_year
                )
                SELECT 
                  v_change.existing_listing_id,
                  (offer->>'monthly_price')::NUMERIC,
                  (offer->>'first_payment')::NUMERIC,
                  (offer->>'period_months')::INTEGER,
                  (offer->>'mileage_per_year')::INTEGER
                FROM jsonb_array_elements(v_change.extracted_data->'offers') AS offer;
              END IF;
            END IF;
            
            v_applied_updates := v_applied_updates + 1;
            
          WHEN 'delete' THEN
            -- Soft delete or hard delete based on business rules
            DELETE FROM listings WHERE id = v_change.existing_listing_id;
            v_applied_deletes := v_applied_deletes + 1;
        END CASE;
        
        -- Mark change as applied
        UPDATE extraction_listing_changes 
        SET 
          change_status = 'applied',
          applied_at = NOW()
        WHERE id = v_change.id;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error and continue
        v_errors := array_append(v_errors, jsonb_build_object(
          'change_id', v_change.id,
          'change_type', v_change.change_type,
          'existing_listing_id', v_change.existing_listing_id,
          'error_code', SQLSTATE,
          'error_message', SQLERRM,
          'error_detail', SQLSTATE || ': ' || SQLERRM
        ));
      END;
    END LOOP;
    
    -- Update session status
    UPDATE extraction_sessions
    SET 
      status = 'completed',
      completed_at = NOW(),
      applied_at = NOW(),
      applied_by = p_applied_by,
      total_updated = v_applied_updates,
      total_new = v_applied_creates,
      total_deleted = v_applied_deletes
    WHERE id = p_session_id;
    
  END;
  
  RETURN QUERY SELECT v_applied_creates, v_applied_updates, v_applied_deletes, v_errors;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the offers_replacement functionality
COMMENT ON FUNCTION apply_extraction_session_changes IS 'Applies all approved changes from an extraction session. Handles offers_replacement field_changes for complete offer replacement.';