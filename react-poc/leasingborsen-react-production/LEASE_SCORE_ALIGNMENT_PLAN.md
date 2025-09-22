# Lease Score Alignment Plan

## Problem Summary
The lease scores differ between listing cards and detail pages because they're calculating scores for different lease configurations. The system needs to ensure scores consistently reflect the user's current filter/configuration selections.

## Current Behavior Analysis

### On Listings Page (`/listings`)
- Server calculates `selected_lease_score` using `selectBestOffer`
- Uses selected mileage filter (or 15,000 km default)
- Uses default deposit (35,000 kr) and prefers 36-month terms
- ListingCard displays pre-calculated `selected_lease_score`

### On Detail Page (`/listing`)
- `useListing` hook fetches listing with user's offer settings from URL
- If settings differ from defaults, selects different lease offer
- `useLeaseCalculator` recalculates score for this configuration
- Results in potentially different score being displayed

### Similar Cars Section
- Uses `findMatchingOffer` (different logic than main listings)
- Tries exact match → partial match → cheapest fallback
- Does NOT use `selectBestOffer` with its complex defaults
- Another source of score inconsistency

## Root Cause
Multiple offer selection algorithms used across different contexts:
1. Main listings: `selectBestOffer` with strict mode
2. Detail page: `selectBestOffer` with user parameters
3. Similar cars: `findMatchingOffer` with simpler logic

## Proposed Solution

### Core Principle
**The lease score should always reflect what the user is currently seeing/selecting**, not some default configuration.

### Implementation Strategy

#### 1. Extract selectBestOffer to Shared Location
- Move `selectBestOffer` from `src/lib/supabase.ts` to `supabase/functions/_shared/offerSelection.ts`
- Make it importable by both client code and Edge Functions
- Ensure consistent parameter defaults:
  - Mileage: 15,000 km (when not specified)
  - Deposit: 35,000 kr (balanced middle-ground)
  - Term: Prefer 36 months via algorithm

#### 2. Update Similar Cars Edge Function
Replace `findMatchingOffer` in `supabase/functions/get-similar-cars/index.ts`:

```typescript
// Import shared function
import { selectBestOffer } from '../_shared/offerSelection'

// Replace findMatchingOffer usage with:
const hasUserConfig = [currentMileage, currentDeposit, currentTerm].some(
  (value) => value !== undefined
)

const selectedOffer =
  selectBestOffer(
    leasePricing,
    currentMileage ?? 15000,
    currentDeposit ?? 35000,
    currentTerm,
    true, // strict mode for user-aligned selection
    hasUserConfig
  ) ??
  selectBestOffer(
    leasePricing,
    currentMileage ?? 15000,
    currentDeposit ?? 35000,
    currentTerm,
    false, // flexible fallback mirrors previous behaviour
    hasUserConfig
  )

if (selectedOffer && selectedOffer.monthly_price) {
  dynamicLeaseScore = calculateLeaseScoreSimple({
    monthlyPrice: selectedOffer.monthly_price,
    retailPrice: car.retail_price,
    mileagePerYear: selectedOffer.mileage_per_year,
    firstPayment: selectedOffer.first_payment || 0,
    contractMonths: selectedOffer.period_months
  })
}
```

#### 3. Ensure Consistent Parameter Flow

**Listings Page Context:**
- Pass mileage filter if selected
- Use default deposit (35,000 kr)
- Let algorithm prefer 36-month terms
- Score reflects filtered configuration

**Detail Page Context:**
- Pass current slider selections
- Similar cars use same configuration as main car
- All cards show scores for current detail config

**ListingCard Component:**
- Always display `selected_lease_score` from server
- Pre-calculated with consistent logic

#### 4. Update getListings Parameters
- When no mileage filter: use 15,000 km default
- Always use 35,000 kr deposit unless explicitly set
- Let selectBestOffer handle term preference

#### 5. Add Validation Tests
- Verify score consistency between listings → detail navigation
- Test similar cars show same scores as main listings
- Cover zero-deposit and missing-term paths to ensure defaults never override intentional 0 selections
- Backstop cheapest-offer fallback so strict-mode misses still render cards
- Ensure URL parameters properly preserved

## Expected Results

✅ **Listing cards on `/listings`** reflect filtered mileage + smart defaults
✅ **Detail page** maintains same score when opened from listing card
✅ **Similar cars** show scores for current detail configuration
✅ **All contexts** use unified offer selection logic

## Implementation Checklist

- [ ] Extract `selectBestOffer` to shared module
- [ ] Update Similar Cars Edge Function to use shared logic with strict+flex fallback
- [ ] Verify consistent default parameters across contexts
- [ ] Add temporary logging/monitoring for null/fallback selections post-release
- [ ] Test score alignment in all navigation flows
- [ ] Add unit tests for offer selection consistency (zero deposit, fallback parity)
- [ ] Run Supabase bundler/type checks to confirm shared module compatibility
- [ ] Document the unified scoring approach in code + docs

## Files to Modify

1. Create: `supabase/functions/_shared/offerSelection.ts`
2. Update: `supabase/functions/get-similar-cars/index.ts`
3. Update: `src/lib/supabase.ts` (import from shared)
4. Test: Create test suite for score consistency

## Risk Mitigation

- Backward compatibility: Ensure existing URLs still work
- Performance: Shared function should be optimized
- Edge cases: Handle missing prices/offers gracefully
- Monitoring: Log score discrepancies during transition
