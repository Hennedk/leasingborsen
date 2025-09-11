# Documentation Drift Report — Leasingbørsen React Production

Generated: 2025-09-09

This report identifies mismatches between documentation/specs and the actual code/behavior. Each discrepancy includes evidence with concrete file paths and line numbers. See the Evidence Appendix for excerpts.

## Scope Update

- Added Docs/specs sources: `CLAUDE.md` (root) and any Markdown linked from `README.md` and `claude.md` (depth: 2).
- Helper script added: `scripts/list-linked-markdown.mjs` – run `node scripts/list-linked-markdown.mjs` to list included linked `.md` docs for auditing.
- Current discovery output:
  - README.md (no additional relative .md links found in this run)
- Manual inclusion: `CLAUDE.md` (uppercase) added to scope for claims inventory.

## Executive Summary

- README staging commands drift: README/docs instruct `npm run staging:deploy` and `staging:check`, but scripts are missing; use `staging:deploy-functions`/`staging:deploy-all` instead.
- Feature flag envs listed in README (`VITE_BATCH_PROCESSING_ENABLED`, `VITE_MOBILE_FILTERS_ENABLED`, `VITE_PERFORMANCE_MONITORING`) are not referenced by the frontend code.
- Mileage filter defaults drift: Docs specify “15k preselected” and “15k not counted as active,” but store defaults to null and always chips mileage if set.
- Analytics page_view implementation matches plan: EU host, opt-out-by-default, 30‑min session TTL, 200ms de-dup, SPA marking, filter whitelist, legacy `max_price` support.
- Analytics broader plan (7 core events) not yet implemented beyond `page_view`; tracked as planned in docs, not a production gap.
- LeaseScore v2.1 EML docs match the single source of truth used by frontend and Edge Functions; triggers for `period_months` are present in migrations.
- Env token handling for Mixpanel matches docs; auto-consent explicitly marked as temporary in docs and implemented in App.tsx.
- Edge Functions list drift in dev docs: `staging-check` and `test-function` are documented but not present in `supabase/functions`.
- README tech versions align with `package.json` (React 19.1, TS 5.8.3, Tailwind 4.1.8, React Query 5.80.7, Zustand 5.0.5).
- Env coverage gaps: `.env.example` includes Responses API flags (for Deno), but no front-end usage; also `VITE_ENVIRONMENT` is referenced in code but not documented in `.env.example`.

Additional items from CLAUDE.md breadth-scan:
- CLAUDE.md routes drift: references `/admin/ai-extractions` (PDF review), but current app uses `/admin/extraction-sessions` routes.
- Edge Functions count drift: CLAUDE.md and dev docs state “14” functions; repository contains 15 (including `get-similar-cars` plus newly scaffolded utilities).
- Docs reference `npm run typecheck`, but no `typecheck` script exists in package.json.

## Drift Table

