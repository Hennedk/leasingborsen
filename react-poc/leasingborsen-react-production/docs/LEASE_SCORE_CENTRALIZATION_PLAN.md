# Lease Score Calculation Centralization Plan (MVP Edition)

## Executive Summary

The lease score calculation is currently duplicated across 4 different locations in the codebase with no shared source of truth. This creates maintenance issues, inconsistency risks, and has already caused bugs (scores > 100). This document outlines a **lean 2-3 day MVP approach** to centralize the calculation and updates the business rules to reward lower upfront payment (deposit-based flexibility) rather than shorter contract terms.

### Why This MVP Approach?

**Key Insights from Analysis:**
- Database already has `first_payment` field - no schema changes needed
- Only 4 implementations to update - manageable in one session
- Current formula works in production - low risk to centralize
- Business wants deposit-based scoring - good time to make the change

**Simplified vs Original Plan:**
- ~~5 weeks~~ → **2-3 days** implementation
- ~~Feature flags~~ → **Direct deployment** with validation
- ~~100+ tests~~ → **15 focused tests** on business logic  
- ~~Complex overloads~~ → **Single clear API** with simple wrapper
- ~~Gradual rollout~~ → **Ship it, monitor, iterate**

**MVP Balance:** Maximum value (centralization + deposit scoring) with minimum complexity (shared module + focused tests).

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

## Lean MVP Implementation Plan (2-3 Days)

### Day 1: Core Implementation

#### 1.1 Create Shared Module
**File**: `supabase/functions/_shared/leaseScore.ts`

```typescript
// Simple, clear type definitions
export interface LeaseScoreInput {
  retailPrice: number
  monthlyPrice: number
  mileagePerYear: number
  firstPayment: number  // Already exists in DB
  contractMonths?: number  // Keep for compatibility, ignore in v2
}

export interface LeaseScoreBreakdown {
  totalScore: number
  monthlyRateScore: number
  monthlyRatePercent: number
  mileageScore: number
  mileageNormalized: number
  upfrontScore: number  // Replaces flexibilityScore
  firstPaymentPercent: number
  calculation_version: '2.0'  // Version tagging for tracking
  // Temporary backwards compatibility
  flexibilityScore?: number  // Map to upfrontScore if needed
}

// Single clear function - no complex overloads
export function calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown {
  // Implementation with v2 formula
}

// Simple wrapper for backwards compatibility
export function calculateLeaseScoreSimple(input: LeaseScoreInput): number {
  return calculateLeaseScore(input).totalScore
}
```

#### 1.2 Duplicate for Frontend (Simple Solution)
**File**: `src/lib/leaseScore.ts`
- Exact copy of the Deno version for Node compatibility
- Add a simple build script later: `cp supabase/functions/_shared/leaseScore.ts src/lib/`

#### 1.3 Focused Test Suite (10-15 Tests)
**File**: `src/lib/__tests__/leaseScore.test.ts`

```typescript
describe('Lease Score v2', () => {
  // Core business logic (8 tests)
  test('0% deposit scores upfrontScore=100')
  test('3% deposit scores upfrontScore=95')
  test('5% deposit scores upfrontScore=90')
  test('10% deposit scores upfrontScore=70')
  test('15% deposit scores upfrontScore=55')
  test('20% deposit scores upfrontScore=40')
  test('25%+ deposit scores upfrontScore=25')
  test('total score never exceeds 100 or goes below 0')
  
  // Edge cases (4 tests)
  test('handles zero/null retail price gracefully')
  test('handles negative values by returning 0')
  test('rounds scores correctly')
  test('includes calculation_version: 2.0 in breakdown')
  
  // Parity test (1 test)
  test('Edge Function and frontend return identical results')
})
```

### Day 2: Integration & Migration

#### 2.1 Update All 4 Implementations
```typescript
// Edge Functions (3 files)
// calculate-lease-score/index.ts
import { calculateLeaseScore } from '../_shared/leaseScore.ts'
export { calculateLeaseScore }

// batch-calculate-lease-scores/index.ts
import { calculateLeaseScore } from '../_shared/leaseScore.ts'
// Update to pass pricing.first_payment

// get-similar-cars/index.ts  
import { calculateLeaseScoreSimple } from '../_shared/leaseScore.ts'
// Update to pass first_payment || 0

// Frontend (2 files)
// useLeaseCalculator.ts
import { calculateLeaseScoreSimple } from '@/lib/leaseScore'
// Update calls to pass firstPayment

// lib/supabase.ts
import { calculateLeaseScoreSimple } from '@/lib/leaseScore'
// Update to pass selectedOffer.first_payment || 0
```

#### 2.2 Database Migration
```sql
-- Update trigger to include first_payment in staleness check
CREATE OR REPLACE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF monthly_price, period_months, mileage_per_year, first_payment 
ON lease_pricing
FOR EACH ROW EXECUTE FUNCTION mark_score_stale();
```

