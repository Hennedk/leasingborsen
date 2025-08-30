# Listings Fetch/Filter/Sort — TDD Refactor Plan

## Goals

- Drive all changes via tests (Red → Green → Refactor) to preserve current behavior while improving performance and maintainability.
- Move selection/sort/pagination server-side behind a feature flag, validated by test suites and parity checks.
- Unify mappings and schemas with single-source utilities, verified by tests.
- Reduce payloads and client CPU without changing user-visible results.

---

## Guiding Principles

- Contract-first: write tests for public contracts (server response, hooks, route schema) before implementation.
- Characterization: capture current behavior in tests to prevent regressions (selection logic, tie-breakers, mapping).
- Single source of truth: one mapping module consumed by both client and server; tested in isolation.
- Incremental rollout: feature-flagged client integration, parity-tested vs current client-only path.

---

## Milestone 0 — Baseline Characterization (tests only)

Purpose: Freeze current behavior in tests before changing code.

Write tests (should fail only if behavior changes):

1) Offer Selection (Vitest)
- File: `src/lib/__tests__/offerSelection.characterization.test.ts`
- Temporary import path: selection logic is currently inside `src/lib/supabase.ts` (`selectBestOffer`). Create a temporary exported shim in a new module `src/lib/offerSelection.characterization.ts` that re-exports the existing function untouched.
- Cases:
  - Exact mileage match returns an offer; strict mode excludes otherwise.
  - 35k+ mileage groups (35k/40k/45k/50k) match in strict mode.
  - Flexible mode finds closest mileage (tie → lower value).
  - Term preference 36 → 24 → 48.
  - Deposit preference: closest to target deposit (absolute distance), with lower monthly price as tie-breaker.

2) Sorting (Vitest)
- File: `src/lib/__tests__/sorting.characterization.test.ts`
- Use fixtures to validate sorting by `lease_score_desc`, price asc, price desc, including tie-breakers (score then make+model alpha) using selected-offer fields.

3) Mapping (Vitest)
- File: `src/lib/__tests__/filterMapping.characterization.test.ts`
- Assert current `filterTranslations` behavior and any mapping logic used in `applyFilters` (body/fuel/transmission). Identify mismatches and document them (fail tests only if behavior unintentionally changes).

4) Route Schema (Vitest)
- File: `src/routes/__tests__/listingsSearchSchema.characterization.test.ts`
- Capture current zod schema behavior, including where multi-select values are silently dropped (fuel/transmission). These tests inform later schema fixes.

5) getListingById with offerSettings (Vitest) - NEW FEATURE
- File: `src/lib/__tests__/getListingById.characterization.test.ts`
- Test new offerSettings parameter functionality added in commit 15cd8e1:
  - Providing targetMileage/targetDeposit/targetTerm selects appropriate offer
  - Defaults to 15000/35000/null when not provided
  - Returns selected_* metadata fields for chosen offer
  - Falls back gracefully when exact match not found

6) useLeaseCalculator Initialization (Vitest) - NEW FEATURE
- File: `src/hooks/__tests__/useLeaseCalculator.initialization.test.ts`
- Test complex initialization logic added in commit 15cd8e1:
  - Priority 1: Uses car.selected_mileage/selected_term/selected_deposit when available
  - Priority 2: Finds best match with same mileage (36→24→48 term preference)
  - Priority 3: Falls back to cheapest overall option
  - Handles navigation from /listings preserving offer selection

Leverage existing tests where available:
- If prior suites exist (e.g., `lease-score-sorting.test.ts`, `filter-mappings.test.ts`), import and extend them rather than duplicating.
- Add fixtures and assertions to cover any uncovered edge cases.

---

## Milestone 0.25 — Configuration Unification (critical fix)

Purpose: Resolve deposit target inconsistency found in commit e061aa2.

Problem (PARTIALLY RESOLVED):
- ✅ All call sites now consistently use 35000 (getListings, getListingById, getListingCount)
- ❌ Value is hardcoded in multiple places instead of centralized configuration
- Risk: Future changes could re-introduce inconsistencies without central config

