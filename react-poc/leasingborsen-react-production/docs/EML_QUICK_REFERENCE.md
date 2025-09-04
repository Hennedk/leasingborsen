# Effective Monthly (EM) Quick Reference Guide

## What is Effective Monthly?

**Effective Monthly (EM)** = True monthly cost including amortized upfront payments

*Note: Code uses "EML" prefix (Effective Monthly Load) but user-facing term is "Effective Monthly"*

```
EML = Monthly Payment + (First Payment / Amortization Period)
```

## Key Changes: v2.0 → v2.1 ✅ COMPLETED

| Aspect | v2.0 (Legacy) | v2.1 (Current - EML) |
|--------|---------------|----------------------|
| **Monthly Calculation** | `monthlyPrice / retailPrice` | ✅ EML blend of 12-month and full-term |
| **Upfront Impact** | Separate 20% component only | ✅ Included in EML + separate component |
| **Danish Context** | Ignored | ✅ 70% weight on 12-month early exit |
| **Contract Term** | Ignored | ✅ Used in EML calculation |
| **Anchors** | 0.9% - 2.1% | ✅ 0.85% - 2.25% (calibrated) |

## EML Calculation Formula

### Step 1: Calculate EML Variants
```typescript
const eml12 = monthlyPrice + (firstPayment / 12)        // 12-month exit
const emlTerm = monthlyPrice + (firstPayment / termMonths)  // Full contract
```

### Step 2: Blend for Danish Market
```typescript
const emlBlendPercent = (0.7 * eml12Percent) + (0.3 * emlTermPercent)
```

### Step 3: Convert to Score
```typescript
const score = 100 * (2.25 - emlBlendPercent) / (2.25 - 0.85)
// Clamped to 0-100 range
```

## Quick Examples

### High Deposit Impact
```
BMW X3: 450,000 kr, 4,200 kr/month, 22,500 kr deposit (5%)

v2.0: (4,200/450,000)*100 = 0.93% → Score: ~95
v2.1: EML-12: 1.87% + EML-36: 1.10% → Blend: 1.56% → Score: 49

Result: 46-point penalty for high deposit in v2.1
```

### Zero Deposit Advantage
```
Tesla Model 3: 350,000 kr, 4,100 kr/month, 0 kr deposit

v2.0: (4,100/350,000)*100 = 1.17% → Score: ~81
v2.1: EML = 1.17% (same) → Score: ~77

Result: Similar scoring when no deposit
```

## Implementation Checklist

### Must-Fix Gates (MANDATORY) ✅ ALL COMPLETED
- [x] **GATE 1**: Anchor calibration passes CI (median 55-70, 10-25% score 80+)
- [x] **GATE 2**: Units clarity with Percent type safety 
- [x] **GATE 3**: Retail price bounds (75K-2.5M DKK) with guards
- [x] **GATE 4**: Double-counting visibility with explicit TODOs
- [x] **GATE 5**: Must-fix tests pass (rounding, boundaries, retail guards)

### Phase 1 Implementation ✅ ALL COMPLETED 2025-09-04
- [x] Update `calculateMonthlyRateScore()` function signature
- [x] Add Effective Monthly calculation logic with type safety
- [x] Update breakdown with `eml12Percent`, `emlTermPercent`, `emlBlendPercent`
- [x] Update staleness triggers for `period_months`
- [x] Update tooltip with "Effective Monthly" terminology
- [x] Add comprehensive unit tests including must-fix cases (21 tests passing)

### Phase 2 (Next Sprint)
- [ ] Add fee columns to database (`establishment_fee`, `end_inspection_fee`, `early_exit_fee_months`)
- [ ] Update AI extraction to capture fees
- [ ] Enhance EML calculation with all fees
- [ ] Reduce upfront weight from 20% to 15%

## Files to Modify

### Core Logic
- `src/lib/leaseScore.ts`
- `supabase/functions/_shared/leaseScore.ts`

### Edge Functions
- `supabase/functions/calculate-lease-score/index.ts`
- `supabase/functions/batch-calculate-lease-scores/index.ts`

### UI Components
- `src/components/ui/LeaseScoreBadge.tsx` (tooltip update)

### Database
- New migration for staleness triggers
- Future: fee columns migration

## Testing Priorities

1. **Guard clauses**: Invalid retail price, negative monthly price
2. **EML calculations**: High deposit vs zero deposit scenarios
3. **Score clamping**: Extremely good/bad deals stay in 0-100 range
4. **Tie-breakers**: Same monthly, different deposits → EML differentiates
5. **Edge cases**: Very short contracts (< 12 months)

## Common Issues & Solutions

### Issue: "Scores all cluster at extremes"
**Cause**: Anchors not calibrated to real data
**Solution**: Run calibration script, adjust BEST_EML/WORST_EML

### Issue: "High deposits get unfairly penalized"  
**Cause**: Double-counting (EML + upfront component)
**Solution**: v2.2 will reduce upfront weight to 15%

### Issue: "Business leases scored wrong"
**Cause**: Using private lease 70/30 blend for business leases
**Solution**: Add `isPrivateLease` field, adjust weights

## Calibration Commands

```bash
# Run anchor calibration
node scripts/calibrateAnchors.js

# Test score distribution
npm run test:score-distribution

# Batch recalculate with new anchors
curl -X POST /functions/v1/batch-calculate-lease-scores?force=true
```

## Success Criteria

- **Score Distribution**: Median around 60-65
- **High-Value Identification**: 15-20% score 80+
- **Performance**: <100ms per calculation
- **Coverage**: >80% of listings have scores
- **User Impact**: Higher engagement with high-scoring listings

## Migration Timeline

| Week | Activity | Status |
|------|----------|--------|
| **Week 1** | Calibrate anchors, fix function signatures | ✅ COMPLETED |
| **Week 2** | Deploy v2.1, monitor score distribution | ✅ COMPLETED |
| **Week 3** | Add database fee columns | 📋 PLANNED |
| **Week 4** | Implement v2.2 with full fee integration | 📋 PLANNED |

*Phase 1 (v2.1) completed ahead of schedule on 2025-09-04*

---

*Last Updated: Based on comprehensive implementation plan*