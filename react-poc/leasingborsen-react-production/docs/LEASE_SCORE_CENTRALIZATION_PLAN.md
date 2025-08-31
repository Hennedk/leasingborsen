# Lease Score Calculation Centralization Plan

## Executive Summary

The lease score calculation is currently duplicated across 4 different locations in the codebase with no shared source of truth. This creates maintenance issues, inconsistency risks, and has already caused bugs (scores > 100). This document outlines a TDD-driven approach to centralize the calculation.

## Current State Analysis

### Duplicate Implementations Found

1. **`supabase/functions/calculate-lease-score/index.ts`**
   - Official Edge Function for score calculation
   - Exports: `calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown`
   - Returns detailed breakdown with sub-scores
   - Used for database score updates

2. **`supabase/functions/batch-calculate-lease-scores/index.ts`**
   - Batch processing Edge Function
   - Internal duplicate of the same function
   - Identical implementation to calculate-lease-score
   - Used for bulk score updates

3. **`supabase/functions/get-similar-cars/index.ts`**
   - Just fixed (was using wrong formula producing scores > 100)
   - Different signature: `calculateLeaseScore(monthlyPrice, retailPrice, mileagePerYear, periodMonths): number`
   - Returns only the total score (not breakdown)
   - Used for dynamic scoring of similar cars

4. **`src/hooks/useLeaseCalculator.ts`**
   - Frontend implementation
   - Export: `calculateLeaseScore(monthlyPrice, retailPrice, mileagePerYear, periodMonths): number`
   - Simplified version (no breakdown, just total score)
   - Used in ListingCard and lease calculator UI

### Testing Coverage Analysis

- **Current Tests**: Only `src/lib/__tests__/lease-score-sorting.test.ts` exists
  - Tests sorting logic, not score calculation
  - Uses mock data with hardcoded scores
  - No validation of score calculation accuracy

- **Missing Tests**:
  - No unit tests for the calculation formula itself
  - No integration tests verifying consistency across implementations
  - No edge case testing (zero values, extreme ranges)
  - No validation tests for score range (0-100)

## Problems Identified

### Critical Issues

1. **No Single Source of Truth**
   - 4 separate implementations that can diverge
   - Already caused production bug (scores > 100)
   - No way to ensure consistency

2. **Different Function Signatures**
   - Edge Functions use object input: `LeaseScoreInput`
   - Frontend/similar-cars use individual parameters
   - Makes sharing code difficult

3. **Inconsistent Return Types**
   - Some return just the score (number)
   - Others return detailed breakdown object
   - No standardization

4. **Maintenance Overhead**
   - Algorithm changes require 4 updates
   - Easy to miss one location
   - No automated validation of consistency

5. **No Test Coverage**
   - Formula correctness not tested
   - Edge cases not covered
   - No regression protection

## TDD Implementation Plan

### Phase 1: Write Tests First (RED)

#### 1.1 Create Core Test Suite
**File**: `supabase/functions/_shared/__tests__/leaseScore.test.ts`

```typescript
describe('Lease Score Calculation', () => {
  describe('Core Formula Tests', () => {
    // Test the weighted formula components
    it('should calculate monthly rate score correctly')
    it('should calculate mileage score correctly')
    it('should calculate flexibility score correctly')
    it('should apply correct weights (45%, 35%, 20%)')
    it('should round final score to integer')
  })

  describe('Score Range Tests', () => {
    it('should never return score below 0')
    it('should never return score above 100')
    it('should handle edge case inputs gracefully')
  })

  describe('Validation Tests', () => {
    it('should handle zero retail price')
    it('should handle negative values')
    it('should handle null/undefined inputs')
    it('should handle extremely large values')
  })

  describe('Known Scenarios', () => {
    // Test with real data to ensure consistency
    it('should score 87 for specific known configuration')
    it('should match production scores for sample data')
  })

  describe('Breakdown Tests', () => {
    it('should return complete breakdown when requested')
    it('should match total score to sum of weighted components')
  })
})
```

