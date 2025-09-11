# Lease Calculator Navigation Issue Analysis

## Executive Summary

Two critical issues have been identified in the lease calculator initialization logic:

1. **URL Parameter Issue** (FIXED): Race condition prevented URL mileage parameters from being applied
2. **Similar Cars Navigation Issue** (IDENTIFIED): Lease offers become null when navigating between listings

## Issue 1: URL Parameter Not Applied (FIXED)

### Problem
When navigating from `/listings?km=25000` to a listing detail, the calculator showed default 15k mileage instead of 25k from URL.

### Root Cause
Race condition between two `useEffect` hooks:
- Reset effect: Cleared state when car changed
- Initialize effect: Set values from car data
- Both had `car?.selected_mileage` in dependencies, causing unpredictable execution order

### Solution Implemented
Combined both effects into single `useIsomorphicLayoutEffect` with:
- Stable car key (`listing_id` preferred over `id`)
- Null guard for loading transitions
- Ref tracking to prevent double-initialization
- SSR-safe layout effect to prevent flicker

## Issue 2: Similar Cars Navigation (PENDING FIX)

### Problem Description
When navigating from listing A to listing B via similar cars component:
- All lease offer details (mileage, period, upfront) become null
- Calculator never initializes with new car's data
- User sees empty/broken pricing configuration

### Detailed Flow Analysis

#### Current Broken Flow:
```
1. User on Listing A (id: "abc-123")
   - prevCarKeyRef = "abc-123"
   - State initialized with car A's offers
   
2. User clicks similar car B (id: "def-456")
   
3. Navigation triggers, car prop updates to B
   
4. Effect runs (line 304):
   - carKey = "def-456"
   - prevCarKeyRef = "abc-123" (different!)
   - Enters reset block (line 312)
   - Sets all state to null
   - Updates prevCarKeyRef = "def-456"
   - RETURNS EARLY (line 319) ← Problem starts here
   
5. Next render (offers still loading):
   - carKey = "def-456"
   - prevCarKeyRef = "def-456" (same, skips reset)
   - leaseOptions.length = 0 (offers not loaded yet)
   - BAILS at line 323 without updating ref ← Critical issue
   
6. Offers finally load, effect runs again:
   - carKey = "def-456"
   - prevCarKeyRef = "def-456" (same, skips reset)
   - leaseOptions.length > 0 (offers loaded)
   - BUT: selectedMileage !== null check fails (line 326)
   - Because we never reach initialization code
   
7. Result: State remains null forever
```

### Root Cause Analysis

The issue stems from a **flawed assumption** in the effect logic:
- Assumes `leaseOptions.length === 0` means "no offers to initialize"
- Reality: Could mean "offers still loading"
- When we bail without updating ref, we lose track of initialization state

### Proposed Solutions

#### Solution A: Track Loading State (Confidence: 65%)
```typescript
// Only bail if offers are loaded but empty
if (!isLoading && !leaseOptions.length) return

// If still loading, wait for next render
if (isLoading) return
```

**Pros:**
- Simple change
- Directly addresses the issue

**Cons:**
- Requires adding `isLoading` to dependencies
- Could trigger more renders
- Edge cases around error states

#### Solution B: Don't Return After Reset (Confidence: 70%)
```typescript
if (prevCarKeyRef.current !== null && prevCarKeyRef.current !== carKey) {
  // Reset for new car
  setSelectedMileage(null)
  setSelectedPeriod(null)
  setSelectedUpfront(null)
  initSourceRef.current = null
  // Continue to initialization attempt (don't return)
}
```

**Pros:**
- Avoids the two-render initialization delay
- Simpler flow

**Cons:**
- Might attempt initialization with stale data
- Could cause flicker if initialization happens twice

#### Solution C: Explicit Initialization Tracking (Confidence: 85%)
```typescript
const hasInitializedRef = useRef(false)

useIsomorphicLayoutEffect(() => {
  const carKey = car?.listing_id || car?.id || null
  
  if (!carKey) return
  
  // Reset initialization flag for new car
  if (prevCarKeyRef.current !== carKey) {
    hasInitializedRef.current = false
    prevCarKeyRef.current = carKey
    setSelectedMileage(null)
    setSelectedPeriod(null)
    setSelectedUpfront(null)
  }
  
  // Skip if already initialized
  if (hasInitializedRef.current) return
  
  // Wait if loading
  if (isLoading) return
  
  // Bail if no options after loading
  if (!leaseOptions.length) return
  
  // Initialize...
  if (selectedMileage === null && selectedPeriod === null && selectedUpfront === null) {
    // ... initialization logic ...
    hasInitializedRef.current = true
  }
})
```

**Pros:**
- Explicit tracking of initialization state
- Clear separation of concerns
- Handles all edge cases

