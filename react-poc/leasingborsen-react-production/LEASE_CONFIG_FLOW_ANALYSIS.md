# Lease Configuration Flow Analysis

## Executive Summary

This document provides a comprehensive analysis of the lease configuration flow in the Leasingborsen React application, identifying critical issues that impact user experience and proposing fixes.

## Context & Overview

The lease configuration system manages three key parameters across the application:
- **Mileage** (km/selectedMileage): Annual mileage allowance
- **Term** (mdr/selectedTerm): Lease duration in months  
- **Deposit** (udb/selectedDeposit): Upfront payment amount

These parameters flow through multiple routes and components:
1. **Search Results** (`/listings`) → **Detail Page** (`/listing/$id`)
2. **Detail Page** → **Similar Car Detail** (detail-to-detail navigation)
3. **URL** ↔ **Filter Store** ↔ **Components** (state synchronization)

## Identified Issues

### 🔴 Critical Issues (Breaks Core Features)

#### 1. **Target Term Completely Ignored**
**Location:** `src/lib/supabase.ts:186`

**Evidence:**
```typescript
// Term preference order: 36 → 24 → 48
const termPreference = [36, 24, 48]

for (const preferredTerm of termPreference) {
  const termOffers = matchingOffers.filter(offer => 
    offer.period_months === preferredTerm
  )
  // ...
}
```

**Problem:** The `selectBestOffer` function doesn't accept or use a `targetTerm` parameter. Users cannot select their preferred lease term - the system always applies the hardcoded preference order.

**Impact:** Users selecting 48-month terms always get 36-month pricing if available.

---

#### 2. **ListingCard Only Reads Legacy URL Parameters**
**Location:** `src/components/ListingCard.tsx:72-76`

**Evidence:**
```typescript
return {
  selectedMileage: parseNum((searchParams as any).km),
  selectedTerm: parseNum((searchParams as any).mdr),
  selectedDeposit: parseNum((searchParams as any).udb),
}
```

**Problem:** ListingCard doesn't read the new `selectedX` parameters from URL, only legacy `km/mdr/udb`.

**Impact:** Configuration lost when navigating between similar cars if the detail page uses new parameter names.

---

### 🟡 High Priority Issues (Degrades UX)

#### 3. **Parameter Naming Mismatch**
**Locations:** 
- `/listings` route: `src/routes/listings.tsx:35-37`
- `/listing/$id` route: `src/routes/listing.$id.tsx:9-17`

**Evidence:**
```typescript
// listings.tsx uses legacy names
km: z.number().int().optional(),
mdr: z.number().int().catch(36),
udb: z.number().catch(0),

// listing.$id.tsx accepts both
selectedDeposit: z.coerce.number().optional(),
selectedMileage: z.coerce.number().optional(),
selectedTerm: z.coerce.number().optional(),
// Legacy parameter names for backward compatibility
udb: z.coerce.number().optional(),
km: z.coerce.number().optional(),
mdr: z.coerce.number().optional(),
```

**Problem:** Inconsistent parameter naming across routes creates confusion and increases regression risk.

**Impact:** Developers must remember different parameter names for different routes.

---

#### 4. **Navigation Context Pollution**
**Location:** `src/components/ListingCard.tsx:149-153`

**Evidence:**
```typescript
prepareListingNavigation(
  window.scrollY,
  currentPage,
  urlSearchParams
)
```

**Problem:** `prepareListingNavigation` is called for ALL card clicks, including detail→detail navigation, polluting sessionStorage with incorrect "listings" scroll positions.

**Impact:** Scroll restoration fails when returning to listings from a detail page that was reached via another detail page.

---

#### 5. **Incomplete Scroll Restoration Key**
**Location:** `src/components/ListingCard.tsx:143-147`

**Evidence:**
```typescript
const urlSearchParams = new URLSearchParams({ 
  km: String(currentLeaseConfig.selectedMileage || 15000),
  mdr: String(currentLeaseConfig.selectedTerm || 36),
  udb: String(currentLeaseConfig.selectedDeposit || 0)
})
```

**Problem:** Only captures lease configuration, not other filters (make, model, body_type, etc.).

**Impact:** Scroll position lost when users have complex filter combinations.

