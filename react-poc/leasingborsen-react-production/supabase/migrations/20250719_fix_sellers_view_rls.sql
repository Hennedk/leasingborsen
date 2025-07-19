-- Fix RLS access issues for sellers_with_make view and related tables
-- This migration addresses the ERR_INTERNET_DISCONNECTED error when accessing admin/sellers

-- First, ensure the sellers_with_make view exists and is properly defined
CREATE OR REPLACE VIEW sellers_with_make AS
SELECT 
  s.*,
  m.name as make_name
FROM sellers s
LEFT JOIN makes m ON s.make_id = m.id;

-- Grant proper access to the sellers_with_make view for all roles
GRANT SELECT ON sellers_with_make TO anon, authenticated, service_role;

-- Important: Views inherit RLS from underlying tables, but we need to ensure
-- the policies allow appropriate access for admin functionality

-- Update the sellers policies to be more permissive for admin interface
-- Allow authenticated users to read all sellers (for admin interface)
DROP POLICY IF EXISTS "Authenticated can view all sellers for admin" ON sellers;
CREATE POLICY "Authenticated can view all sellers for admin" ON sellers
  FOR SELECT TO authenticated
  USING (true);

-- Update makes policies to ensure they can be read by everyone
-- (This is needed for the sellers_with_make view to work)
DROP POLICY IF EXISTS "Anyone can read makes" ON makes;
CREATE POLICY "Anyone can read makes" ON makes
  FOR SELECT TO anon, authenticated
  USING (true);

-- Ensure admin users have full management access
DROP POLICY IF EXISTS "Admin can modify sellers" ON sellers;
CREATE POLICY "Admin can modify sellers" ON sellers
  FOR ALL TO authenticated
  USING (is_admin());

-- Grant necessary table permissions
GRANT SELECT ON sellers TO anon, authenticated, service_role;
GRANT SELECT ON makes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON sellers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON makes TO authenticated;

-- Create a function to check seller access permissions
CREATE OR REPLACE FUNCTION check_seller_access_permissions()
RETURNS TABLE(
  object_name TEXT,
  object_type TEXT,
  anon_access BOOLEAN,
  authenticated_access BOOLEAN,
  admin_policy_exists BOOLEAN
) AS $$
BEGIN
  -- Check view access
  RETURN QUERY
  SELECT 
    'sellers_with_make'::TEXT,
    'view'::TEXT,
    has_table_privilege('anon', 'sellers_with_make', 'SELECT')::BOOLEAN,
    has_table_privilege('authenticated', 'sellers_with_make', 'SELECT')::BOOLEAN,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'sellers' AND policyname LIKE '%Admin%')::BOOLEAN;

  -- Check sellers table access
  RETURN QUERY
  SELECT 
    'sellers'::TEXT,
    'table'::TEXT,
    has_table_privilege('anon', 'sellers', 'SELECT')::BOOLEAN,
    has_table_privilege('authenticated', 'sellers', 'SELECT')::BOOLEAN,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'sellers' AND policyname LIKE '%Admin%')::BOOLEAN;

  -- Check makes table access
  RETURN QUERY
  SELECT 
    'makes'::TEXT,
    'table'::TEXT,
    has_table_privilege('anon', 'makes', 'SELECT')::BOOLEAN,
    has_table_privilege('authenticated', 'makes', 'SELECT')::BOOLEAN,
    EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'makes' AND policyname LIKE '%Admin%')::BOOLEAN;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the check function
GRANT EXECUTE ON FUNCTION check_seller_access_permissions() TO authenticated;

-- Add comment documenting the fix
COMMENT ON VIEW sellers_with_make IS 'View combining sellers with make names - accessible to all roles for admin interface';
COMMENT ON FUNCTION check_seller_access_permissions() IS 'Diagnostic function to verify seller access permissions are properly configured';