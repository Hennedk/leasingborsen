-- Implement comprehensive Row Level Security (RLS) for all tables
-- This migration enables RLS and creates appropriate policies for different user roles

-- Enable RLS on all main tables
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_ai_usage ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Responses API tables
ALTER TABLE responses_api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_format_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_versions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on reference tables
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivetrain_types ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LISTINGS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to listings" ON listings
  FOR ALL TO authenticated
  USING (is_admin());

-- Sellers: Can view their own listings
CREATE POLICY "Sellers can view own listings" ON listings
  FOR SELECT TO authenticated
  USING (seller_id = get_current_user_id());

-- Anonymous: Can view active listings (for public website)
CREATE POLICY "Anonymous can view active listings" ON listings
  FOR SELECT TO anon
  USING (status = 'active');

-- SELLERS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to sellers" ON sellers
  FOR ALL TO authenticated
  USING (is_admin());

-- Sellers: Can view their own profile
CREATE POLICY "Sellers can view own profile" ON sellers
  FOR SELECT TO authenticated
  USING (id = get_current_user_id());

-- Anonymous: Can view basic seller info (for public website)
CREATE POLICY "Anonymous can view basic seller info" ON sellers
  FOR SELECT TO anon
  USING (active = true);

-- EXTRACTION SESSIONS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to extraction sessions" ON extraction_sessions
  FOR ALL TO authenticated
  USING (is_admin());

-- Sellers: Can view their own extraction sessions
CREATE POLICY "Sellers can view own extraction sessions" ON extraction_sessions
  FOR SELECT TO authenticated
  USING (seller_id = get_current_user_id());

-- LISTING CHANGES TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to listing changes" ON listing_changes
  FOR ALL TO authenticated
  USING (is_admin());

-- Sellers: Can view changes to their own listings
CREATE POLICY "Sellers can view own listing changes" ON listing_changes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM listings 
    WHERE listings.listing_id = listing_changes.listing_id 
    AND listings.seller_id = get_current_user_id()
  ));

-- PROCESSING JOBS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to processing jobs" ON processing_jobs
  FOR ALL TO authenticated
  USING (is_admin());

-- Sellers: Can view their own processing jobs
CREATE POLICY "Sellers can view own processing jobs" ON processing_jobs
  FOR SELECT TO authenticated
  USING (seller_id = get_current_user_id());

-- BATCH IMPORTS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to batch imports" ON batch_imports
  FOR ALL TO authenticated
  USING (is_admin());

-- Sellers: Can view their own batch imports
CREATE POLICY "Sellers can view own batch imports" ON batch_imports
  FOR SELECT TO authenticated
  USING (seller_id = get_current_user_id());

-- AI USAGE LOG TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to ai usage log" ON ai_usage_log
  FOR ALL TO authenticated
  USING (is_admin());

-- Service role: Can insert and select for logging
CREATE POLICY "Service role can use ai usage log" ON ai_usage_log
  FOR ALL TO service_role
  USING (true);

-- MONTHLY AI USAGE TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to monthly ai usage" ON monthly_ai_usage
  FOR ALL TO authenticated
  USING (is_admin());

-- RESPONSES API CONFIGS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to responses api configs" ON responses_api_configs
  FOR ALL TO authenticated
  USING (is_admin());

-- Service role: Can select for API operations
CREATE POLICY "Service role can read responses api configs" ON responses_api_configs
  FOR SELECT TO service_role
  USING (true);

-- TEXT FORMAT CONFIGS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to text format configs" ON text_format_configs
  FOR ALL TO authenticated
  USING (is_admin());

-- Service role: Can select for API operations
CREATE POLICY "Service role can read text format configs" ON text_format_configs
  FOR SELECT TO service_role
  USING (true);

-- INPUT SCHEMAS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to input schemas" ON input_schemas
  FOR ALL TO authenticated
  USING (is_admin());

-- Service role: Can select for API operations
CREATE POLICY "Service role can read input schemas" ON input_schemas
  FOR SELECT TO service_role
  USING (true);

-- API CALL LOGS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to api call logs" ON api_call_logs
  FOR ALL TO authenticated
  USING (is_admin());

-- Service role: Can insert and select for logging
CREATE POLICY "Service role can use api call logs" ON api_call_logs
  FOR ALL TO service_role
  USING (true);

-- CONFIG VERSIONS TABLE POLICIES
-- Admin: Full access
CREATE POLICY "Admin full access to config versions" ON config_versions
  FOR ALL TO authenticated
  USING (is_admin());

-- Service role: Can select for API operations
CREATE POLICY "Service role can read config versions" ON config_versions
  FOR SELECT TO service_role
  USING (true);

-- REFERENCE TABLES POLICIES (makes, models, fuel_types, etc.)
-- These are read-only for most users, admin can modify

-- Makes table
CREATE POLICY "Anyone can read makes" ON makes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can modify makes" ON makes
  FOR ALL TO authenticated
  USING (is_admin());

-- Models table
CREATE POLICY "Anyone can read models" ON models
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can modify models" ON models
  FOR ALL TO authenticated
  USING (is_admin());

-- Fuel types table
CREATE POLICY "Anyone can read fuel types" ON fuel_types
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can modify fuel types" ON fuel_types
  FOR ALL TO authenticated
  USING (is_admin());

-- Transmissions table
CREATE POLICY "Anyone can read transmissions" ON transmissions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can modify transmissions" ON transmissions
  FOR ALL TO authenticated
  USING (is_admin());

-- Body types table
CREATE POLICY "Anyone can read body types" ON body_types
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can modify body types" ON body_types
  FOR ALL TO authenticated
  USING (is_admin());

-- Drivetrain types table
CREATE POLICY "Anyone can read drivetrain types" ON drivetrain_types
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admin can modify drivetrain types" ON drivetrain_types
  FOR ALL TO authenticated
  USING (is_admin());

-- Grant necessary permissions to service role for Edge Functions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
GRANT INSERT ON listings, extraction_sessions, listing_changes, processing_jobs, batch_imports, ai_usage_log, monthly_ai_usage, api_call_logs TO service_role;
GRANT UPDATE ON listings, extraction_sessions, processing_jobs, batch_imports TO service_role;
GRANT DELETE ON listings, listing_changes TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Create a function to check RLS status
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity,
    COUNT(p.policyname)::INTEGER
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the check function
GRANT EXECUTE ON FUNCTION check_rls_status() TO authenticated;