Tests first:
- `src/lib/__tests__/leaseDefaults.consistency.test.ts`:
  - Assert all call sites use centralized configuration (not hardcoded 35000)
  - Add lint rule to fail CI if hardcoded deposit targets found
  - Verify deposit changes affect all functions consistently
  - Test both 0 and 35000 targets show different selection results (regression prevention)

Implementation:
- Create `src/config/leaseDefaults.ts` with centralized constants:
  ```typescript
  export const LEASE_DEFAULTS = {
    targetDeposit: 35000, // Business confirmed default (currently hardcoded)
    defaultTerm: 36,
    defaultMileage: 15000
  } as const
  ```
- Update all call sites to use `LEASE_DEFAULTS.targetDeposit`:
  - `getListings`: Replace hardcoded `35000` with config
  - `getListingById`: Replace hardcoded `35000` with config  
  - `getListingCount`: Replace hardcoded `35000` with config
- Add ESLint rule to prevent future hardcoded deposit values

Validation:
- Characterization tests must pass after centralization (no behavior change expected)
- Configuration centralization should be purely refactoring with identical results
- Note: The behavior change from 0 to 35k preference has already been implemented

---

## Milestone 0.5 — Test Infrastructure Setup

Tests first (infra):
- Configure MSW for API mocking (global server lifecycle hooks in Vitest setup).
- Configure Deno test runner for Edge Functions; add `deno.json` with test permissions.
- Create test data factories (e.g., `src/test/factories/listingFactory.ts`) with deterministic seeds.
- Add coverage thresholds in Vitest and Deno; fail CI when below targets.
- Introduce a shared test utils module for common assertions and fixtures.

---

## Milestone 1 — Extract Pure Selection Module (unit-first)

Objective: Isolate selection into a pure, testable module without behavior change.

Tests first:
- Add `src/lib/__tests__/offerSelection.test.ts` (same cases as characterization, plus edge cases for bad data).

Implementation:
- Create `src/lib/offerSelection.ts` exporting `selectBestOffer` (pure; copied from current with minimal changes to imports/types).
- Update `src/lib/supabase.ts` to import and use `selectBestOffer` (no logic changes). All characterization + new unit tests must pass.

Refactor:
- Add types for selection result (include `selection_method`), using a discriminated union on `selection_method`.
- Break logic into helpers (each covered by unit tests): `findMatchingOffers`, `applyTermPreference`, `selectClosestToDepositTarget`.
- Add property-based tests for deposit selection invariants:
  - Selected deposit is always closest to target (absolute distance)
  - Ties broken by lower monthly price
  - Empty offers return null
- Maintain exact behavior; defer enhancements until server move.

---

## Milestone 2 — Sort Semantics Unification (unit-first)

Objective: Canonicalize sort options and provide a backward-compatible adapter.

Tests first:
- `src/lib/__tests__/sortOrderAdapter.test.ts`
  - `'asc' → 'price_asc'`, `'desc' → 'price_desc'` mapping.
  - Invalid inputs map to default `'lease_score_desc'`.

Implementation:
- Add `src/lib/sortOrder.ts` with `toCanonicalSort(order: string): 'lease_score_desc'|'price_asc'|'price_desc'`.
- Use adapter in UI sort components and hooks (no behavior change). Sorting characterization tests must still pass.

---

## Milestone 3 — Route Schema Alignment (schema-first)

Objective: Update zod schema to accept arrays/CSV for `fuel_type` and `transmission` (like `body_type`).

Tests first:
- Update/replace `src/routes/__tests__/listingsSearchSchema.test.ts`:
  - Accept `fuel_type`/`transmission` as CSV or array (backward compatible with singular values).
  - Preserve defaults for `page`, `limit`, `sort`, `view`.
  - Ensure valid canonical values only (simplified vocabularies).
  - Support mileage parameter under both `km` (current) and `mileage_selected` (new), with consistent coercion and precedence.

Implementation:
- Update `src/routes/listings.tsx` zod schema to accept multi-select and normalized values.
- Ensure `useUrlSync` writes arrays as CSV consistently for these fields.
- Maintain backward compatibility during transition:
  - Parse legacy singular `fuel_type`/`transmission` into single-element arrays.
  - Accept both `km` and `mileage_selected` in search; map `km` → `mileage_selected` in state; prefer `mileage_selected` if both provided.

---

## Milestone 4 — Server Endpoint (contract-first)