**Cons:**
- More complex (additional ref)
- Requires careful testing

### Edge Cases to Consider

1. **Rapid Navigation**
   - User clicks multiple similar cars quickly
   - Could cause race conditions with multiple pending offer fetches
   
2. **Error States**
   - What if offers fail to load?
   - Should show error UI, not empty state
   
3. **No Offers Available**
   - Some listings genuinely have no lease pricing
   - Must distinguish from "loading" state
   
4. **React StrictMode**
   - Double-invocation in development
   - Current ref pattern should handle this

5. **SSR/Hydration**
   - `useIsomorphicLayoutEffect` handles this
   - But need to verify no hydration mismatches

### Performance Considerations

1. **Render Count**
   - Adding `isLoading` to dependencies increases renders
   - Each navigation triggers 3-4 renders minimum
   
2. **Memory Leaks**
   - Refs persist across component lifecycle
   - Need cleanup on unmount
   
3. **Query Caching**
   - React Query caches offers by listing ID
   - Consider using `placeholderData` to show previous car's data during loading

### Testing Requirements

1. **Manual Testing Scenarios**
   - Navigate from listing → similar car
   - Navigate between multiple similar cars rapidly
   - Navigate with slow network (throttle to 3G)
   - Navigate to car with no offers
   - Navigate away and back (browser back/forward)

2. **Automated Tests Needed**
   ```typescript
   describe('useLeaseCalculator navigation', () => {
     it('should initialize when navigating to new car')
     it('should handle loading state during navigation')
     it('should reset state when car changes')
     it('should not re-initialize if already initialized')
     it('should handle cars with no offers')
     it('should handle offer loading errors')
   })
   ```

### Recommended Implementation Plan

1. **Phase 1: Add Debug Logging**
   ```typescript
   console.log('[LeaseCalc] Effect run', {
     carKey,
     prevCarKey: prevCarKeyRef.current,
     isLoading,
     leaseOptionsCount: leaseOptions.length,
     selectedMileage,
     hasInitialized: hasInitializedRef?.current
   })
   ```

2. **Phase 2: Implement Solution C**
   - Add `hasInitializedRef`
   - Update effect logic
   - Add `isLoading` to dependencies

3. **Phase 3: Test Thoroughly**
   - Manual testing with network throttling
   - Test all navigation patterns
   - Verify no performance regression

4. **Phase 4: Consider Enhancements**
   - Add loading skeleton during offer fetch
   - Use `placeholderData` for smoother transitions
   - Add error boundary for failed states

### Alternative Approach: Simplify Architecture

Consider refactoring to separate concerns:

```typescript
// Separate hooks for clarity
const useCarChangeReset = (carKey: string) => {
  // Handle reset logic
}

const useLeaseInitialization = (
  car: CarListing,
  offers: Offer[],
  isLoading: boolean
) => {
  // Handle initialization logic
}
```

This would make the logic more testable and maintainable.

### Conclusion

The issue is well-understood: the effect bails out during loading without tracking that initialization is still pending. Solution C (explicit initialization tracking) provides the most robust fix with acceptable complexity. The key insight is that we need to distinguish between:

1. "Haven't tried to initialize yet" (waiting for data)
2. "Tried but no options available" (no offers)
3. "Successfully initialized" (done)

Current implementation conflates cases 1 and 3, causing the bug.

### Risk Assessment

- **Risk of regression**: Medium
- **Complexity added**: Low-Medium
- **Testing burden**: Medium
- **Performance impact**: Minimal

### Recommendation

Implement Solution C with comprehensive logging for validation. The explicit tracking approach is more verbose but eliminates ambiguity in the initialization state machine.

## Implementation Guide for Next Session

### Enhanced Solution C - Production Ready Implementation

Based on further analysis, here's the refined implementation plan that addresses all identified issues:

#### Core Changes Required

1. **Add Explicit Initialization Tracking**
```typescript
// New refs and state to add
const initializedForCarRef = useRef<string | null>(null)
type InitStatus = 'pending' | 'loading' | 'empty' | 'initialized' | 'error'
const [initStatus, setInitStatus] = useState<InitStatus>('pending')
```

