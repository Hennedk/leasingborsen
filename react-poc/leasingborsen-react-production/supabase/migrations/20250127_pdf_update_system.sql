-- PDF Update System Schema
-- This migration adds support for PDF-based listing updates with change tracking

-- 1. Create extraction sessions table to track PDF comparisons
CREATE TABLE IF NOT EXISTS extraction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  seller_id UUID NOT NULL REFERENCES sellers(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('create', 'update')),
  
  -- Extraction metadata
  total_extracted INTEGER DEFAULT 0,
  total_matched INTEGER DEFAULT 0,
  total_new INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  total_unchanged INTEGER DEFAULT 0,
  total_deleted INTEGER DEFAULT 0,
  
  -- Processing metadata
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  processing_time_ms INTEGER,
  ai_provider TEXT,
  model_version TEXT,
  tokens_used INTEGER,
  cost_cents INTEGER,
  
  -- User interaction
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  applied_at TIMESTAMP,
  applied_by TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- 2. Create listing changes table to track individual changes
CREATE TABLE IF NOT EXISTS listing_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  existing_listing_id UUID REFERENCES listings(id),
  
  -- Change metadata
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete', 'unchanged')),
  change_status TEXT NOT NULL CHECK (change_status IN ('pending', 'approved', 'rejected', 'applied')),
  confidence_score DECIMAL(3,2), -- AI confidence in the match
  
  -- Extracted data (for both create and update)
  extracted_data JSONB NOT NULL,
  
  -- Change details (for updates)
  field_changes JSONB, -- { field_name: { old: value, new: value } }
  change_summary TEXT,
  
  -- Matching metadata
  match_method TEXT CHECK (match_method IN ('exact', 'fuzzy', 'manual', 'unmatched')),
  match_details JSONB, -- Details about how the match was made
  
  -- User decisions
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  review_notes TEXT,
  applied_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX idx_extraction_sessions_seller ON extraction_sessions(seller_id);
CREATE INDEX idx_extraction_sessions_status ON extraction_sessions(status);
CREATE INDEX idx_extraction_sessions_created ON extraction_sessions(created_at DESC);

CREATE INDEX idx_listing_changes_session ON listing_changes(session_id);
CREATE INDEX idx_listing_changes_listing ON listing_changes(existing_listing_id);
CREATE INDEX idx_listing_changes_type ON listing_changes(change_type);
CREATE INDEX idx_listing_changes_status ON listing_changes(change_status);

-- 4. Create view for session summary with detailed stats
CREATE OR REPLACE VIEW extraction_session_summary AS
SELECT 
  es.*,
  COUNT(DISTINCT lc.id) as total_changes,
  COUNT(DISTINCT CASE WHEN lc.change_type = 'create' THEN lc.id END) as creates_count,
  COUNT(DISTINCT CASE WHEN lc.change_type = 'update' THEN lc.id END) as updates_count,
  COUNT(DISTINCT CASE WHEN lc.change_type = 'delete' THEN lc.id END) as deletes_count,
  COUNT(DISTINCT CASE WHEN lc.change_status = 'approved' THEN lc.id END) as approved_count,
  COUNT(DISTINCT CASE WHEN lc.change_status = 'rejected' THEN lc.id END) as rejected_count,
  COUNT(DISTINCT CASE WHEN lc.change_status = 'applied' THEN lc.id END) as applied_count
FROM extraction_sessions es
LEFT JOIN listing_changes lc ON es.id = lc.session_id
GROUP BY es.id;

-- 5. Function to apply approved changes from a session
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
BEGIN
  -- Start transaction
  BEGIN
    -- Process each approved change
    FOR v_change IN 
      SELECT * FROM listing_changes 
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
            -- Update existing listing with changed fields
            UPDATE listings
            SET 
              variant = COALESCE(v_change.extracted_data->>'variant', variant),
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
            
            -- Update lease pricing if provided
            IF v_change.extracted_data->'offers' IS NOT NULL THEN
              -- Delete existing pricing
              DELETE FROM lease_pricing WHERE listing_id = v_change.existing_listing_id;
              
              -- Insert new pricing
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
            
            v_applied_updates := v_applied_updates + 1;
            
          WHEN 'delete' THEN
            -- Soft delete or hard delete based on business rules
            DELETE FROM listings WHERE id = v_change.existing_listing_id;
            v_applied_deletes := v_applied_deletes + 1;
        END CASE;
        
        -- Mark change as applied
        UPDATE listing_changes 
        SET 
          change_status = 'applied',
          applied_at = NOW()
        WHERE id = v_change.id;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error and continue
        v_errors := array_append(v_errors, jsonb_build_object(
          'change_id', v_change.id,
          'error', SQLERRM
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

-- 6. RLS policies
ALTER TABLE extraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_changes ENABLE ROW LEVEL SECURITY;

-- Admin only policies
CREATE POLICY extraction_sessions_admin_all ON extraction_sessions
  FOR ALL
  USING (auth.role() = 'admin' OR auth.role() = 'service_role');

CREATE POLICY listing_changes_admin_all ON listing_changes
  FOR ALL
  USING (auth.role() = 'admin' OR auth.role() = 'service_role');

-- 7. Add helpful comments
COMMENT ON TABLE extraction_sessions IS 'Tracks PDF extraction sessions for creating or updating listings';
COMMENT ON TABLE listing_changes IS 'Individual listing changes detected during extraction sessions';
COMMENT ON COLUMN listing_changes.confidence_score IS 'AI confidence score for fuzzy matches (0.00-1.00)';
COMMENT ON COLUMN listing_changes.field_changes IS 'JSON object showing old vs new values for each changed field';
COMMENT ON FUNCTION apply_extraction_session_changes IS 'Applies all approved changes from an extraction session';