---

### 🟢 Medium Priority Issues (Technical Debt)

#### 6. **Race Conditions in URL Updates**
**Evidence:** Multiple components update URL without coordination:
- Filter changes via `useUrlSync`
- Lease config via `useLeaseConfigUrlSync`
- Navigation with `setTimeout(0)` in ListingCard

**Problem:** Concurrent URL updates can overwrite each other.

---

#### 7. **Missing Edge Case Handling**
**Evidence:** 
- No validation of lease config ranges
- No fallback when `selectBestOffer` returns null in strict mode
- Inconsistent defaults (15000 vs undefined for km)

**Problem:** Application can crash or show incorrect data with invalid inputs.

---

#### 8. **Performance Issues**
**Evidence:**
- URL updates trigger full re-renders
- No memoization of URL parsing
- Frequent sessionStorage writes without throttling

**Problem:** Unnecessary computation and storage operations.

---

## Code Flow Diagram

```
USER INTERACTION
       ↓
[/listings page]
   - URL params: km/mdr/udb
   - useLeaseConfigUrlSync: reads/writes URL
   - ListingCard: reads km/mdr/udb from URL
       ↓ (click)
   - prepareListingNavigation: saves scroll position
   - navigate with selectedX params
       ↓
[/listing/$id page]
   - Accepts both selectedX and km/mdr/udb
   - useListing: fetches with offer settings
   - selectBestOffer: IGNORES targetTerm
       ↓
[Similar Cars Grid]
   - Passes leaseConfig to cards
   - ListingCard: uses initialLeaseConfig
       ↓ (click similar)
   - navigate to next detail with selectedX
```

## Proposed Solutions

### Phase 1: Critical Fixes (Immediate)

#### Fix 1: Honor Target Term Selection (Recommended Option)
Implement strict mileage with term fallback that prioritizes the user’s selected term, then falls back to `[36, 24, 48]`.

```typescript
// src/lib/supabase.ts
function selectBestOffer(
  leasePricing: any,
  targetMileage: number,
  targetDeposit: number = 35000,
  targetTerm?: number, // ADD THIS
  strictMode: boolean = true
): any {
  // ... existing matchingOffers logic for mileage (strict or flexible)

  // Recommended: strict mileage; term fallback order prioritizes user's targetTerm
  const termPreference = Array.from(
    new Set(
      targetTerm ? [targetTerm, 36, 24, 48] : [36, 24, 48]
    )
  )

  for (const preferredTerm of termPreference) {
    const termOffers = matchingOffers.filter(
      offer => offer.period_months === preferredTerm
    )
    if (termOffers.length > 0) {
      // choose by closest deposit to target, then lower price (existing logic)
      // ...
      return {
        ...selectedOffer,
        selection_method: preferredTerm === targetTerm ? 'exact' : 'fallback'
      }
    }
  }

  // No term available: preserve existing flexible-mode behavior or return null in strict
}
```

Also update `getListingById` to pass the `targetTerm` through to `selectBestOffer` while keeping `getListings` unchanged:

```typescript
// src/lib/supabase.ts#getListingById
const selectedOffer = selectBestOffer(
  leasePricingArray,
  offerSettings.targetMileage || 15000,
  offerSettings.targetDeposit || 35000,
  offerSettings.targetTerm,            // ← pass through user’s target term
  true // strict mode
)
```

Optionally, reflect the fallback in UI by relying on `selection_method: 'exact' | 'fallback'` to display a subtle note when the selected term wasn’t available.

#### Fix 2: Support Both Parameter Formats in ListingCard
```typescript
// src/components/ListingCard.tsx
const currentLeaseConfig: LeaseConfigSearchParams = useMemo(() => {
  if (initialLeaseConfig) {
    return { /* existing logic */ }
  }
  
  const parseNum = (v: unknown): number | undefined => { /* existing */ }
  
  // Read BOTH legacy and new params
  return {
    selectedMileage: parseNum(searchParams.selectedMileage) ?? parseNum(searchParams.km),
    selectedTerm: parseNum(searchParams.selectedTerm) ?? parseNum(searchParams.mdr),
    selectedDeposit: parseNum(searchParams.selectedDeposit) ?? parseNum(searchParams.udb),
  }
}, [initialLeaseConfig, searchParams])
```

