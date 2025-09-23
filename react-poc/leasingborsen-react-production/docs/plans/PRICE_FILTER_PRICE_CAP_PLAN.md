# Price Filter Price-Cap Alignment Plan

## Context
- Current listings grid filters on `full_listing_view.monthly_price`, which is the minimum offer per listing.
- After fetch, `selectBestOffer` can choose a higher-priced offer (e.g., better deposit alignment) and overwrite `monthly_price`.
- Result: listings that pass the filter show prices above the selected max, creating user confusion and perceived bugs.

## Challenge Statement
Deliver consistent price filtering that:
- Excludes listings lacking any offer under the selected max price.
- Displays the cheapest offer within the max range when the 35 000 kr baseline offer is more expensive.
- Communicates clearly when the displayed offer is not the “ideal” 35 000 kr configuration.
- Keeps counts, sorting, and detailed views synchronized with the displayed price.

## Objectives
1. Extend offer selection logic to accept an optional inclusive `maxPrice` constraint tied to filter usage.
2. Provide both the displayed (capped) offer and the ideal 35 000 kr offer so the UI can contextualize differences.
3. Ensure all listing counts, pagination, and sorting operate on the same constrained data.
4. Preserve backward compatibility for contexts where no price cap is applied.

## Non-Goals
- No redesign of the offer selector UX beyond adding contextual messaging.
- No changes to the existing filters outside the price cap logic.
- No modifications to backend data ingestion (assumes Supabase view remains the source).

## Proposed Solution Overview
1. **Core selector upgrade:**
   - Update `selectBestOffer` to accept `{ maxPrice?: number, enforcePriceCap?: boolean }`.
   - Filter candidate offers by `maxPrice` (inclusive) when both options are set.
   - Cache the “ideal” offer computed from the original selection pipeline before cap filtering.
   - Return structured metadata capturing display offer, ideal offer, selection reason, and delta to ideal.
2. **API integration:**
   - When `filters.price_max` is active, call `selectBestOffer` with the new options.
   - Drop listings with no offers under the cap.
   - Attach display/ideal price metadata to each listing response and expose a normalized numeric for sorting.
   - Mirror logic in `getListingCount` and any aggregate/facet queries.
3. **UI updates:**
   - Listing cards display the constrained price (formatted) and optional note about the ideal offer (with CTA to switch deposit).
   - Ensure note triggers the existing offer selector/deposit overlay pre-set to the ideal configuration.
   - Adjust client-side sorting utilities to use the normalized display price, with stable secondary keys (lease score desc, updated_at desc).
4. **State & analytics alignment:**
   - Update shared types/stores to carry the new display metadata.
   - Ensure URL sync and analytics capture that a price cap is active and whether the displayed offer differs from the ideal.

## Detailed Work Breakdown
1. **Selector Enhancements**
   - Modify `LeasePricingOffer` selection pipeline to filter offers by `maxPrice` when `enforcePriceCap` is true and `maxPrice` is defined.
   - Guard: if `enforcePriceCap` true but `maxPrice` missing → skip cap (and warn in dev).
   - Store the original best-fit offer (uncapped) to compare later.
   - Add new return shape:
     ```ts
     interface OfferSelectionResult {
       displayOffer: LeasePricingOffer | null
       displayReason: 'best_fit' | 'price_cap_best_fit' | 'price_cap_cheapest' | 'cheapest'
       idealOffer?: LeasePricingOffer
       deltaToIdeal?: number
     }
     ```
   - Maintain existing `selection_method` for backward compatibility, mapping to `displayReason` when possible.
   - Unit tests covering:
     - No cap → existing behaviour identical.
     - Cap allows best-fit → displayReason `price_cap_best_fit`.
     - Cap forces cheaper deposit → displayReason `price_cap_cheapest`, delta positive.
     - Cap excludes all offers → result null.
     - Boundary case `monthly_price === maxPrice`.

2. **Supabase Client Integration**
   - Update `CarListingQueries.getListings` and `getListingCount`.
   - Exclude listings when `displayOffer` is null under cap.
   - Attach new fields to listing payload:
     - `display_monthly_price`
     - `display_price_reason`
     - `display_price_numeric`
     - `ideal_monthly_price`
     - `ideal_deposit`
     - `price_cap_delta`
   - Adjust sorting blocks to use `display_price_numeric`, with secondary `selected_lease_score` desc, `updated_at` desc.
   - Ensure pagination uses the capped list before slicing.
   - Update types in `src/types/index.ts` and related inference helpers.

3. **UI & Store Updates**
   - Listing card: render `display_monthly_price` with fallback to old field.
   - Insert subtle inline note when `display_price_reason` indicates a price-cap fallback, referencing `ideal_monthly_price` and deposit.
   - Wire note CTA to open offer selector with deposit pre-selected.
   - Update price badges, overlays, and mobile components to honour the display price metadata.
   - Ensure favourites/share components use the display price string.

4. **Sorting & Filtering Consistency**
   - Update home/listing pages and any client-side sort utilities to sort via `display_price_numeric` when present.
   - Ensure filter pills and analytics summarise the active price cap and reason.
   - Review cached results (if any) to include `price_max` and selection reason in cache keys.

5. **Testing & Verification**
   - Unit tests for selector and store changes.
   - Integration tests for listings page verifying:
     - Listings with offers above cap are removed.
     - Display price equals cheapest under cap.
     - Note renders with correct copy and CTA.
     - Sorting order reflects displayed prices.
   - Smoke test on listing detail to confirm offer selector opens with expected state.
   - Regression test ensuring counts (total listings, facet counts) match visible cards under cap.

6. **Documentation & Rollout**
   - Update developer docs (`docs/LISTINGS_FETCH_FILTER_SORT_TDD_PLAN.md`) to record the new selector contract.
   - Communicate release notes for stakeholders explaining new behaviour.
   - Monitor analytics post-release for changes in filter usage and engagement.

## Risks & Mitigations
- **Risk:** Performance hit from running selector twice.
  - *Mitigation:* Compute ideal offer once per listing and reuse.
- **Risk:** UI copy confusion.
  - *Mitigation:* Align with design/UX for phrasing; ensure localization support.
- **Risk:** Cached results mismatch.
  - *Mitigation:* Include price cap parameters in keys; flush relevant caches on deploy.

## Acceptance Criteria
- Listings filtered by max price display no cards exceeding that max.
- UI notes appear only when the displayed offer differs from the ideal 35 000 kr option.
- Sorting order aligns with displayed prices, with stable secondary ordering.
- Counts, pagination, and detail views remain consistent with the grid.
- All existing tests pass; new coverage validates the price-cap flows.

## Open Questions
- Should the note be dismissible or persist per listing?
- Do we expose the delta in analytics to measure frequency of price-cap fallbacks?
- Any need to surface the ideal offer details in comparison tables or other contexts?