Objective: Implement server-side selection/sort/pagination behind a stable API contract.

Tests first (Deno):
- Directory: `supabase/functions/get_listings/__tests__/`
- Files:
  - `handler.contract.test.ts`: Validates request/response contract (status, shape, `has_more`, `total`).
  - `handler.selection.test.ts`: Validates selection semantics on synthetic datasets.
  - `handler.sorting.test.ts`: Ensures sort order and tie-breakers.
  - `handler.pagination.test.ts`: Ensures stability across pages (no duplicates, correct slicing).

Testing strategy:
- Design the handler to accept an injected data provider (in-memory arrays) under `DENO_ENV=test` so tests do not require a live DB.
- Provide small fixtures with multiple offers per listing to exercise selection.
 - Add property-based tests for selection and sorting invariants (e.g., closest mileage tie-break chooses lower value; score tie -> price tie -> alpha order).

Implementation:
- Create `supabase/functions/get_listings/index.ts`:
  - Validate input with zod (include `targetDeposit` parameter).
  - Normalize filters using a shared mapping utility (see Milestone 5).
  - Query minimal columns + `lease_pricing` (when not in injected test mode).
  - Deduplicate, select offer (reuse `selectBestOffer` with `targetDeposit`), compute lease score for selected offer, sort, slice, count.
  - Return `{ data, total, page, limit, has_more }`.
 - Consider a Postgres RPC alternative for lower latency; keep interface identical.

Refactor:
- Ensure deterministic behavior by stable keys (id/make+model) for tie-breakers.
 - Add request validation middleware, correlation IDs, and basic rate limiting. Include tests for validation errors (400/422) and rate-limit responses (429).

---

## Milestone 5 — Unified Mapping Utility (unit-first)

Objective: Single source of truth for mapping UI values → DB values for body/fuel/transmission.

Tests first:
- `src/lib/__tests__/filterMapping.test.ts`:
  - `getDatabaseValuesForSimplifiedFuelType('Hybrid')` returns all hybrid variants.
  - Body type alias mapping (e.g., `Station Wagon → Stationcar`).
  - Batch translate and cache behaviors.

Implementation:
- Extend `filterTranslations` to expose server-consumable mappers (already present; ensure exhaustive and documented).
- Server handler uses these mappers before building `.in(...)` filters.
- Remove duplicate mapping logic from `src/lib/supabase.ts` once FE is switched (keep behind flag until then).

---

## Milestone 5.5 — Error Handling Strategy (tests first)

Objective: Robust error handling across server and client.

Tests first:
- Define error response contract from the server (status code, `error.code`, `error.message`, optional `correlation_id`).
- MSW tests for transient failures and retries (e.g., 500 → retry with backoff), and permanent failures (400/422).
- UI tests for user-friendly Danish messages and retry actions.

Implementation:
- Implement retry policy in hooks (limited attempts for 5xx, no retry for 4xx).
- Circuit breaker/fallback to old path when Edge Function errors exceed threshold (feature flag aware).
- Ensure Danish error copy strings are centralized and tested.

---

## Milestone 6 — Client Data Hooks (MSW-first)

Objective: Replace client-side pagination/sort with server pagination via Edge Function.

Tests first (Vitest + MSW):
- `src/hooks/__tests__/useInfiniteListings.server.test.ts`:
  - Mocks the Edge Function endpoint.
  - Asserts correct request payload mapping from filters/sort/pagination.
  - Uses `has_more` to advance pages (no local sort/slice).
  - Exposes `total` for count; keep `useListingCount` as a lightweight alternative (tests ensure parity when flagging between paths).
  - Prefetch next page on near-end scroll; optimistic UI for filter changes (validate prefetch calls & cache usage).

Implementation:
- Update `useInfiniteListings` to POST to Edge Function.
- Use `pageParam` to compute `offset` and pass `limit`.
- Replace `getNextPageParam` with `has_more` logic.
- Update components to use `total`.
 - Consider React Suspense boundaries for loading states.

Feature flag:
- Gate via `config.features.serverListings` and keep old path as fallback until parity milestone passes.

---

## Milestone 7 — Parity and Cutover (tests + tooling)

Objective: Verify new path parity and switch default.

