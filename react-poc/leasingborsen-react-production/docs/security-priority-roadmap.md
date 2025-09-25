# LeasingBuddy Security Remediation Roadmap

_Last updated: 2025-09-23_

This document consolidates the latest production risks, recommended fixes, and sequencing guidance. Tackle work in priority order; each item lists the current status, rationale, and concrete next steps.

## 🚨 Urgent (Blocker)

### 1. Lock Down Edge Functions & Admin API Surface
- **Status**: Partially mitigated — `admin-listing-operations` and `admin-seller-operations` now run behind `withAdminAuth`, but the remaining admin and AI functions still trust the service-role key, emit `Access-Control-Allow-Origin: *`, and do not verify JWTs. The Supabase config only enables `verify_jwt` for `manage-prompts`, and the React admin flows continue to hit several functions with the anon key.
- **Evidence**: `supabase/functions/admin-reference-operations/index.ts:5`, `supabase/functions/admin-image-operations/index.ts:6`, `supabase/functions/apply-extraction-changes/index.ts:4`, `supabase/functions/compare-extracted-listings/index.ts:5`, `supabase/functions/ai-extract-vehicles/index.ts:84`, `supabase/functions/remove-bg/index.ts:34`, `supabase/functions/pdf-proxy/index.ts:5`, `supabase/functions/batch-calculate-lease-scores/index.ts:10`, and `supabase/functions/manage-prompts/index.ts:1` instantiate service-role clients with wildcard CORS and no role check; `supabase/config.toml:324` limits `verify_jwt = true` to `manage-prompts`; UI components still send `Authorization: Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` in `src/components/admin/sellers/GenericBatchUploadDialog.tsx:194`, `src/components/admin/sellers/SellerBulkPDFExtractionModal.tsx:159/374`, and `src/components/admin/sellers/SellerPDFUploadModal.tsx:630`.
- **Actions**:
  1. Add `verify_jwt = true` blocks for every deployed Edge Function in `supabase/config.toml` and redeploy.
  2. Wrap `admin-image-operations`, `admin-reference-operations`, `apply-extraction-changes`, `compare-extracted-listings`, `pdf-proxy`, `remove-bg`, `ai-extract-vehicles`, `batch-calculate-lease-scores`, and `manage-prompts` in `withAdminAuth`, ensuring the middleware’s allow-listed CORS headers are reused.
  3. Replace direct `fetch` calls that send the anon key with `supabase.functions.invoke` (or manual fetches signed with the session access token) and delete the unused `process-pdf` client flow or reintroduce it behind the new middleware.
  4. Rotate the service-role key after rollout and move any per-function secrets into Supabase Edge Function secrets so leaked anon keys cannot escalate to admin access.

### 2. Protect AI Extraction Change Data
- **Status**: Not mitigated — the `apply-extraction-changes` Edge Function still runs with the service-role key and no auth, so RLS policies can be bypassed remotely; the migrations do not enable RLS on `extraction_listing_changes`, even though new policies reference `public.user_roles`.
- **Evidence**: `supabase/functions/apply-extraction-changes/index.ts:4` uses a global service-role client with wildcard CORS; `supabase/migrations/20250122_admin_authentication_system.sql:96` adds policies but there is no `ALTER TABLE extraction_listing_changes ENABLE ROW LEVEL SECURITY` anywhere in the migration set.
- **Actions**:
  1. Enable RLS on `extraction_listing_changes` and confirm policies cover admin, seller, and service-role use cases.
  2. Migrate `apply-extraction-changes` (and other extraction helpers) to `withAdminAuth`, keeping the user-context client for RLS evaluation.
  3. Add automated regression tests that fail if an unauthenticated request can apply pending changes.

### 3. Harden Storage Bucket Permissions
- **Status**: Not started — storage policies still grant every authenticated user full write permissions on the public `images` bucket.
- **Evidence**: `setup-staging-storage.sql:11`–`23` create permissive INSERT/UPDATE/DELETE policies with no owner checks or role gating.
- **Actions**:
  1. Drop the blanket storage policies and replace them with owner-aware rules (`owner = auth.uid()`) for write paths, plus explicit admin overrides.
  2. Re-run the SQL in staging/production and verify only intended principals can modify assets.
  3. Update documentation so future bucket creations inherit the tighter defaults.

### 4. Remove Real Secrets From Git & Rotate Keys
- **Status**: Not started — live Supabase anon keys and the Mixpanel token remain in tracked env files.
- **Evidence**: `.env:1`–`8`, `.env.local:1`–`8`, and `.env.staging:1`–`8` contain active keys committed to the repo.
- **Actions**:
  1. Replace secrets with placeholders in tracked files and rely on environment-specific secret stores.
  2. Rotate the exposed Supabase anon keys and Mixpanel token across all environments.
  3. Add a lint check or pre-commit hook to block future secret commits.

