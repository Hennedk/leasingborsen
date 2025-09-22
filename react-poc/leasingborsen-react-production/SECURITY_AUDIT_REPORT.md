# 🔒 LeasingBuddy Production Security Audit Report

**Date**: 2025-01-22
**Auditor**: Security Analysis
**Scope**: Full stack security review of LeasingBuddy platform

## Executive Summary

Critical security issues identified that require immediate attention before production deployment. Most severe: **No authentication system exists**, **Missing RLS on 60% of tables**, **Wildcard CORS in all Edge Functions**, and **All admin endpoints are publicly accessible**.

---

## Findings Table

| ID | Severity | Area | File/Path | Why it's risky | Concrete fix | Effort | OWASP/CWE |
|----|----------|------|-----------|----------------|--------------|--------|-----------|
| 1 | **CRITICAL** | Auth | Entire Application | **NO AUTHENTICATION SYSTEM** - All admin routes (`/admin/*`) are publicly accessible | Implement authentication system | L | CWE-306 |
| 2 | **CRITICAL** | Authorization | `makes`, `sellers`, `lease_pricing`, etc. | RLS disabled on 12+ tables - any user can read/write all data | Enable RLS on all tables with proper policies | S | CWE-862 |
| 3 | **CRITICAL** | CORS | All Edge Functions | `Access-Control-Allow-Origin: '*'` allows any website to call your APIs | Restrict to your domain(s) | S | CWE-942 |
| 4 | **CRITICAL** | Auth | `admin-*` Edge Functions | No JWT verification - admin endpoints completely unprotected | Add JWT verification middleware | M | CWE-306 |
| 5 | **HIGH** | Auth | Edge Functions | Service role key usage bypasses all RLS | Use user JWT + RLS policies (after implementing auth) | L | CWE-250 |
| 6 | **HIGH** | Headers | `vercel.json` | Missing security headers (CSP, X-Frame-Options, etc.) | Add security headers configuration | S | CWE-693 |
| 7 | **MEDIUM** | Rate Limiting | `rateLimitMiddleware.ts` | In-memory storage doesn't work across instances | Use Redis/database for distributed rate limiting | M | CWE-770 |
| 8 | **MEDIUM** | PDF Pipeline | `ai-extract-vehicles/index.ts` | No file size limits for PDF extraction | Add 50MB limit | S | CWE-400 |
| 9 | **LOW** | Storage | `setup-staging-storage.sql` | Public bucket allows anyone to view all images | Expected for car images, but consider signed URLs for sensitive data | N/A | N/A |
| 10 | **LOW** | Dependencies | `package.json` | 3 low-severity vulnerabilities in dependencies | Run `npm audit fix` | S | CWE-1104 |

---

## 🚨 Top 10 Fix-First List (by Risk × Exploitability)

1. **Implement authentication system** - Application has NO authentication whatsoever
2. **Protect admin routes** - Anyone can access `/admin/*` pages
3. **Enable RLS on all tables** - Database completely exposed
4. **Fix CORS wildcard** - APIs callable from any domain
5. **Add JWT verification to admin endpoints** - Admin functions unprotected
6. **Add security headers** - XSS/clickjacking protection missing
7. **Stop using service role key in Edge Functions** - Bypasses all security
8. **Add PDF file size limits** - DoS vulnerability
9. **Implement distributed rate limiting** - Current implementation ineffective
10. **Add monitoring/alerting** - No visibility into attacks

---

## 🔴 CRITICAL: No Authentication System

The application currently has **NO authentication system** implemented:
- No login/signup functionality
- No user sessions or JWT tokens
- No protected routes in the frontend
- All `/admin/*` routes are publicly accessible via URL
- All admin Edge Functions can be called by anyone

### Evidence:
- No auth components in `src/components/`
- No auth hooks or context providers
- No Supabase auth calls in the codebase
- Admin routes have no route guards
- Edge Functions don't check for authenticated users

### Immediate Risk:
**Anyone can**:
- Access `/admin/listings` to create/edit/delete all car listings
- Access `/admin/sellers` to manage dealer accounts
- Access `/admin/ai-extractions` to trigger AI operations (cost implications)
- Call admin Edge Functions directly to bypass any frontend restrictions
- Modify or delete all data in the system