#### 1.2 Create Integration Tests
**File**: `supabase/functions/_shared/__tests__/leaseScore.integration.test.ts`

```typescript
describe('Lease Score Integration', () => {
  it('should produce identical results across all implementations')
  it('should handle Edge Function input format')
  it('should handle frontend parameter format')
  it('should work with TypeScript and Deno environments')
})
```

### Phase 2: Create Shared Module (GREEN)

#### 2.1 Core Module Structure
**File**: `supabase/functions/_shared/leaseScore.ts`

```typescript
// Type definitions
export interface LeaseScoreInput {
  retailPrice: number
  monthlyPrice: number
  mileagePerYear: number
  contractMonths: number
}

export interface LeaseScoreBreakdown {
  totalScore: number
  monthlyRateScore: number
  monthlyRatePercent: number
  mileageScore: number
  mileageNormalized: number
  flexibilityScore: number
}

// Main calculation function with overloads
export function calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown
export function calculateLeaseScore(
  monthlyPrice: number,
  retailPrice: number,
  mileagePerYear: number,
  periodMonths: number
): number

// Implementation that handles both signatures
export function calculateLeaseScore(
  inputOrMonthlyPrice: LeaseScoreInput | number,
  retailPrice?: number,
  mileagePerYear?: number,
  periodMonths?: number
): LeaseScoreBreakdown | number {
  // Unified implementation here
}
```

#### 2.2 Algorithm Components
```typescript
// Separate functions for testability
export function calculateMonthlyRateScore(monthlyPrice: number, retailPrice: number): number
export function calculateMileageScore(mileagePerYear: number): number  
export function calculateFlexibilityScore(contractMonths: number): number
export function calculateWeightedTotal(
  monthlyRateScore: number,
  mileageScore: number,
  flexibilityScore: number
): number
```

### Phase 3: Refactor Existing Code (REFACTOR)

#### 3.1 Update Edge Functions
```typescript
// calculate-lease-score/index.ts
import { calculateLeaseScore } from '../_shared/leaseScore.ts'

// Simply re-export or wrap the shared function
export { calculateLeaseScore }
```

#### 3.2 Update Frontend
```typescript
// src/hooks/useLeaseCalculator.ts
import { calculateLeaseScore } from '@/lib/leaseScore'

// Use the shared implementation
export { calculateLeaseScore }
```

#### 3.3 Create Frontend Copy (for performance)
```typescript
// src/lib/leaseScore.ts
// Exact copy of shared module for frontend use
// (Edge Functions can't import from src/)
```

### Phase 4: Migration Strategy

#### 4.1 Gradual Rollout
1. **Week 1**: Deploy shared module to Edge Functions
2. **Week 2**: Update frontend to use shared logic
3. **Week 3**: Monitor for discrepancies
4. **Week 4**: Remove old implementations

#### 4.2 Feature Flags
```typescript
const USE_CENTRALIZED_SCORE = process.env.USE_CENTRALIZED_SCORE === 'true'

const score = USE_CENTRALIZED_SCORE 
  ? calculateLeaseScoreCentralized(...)
  : calculateLeaseScoreOld(...)
```

#### 4.3 Validation Layer
```typescript
// Temporary validation during migration
function validateScoreConsistency(input: LeaseScoreInput) {
  const oldScore = calculateLeaseScoreOld(input)
  const newScore = calculateLeaseScoreCentralized(input)
  
  if (Math.abs(oldScore - newScore) > 1) {
    console.error('Score mismatch detected', { oldScore, newScore, input })
  }
  
  return newScore
}
```

## Implementation Checklist

### Phase 1: Testing (Week 1)
- [ ] Create test directory structure
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Ensure all tests fail initially (RED)
- [ ] Document expected behaviors

