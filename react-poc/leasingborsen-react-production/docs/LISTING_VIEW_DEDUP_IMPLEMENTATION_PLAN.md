# Listing View Deduplication Plan

## Overview

Goal: Count a `listing_view` impression exactly once per `(results_session_id, listing_id, component_context)` with a ≥50% visibility for ≥300ms dwell requirement. Prevent inflation from re-renders, virtualization, infinite scroll revisits, and back/forward navigation; recount only when the search context (filters+sort) changes or the analytics session TTL rolls.

## Objectives

- Correctness: One impression per `(results_session_id, listing_id, container)`.
- Dwell: Fire after ≥50% visibility sustained for ≥300ms.
- Stability: No re-count on re-renders, virtualization remounts, or back from detail (same `results_session_id`).
- Fresh contexts:
  - Recount when `results_session_id` changes (filters+sort fingerprint change).
  - Recount when analytics `session_id` (30m TTL) rolls.
  - Optional: Treat new day/visit as a new journey (future).
- Lightweight: Minimal memory; optional sessionStorage mirroring to avoid reload duplicates.

## Current State Summary

- `results_session_id` is generated in `src/analytics/pageview.ts` from a canonical filters fingerprint.
- `listing_view` event supports `results_session_id` and `container` (component context) in `src/analytics/schema.ts` and is emitted by `src/analytics/listing.ts`.
- `ListingCard.tsx` emits a `listing_view` when ≥50% visible, but:
  - No dwell threshold (fires immediately on threshold).
  - No global deduplication across mounts; only a per-mount ref guard.
- Fingerprint currently excludes sort; should include sort to represent the “results context” fully.
- No persistence across SPA route changes or reloads.

## Design

### Single Source of `results_session_id`

- Use `pageview.ts` as the sole source for `results_session_id` (already used by listing events via `getCurrentResultsSessionId()`).
- Include `sort_option` in the filters fingerprint so that changing sort produces a new `results_session_id`.

### Dedup Store (MVP)

- In `src/analytics/listing.ts`, create an internal dedup index:
  - `Map<string, Map<string, Set<string>>>`
  - Keys: `resultsKey = results_session_id`, `containerKey = container | 'results_grid'`.
  - Values: `Set<listing_id>` seen for this tuple.
- Optional persistence: Mirror each set to `sessionStorage` with key `lv_seen_rs_${resultsKey}_${containerKey}` (array of IDs) to survive reloads.

### Dwell Logic

- In `ListingCard`, use `IntersectionObserver` with threshold `0.5`.
- On enter: start a 300ms timer. If still ≥50% visible at timer end, query dedup store; only then emit.
- On exit before 300ms: cancel timer.

### Reset Rules

- When `results_session_id` changes: initialize a fresh set for that `resultsKey` (do not clear other sessions’ sets).
- When analytics `session_id` changes (TTL rollover): clear all dedup maps (fresh journey).

## Implementation Steps

1) Update results fingerprint to include sort
- File: `src/analytics/pageview.ts`
- Add `sort_option` (mapped from `query.sort`) to the filters object (already present) and include it in `getSearchFingerprint()` significant keys.
- Result: `results_session_id` changes on sort change.

2) Implement dedup index and helper
- File: `src/analytics/listing.ts`
- Add module-level structures:
  - `const seenByResults: Map<string, Map<string, Set<string>>> = new Map()`
  - `let lastAnalyticsSessionId: string | null = null`
- Export `shouldTrackListingView(listingId: string, container?: 'results_grid' | 'similar_grid' | 'carousel'): boolean`:
  - Get `resultsKey = getCurrentResultsSessionId() || 'no_rs'`.
  - On first call, if `analytics.getSessionId() !== lastAnalyticsSessionId`, clear `seenByResults` and set `lastAnalyticsSessionId`.
  - Ensure `seenByResults.get(resultsKey)?.get(containerKey)` exists.
  - If `listingId` not in set: add it, persist to sessionStorage if mirroring enabled, return true; else return false.
- Export `resetListingImpressionDedup()` for tests.

3) Add optional sessionStorage mirror (MVP-friendly)
- On first access of `(resultsKey, containerKey)`, attempt to load `sessionStorage['lv_seen_rs_${resultsKey}_${containerKey}']` as array → Set.
- After adding `listingId`, write back the array stringified.

4) Add 300ms dwell in `ListingCard`
- File: `src/components/ListingCard.tsx`
- Replace the simple per-mount guard with:
  - On intersection ≥0.5: start `setTimeout(300ms)`; on fire, if still ≥0.5, call `shouldTrackListingView(listingId, container)`; if true, call `trackListingView(...)`.
  - Cancel timer on exit or unmount.
  - Keep an instance ref to avoid repeated timers for same visibility window; dedup store will prevent duplicates anyway.

5) Tests
- File: `src/analytics/__tests__/listing.test.ts`
- Add cases:
  - Dedup within same `(rs, id, container)`.
  - New `results_session_id` → impression allowed again.
  - Different `container` → independent counts.
  - Analytics session TTL change (mock `analytics.getSessionId()` change) clears dedup.
- File: `src/components/__tests__/ListingCard.impression.test.tsx` (or extend existing ListingCard tests)
  - Simulate IntersectionObserver entries to verify 300ms dwell requirement.

6) Documentation
- Update `docs/ANALYTICS_FLOW_ARCHITECTURE.md` (or this file suffices) to describe impression scope and reset semantics.

## Data Structures

- Map nesting for fast lookup and scoped memory:
  - `seenByResults: Map<results_session_id, Map<container, Set<listing_id>>>`
- sessionStorage keys:
  - `lv_seen_rs_${results_session_id}_${container}` → `string[]` of listing IDs.

## Edge Cases

- Filter change where some items remain in view: only new, not-yet-seen IDs (for the new `results_session_id`) will fire when they hit dwell again.
- Back from detail: same `results_session_id` → no re-fire.
- Infinite scroll/virtualization: newly revealed cards fire once; scrolling back up or remounts won’t re-fire.
- Missing `results_session_id`: fallback to `'no_rs'` resultsKey to avoid crashes; low likelihood on results page.

## Rollout

- Implement behind a small feature flag if desired (env or constant), default ON in staging.
- Validate in staging: views/session distribution, CTR stabilization, and expected drops in inflated counts.
- Monitor errors and memory footprint.

## Metrics & Validation

- Track `listing_view` volume per results_session_id and per container.
- CTR stability: `listing_click / listing_view` should increase in consistency (less inflated views).
- Revisit rate: ensure back/forward navigations don’t re-increment views.

## Risks & Mitigations

- Memory growth: Scoped by session keys and cleared on TTL or navigation; typical set sizes are bounded by page inventories.
- sessionStorage size: Only arrays of IDs per session/context; clean on TTL or when sessionStorage exceeds a threshold (optional cleanup).
- Observer churn: Keep one observer per card; timers only when threshold reached.

## Success Criteria

- Each `(results_session_id, listing_id, container)` yields at most one `listing_view`.
- Views do not inflate on back/forward or rerenders.
- Views reset appropriately on new fingerprint (filters+sort) or analytics session TTL roll.
- Dwell constraint enforced (≥50% for ≥300ms).

