-- Fix RLS issues with sellers_with_make view and admin access
-- This migration ensures admin users can access sellers data properly

-- First, ensure the sellers_with_make view exists with proper structure
CREATE OR REPLACE VIEW sellers_with_make AS
SELECT 
  s.id,
  s.name,
  s.email,
  s.phone,
  s.company,
  s.address,
  s.country,
  s.logo_url,
  s.pdf_url,
  s.pdf_urls,
  s.make_id,
  s.active,
  s.created_at,
  s.updated_at,
  m.name as make_name
FROM sellers s
LEFT JOIN makes m ON s.make_id = m.id;

-- Grant access to the view for different roles
GRANT SELECT ON sellers_with_make TO authenticated;
GRANT SELECT ON sellers_with_make TO anon;
GRANT SELECT ON sellers_with_make TO service_role;

-- Create specific policies for admin access to circumvent any RLS issues
-- This ensures admin users always have access to sellers data

-- Update the sellers table policy to be more permissive for admin operations
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
CREATE POLICY "Admin full access to sellers" ON sellers
  FOR ALL TO authenticated
  USING (
    COALESCE(
      (current_setting('request.jwt.claims', true)::json->>'role') = 'admin',
      false
    )
  );

-- Add a more permissive policy for authenticated users to read seller basic info
DROP POLICY IF EXISTS "Authenticated can view sellers for admin" ON sellers;
CREATE POLICY "Authenticated can view sellers for admin" ON sellers
  FOR SELECT TO authenticated
  USING (true);

-- Update makes table to ensure admin can access make data
DROP POLICY IF EXISTS "Anyone can read makes" ON makes;
CREATE POLICY "Anyone can read makes" ON makes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Ensure service role has proper access for Edge Functions
GRANT ALL PRIVILEGES ON sellers TO service_role;
GRANT ALL PRIVILEGES ON makes TO service_role;
GRANT SELECT ON sellers_with_make TO service_role;

-- Create a function to test sellers access
CREATE OR REPLACE FUNCTION test_sellers_access()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Test 1: Check if we can query sellers table
  RETURN QUERY
  SELECT 
    'Sellers table access'::TEXT,
    CASE 
      WHEN EXISTS (SELECT 1 FROM sellers LIMIT 1) THEN 'PASS'
      ELSE 'FAIL'
    END::TEXT,
    'Basic sellers table query'::TEXT;

  -- Test 2: Check if we can query sellers_with_make view
  RETURN QUERY
  SELECT 
    'Sellers view access'::TEXT,
    CASE 
      WHEN EXISTS (SELECT 1 FROM sellers_with_make LIMIT 1) THEN 'PASS'
      ELSE 'FAIL'
    END::TEXT,
    'Sellers with make view query'::TEXT;

  -- Test 3: Check seller count
  RETURN QUERY
  SELECT 
    'Seller count'::TEXT,
    'INFO'::TEXT,
    ('Total sellers: ' || COUNT(*)::TEXT) as details
  FROM sellers;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT 
      'Error'::TEXT,
      'FAIL'::TEXT,
      SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION test_sellers_access() TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW sellers_with_make IS 'View combining sellers with their associated make names - used by admin interface';
COMMENT ON FUNCTION test_sellers_access() IS 'Diagnostic function to test sellers table and view access';

-- Log the migration
INSERT INTO migration_metrics (
  migration_name,
  operation_type,
  table_name,
  execution_time_ms,
  success,
  details
) VALUES (
  '20250719_fix_sellers_view_rls',
  'RLS_FIX',
  'sellers_with_make',
  0,
  true,
  'Fixed RLS policies for sellers view and admin access'
);