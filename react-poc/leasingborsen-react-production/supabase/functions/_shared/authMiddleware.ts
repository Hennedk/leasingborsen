/**
 * Admin Authentication Middleware for Supabase Edge Functions
 * Implements secure authentication following ADMIN_AUTH_PLAN.md principles:
 * - Authentication at the edge
 * - RLS enforcement in Postgres
 * - Roles as data (app_metadata.roles mirrored to public.user_roles)
 * - Strict service-role secret handling
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Type definitions
interface AuthUser {
  id: string;
  email: string;
  app_metadata: {
    roles?: string[];
    [key: string]: any;
  };
}

interface AuthResult {
  success: true;
  user: AuthUser;
  supabase: SupabaseClient;
}

interface AuthError {
  success: false;
  error: string;
  status: number;
}

type AuthMiddlewareResult = AuthResult | AuthError;

// Danish error messages (matching frontend patterns)
const errorMessages = {
  missingToken: 'Manglende adgangstoken',
  invalidToken: 'Ugyldig adgangstoken',
  expiredToken: 'Udløbet adgangstoken',
  insufficientPermissions: 'Utilstrækkelige tilladelser - kun administratorer har adgang',
  internalError: 'Intern serverfejl ved godkendelse'
} as const;

// CORS headers with restricted origins (following ADMIN_AUTH_PLAN.md)
const getAllowedOrigins = () => {
  // In production, this should be restricted to specific domains
  const allowedOrigins = [
    'http://localhost:5173', // Local development
    'https://leasingborsen.dk', // Production domain
    'https://www.leasingborsen.dk', // Production www subdomain
    'https://staging.leasingborsen.dk' // Staging domain
  ];
  return allowedOrigins;
};

const getCorsHeaders = (origin?: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
};

/**
 * Extract and validate JWT token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Sync user roles from app_metadata to public.user_roles table
 * This enables RLS policies to efficiently check roles
 */
async function syncUserRoles(
  supabase: SupabaseClient,
  userId: string,
  roles: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .rpc('sync_user_roles', {
        user_uuid: userId,
        new_roles: roles
      });

    if (error) {
      console.error('Error syncing user roles:', error);
      // Don't throw - this is not critical for the auth flow
    }
  } catch (err) {
    console.error('Failed to sync user roles:', err);
    // Don't throw - this is not critical for the auth flow
  }
}

/**
 * Verify admin access for Edge Functions
 * Returns authenticated user and configured Supabase client
 */
export async function verifyAdminAccess(req: Request): Promise<AuthMiddlewareResult> {
  try {
    // Extract bearer token
    const token = extractBearerToken(req);
    if (!token) {
      return {
        success: false,
        error: errorMessages.missingToken,
        status: 401
      };
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return {
        success: false,
        error: errorMessages.internalError,
        status: 500
      };
    }

    // First, verify the token with the anon key to check if it's valid
    const anonSupabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    );

    const { data: { user }, error: userError } = await anonSupabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid token:', userError?.message);
      return {
        success: false,
        error: userError?.message === 'Invalid JWT'
          ? errorMessages.invalidToken
          : errorMessages.expiredToken,
        status: 401
      };
    }

    // Check if user has admin role in app_metadata
    const roles = user.app_metadata?.roles || [];
    const isAdmin = roles.includes('admin');

    if (!isAdmin) {
      console.warn(`Access denied for user ${user.id}: missing admin role`);
      return {
        success: false,
        error: errorMessages.insufficientPermissions,
        status: 403
      };
    }

    // Create service-role client with user context for RLS
    // This allows the service role to act on behalf of the authenticated user
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    // Sync roles to public.user_roles table for RLS policies
    await syncUserRoles(supabase, user.id, roles);

    // Log successful admin access
    console.log(`✅ Admin access verified for user: ${user.email} (${user.id})`);

    return {
      success: true,
      user: user as AuthUser,
      supabase
    };

  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      success: false,
      error: errorMessages.internalError,
      status: 500
    };
  }
}

/**
 * Create authenticated response with proper CORS headers
 */
export function createAuthResponse(
  data: any,
  status: number = 200,
  origin?: string | null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Create CORS preflight response
 */
export function createCorsResponse(origin?: string | null): Response {
  return new Response('ok', {
    headers: getCorsHeaders(origin)
  });
}

/**
 * Admin authentication middleware wrapper
 * Handles authentication, CORS, and error responses
 */
export function withAdminAuth(
  handler: (req: Request, authResult: AuthResult) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return createCorsResponse(origin);
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(req);

    if (!authResult.success) {
      return createAuthResponse({
        success: false,
        error: authResult.error
      }, authResult.status, origin);
    }

    try {
      // Call the actual handler with authenticated context
      const response = await handler(req, authResult);

      // Ensure CORS headers are present in the response
      const headers = new Headers(response.headers);
      const corsHeaders = getCorsHeaders(origin);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      console.error('Handler error:', error);
      return createAuthResponse({
        success: false,
        error: errorMessages.internalError
      }, 500, origin);
    }
  };
}

/**
 * Utility to check if request has valid admin session (for non-critical paths)
 */
export async function hasAdminAccess(req: Request): Promise<boolean> {
  const authResult = await verifyAdminAccess(req);
  return authResult.success;
}

// Export types for use in Edge Functions
export type { AuthResult, AuthUser };