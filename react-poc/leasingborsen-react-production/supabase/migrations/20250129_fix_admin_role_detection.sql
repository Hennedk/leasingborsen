-- Ensure admin RLS works immediately after login by trusting JWT metadata
-- while still honouring the user_roles mirror for consistency.

CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_roles jsonb;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Attempt to read roles from the JWT so fresh sessions work before
  -- the Edge Functions have synced roles to user_roles.
  jwt_roles := auth.jwt()->'app_metadata'->'roles';

  IF jwt_roles IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(jwt_roles) AS role(role_name)
      WHERE role_name = 'admin'
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Fallback to the mirrored roles table as source of truth.
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = user_uuid
      AND 'admin' = ANY(ur.roles)
  );
END;
$$;