Tests/tooling:
- Add a dev-only parity utility:
  - `src/tools/__tests__/parity.compare.test.ts` (node-only): fetch both old and new paths for the same filters and compare top N IDs, order, and counts.
  - Allow a small tolerance for ordering when lease scores are equal.

Cutover steps:
- Enable `serverListings` in staging; run parity tests and manual spot checks.
- If green, enable in production. Keep fallback for 2 release cycles and add telemetry to track old vs new path usage.

Cleanup:
- Remove client-side selection/sort/slice code from `src/lib/supabase.ts`.
- Remove duplicate mappings; simplify route schema/URL sync code paths.

---

## Acceptance Criteria (test-defined)

- All characterization tests pass before and after refactor.
- New unit tests for selection, mapping, and sort pass.
- Edge Function contract and behavior tests (Deno) pass.
- MSW hook tests pass, with correct pagination and totals.
- Parity test shows identical IDs and near-identical ordering for top N results under common filters.
- Coverage thresholds: 
  - `src/lib/offerSelection.ts` ≥ 95%
  - `supabase/functions/get_listings/index.ts` core logic ≥ 85%

Success Metrics (monitor post-cutover):
- User-perceived filter-to-results time.
- Cache hit rate (client and edge).
- Edge Function cold-start frequency.
- Error rate by filter combination.
- Engagement metrics (filter usage, pagination depth).

---

## Test Skeletons

1) Offer Selection (Vitest)
```ts
import { describe, it, expect } from 'vitest'
import { selectBestOffer } from '@/lib/offerSelection'

const offers = [
  { mileage_per_year: 10000, period_months: 36, first_payment: 0, monthly_price: 2595 },
  { mileage_per_year: 15000, period_months: 24, first_payment: 0, monthly_price: 2795 },
  { mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 2495 },
  { mileage_per_year: 15000, period_months: 36, first_payment: 40000, monthly_price: 2400 },
  { mileage_per_year: 20000, period_months: 36, first_payment: 0, monthly_price: 2995 }
]

describe('selectBestOffer', () => {
  it('prefers exact mileage, 36 months, and closest to target deposit', () => {
    const res = selectBestOffer(offers, 15000, 35000, true)
    expect(res?.mileage_per_year).toBe(15000)
    expect(res?.period_months).toBe(36)
    expect(res?.first_payment).toBe(35000) // Closest to target 35000
  })
  
  it('breaks deposit ties by lower monthly price', () => {
    const tieOffers = [
      { mileage_per_year: 15000, period_months: 36, first_payment: 30000, monthly_price: 2600 },
      { mileage_per_year: 15000, period_months: 36, first_payment: 40000, monthly_price: 2500 }
    ]
    const res = selectBestOffer(tieOffers, 15000, 35000, true)
    // Both are 5000 away from target, lower price wins
    expect(res?.monthly_price).toBe(2500)
    expect(res?.first_payment).toBe(40000)
  })
})
```

2) Sort Order Adapter (Vitest)
```ts
import { toCanonicalSort } from '@/lib/sortOrder'
import { describe, it, expect } from 'vitest'

describe('toCanonicalSort', () => {
  it('maps asc/desc', () => {
    expect(toCanonicalSort('asc')).toBe('price_asc')
    expect(toCanonicalSort('desc')).toBe('price_desc')
  })
  it('defaults to lease_score_desc', () => {
    expect(toCanonicalSort('unknown')).toBe('lease_score_desc')
  })
})
```

3) Edge Function (Deno)
```ts
import { assert, assertEquals } from 'https://deno.land/std/assert/mod.ts'
import { handler } from '../index.ts'

Deno.test('paginates and sorts correctly', async () => {
  const req = new Request('http://local', {
    method: 'POST',
    body: JSON.stringify({
      filters: { makes: [], models: [], body_type: [], fuel_type: [], transmission: [], mileage_selected: 15000 },
      pagination: { offset: 0, limit: 20 },
      sort: 'lease_score_desc',
      strictMileage: true,
      targetDeposit: 35000
    })
  })
  const res = await handler(req)
  assertEquals(res.status, 200)
  const body = await res.json()
  assert(Array.isArray(body.data))
  assert(typeof body.total === 'number')
  assert(typeof body.has_more === 'boolean')
})
```

