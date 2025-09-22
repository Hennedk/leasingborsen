# LeasingBuddy Security Remediation Roadmap

_Last updated: $(date +%Y-%m-%d)_

This document consolidates the latest production risks, recommended fixes, and sequencing guidance. Tackle work in priority order; each item lists the goal, rationale, and concrete next steps.

## 🚨 Urgent (Blocker)

### 1. Lock Down Edge Functions & Admin API Surface
- **Risk**: All critical Supabase Edge Functions (`ai-extract-vehicles`, `admin-*`, `apply-extraction-changes`, `remove-bg`, `pdf-proxy`) trust the service-role key, skip JWT validation, and allow `Access-Control-Allow-Origin: *`. Any attacker can invoke admin capabilities or burn AI spend.
- **Fix**:
  1. Set `verify_jwt = true` in `supabase/config.toml` for every function.
  2. Add a shared auth helper (e.g., `supabase/functions/_shared/auth.ts`) that validates the bearer token via `supabase.auth.getUser()` and checks `app_metadata.role`.
  3. Replace wildcard CORS with an allow-list (`https://leasingborsen.dk`, staging, preview) and respond `403` if the `Origin` is not approved.
  4. Ensure all responses reuse the validated CORS headers.

### 2. Protect AI Extraction Change Data
- **Risk**: `extraction_listing_changes` never had RLS enabled; policies target a dropped `listing_changes` table. Authenticated actors can read/write every dealer’s pending AI changes.
- **Fix**:
  - `ALTER TABLE extraction_listing_changes ENABLE ROW LEVEL SECURITY;`
  - Admin policy: `USING (is_admin())` / `WITH CHECK (is_admin())`.
  - Seller SELECT policy: allow rows where the parent session matches `get_current_user_id()`.
  - Service-role policy for edge functions.

### 3. Harden Storage Bucket Permissions
- **Risk**: `storage.objects` policies allow any authenticated user to insert/update/delete all content in the public `images` bucket.
- **Fix**:
  - Drop the blanket policies in `setup-staging-storage.sql`.
  - Add owner-aware policies (`owner = auth.uid()`) for INSERT/UPDATE/DELETE and keep `SELECT` public.
  - Provide a service-role override for automated jobs.

### 4. Remove Real Secrets From Git & Rotate Keys
- **Risk**: `.env`, `.env.local`, `.env.staging` include live Supabase anon keys and Mixpanel token.
- **Fix**:
  1. Remove sensitive values from tracked files (keep `.env.example` placeholders only).
  2. Rotate Supabase anon keys and Mixpanel token; update Vercel/Supabase config directly.
  3. Add git hooks or lint checks to block future secret commits.

## ⚠️ High Priority

### 5. Apply RLS to Remaining Tables
- **Targets**: `dealers`, `colours`, `body_type_mapping`.
- **Motivation**: These tables still expose configuration data or allow unauthorized writes via PostgREST.
- **Actions**:
  - `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
  - Grant anon/authenticated read only where business requires it (`is_active = true` for dealers).
  - Restrict write operations to `is_admin()` and service-role.

### 6. Fix Admin Frontend Auth Flow
- **Risk**: Admin React hooks call edge functions with `fetch(... Authorization: Bearer ANON_KEY ...)`, so possession of the anon key equals full admin access.
- **Fix**:
  - Replace raw fetches with `supabase.functions.invoke(...)` so the browser sends the user’s session JWT.
  - Introduce route guards (e.g., TanStack loader + Supabase session check) around `/admin/*`.

### 7. Update Supabase Auth Configuration
- **Risk**: `supabase/config.toml` still points `site_url` to `http://127.0.0.1:3000` and leaves cookie flags unset; production cookies won’t be `Secure`, and redirect allow-lists miss real domains.
- **Fix**:
  - Set `site_url = "https://leasingborsen.dk"`.
  - Populate `additional_redirect_urls` with staging/preview domains.
  - Add `[auth.cookies] secure = true, same_site = "lax", domain = ".leasingborsen.dk"`.

## 🛡 Medium Priority

### 8. Ship Security Headers for Frontend
- **Risk**: Vercel deploys with default headers—no CSP, X-Frame-Options, etc.
- **Fix**: Extend `vercel.json` (or add `public/_headers`) with:
  - `Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co ...`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restricting sensors, camera, microphone.

### 9. Pin CDN Dependencies for Edge Functions
- **Risk**: Functions import `openai@latest` and `@supabase/supabase-js@2` from CDN, inheriting supply-chain changes instantly.
- **Fix**: Replace with explicit versions (e.g., `openai@5.5.1`, `@supabase/supabase-js@2.39.3`) and manage upgrades deliberately.

### 10. Rate-Limiter Persistence
- **Risk**: `_shared/rateLimitMiddleware.ts` stores counters in memory; multi-instance deployments disable limits.
- **Fix**: Port to a shared backend (Redis, Supabase table) or Supabase Functions rate limiting once JWT auth is in place.

## ✅ Completed / Newly Mitigated

- PDF proxy now enforces HTTPS, dealer allow-list, MIME/size limits (`supabase/functions/pdf-proxy/index.ts`).
- `listings`, `sellers`, `lease_pricing`, and most AI configuration tables have RLS policies from the July migrations—verify after applying the remaining gaps above.

## Verification Checklist

After each sprint of remediation:
1. Run `SELECT * FROM verify_rls_security();` to ensure no table regressed.
2. Hit each edge function from an unauthorized origin; expect CORS failure.
3. Use valid/invalid JWTs to confirm auth gating.
4. Smoke-test admin workflows via browser to ensure new guards don’t block legitimate users.
5. Re-run automated tests (`npm run test`, edge function suites) and stage deploy before promoting to production.

---

For any questions or to log additional issues, update this document and coordinate via the security channel.