| Area | Claim | Reality | Severity | Confidence | Recommendation |
|------|-------|---------|----------|------------|----------------|
| Docs → Scripts | “Deploy to staging: npm run staging:deploy” (README.md:119–120; docs/DEVELOPMENT_COMMANDS.md:213–220) | No `staging:deploy` script. Available: `staging:deploy-functions`, `staging:deploy-all`. (package.json) | High | High | Update docs to reference `staging:deploy-all` or add a `staging:deploy` alias script.
| Docs → Scripts | “Check staging: npm run staging:check” (docs/DEVELOPMENT_COMMANDS.md:213–220) | No `staging:check` script in `package.json`. | High | High | Add a `staging:check` script or remove from docs; suggest a minimal health-check script.
| Config → Env | README instructs setting `VITE_BATCH_PROCESSING_ENABLED`, `VITE_MOBILE_FILTERS_ENABLED`, `VITE_PERFORMANCE_MONITORING` (README.md:57–65) | These vars are not read anywhere in `src/**` (grep shows only docs/scripts references). | Medium | High | Remove from README or wire them into code (feature-gate UI areas), and add to env coverage guardrail.
| UI/Filters | “Default state: 15k preselected; 15000 shouldn’t count as active filter” (MILEAGE_FILTER_IMPLEMENTATION_PLAN.md) | Store defaults `mileage_selected: null`; `getActiveFilters` adds mileage chip for any non-null value; `hasStoredFilters` treats any non-null mileage as active. (src/stores/consolidatedFilterStore.ts:34–48; 248–286; 304–318) | High | High | Set default to 15000; suppress chip and active‑filter for 15000; adjust `hasStoredFilters` and `resetFilters` accordingly.
| Analytics | “Opt-out by default; EU data residency; 200ms de-dup; SPA marking; 30‑min TTL; filter whitelist; legacy `max_price` allowed.” (docs/TRACKING_PLAN_PAGE_VIEW.md:5–14, 165–173, 241–283) | Implemented in code: mp.ts (lines 48–55, 119–121, 30), pageview.ts (lines 54–58, 175–190), App.tsx SPA marking (lines 49–55). | — | High | No change; keep as is. Consider adding unit tests (see Guardrails).
| Analytics Scope | “Exactly 7 core events (listing_view, listing_click, filters_change, filters_apply, dealer_outbound, …)” (docs/ANALYTICS_FLOW_ARCHITECTURE.md) | Only `page_view` implemented; code has TODOs for other events (src/analytics/mp.ts:377–380). | Medium | High | Align roadmap wording in README and keep Phase 2 TODOs. Optionally add stubs and guardrail tests.
| Edge Functions | “Deploy staging-check, test-function” (docs/DEVELOPMENT_COMMANDS.md: Utilities section) | Folders missing: `supabase/functions/staging-check`, `supabase/functions/test-function`. | Medium | High | Update docs to drop these or add minimal functions.
| Config → Env | “VITE_ENVIRONMENT=staging supported” (src/config/environments.ts:55) | `.env.example` doesn’t document `VITE_ENVIRONMENT`. | Low | High | Add `VITE_ENVIRONMENT` to `.env.example` with comment.
| Env Scope | `.env.example` includes Responses API flags (for Edge Functions) | Front-end doesn’t read them; Edge Functions use `Deno.env.get(...)`. | Low | High | Clarify in `.env.example` which keys are frontend vs Edge Functions.
| Docs → UI Routes | “PDF review at /admin/ai-extractions” (CLAUDE.md:74,95) | No such route; current routes: `/admin/extraction-sessions` and related (src/routes/admin/extraction-sessions.*). | Medium | High | Update CLAUDE.md to `/admin/extraction-sessions`.
| Docs → Edge Functions | “Edge Functions (14 total)” (CLAUDE.md:196,231) and “Complete Deployment List (14 Functions)” (docs/DEVELOPMENT_COMMANDS.md:80) | Actual functions with index.ts: 15, including `get-similar-cars`, `staging-check`, `test-function`. | Low | High | Update counts to 15 and include `get-similar-cars` in lists.
| Docs → Scripts | “npm run typecheck” exists (docs/DEVELOPMENT_COMMANDS.md:239,326; TANSTACK_ROUTER_MIGRATION_PLAN.md:1286) | No `typecheck` script in `package.json`. | Low | High | Add `typecheck` script (`tsc -b --noEmit`) or update docs to remove.

## Evidence Appendix

See docs/audits/evidence-appendix.md for 10 concise excerpts with paths and line numbers covering: README commands, scripts in package.json, filter store defaults/logic, analytics init & track, SPA marking, Mixpanel EU host + opt-out, results filter whitelist, event TODOs, Edge Functions absence, and env usage.

## Action Plan

1) Fix staging commands in docs (High)
- Owner: Docs/DevEx
- Files: README.md, docs/DEVELOPMENT_COMMANDS.md
- Change: Replace `staging:deploy` with `staging:deploy-all` or add alias in package.json; remove/add `staging:check` accordingly.

2) Align mileage default and active-filter rules (High)
- Owner: Frontend
- Files: src/stores/consolidatedFilterStore.ts
- Change: default `mileage_selected=15000`; don’t create chip when 15000; treat 15000 as non-active in `hasStoredFilters`; reset to 15000.

3) Env flags cleanup (Medium)
- Owner: Frontend/Docs
- Files: README.md, .env.example
- Change: Remove unused flags from README or implement checks in code. Add `VITE_ENVIRONMENT` to `.env.example`.

4) Edge Functions list cleanup (Medium)
- Owner: Backend/Docs
- Files: docs/DEVELOPMENT_COMMANDS.md
- Change: Drop `staging-check`/`test-function` or add minimal functions later.

5) Analytics guardrails (Medium)
- Owner: Frontend
- Files: tests/analytics.spec.ts, tests/contracts.spec.ts
- Change: Add stubs to assert `page_view` properties, results filter whitelist, and types; expand in Phase 2.

6) Env coverage guardrail (Medium)
- Owner: Frontend/DevEx
- Files: scripts/check-env-coverage.ts
- Change: Script to compare `import.meta.env`/`process.env`/`Deno.env.get` keys vs `.env.example` and `supabase/functions/.env.example`.
