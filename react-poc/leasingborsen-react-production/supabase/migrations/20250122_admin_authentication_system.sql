-- Admin Authentication System Migration
-- Creates user_roles table and updates RLS policies for admin access
-- Following the principles in ADMIN_AUTH_PLAN.md

-- Create user_roles table to mirror app_metadata.roles for RLS
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  roles TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own roles
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only authenticated users can upsert their own roles (will be done by Edge Functions)
CREATE POLICY user_roles_upsert_own ON public.user_roles
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_roles ON public.user_roles USING GIN(roles);

-- Helper function to check if user has admin role
CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = user_uuid
      AND 'admin' = ANY(ur.roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for admin-managed tables
-- Drop existing policies if they exist and create new ones

-- Listings table policies
DROP POLICY IF EXISTS admin_select_listings ON public.listings;
DROP POLICY IF EXISTS admin_write_listings ON public.listings;

CREATE POLICY admin_select_listings ON public.listings
  FOR SELECT USING (
    public.user_has_admin_role() OR
    status = 'active' -- Allow public read for active listings
  );

CREATE POLICY admin_write_listings ON public.listings
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Sellers table policies
DROP POLICY IF EXISTS admin_select_sellers ON public.sellers;
DROP POLICY IF EXISTS admin_write_sellers ON public.sellers;

CREATE POLICY admin_select_sellers ON public.sellers
  FOR SELECT USING (public.user_has_admin_role());

CREATE POLICY admin_write_sellers ON public.sellers
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Lease pricing table policies
DROP POLICY IF EXISTS admin_select_lease_pricing ON public.lease_pricing;
DROP POLICY IF EXISTS admin_write_lease_pricing ON public.lease_pricing;

CREATE POLICY admin_select_lease_pricing ON public.lease_pricing
  FOR SELECT USING (
    public.user_has_admin_role() OR
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_id AND l.status = 'active'
    ) -- Allow public read for active listing pricing
  );

CREATE POLICY admin_write_lease_pricing ON public.lease_pricing
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Extraction sessions table policies
DROP POLICY IF EXISTS admin_select_extraction_sessions ON public.extraction_sessions;
DROP POLICY IF EXISTS admin_write_extraction_sessions ON public.extraction_sessions;

CREATE POLICY admin_select_extraction_sessions ON public.extraction_sessions
  FOR SELECT USING (public.user_has_admin_role());

CREATE POLICY admin_write_extraction_sessions ON public.extraction_sessions
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Extraction listing changes table policies
DROP POLICY IF EXISTS admin_select_extraction_listing_changes ON public.extraction_listing_changes;
DROP POLICY IF EXISTS admin_write_extraction_listing_changes ON public.extraction_listing_changes;

CREATE POLICY admin_select_extraction_listing_changes ON public.extraction_listing_changes
  FOR SELECT USING (public.user_has_admin_role());

CREATE POLICY admin_write_extraction_listing_changes ON public.extraction_listing_changes
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Reference tables - allow public read, admin write
-- Makes table
DROP POLICY IF EXISTS public_read_makes ON public.makes;
DROP POLICY IF EXISTS admin_write_makes ON public.makes;

CREATE POLICY public_read_makes ON public.makes
  FOR SELECT USING (TRUE); -- Public read access

CREATE POLICY admin_write_makes ON public.makes
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Models table
DROP POLICY IF EXISTS public_read_models ON public.models;
DROP POLICY IF EXISTS admin_write_models ON public.models;

CREATE POLICY public_read_models ON public.models
  FOR SELECT USING (TRUE); -- Public read access

CREATE POLICY admin_write_models ON public.models
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Body types table
DROP POLICY IF EXISTS public_read_body_types ON public.body_types;
DROP POLICY IF EXISTS admin_write_body_types ON public.body_types;

CREATE POLICY public_read_body_types ON public.body_types
  FOR SELECT USING (TRUE); -- Public read access

CREATE POLICY admin_write_body_types ON public.body_types
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Fuel types table
DROP POLICY IF EXISTS public_read_fuel_types ON public.fuel_types;
DROP POLICY IF EXISTS admin_write_fuel_types ON public.fuel_types;

CREATE POLICY public_read_fuel_types ON public.fuel_types
  FOR SELECT USING (TRUE); -- Public read access

CREATE POLICY admin_write_fuel_types ON public.fuel_types
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Transmissions table
DROP POLICY IF EXISTS public_read_transmissions ON public.transmissions;
DROP POLICY IF EXISTS admin_write_transmissions ON public.transmissions;

CREATE POLICY public_read_transmissions ON public.transmissions
  FOR SELECT USING (TRUE); -- Public read access

CREATE POLICY admin_write_transmissions ON public.transmissions
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Colours table
DROP POLICY IF EXISTS public_read_colours ON public.colours;
DROP POLICY IF EXISTS admin_write_colours ON public.colours;

CREATE POLICY public_read_colours ON public.colours
  FOR SELECT USING (TRUE); -- Public read access

CREATE POLICY admin_write_colours ON public.colours
  FOR ALL USING (public.user_has_admin_role())
  WITH CHECK (public.user_has_admin_role());

-- Function to sync user roles from auth.users app_metadata
-- This will be called by Edge Functions when they verify admin access
CREATE OR REPLACE FUNCTION public.sync_user_roles(user_uuid UUID, new_roles TEXT[])
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, roles, updated_at)
  VALUES (user_uuid, new_roles, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    roles = new_roles,
    updated_at = NOW()
  WHERE user_roles.roles IS DISTINCT FROM new_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_admin_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_roles TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.user_roles IS 'Mirrors user roles from auth.users.app_metadata for RLS policies';
COMMENT ON FUNCTION public.user_has_admin_role IS 'Checks if user has admin role for RLS policies';
COMMENT ON FUNCTION public.sync_user_roles IS 'Syncs user roles from app_metadata, called by Edge Functions';