4) Hook with MSW (Vitest)
```ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useInfiniteListings } from '@/hooks/useListings'

const server = setupServer(
  http.post('/functions/v1/get_listings', async () => {
    return HttpResponse.json({ data: [{ id: '1', selected_monthly_price: 2000 }], total: 1, page: 0, limit: 20, has_more: false })
  })
)

// init server lifecycle hooks ...

it('requests server with filters and paginates via has_more', async () => {
  const qc = new QueryClient()
  const wrapper = ({ children }: any) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useInfiniteListings({ makes: [], models: [] }, 'lease_score_desc'), { wrapper })
  // assert initial page loaded and has_more -> false stops pagination
})
```

5) getListingById with offerSettings (Vitest)
```ts
import { describe, it, expect } from 'vitest'
import { CarListingQueries } from '@/lib/supabase'

describe('getListingById with offerSettings', () => {
  it('uses provided offerSettings to select specific offer', async () => {
    const result = await CarListingQueries.getListingById('test-id', {
      targetMileage: 25000,
      targetDeposit: 35000,
      targetTerm: 36
    })
    
    expect(result.data?.selected_mileage).toBe(25000)
    expect(result.data?.selected_deposit).toBe(35000)
    expect(result.data?.selected_term).toBe(36)
  })
  
  it('defaults to 15000/35000 when offerSettings not provided', async () => {
    const result = await CarListingQueries.getListingById('test-id')
    // Should use selectBestOffer with defaults
    expect(result.data?.offer_selection_method).toBeDefined()
  })
  
  it('falls back gracefully when exact match not found', async () => {
    const result = await CarListingQueries.getListingById('test-id', {
      targetMileage: 99000, // Non-existent mileage
      targetDeposit: 35000
    })
    
    // Should still return a result with best available offer
    expect(result.data).toBeTruthy()
    expect(result.data?.offer_selection_method).toBe('closest')
  })
})
```

6) useLeaseCalculator Initialization (Vitest)
```ts
import { renderHook } from '@testing-library/react'
import { useLeaseCalculator } from '@/hooks/useLeaseCalculator'
import { CarListing } from '@/types'

describe('useLeaseCalculator initialization priorities', () => {
  it('priority 1: initializes from car selected_* values', () => {
    const carWithSelected: CarListing = {
      id: 'test',
      selected_mileage: 25000,
      selected_term: 24,
      selected_deposit: 50000,
      all_lease_pricing: [
        { mileage_per_year: 25000, period_months: 24, first_payment: 50000, monthly_price: 3000 },
        { mileage_per_year: 15000, period_months: 36, first_payment: 0, monthly_price: 2500 }
      ]
    } as CarListing
    
    const { result } = renderHook(() => useLeaseCalculator(carWithSelected))
    
    expect(result.current.selectedMileage).toBe(25000)
    expect(result.current.selectedPeriod).toBe(24)
    expect(result.current.selectedUpfront).toBe(50000)
  })
  
  it('priority 2: finds best match with same mileage', () => {
    const carWithoutSelected: CarListing = {
      id: 'test',
      mileage_per_year: 20000, // No selected_* values, use this as target
      all_lease_pricing: [
        { mileage_per_year: 20000, period_months: 48, first_payment: 0, monthly_price: 3000 },
        { mileage_per_year: 20000, period_months: 36, first_payment: 0, monthly_price: 2800 }, // Should prefer 36
        { mileage_per_year: 15000, period_months: 36, first_payment: 0, monthly_price: 2500 }
      ]
    } as CarListing
    
    const { result } = renderHook(() => useLeaseCalculator(carWithoutSelected))
    
    expect(result.current.selectedMileage).toBe(20000)
    expect(result.current.selectedPeriod).toBe(36) // Prefers 36 over 48
  })
  
  it('priority 3: falls back to cheapest overall', () => {
    const carNoMatches: CarListing = {
      id: 'test',
      // No matching mileage available
      all_lease_pricing: [
        { mileage_per_year: 10000, period_months: 36, first_payment: 0, monthly_price: 3000 },
        { mileage_per_year: 15000, period_months: 36, first_payment: 0, monthly_price: 2000 }, // Cheapest
      ]
    } as CarListing
    
    const { result } = renderHook(() => useLeaseCalculator(carNoMatches))
    
    expect(result.current.selectedMileage).toBe(15000)
    expect(result.current.selectedLease?.monthly_price).toBe(2000)
  })
})
```

