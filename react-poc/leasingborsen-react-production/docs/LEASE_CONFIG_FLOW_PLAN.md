# Lease Configuration Flow – Implementation Plan

## Objectives
- Preserve and honor user-selected lease configuration (mileage/term/deposit) across listings, details, and similar-car navigation.
- Standardize parameter handling and defaults while maintaining backward compatibility.
- Improve robustness (validation/clamping) and reduce UX friction (debounced URL updates).

## Scope
- Parameter normalization and validation.
- Detail fetch selection honor for term (DONE in a37bc36).
- Dual URL param support (new+legacy) (DONE in a37bc36).
- Navigation context scoping (DONE for listings in a37bc36).
- Debounced URL updates for smoother UX.
- Documentation and tests.

## Phases & Tasks

### Phase 1 – Critical (Merged: a37bc36)
- selectBestOffer honors `targetTerm` with fallback ordering [targetTerm, 36, 24, 48].
- ListingCard reads both new (`selectedX`) and legacy (`km/mdr/udb`) params via central normalization.
- Listing navigation context only saved when navigating from `/listings`, passing full URL query.

### Phase 2 – Consistency & Validation (This commit)
1. Centralized validation/clamping when writing lease config to URL
   - Update `useLeaseConfigUrlSync` to construct a full internal config from current search + updated key.
   - Clamp via `validateLeaseConfig` and map back to legacy params for navigation.
   - Debounce URL updates (e.g., 200ms) to reduce re-renders during rapid changes.
2. Clamp detail offer settings before fetch
   - Apply `validateLeaseConfig` to normalized params in `Listing.tsx` to ensure API selection receives sane values.

### Phase 3 – Standardization & UI Feedback
1. (Optional) Route-level param shim
   - Consider normalizing route search objects to `selectedX` consistently while continuing to accept legacy params.
2. (Optional) UI indicator for `offer_selection_method === 'fallback'`
   - Display a subtle note near pricing when term fallback is being used.

### Phase 4 – Performance & Observability
1. Tighten URL update and filter sync coordination (avoid races)
   - Ensure `useLeaseConfigUrlSync` and `useUrlSync` do not overwrite each other.
2. Add instrumentation for:
   - Config persistence success rate, selection method distribution, and URL update frequency.

## Acceptance Criteria
- Selecting 12/24/36/48 months persists correctly to detail.
- Similar-car navigation preserves user’s config.
- Writing out-of-range values clamps to nearest valid.
- URL updates during rapid changes feel smooth (no flicker, minimal re-renders).
- Backward compatibility maintained.

## Risks & Mitigations
- Race conditions between hooks updating URL: mitigate with debounce and careful sequencing.
- UI regressions from clamping: validate and clamp quietly, surface only when helpful (Phase 3 UI note).

## Rollout Notes
- Keep debug logs in dev builds only; remove noisy logs before production.
- Add targeted tests for normalization/validation and selection honoring.