2. **Replace Current Effect with Deterministic Logic**
```typescript
useIsomorphicLayoutEffect(() => {
  const carKey = car?.listing_id || car?.id || null
  
  // Guard against null keys during transitions
  if (!carKey) {
    setInitStatus('pending')
    return
  }
  
  // Check if we need to initialize for this car
  if (initializedForCarRef.current !== carKey) {
    // Reset state for genuinely new car (not first mount)
    if (initializedForCarRef.current !== null) {
      setSelectedMileage(null)
      setSelectedPeriod(null)
      setSelectedUpfront(null)
      initSourceRef.current = null
    }
    
    // Handle loading state - wait for offers
    if (isLoading) {
      setInitStatus('loading')
      return
    }
    
    // Handle error state
    if (error) {
      setInitStatus('error')
      initializedForCarRef.current = carKey // Mark as handled
      return
    }
    
    // Handle empty state (no offers available)
    if (!leaseOptions.length) {
      setInitStatus('empty')
      initializedForCarRef.current = carKey // Mark as handled
      return
    }
    
    // Proceed with initialization
    const targetMileage = car?.selected_mileage ?? car?.mileage_per_year ?? null
    const targetPeriod = car?.selected_term ?? car?.period_months ?? null
    const targetUpfront = car?.selected_deposit ?? car?.first_payment ?? null
    
    // ... existing initialization logic (exact match, same mileage, cheapest) ...
    
    // Mark as initialized for this car
    initializedForCarRef.current = carKey
    setInitStatus('initialized')
  }
}, [
  car?.listing_id, car?.id,
  isLoading, error,  // Add these to dependencies
  leaseOptions.length, cheapestOption,
  car?.selected_mileage, car?.mileage_per_year,
  car?.selected_term, car?.period_months,
  car?.selected_deposit, car?.first_payment
  // Do NOT include selected* states to avoid loops
])
```

3. **Update Hook Return Value**
```typescript
return {
  // ... existing returns
  initStatus,  // New: explicit status for UI
  selectedMileage,
  selectedPeriod,
  // ... rest
}
```

#### UI Updates Required

1. **LeaseCalculatorCard Component**
```typescript
// Handle different initialization states
if (initStatus === 'loading') {
  return <LoadingSkeleton />
}

if (initStatus === 'empty') {
  return (
    <Card>
      <CardContent>
        <p>Ingen leasingpriser tilgængelige for denne bil</p>
      </CardContent>
    </Card>
  )
}

if (initStatus === 'error') {
  return (
    <Card>
      <CardContent>
        <p>Der opstod en fejl ved indlæsning af priser</p>
      </CardContent>
    </Card>
  )
}
```

#### Key Improvements Over Current Implementation

1. **Separation of Concerns**
   - `initializedForCarRef`: Tracks "have we initialized for this car"
   - `prevCarKeyRef`: Can be removed (no longer needed)
   - `initStatus`: Provides unambiguous state for UI

2. **Deterministic State Machine**
   - No reliance on triple-null check
   - Explicit handling of loading/empty/error states
   - Clear initialization flow

3. **Performance Optimizations**
   - Consider prefetching on hover: `onPointerEnter` → prefetch offers
   - Use React Query's `placeholderData` for smoother transitions

#### Testing Checklist

- [ ] Navigation from listing A → B via similar cars
- [ ] Rapid clicking between multiple similar cars
- [ ] Navigation with 3G network throttling
- [ ] Navigation to car with no offers
- [ ] Browser back/forward navigation
- [ ] Network error during offer fetch
- [ ] React StrictMode double invocation
- [ ] SSR/hydration consistency

#### Debug Logging (Development Only)

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[LeaseCalc] Effect run', {
    carKey,
    initializedFor: initializedForCarRef.current,
    isLoading,
    hasError: !!error,
    optionsCount: leaseOptions.length,
    initStatus,
    source: initSourceRef.current
  })
}
```

#### Migration Notes

1. The current `prevCarKeyRef` logic can be kept initially for safety
2. Add the new refs/state alongside existing code
3. Gradually migrate the effect logic
4. Remove old refs once confirmed working

#### Potential Enhancements

1. **Prefetching Strategy**
```typescript
// In ListingCard component
const prefetchOffers = (listingId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['offers', listingId],
    queryFn: () => fetchOffers(listingId),
    staleTime: 30 * 1000
  })
}

<div onPointerEnter={() => prefetchOffers(car.listing_id)}>
```

2. **Transition Smoothing**
```typescript
// In useOffers hook
placeholderData: keepPreviousData()  // Show old data while loading new
```

3. **Status-Aware Analytics**
```typescript
// Track initialization failures
if (initStatus === 'empty' || initStatus === 'error') {
  trackEvent('lease_calculator_init_failed', {
    status: initStatus,
    listing_id: carKey
  })
}
```

### Final Recommendation

Implement this enhanced Solution C in a feature branch with comprehensive logging. The explicit `initializedForCarRef` tracking combined with `initStatus` state machine provides the most robust solution. This approach:

- Eliminates ambiguity in initialization state
- Handles all edge cases explicitly
- Provides clear UI states
- Maintains performance
- Is testable and debuggable

The key insight is separating "which car are we looking at" from "have we initialized for this car" - the current implementation conflates these, causing the bug.