---

## Tooling & CI

- Commands:
  - `npm run test` — run all unit/integration tests (Vitest)
  - `npm run test:edge` — run Deno tests for Edge Functions
  - `npm run test:comparison` — comparison/parity tests (where applicable)
- Enforce coverage thresholds in CI for the critical modules.
- Add optional k6 (or similar) load tests for the Edge Function with synthetic 10k+ listings dataset.

---

## Performance Gates (monitored post-cutover)

- P95 first page < 400ms; next page < 300ms.
- Per-page payload reduced > 60% vs `select('*')` baseline.
- No full-table refetch on pagination in logs.
 - Edge Function cold-start P95 < 500ms (track and report).

---

## Performance Optimization Opportunities

1) Database Indexes
- Composite indexes on `(make, model, body_type, fuel_type)`; assess selectivity & usage.
- Consider materialized views for pre-computed lease scores.

2) Caching Strategy
- Cache selection results with a filter hash key (server-side cache); SWR on client.
- Edge caching for common filter combinations where safe.

3) Payload Optimization
- Minimal field selection; support optional field selection parameter (GraphQL-like) if needed later.
- Compression (gzip/brotli) at the edge.
- Consider cursor-based pagination for stability under updates.

---

## Risks & Mitigations

- Behavior drift: mitigated by characterization + parity tests.
- Mapping mismatches: mitigated by single-source mapping + mapping tests.
- Infra variability: handler accepts provider injection for Deno tests (no live DB needed).
- Data consistency during pagination: document and test behavior when listings update mid-scroll; ensure cursor or stable sort prevents duplication/skips.
- Deletions in cached pages: handle gracefully (UI hides missing items; tests for refetch on 404 in detail pages).
- Race conditions on rapid filter changes: debounce/throttle and cancel in-flight requests; tests for cancellation behavior.
- Backward compatibility: maintain old client path for 2 release cycles; telemetry to monitor usage; automated migration guidance for saved searches/bookmarks.

---

## Checklist (TDD-driven)

- [ ] Milestone 0: Characterization tests green (including NEW: getListingById offerSettings, useLeaseCalculator initialization).
- [ ] Milestone 0.25: Configuration unification, centralize hardcoded deposit targets.
- [ ] Milestone 1: Pure selection module, tests green.
- [ ] Milestone 2: Sort adapter, tests green.
- [ ] Milestone 3: Route schema updated, tests green.
- [ ] Milestone 4: Edge Function handler, Deno tests green.
- [ ] Milestone 5: Unified mapping used by handler + tests green.
- [ ] Milestone 6: Hooks using server pagination, MSW tests green.
- [ ] Milestone 7: Parity tests green; feature flag cutover.
- [ ] Cleanup completed; coverage thresholds met.

Migration Strategy:
- Phase 1: Deploy Edge Function, test internally (feature flag off by default).
- Phase 2: A/B test with 10% of users; monitor metrics and error rates.
- Phase 3: Gradual rollout by user segment; continue telemetry.
- Phase 4: Full migration with monitoring and on-call.
- Phase 5: Deprecate old code path post 2 release cycles.

Deposit Target Migration:
- ✅ COMPLETED: All systems now consistently use 35000 (getListings, getListingById, getListingCount)
- ❌ REMAINING: Extract hardcoded 35000 to centralized configuration (Milestone 0.25)
- Impact: Listing order has already changed from 0 to 35000 preference (behavior change complete)
- Next: Configuration centralization is pure refactoring (no further UX impact)

Quick Wins (non-blocking):
- Extract `selectBestOffer` to its own module with an adapter shim (keep characterization tests as guardrails).
- Add monitoring to current implementation to baseline performance.
- Implement request deduplication in client hooks.
- Add Danish error messages to existing error paths.

Navigation Preservation Testing (integration):
- Test that URL params (km/mdr/udb) from /listings carry over to /listing detail page
- Verify getListingById receives correct offerSettings from URL state
- Ensure useLeaseCalculator initializes with preserved offer selection
- Validate that back navigation maintains filter state