## ⚠️ High Priority

### 5. Apply RLS to Remaining Tables
- **Status**: Not started — there is no migration enabling RLS on `dealers`, `colours`, or `body_type_mapping`, so PostgREST still exposes the raw tables.
- **Evidence**: No `ALTER TABLE dealers ENABLE ROW LEVEL SECURITY` (or equivalent) exists in the migration set; legacy policies still rely on JWT `role` claims instead of `public.user_roles`.
- **Actions**:
  1. Enable RLS on each table and create policies that allow public reads (where required) and restrict writes to admin/service-role contexts.
  2. Migrate any remaining `is_admin()` checks to use `public.user_roles`.
  3. Add automated `verify_rls_security` coverage for these tables.

### 6. Fix Admin Frontend Auth Flow
- **Status**: Partially mitigated — the TanStack `beforeLoad` guard and `useAuth` hook block `/admin/*`, but several admin flows still bypass Supabase session signing by calling Edge Functions with the anon key.
- **Evidence**: Guard exists in `src/routes/admin.tsx:40`, yet the seller PDF workflows still post with the anon key in `src/components/admin/sellers/GenericBatchUploadDialog.tsx:194`, `src/components/admin/sellers/SellerBulkPDFExtractionModal.tsx:159/374`, and `src/components/admin/sellers/SellerPDFUploadModal.tsx:630/874`.
- **Actions**:
  1. Refactor these flows to depend on `useAuth().getAccessToken()` (or leverage `supabase.functions.invoke`) and surface 401/403 errors to the UI.
  2. Delete the fallback code that tolerates missing tokens and add integration tests ensuring fetch requests include the user JWT.

### 7. Update Supabase Auth Configuration
- **Status**: Not started — auth still references localhost URLs and lacks secure cookie flags.
- **Evidence**: `supabase/config.toml:110` keeps `site_url = "http://127.0.0.1:3000"` and does not configure `auth.cookies`.
- **Actions**:
  1. Set `site_url` and `additional_redirect_urls` to production, staging, and preview domains.
  2. Configure secure cookie flags (`secure = true`, `same_site = "lax"`, `domain = ".leasingborsen.dk"`).
  3. Disable public signups if admin invites are the only supported path.

## 🛡 Medium Priority

### 8. Ship Security Headers for Frontend
- **Status**: Not started — Vercel still serves default headers.
- **Evidence**: `vercel.json` lacks `headers` or `_headers` configuration.
- **Actions**:
  1. Add CSP, X-Frame-Options, Referrer-Policy, and Permissions-Policy headers.
  2. Include a regression check in CI to ensure headers persist across deploys.

### 9. Pin CDN Dependencies for Edge Functions
- **Status**: Not started — production functions fetch latest builds at runtime.
- **Evidence**: `supabase/functions/ai-extract-vehicles/index.ts:12` imports `openai@latest`; `supabase/functions/admin-reference-operations/index.ts:2`, `admin-image-operations/index.ts:2`, and `manage-prompts/index.ts:3` import `@supabase/supabase-js@2` without pinning.
- **Actions**:
  1. Pin exact versions in every Edge Function import and add a dependency update checklist.
  2. Monitor the bundle size after pinning and adjust build tooling if needed.

### 10. Rate-Limiter Persistence
- **Status**: Not started — the shared middleware stores counters in memory, so horizontal scaling disables the limits.
- **Evidence**: `supabase/functions/_shared/rateLimitMiddleware.ts:32` uses process-local `Map` instances with no external store.
- **Actions**:
  1. Persist counters in Redis or Supabase tables (or adopt Supabase’s function-level rate limiting once auth is enforced).
  2. Tag rate-limited responses with structured telemetry for monitoring.

## ✅ Completed / Newly Mitigated

- Admin routes now require a validated Supabase session via the TanStack `beforeLoad` guard (`src/routes/admin.tsx:40`) and `useAuth` hook.
- Shared middleware (`supabase/functions/_shared/authMiddleware.ts`) verifies admin roles, syncs `public.user_roles`, and is live on `admin-listing-operations` and `admin-seller-operations` (`supabase/functions/admin-listing-operations/index.ts:2`, `supabase/functions/admin-seller-operations/index.ts:2`).
- The `public.user_roles` table and supporting policies are deployed (`supabase/migrations/20250122_admin_authentication_system.sql`).

## Verification Checklist

After each sprint of remediation:
1. Run `SELECT * FROM verify_rls_security();` to ensure no table regressed.
2. Hit each Edge Function from an unauthorized origin; expect CORS failure.
3. Use valid/invalid JWTs to confirm auth gating.
4. Smoke-test admin workflows via browser to ensure new guards don’t block legitimate users.
5. Re-run automated tests (`npm run test`, edge function suites) and stage deploy before promoting to production.

---

For any questions or to log additional issues, update this document and coordinate via the security channel.