### Day 3: Deployment

#### 3.1 Staging Validation
- Deploy to staging environment
- Test a few listings with various deposit amounts
- Verify scores are in expected ranges

#### 3.2 Production Deployment
```bash
# Deploy Edge Functions
supabase functions deploy calculate-lease-score
supabase functions deploy batch-calculate-lease-scores
supabase functions deploy get-similar-cars

# Deploy frontend
git push origin main  # Triggers Vercel deployment

# Recalculate all scores
curl -X POST [supabase-url]/functions/v1/batch-calculate-lease-scores?force=true
```

#### 3.3 Quick Monitoring
- Check score distributions per dealer
- Verify no scores > 100
- Monitor for any errors in logs

## Implementation Checklist

### Day 1: Core Implementation
- [ ] Create `_shared/leaseScore.ts` with v2 formula
- [ ] Copy to `src/lib/leaseScore.ts` for frontend
- [ ] Write 10-15 focused unit tests
- [ ] Ensure tests pass with new implementation
- [ ] Add basic JSDoc documentation

### Day 2: Integration 
- [ ] Update `calculate-lease-score` Edge Function
- [ ] Update `batch-calculate-lease-scores` Edge Function  
- [ ] Update `get-similar-cars` Edge Function
- [ ] Update `useLeaseCalculator` hook
- [ ] Update `lib/supabase.ts` buildListingWithLeaseOptions
- [ ] Create database migration for trigger update
- [ ] Test all flows locally

### Day 3: Deployment
- [ ] Deploy to staging and validate
- [ ] Deploy Edge Functions to production
- [ ] Deploy frontend to production
- [ ] Run batch recalculation with force=true
- [ ] Monitor score distributions

## Risk Analysis & Mitigation (Simplified)

### Low-Risk MVP Approach

1. **Score Discrepancies**
   - Risk: New deposit-based scores differ from old contract-based scores
   - Mitigation: This is intentional - business wants deposit-based scoring
   - Fallback: Pass firstPayment=0 initially to match old behavior if needed

2. **Data Issues**
   - Risk: Missing retail_price causes division by zero
   - Mitigation: Input validation, return score=0 for invalid data
   - Already handled in current implementations

3. **Backwards Compatibility**
   - Risk: UI expects flexibilityScore field
   - Mitigation: Map flexibilityScore = upfrontScore temporarily
   - Remove after UI is updated

4. **File Sync**
   - Risk: Deno and Node versions diverge
   - Mitigation: Simple copy script in package.json
   - Consider single source of truth post-MVP

## Success Metrics (MVP)

1. **Consistency**: All 4 implementations use shared module
2. **Deposit Scoring**: New scores properly reflect deposit flexibility
3. **No Regression**: Scores stay in [0,100] range, no > 100 bugs
4. **Single Source**: Algorithm changes require only one file update
5. **Quick Delivery**: Full implementation in 2-3 days

## Long-term Benefits

1. **Single Source of Truth**: One canonical implementation in _shared/leaseScore.ts
2. **Easier Maintenance**: Change deposit bands once, applies everywhere
3. **Better Business Logic**: Deposit-based flexibility aligns with user value
4. **Reduced Bugs**: Impossible for implementations to diverge
5. **Version Tracking**: calculation_version field enables rollback/comparison
6. **Developer Experience**: Clear API, focused tests, simple to understand

## Next Steps

1. **Day 1**: Create shared module + tests
2. **Day 2**: Update all implementations + migration
3. **Day 3**: Deploy and validate
4. **Post-MVP**: Monitor, optimize, consider advanced features

## Appendix: Formula (v2 - deposit-based)

For reference, the v2 lease score formula uses:

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

Upfront (Deposit) Score (20% weight): based on firstPayment as % of retail price
- 0%: 100 points
- ≤ 3%: 95 points
- ≤ 5%: 90 points
- ≤ 7%: 80 points
- ≤ 10%: 70 points
- ≤ 15%: 55 points
- ≤ 20%: 40 points
- > 20%: 25 points

Total Score = Round(
  MonthlyRateScore * 0.45 +
  MileageScore * 0.35 +
  UpfrontScore * 0.20
)

Clamped to range [0, 100]
```

Versioning and breakdown:
- `calculation_version: '2.0'`
- Breakdown fields include: `monthlyRateScore`, `monthlyRatePercent`, `mileageScore`, `mileageNormalized`, `upfrontScore`, `firstPaymentPercent`.

---

*Document created: 2025-01-08*  
*Updated: 2025-01-08 (Simplified to MVP approach)*  
*Author: System Architecture Team*  
*Status: READY FOR IMPLEMENTATION*