---

## RLS Coverage Report

### ❌ Tables WITHOUT RLS (Critical):
- `makes` - Reference data
- `models` - Reference data
- `body_types` - Reference data
- `fuel_types` - Reference data
- `transmissions` - Reference data
- `sellers` - **Critical: Contains dealer data**
- `lease_pricing` - **Critical: Contains pricing data**
- `dealers` - Dealer management
- `extraction_sessions` - AI extraction data
- `extraction_listing_changes` - Change tracking
- `batch_imports` - Import tracking
- `processing_jobs` - Job queue

### ✅ Tables WITH RLS:
- `listings` - Main car listings (has RLS but policies need review after auth implementation)

### 📦 Storage Buckets:
- `images` - Public bucket (appropriate for car images)

---

## Diff-Ready Fixes

### Fix 1: Implement Basic Authentication (Urgent)

First, implement a basic authentication system:

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      // Check admin status (implement your admin check logic)
      checkAdminStatus(session?.user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      checkAdminStatus(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdminStatus = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    // Implement your admin check logic here
    // For now, you could use a whitelist of admin emails
    const adminEmails = ['admin@leasingbuddy.dk']
    setIsAdmin(adminEmails.includes(user.email || ''))
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Fix 2: Protect Admin Routes

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

// Use in admin routes:
// <ProtectedRoute requireAdmin>
//   <AdminListings />
// </ProtectedRoute>
```

### Fix 3: Enable RLS on Critical Tables

```sql
-- Run in Supabase SQL Editor
-- Enable RLS on all tables
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_listing_changes ENABLE ROW LEVEL SECURITY;

-- Public read-only access for reference tables
CREATE POLICY "Public can view makes" ON makes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view models" ON models
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view body_types" ON body_types
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view fuel_types" ON fuel_types
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view transmissions" ON transmissions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Sellers: public read, admin write
CREATE POLICY "Public can view active sellers" ON sellers
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Only service role can modify sellers" ON sellers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Lease pricing: public read, admin write
CREATE POLICY "Public can view pricing" ON lease_pricing
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Only service role can modify pricing" ON lease_pricing
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin-only tables
CREATE POLICY "Only service role can access extraction_sessions" ON extraction_sessions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only service role can access extraction_listing_changes" ON extraction_listing_changes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Fix 4: CORS Headers for Edge Functions

```typescript
// supabase/functions/_shared/corsConfig.ts
export const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'https://leasingbuddy.dk',
    'https://www.leasingbuddy.dk',
    'http://localhost:5173', // Dev only
    'http://localhost:3000'  // Dev only
  ]

  const isAllowed = origin && allowedOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://leasingbuddy.dk',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400'
  }
}

// Use in Edge Functions:
import { getCorsHeaders } from '../_shared/corsConfig.ts'

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // ... rest of function
})
```

### Fix 5: JWT Verification for Edge Functions

```typescript
// supabase/functions/_shared/authMiddleware.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function verifyAdminAccess(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header')
  }

  const token = authHeader.substring(7)

  // For now, verify the token is valid
  // After implementing proper user roles, check for admin role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid token')
  }

  // Temporary: Check against admin email whitelist
  // TODO: Implement proper role-based access control
  const adminEmails = ['admin@leasingbuddy.dk']
  if (!adminEmails.includes(user.email || '')) {
    throw new Error('Insufficient permissions')
  }

  return user
}

// Use in admin Edge Functions:
import { verifyAdminAccess } from '../_shared/authMiddleware.ts'

serve(async (req) => {
  try {
    const user = await verifyAdminAccess(req)
    // Proceed with admin operation
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 401, headers: corsHeaders }
    )
  }
})
```

### Fix 6: Security Headers (vercel.json)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mixpanel.com; frame-ancestors 'none';"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

---

## Config Appendix - Recommended Values

| Setting | Current | Recommended | Location |
|---------|---------|-------------|----------|
| Authentication | **NONE** | Implement Supabase Auth | Frontend + Backend |
| Admin Protection | **NONE** | Route guards + JWT verification | Frontend + Edge Functions |
| CORS Origins | `*` | Specific domains only | All Edge Functions |
| Rate Limit Storage | In-memory | Database/Redis | `rateLimitMiddleware.ts` |
| File Upload Limit | None | 50MB | Edge Functions |
| Session Management | **NONE** | JWT with 15min expiry + refresh | Supabase Auth |
| Role Management | **NONE** | Implement RBAC | Database + Auth |

---

## Privacy & GDPR Concerns

1. **No data deletion path** for user data (GDPR Article 17 violation)
2. **No consent management** for analytics (Mixpanel configured)
3. **PII in logs** - User emails/phones may be logged
4. **No data retention policy** documented
5. **No user authentication** means no audit trail of who performs actions

---

## Security Remediation Plan

### 🔴 EMERGENCY: Fix Authentication (Day 0-1)

#### 1. Implement Basic Authentication
- Set up Supabase Auth with email/password
- Create login page and auth context
- Add protected route wrapper component
- Whitelist admin emails initially

#### 2. Protect All Admin Routes
- Wrap all `/admin/*` routes with authentication check
- Redirect unauthenticated users to login
- Add loading states during auth check

#### 3. Secure Edge Functions
- Add JWT verification to all admin Edge Functions
- Return 401 for unauthorized requests
- Log authentication failures

### 🔴 Critical Issues (Day 2-3)

#### 4. Enable RLS on All Tables
- Run SQL migration to enable RLS on 12 unprotected tables
- Add appropriate policies for public read / authenticated write
- Test that frontend still works with RLS enabled

#### 5. Fix CORS Wildcard
- Create shared CORS configuration with domain allowlist
- Update all 14 Edge Functions to use new CORS config
- Test from different origins to verify restrictions work

### 🟡 High Priority (Week 1)

#### 6. Implement Security Headers
- Update vercel.json with CSP, X-Frame-Options, etc.
- Test that app still functions with strict CSP
- Monitor for CSP violations

#### 7. Add Resource Limits
- Implement 50MB file size limit for PDFs
- Add request body size limits on Edge Functions
- Implement proper distributed rate limiting

### 🟢 Medium Priority (Pre-Launch)

#### 8. Implement Proper RBAC
- Create user_roles table
- Implement role-based policies
- Replace email whitelist with proper roles

#### 9. Add Monitoring
- Implement audit logging for all admin actions
- Set up alerts for suspicious activity
- Add error tracking (Sentry)

#### 10. Data Privacy Compliance
- Create user data deletion endpoint
- Implement consent management for analytics
- Add privacy policy and cookie notice
- Document data retention policies

---

## Files to Modify

**Immediate (Authentication)**:
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/components/ProtectedRoute.tsx`
- Create: `src/pages/Login.tsx`
- Update: All admin route files to use ProtectedRoute

**Critical**:
- `supabase/migrations/` - New RLS migration
- All Edge Functions in `supabase/functions/`
- `vercel.json` - Security headers
- Create: `supabase/functions/_shared/authMiddleware.ts`
- Create: `supabase/functions/_shared/corsConfig.ts`

---

## Estimated Timeline

- **EMERGENCY (Auth)**: 1-2 days
- **Critical fixes**: 2-3 days
- **High priority**: 3-5 days
- **Full remediation**: 2-3 weeks
- **Testing & validation**: 1 week

**Total**: ~4 weeks for production-ready security

---

## Immediate Actions Required

1. **RIGHT NOW**: Implement authentication to protect admin routes
2. **TODAY**: Enable RLS on all tables
3. **TOMORROW**: Fix CORS headers and add JWT verification
4. **THIS WEEK**: Implement security headers and resource limits
5. **BEFORE LAUNCH**: Full penetration test, GDPR compliance audit

---

## Additional SQL Queries for Analysis

### Check current RLS status:
```sql
-- Tables with RLS status
SELECT c.relname AS table, pg_catalog.pg_class.relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r';
```

### View active policies:
```sql
-- Active policies
SELECT polrelid::regclass AS table, polname, polcmd, polroles::regrole[] AS roles, polqual, polwithcheck
FROM pg_policies
ORDER BY polrelid, polcmd;
```

---

**Report Generated**: 2025-01-22
**Next Review**: Before production deployment
**Critical Update**: Application has NO authentication system - all admin functions are publicly accessible