### Phase 2: Implementation (Week 2)
- [ ] Create `_shared/leaseScore.ts` module
- [ ] Implement core calculation logic
- [ ] Support both function signatures
- [ ] Make all tests pass (GREEN)
- [ ] Add JSDoc documentation

### Phase 3: Integration (Week 3)
- [ ] Update `calculate-lease-score` Edge Function
- [ ] Update `batch-calculate-lease-scores` Edge Function
- [ ] Update `get-similar-cars` Edge Function
- [ ] Create frontend copy in `src/lib/`
- [ ] Update `useLeaseCalculator` hook

### Phase 4: Validation (Week 4)
- [ ] Run integration tests across all implementations
- [ ] Deploy to staging environment
- [ ] Compare scores with production data
- [ ] Monitor for discrepancies
- [ ] Performance testing

### Phase 5: Cleanup (Week 5)
- [ ] Remove old implementations
- [ ] Update documentation
- [ ] Remove feature flags
- [ ] Final testing
- [ ] Production deployment

## Risk Analysis & Mitigation

### Risks

1. **Score Discrepancies**
   - Risk: New implementation produces different scores
   - Mitigation: Extensive testing with production data
   - Validation layer during migration

2. **Performance Impact**
   - Risk: Shared module slower than optimized versions
   - Mitigation: Benchmark before/after
   - Keep frontend copy for performance

3. **Deployment Issues**
   - Risk: Edge Functions fail with shared module
   - Mitigation: Gradual rollout with feature flags
   - Easy rollback strategy

4. **Type Compatibility**
   - Risk: TypeScript/Deno type conflicts
   - Mitigation: Careful type definitions
   - Separate test suites for each environment

## Success Metrics

1. **Consistency**: 100% identical scores across all implementations
2. **Test Coverage**: >95% code coverage for score calculation
3. **Performance**: No degradation in calculation speed
4. **Maintainability**: Single location for algorithm changes
5. **Bug Reduction**: Zero score-related bugs post-migration

## Long-term Benefits

1. **Single Source of Truth**: One canonical implementation
2. **Easier Maintenance**: Change once, deploy everywhere
3. **Better Testing**: Comprehensive test suite
4. **Reduced Bugs**: Impossible for implementations to diverge
5. **Documentation**: Clear, centralized documentation
6. **Flexibility**: Easy to update scoring algorithm
7. **Confidence**: Know that all scores are calculated identically

## Next Steps

1. **Review & Approval**: Get team consensus on approach
2. **Create Test Suite**: Start with TDD tests
3. **Implement Shared Module**: Build centralized solution
4. **Gradual Migration**: Roll out with validation
5. **Monitor & Optimize**: Ensure success metrics are met

## Appendix: Current Formula

For reference, the correct lease score formula uses:

```
Monthly Rate Score (45% weight):
- < 0.9% of retail: 100 points
- < 1.1% of retail: 90 points
- < 1.3% of retail: 80 points
- < 1.5% of retail: 70 points
- < 1.7% of retail: 60 points
- < 1.9% of retail: 50 points
- < 2.1% of retail: 40 points
- >= 2.1% of retail: 25 points

Mileage Score (35% weight):
- >= 25,000 km/year: 100 points
- >= 20,000 km/year: 90 points
- >= 15,000 km/year: 75 points
- >= 12,000 km/year: 55 points
- >= 10,000 km/year: 35 points
- < 10,000 km/year: 20 points

Flexibility Score (20% weight):
- <= 12 months: 100 points
- <= 24 months: 90 points
- <= 36 months: 75 points
- <= 48 months: 55 points
- > 48 months: 30 points

Total Score = Round(
  MonthlyRateScore * 0.45 +
  MileageScore * 0.35 +
  FlexibilityScore * 0.20
)

Clamped to range [0, 100]
```

---

*Document created: 2025-01-08*  
*Author: System Architecture Team*  
*Status: DRAFT - Pending Review*