### Phase 2: High Priority Fixes

#### Fix 3: Standardize Parameter Names
Create a unified parameter mapping utility:

```typescript
// src/lib/leaseConfigMapping.ts
export const LEASE_PARAM_MAP = {
  mileage: { new: 'selectedMileage', legacy: 'km', default: 15000 },
  term: { new: 'selectedTerm', legacy: 'mdr', default: 36 },
  deposit: { new: 'selectedDeposit', legacy: 'udb', default: 0 }
}

export function normalizeLeaseParams(params: any): LeaseConfig {
  return {
    selectedMileage: params.selectedMileage ?? params.km ?? LEASE_PARAM_MAP.mileage.default,
    selectedTerm: params.selectedTerm ?? params.mdr ?? LEASE_PARAM_MAP.term.default,
    selectedDeposit: params.selectedDeposit ?? params.udb ?? LEASE_PARAM_MAP.deposit.default,
  }
}
```

#### Fix 4: Scope Navigation Context
```typescript
// src/components/ListingCard.tsx
const onCardClick = useCallback((e) => {
  // Only save scroll for listings page navigation
  const isFromListings = window.location.pathname === '/listings'
  
  if (isFromListings) {
    // Capture ALL current filters
    const fullSearch = new URLSearchParams(window.location.search)
    prepareListingNavigation(window.scrollY, currentPage, fullSearch)
  }
  
  // Navigate...
}, [/* deps */])
```

### Phase 3: Medium Priority Improvements

#### Fix 5: Add Validation Layer
```typescript
// src/lib/validation.ts
export const LEASE_CONFIG_LIMITS = {
  mileage: { min: 10000, max: 50000 },
  term: { min: 12, max: 60, allowed: [12, 24, 36, 48, 60] },
  deposit: { min: 0, max: 100000 }
}

export function validateLeaseConfig(config: LeaseConfig): LeaseConfig {
  return {
    selectedMileage: clamp(config.selectedMileage, LEASE_CONFIG_LIMITS.mileage),
    selectedTerm: closestAllowed(config.selectedTerm, LEASE_CONFIG_LIMITS.term.allowed),
    selectedDeposit: clamp(config.selectedDeposit, LEASE_CONFIG_LIMITS.deposit)
  }
}
```

#### Fix 6: Performance Optimizations
```typescript
// src/hooks/useLeaseConfigUrlSync.ts
import { useDebouncedCallback } from 'use-debounce'

export function useLeaseConfigUrlSync() {
  // ...
  
  const debouncedUpdate = useDebouncedCallback(
    (key: keyof LeaseConfigState, value: number | null) => {
      // Existing update logic
    },
    300 // 300ms debounce
  )
  
  return [config, debouncedUpdate]
}
```

## Implementation Priority

1. **Week 1:** Critical fixes (Fix 1-2)
   - User-facing functionality restored
   - Test term selection thoroughly

2. **Week 2:** High priority fixes (Fix 3-4)
   - Standardize parameters
   - Fix navigation context

3. **Week 3:** Medium priority (Fix 5-6)
   - Add validation
   - Optimize performance

## Testing Checklist

- [ ] Term selection (12/24/36/48 months) persists correctly
- [ ] Navigation from listings → detail preserves config
- [ ] Navigation from detail → similar car detail preserves config
- [ ] Back button restores scroll position with filters
- [ ] Invalid config values handled gracefully
- [ ] URL updates don't cause race conditions
- [ ] Performance: smooth UI with rapid config changes

## Metrics to Track

- **User Impact:** Track config persistence success rate
- **Performance:** Measure URL update frequency and render count
- **Errors:** Monitor for null returns from selectBestOffer
- **Navigation:** Track scroll restoration success rate

## Conclusion

The lease configuration flow has several critical issues that significantly impact user experience. The proposed fixes address these systematically, prioritizing user-facing functionality while improving code maintainability and performance.

The most critical issues (ignored term selection and lost configuration) should be fixed immediately as they directly break core features. The remaining issues can be addressed iteratively to improve overall system robustness.
