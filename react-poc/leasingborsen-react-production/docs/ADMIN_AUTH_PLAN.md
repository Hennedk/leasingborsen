# Admin Authentication & Authorization Plan

This plan implements secure authentication for the admin area while aligning with the core principles defined for the project: authentication at the edge, RLS enforcement in Postgres, roles as data, and strict handling of service-role secrets. It captures the required adjustments discovered during the latest review and supersedes earlier notes that assumed an `is_admin()` JWT claim.

## 1. Account Model & Sign-in Flow

- Use Supabase email/password with email confirmation enforced; keep magic links available for future use but disabled in the UI until tested.
- Disable open self-signups (`DISABLE_SIGNUP=true`) and rely on invites through the Admin API.
- Make MFA (TOTP) optional for now but require it for production roll-out. Expose MFA prompts in the admin UI once the base flow is stable.
- Enforce a strong password policy client-side (length checks + optional breach check).
- **Admin seeding:** After inviting the first admin, set `app_metadata.roles = ['admin']` via the Admin API (never from the client).

## 2. Role Management (Source of Truth + RLS Mirror)

- Treat roles as data. The source of truth remains `auth.users.app_metadata.roles` (string array).
- Mirror app roles to `public.user_roles` via:
  ```sql
  create table public.user_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    roles text[] not null default '{}',
    updated_at timestamptz not null default now()
  );
  ```
- **Sync strategy:** each privileged Edge Function call checks the bearer token, reads `user.app_metadata.roles`, and upserts `public.user_roles` if roles changed. This mirror enables performant JOINs inside RLS policies.

## 3. Database Hardening & RLS Updates

- Replace the current `is_admin()` helper (which looks for a `role` JWT claim) with policies that read from `public.user_roles`. Example for `public.listings`:
  ```sql
  alter table public.listings enable row level security;

  create policy admin_select_listings on public.listings
    for select using (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
          and 'admin' = any(ur.roles)
      )
    );

  create policy admin_write_listings on public.listings
    for all using (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
          and 'admin' = any(ur.roles)
      )
    ) with check (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
          and 'admin' = any(ur.roles)
      )
    );
  ```
- Repeat the pattern for other admin-managed tables (`public.lease_pricing`, `public.extraction_sessions`, `public.sellers`, etc.). Document every table that needs admin read/write access and ensure public read policies are explicit (no blanket `TRUE`).
- Keep RLS enabled on storage buckets and define admin-only write rules for sensitive buckets.

## 4. Edge Function Authentication Pattern

- Create `_shared/authMiddleware.ts` and export a `verifyAdminAccess` helper that:
  1. Validates the `Authorization: Bearer <token>` header.
  2. Uses a Supabase service-role client *only after* `auth.getUser(token)` succeeds.
  3. Ensures `'admin'` exists in `user.app_metadata.roles`; return 403 otherwise.
  4. Upserts `public.user_roles` before executing privileged logic.
- Instantiate the service-role client with `global: { headers: { Authorization: authHeader } }` so that downstream calls inherit the user context for RLS evaluation.
- Replace wildcard CORS with the curated list from `SECURITY_AUDIT_REPORT.md` (origin-aware response, limited headers/methods, long-lived max-age).
- Roll this middleware into every `supabase/functions/admin-*` function (`admin-listing-operations`, `admin-seller-operations`, etc.) before performing any data operations.

## 5. Client Session Handling (React + TanStack Router)

- Add an `adminSessionGuard` using TanStack Router `beforeLoad` (or `loader`) to block `/admin/*` routes until `supabase.auth.getSession()` resolves.
  ```ts
  export const Route = createFileRoute('/admin')({
    beforeLoad: async ({ preload }) => {
      if (preload) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw redirect({ to: '/login', search: { redirectTo: '/admin' } });
      }
      return { session };
    },
    component: AdminLayout,
  });
  ```
- Surface a suspense/loading state so admin children do not render while the guard runs.
- Expose a `useAdminSession` hook that reads the guarded context; admin data hooks must bail early (returning `enabled: Boolean(session)` to React Query) to avoid a storm of 401 requests before the session is ready.
- Read roles from the JWT only for optimistic UI (never for data gating). Server-side checks remain the authority.

## 6. Frontend Data Hooks & Mutations

- Update `useAdminListings`, `useAdminListing`, and related mutations to require a session object before invoking Supabase queries (`enabled: !!session` in React Query options).
- When calling Edge Functions from the client, send the bearer token via `Authorization: Bearer ${session.access_token}`.
- Handle 401/403 responses by redirecting to login or surfacing a “Insufficient permissions” banner in Danish.

## 7. Storage Controls

- Maintain separate buckets for public vs. admin assets. Ensure storage policies reference `public.user_roles` for admin-only writes.
- Revalidate the background-removal path to confirm tokens are required and stored assets inherit the correct bucket policies.

## 8. Environment & Secrets Hygiene

- Continue using distinct Supabase projects for dev/staging/prod; keep service-role keys in Edge Function environment variables only.
- Rotate anon/service keys on a schedule and invalidate cached tokens when roles change.
- Tag staging admin UIs with clear banners and distinct subdomains to avoid operator mistakes.

## 9. Operational Safeguards

- Ensure email confirmations and refresh-token reuse detection remain enabled.
- Add rate limiting to auth-adjacent Edge Functions (reuse existing `_shared/rateLimitMiddleware`).
- Introduce an `admin_audit` table that records user ID, action, timestamp, and a payload hash for sensitive operations.

## 10. Implementation Checklist

1. Enable email/password auth, require confirmations, disable public signups.
2. Seed and role-tag the first admin via Admin API.
3. Deploy `public.user_roles` table and migrate RLS policies to reference it.
4. Ship `_shared/authMiddleware.ts`; refactor every `admin-*` Edge Function to use it and tightened CORS.
5. Upsert user roles inside each Edge Function before hitting protected tables.
6. Guard `/admin/*` routes with TanStack Router `beforeLoad` + loading boundary.
7. Gate admin React Query hooks on a verified session and attach bearer tokens to Edge Function calls.
8. Recheck storage bucket policies (public read vs. admin write).
9. Rotate Supabase keys and document environment separation.
10. Implement rate limiting + audit logging for admin actions.

## Rollout Notes

- Refactor Edge Functions incrementally but deploy them together with the new middleware to avoid regressions (all admin functions depend on the same guard).
- Coordinate RLS migrations with downtime/maintenance window and backfill `public.user_roles` using `auth.users` data before flipping policies.
- After deploying the router guard, smoke-test every admin route to ensure redirects and loading states behave correctly in Danish/English locales.
