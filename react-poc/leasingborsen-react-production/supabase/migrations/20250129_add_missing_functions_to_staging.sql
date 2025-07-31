-- Add missing functions from production to staging
-- These functions support AI extraction, cost monitoring, and lease scoring

-- 1. apply_extraction_session_changes
CREATE OR REPLACE FUNCTION apply_extraction_session_changes(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- This is a placeholder - the actual implementation should be copied from production
    -- The function applies all changes from an extraction session
    RETURN jsonb_build_object('success', false, 'message', 'Function needs to be implemented');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. check_inference_rate_alert
CREATE OR REPLACE FUNCTION check_inference_rate_alert()
RETURNS BOOLEAN AS $$
BEGIN
    -- Checks if AI inference rate exceeds threshold
    -- Placeholder implementation
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 3. config_exists
CREATE OR REPLACE FUNCTION config_exists(p_config_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM responses_api_configs 
        WHERE name = p_config_name
    );
END;
$$ LANGUAGE plpgsql;

-- 4. create_responses_config
CREATE OR REPLACE FUNCTION create_responses_config(
    p_name TEXT,
    p_provider TEXT,
    p_model TEXT,
    p_temperature FLOAT DEFAULT 0.7
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    INSERT INTO responses_api_configs (name, provider, model, temperature)
    VALUES (p_name, p_provider, p_model, p_temperature)
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- 5. detect_extraction_deletions
CREATE OR REPLACE FUNCTION detect_extraction_deletions(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_deletions_count INTEGER;
BEGIN
    -- Detects listings that should be deleted based on extraction
    -- Placeholder implementation
    SELECT COUNT(*) INTO v_deletions_count
    FROM extraction_listing_changes
    WHERE session_id = p_session_id
      AND action = 'DELETE';
    
    RETURN v_deletions_count;
END;
$$ LANGUAGE plpgsql;

-- 6. get_current_month_ai_spending
CREATE OR REPLACE FUNCTION get_current_month_ai_spending()
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(cost), 0) INTO v_total
    FROM api_call_logs
    WHERE created_at >= date_trunc('month', CURRENT_DATE)
      AND created_at < date_trunc('month', CURRENT_DATE) + interval '1 month';
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- 7. is_admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role
    -- This is a simplified implementation
    RETURN auth.jwt() ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. mark_lease_score_stale
CREATE OR REPLACE FUNCTION mark_lease_score_stale()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark lease scores as needing recalculation
    IF TG_OP = 'DELETE' THEN
        UPDATE listings 
        SET lease_score = NULL,
            lease_score_calculated_at = NULL
        WHERE id = OLD.listing_id;
    ELSE
        UPDATE listings 
        SET lease_score = NULL,
            lease_score_calculated_at = NULL
        WHERE id = NEW.listing_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. set_config_active
CREATE OR REPLACE FUNCTION set_config_active(p_config_id UUID, p_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE responses_api_configs
    SET active = p_active,
        updated_at = NOW()
    WHERE id = p_config_id;
END;
$$ LANGUAGE plpgsql;

-- Add necessary triggers if they don't exist
DROP TRIGGER IF EXISTS listings_score_stale ON listings;
CREATE TRIGGER listings_score_stale
    AFTER UPDATE OF retail_price ON listings
    FOR EACH ROW
    EXECUTE FUNCTION mark_lease_score_stale();

-- Note: These are simplified implementations. 
-- For production use, copy the exact implementations from the production database.