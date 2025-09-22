# Lease Score System - Leasingborsen Platform

Comprehensive documentation for the intelligent car leasing value scoring system with Denmark-aware Effective Monthly Load (EML) scoring.

## Overview

The lease score system provides intelligent scoring of car listings based on value analysis across multiple pricing offers. Each listing can have multiple lease pricing options, and the system calculates the best possible score.

## Version History

### Version 2.1 (Current) - Effective Monthly Implementation
- **Effective Monthly (EM)**: True monthly cost including amortized upfront payments over Danish 12-month and full-term horizons
- **Denmark-aware scoring**: 70% weight on 12-month early termination (Danish private lease right)  
- **Enhanced accuracy**: Captures real cost of ownership, not just sticker monthly price
- **Backward compatible**: Same API shapes, field names, and UI components
- **Production ready**: Includes mandatory gates for anchor calibration, type safety, and data quality
- **Deployed**: 2025-09-04 with comprehensive test suite and Edge Functions synchronization

### Version 2.0 (Legacy)
- **Deposit-based scoring**: Uses upfront payment flexibility instead of contract term-based scoring, better aligning with user value perception
- **Centralized implementation**: Single source of truth in `supabase/functions/_shared/leaseScore.ts` eliminates duplicate code and prevents inconsistencies
- **Version tracking**: All scores tagged with `calculation_version: '2.0'` for rollback capability
- **Superseded**: Replaced by v2.1 EML system for more accurate Danish market representation

## Scoring Algorithms

### Current Algorithm (v2.1) - EML Implementation

The lease score uses a weighted scoring system (0-100 scale) with Effective Monthly Load (EML) calculation:

```typescript
// v2.1 EML-based scoring (current)
const eml12 = monthlyPrice + (firstPayment / 12)        // Danish 12-month exit
const emlTerm = monthlyPrice + (firstPayment / termMonths)  // Full contract
const emlBlend = (0.7 * eml12Percent) + (0.3 * emlTermPercent) // Denmark-weighted blend

const totalScore = Math.round(
  (emlScore * 0.45) +             // 45% - EML-based true monthly cost
  (mileageScore * 0.35) +         // 35% - Mileage allowance (unchanged)
  (upfrontScore * 0.20)          // 20% - Flexibility penalty (to be reduced to 15% in v2.2)
)
```

### Legacy Algorithm (v2.0)

```typescript
// v2.0 Scoring weights and calculation (superseded)
const totalScore = Math.round(
  (monthlyRateScore * 0.45) +     // 45% - Monthly rate vs retail price (raw)
  (mileageScore * 0.35) +         // 35% - Mileage allowance value  
  (upfrontScore * 0.20)          // 20% - Upfront payment flexibility
)
```

## Score Components Breakdown

### 1. Monthly Rate Score (45% weight)

#### Current (v2.1): Effective Monthly Load (EML)
Evaluates true monthly cost including amortized upfront payments over Danish market exit horizons.

**Calculation**: 
```typescript
const eml12Percent = ((monthlyPrice + (firstPayment / 12)) / retailPrice) * 100
const emlTermPercent = ((monthlyPrice + (firstPayment / termMonths)) / retailPrice) * 100
const emlBlendPercent = (0.7 * eml12Percent) + (0.3 * emlTermPercent)
```

#### Legacy (v2.0): Raw Monthly Rate
Evaluates the monthly payment as a percentage of retail price (superseded).

**Calculation**: `(monthlyPrice / retailPrice) * 100`

| EML Rate | Score | Rating |
|----------|-------|--------|
| ≤ 0.85% | 100 points | Exceptional |
| 0.85-1.20% | 80-99 points | Excellent |
| 1.20-1.55% | 60-79 points | Good |
| 1.55-1.90% | 40-59 points | Fair |
| 1.90-2.25% | 20-39 points | Poor |
| ≥ 2.25% | 0-19 points | Very Poor |

*Note: v2.1 anchors (0.85% - 2.25%) calibrated and deployed 2025-09-04.*

**Legacy Score Bands (v2.0)**: Step-based (superseded)
| Rate | Score | Rating |
|------|-------|--------|
| < 0.9% | 100 points | Excellent |
| < 1.1% | 90 points | Very Good |
| < 1.3% | 80 points | Good |
| < 1.5% | 70 points | Fair |
| < 1.7% | 60 points | Below Average |
| < 1.9% | 50 points | Poor |
| < 2.1% | 40 points | Very Poor |
| ≥ 2.1% | 25 points | Extremely Poor |

### 2. Mileage Score (35% weight)
Evaluates the included mileage allowance.

**Calculation**: 
- Higher mileage allowance = better value = higher score
- Based on annual mileage bands

**Score Bands**:
| Annual Mileage | Score | Rating |
|----------------|-------|--------|
| ≥ 25,000 km | 100 points | Excellent |
| ≥ 20,000 km | 90 points | Very Good |
| ≥ 15,000 km | 75 points | Good (baseline) |
| ≥ 12,000 km | 55 points | Fair |
| ≥ 10,000 km | 35 points | Below Average |
| < 10,000 km | 20 points | Poor |

### 3. Upfront Score (20% weight) - NEW in v2.0
Evaluates upfront payment flexibility based on deposit as percentage of retail price.

**Business Logic**: Lower deposits provide better payment flexibility and higher scores.

**Calculation**: `(firstPayment / retailPrice) * 100`

**Score Bands**:
| Deposit % | Score | Rating |
|-----------|-------|--------|
| 0% | 100 points | Maximum Flexibility |
| ≤ 3% | 95 points | Excellent |
| ≤ 5% | 90 points | Very Good |
| ≤ 7% | 80 points | Good |
| ≤ 10% | 70 points | Fair |
| ≤ 15% | 55 points | Below Average |
| ≤ 20% | 40 points | Poor |
| > 20% | 25 points | Very Poor |

## Multi-Offer Processing

When a listing has multiple lease offers, the system:

1. **Calculates Individual Scores**: Each pricing option gets its own score
2. **Selects Best Score**: The highest total score becomes the listing's official score
3. **Stores Winner Details**: The winning offer's pricing_id and breakdown are stored

### Unified Offer Selection (2025-02 Refresh)
- **Single source of truth**: `supabase/functions/_shared/offerSelection.ts` exports `selectBestOffer` and `selectOfferWithFallback`; the web app consumes them via `src/lib/offerSelection.ts`.
- **Default alignment**: Mileage defaults to 15,000 km and deposit to 35,000 kr when a user has not supplied values; lease terms prefer `[userTerm, 36, 24, 48]` in that order.
- **User intent detection**: Zero-deposit selections now count as user input because `isUserSpecified` only checks for `undefined`, preventing defaults from overriding real campaign offers.
- **Fallback behaviour**: Similar cars and other derived views call `selectOfferWithFallback`, which runs strict matching first, then flexible mileage matching, and finally falls back to the cheapest offer if no structured match exists.
- **Telemetry**: Edge functions log whenever flexible or cheapest fallbacks are used, helping track mismatches during rollout.

### Implementation Example (v2.1)
```typescript
// Multiple offers processing with v2.1 EML formula
const scores = listing.lease_pricing.map(pricing => ({
  pricingId: pricing.id,
  score: calculateLeaseScore({
    retailPrice: listing.retail_price,
    monthlyPrice: pricing.monthly_price,
    mileagePerYear: pricing.mileage_per_year,
    firstPayment: pricing.first_payment || 0,  // Used in EML calculation
    contractMonths: pricing.period_months        // NOW USED: Critical for EML term calculation
  })
}))

// Use the best score (highest total)
const bestScore = scores.reduce((best, current) => 
  current.score.totalScore > best.score.totalScore ? current : best
)

// Store result with v2.1 breakdown
await updateListing({
  lease_score: bestScore.score.totalScore,
  lease_score_breakdown: {
    ...bestScore.score,                        // Includes calculation_version: '2.1'
    pricing_id: bestScore.pricingId
  },
  lease_score_calculated_at: new Date()
})
```

## Database Implementation

### Schema Changes
```sql
-- New fields added to listings table
ALTER TABLE listings ADD COLUMN lease_score INTEGER;
ALTER TABLE listings ADD COLUMN lease_score_calculated_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN lease_score_breakdown JSONB;

-- v2.1 breakdown JSON structure (current)
{
  "totalScore": 82,
  "monthlyRateScore": 78,
  "monthlyRatePercent": 1.39,            // NOW: EML blend percentage
  "mileageScore": 75,
  "mileageNormalized": 15000,
  "upfrontScore": 90,                    
  "firstPaymentPercent": 5.0,            
  // New EML fields
  "eml12Percent": 1.47,                  // 12-month exit EML
  "emlTermPercent": 1.19,                // Full-term EML  
  "emlBlendPercent": 1.39,               // Weighted blend
  "calculation_version": "2.1",          
  "baseline": { "method": "anchors" },   // Scoring method
  "pricing_id": "uuid-of-winning-offer",
  "flexibilityScore": 90                 // Backward compatibility
}

-- v2.0 breakdown JSON structure (legacy)
{
  "totalScore": 85,
  "monthlyRateScore": 90,
  "monthlyRatePercent": 1.05,            // Raw monthly rate (superseded)
  "mileageScore": 75,
  "mileageNormalized": 15000,
  "upfrontScore": 90,                    
  "firstPaymentPercent": 5.0,            
  "calculation_version": "2.0",          
  "pricing_id": "uuid-of-winning-offer",
  "flexibilityScore": 90                 // Alias for upfrontScore
}
```

### View Updates
The `full_listing_view` has been updated to include all lease score fields for efficient querying.

## Edge Functions

### Individual Calculation
**Endpoint**: `calculate-lease-score`

**Request (v2.1)**:
```json
{
  "retailPrice": 350000,
  "monthlyPrice": 3675,
  "mileagePerYear": 15000,
  "firstPayment": 17500,        // 5% deposit - used in EML calculation
  "contractMonths": 36          // NOW USED: Critical for EML term calculation
}
```

**Response (v2.1)**:
```json
{
  "totalScore": 82,
  "monthlyRateScore": 78,
  "monthlyRatePercent": 1.39,   // EML blend percentage
  "mileageScore": 75,
  "mileageNormalized": 15000,
  "upfrontScore": 90,           // 5% deposit scores 90 points
  "firstPaymentPercent": 5.0,   // Deposit percentage
  "eml12Percent": 1.47,         // 12-month exit EML
  "emlTermPercent": 1.19,       // Full-term EML
  "emlBlendPercent": 1.39,      // Weighted blend
  "calculation_version": "2.1", // Version tracking
  "baseline": { "method": "anchors" }
}
```

### Bulk Processing
**Endpoint**: `batch-calculate-lease-scores?ids=id1,id2,id3&force=true`

**Features**:
- Processes specific listing IDs
- Handles multiple offers per listing
- Automatic cache invalidation
- Progress tracking

## Admin Interface Integration

### React Hooks
```typescript
// Bulk calculation hook
import { useBulkLeaseScoreCalculation } from '@/hooks/useBulkLeaseScoreCalculation'

const { mutate: calculateScores, isLoading } = useBulkLeaseScoreCalculation()

// Calculate scores for selected listings
calculateScores(selectedListings) // Array of listing IDs
```

### UI Components
```typescript
// Score display component
import { LeaseScoreBadge } from '@/components/ui/LeaseScoreBadge'

<LeaseScoreBadge
  score={listing.lease_score}
  breakdown={listing.lease_score_breakdown}
  calculatedAt={listing.lease_score_calculated_at}
  retailPrice={listing.retail_price}
  showTooltip={true}
/>
```

### Visual Indicators
- **Green Badge (≥80)**: Excellent value deals
- **Yellow Badge (60-79)**: Good value deals  
- **Red Badge (<60)**: Below-average value deals
- **Gray Badge**: No score calculated or missing retail price

## Score Calculation Logic

### Prerequisites
- Listing must have `retail_price` (not null)
- At least one `lease_pricing` record must exist
- All required fields must be present

### Calculation Flow
1. Fetch listing with all pricing options
2. Validate prerequisites
3. Calculate score for each pricing option
4. Select highest scoring option
5. Update listing with score and breakdown
6. Invalidate React Query cache

### Error Handling
- Missing retail price: Skip calculation
- No pricing options: Skip calculation
- Calculation errors: Log and continue with next listing

## Performance Considerations

### Caching Strategy
- Scores cached at database level
- React Query caches frontend data
- Force recalculation with `force=true` parameter

### Bulk Processing
- Processes in batches of 50 listings
- Async processing with progress tracking
- Automatic retry on failures

### Query Optimization
```sql
-- Efficient score queries
SELECT * FROM full_listing_view 
WHERE lease_score >= 80 
ORDER BY lease_score DESC;

-- Stale score detection
SELECT listing_id FROM listings 
WHERE lease_score_calculated_at < updated_at
OR lease_score IS NULL;
```

## Troubleshooting

### Common Issues

**Score Not Showing**
1. Check `retail_price` exists on listing
2. Verify `lease_pricing` records exist
3. Confirm calculation succeeded in logs
4. Hard refresh browser (Ctrl+Shift+R)

**Calculation Fails**
1. Check Edge Function logs
2. Verify data integrity
3. Review error messages
4. Check for null values

**Incorrect Scores**
1. Verify pricing data accuracy
2. Check calculation breakdown
3. Review score component weights
4. Validate business rules

### Debugging Commands
```bash
# View calculation logs
supabase functions logs calculate-lease-score
supabase functions logs batch-calculate-lease-scores

# Check specific listing
SELECT 
  listing_id,
  retail_price,
  lease_score,
  lease_score_breakdown,
  lease_score_calculated_at
FROM listings 
WHERE listing_id = 'uuid';

# View pricing options
SELECT * FROM lease_pricing 
WHERE listing_id = 'uuid';
```

## Business Rules

### Score Interpretation
- **80-100**: Premium value - highlight these deals
- **60-79**: Good value - standard presentation
- **40-59**: Fair value - consider improvements
- **0-39**: Poor value - review pricing strategy

### Update Triggers

#### Current (v2.1)
Scores are automatically marked stale when:
- Retail price changes
- Lease pricing updated (monthly_price, **period_months**, mileage_per_year, **first_payment**)
- New pricing option added
- Pricing option deleted

**Enhanced in v2.1**: The trigger now monitors `period_months` changes since contract term is critical for EML calculation.

```sql
-- v2.1 Enhanced staleness trigger (implemented)
CREATE OR REPLACE TRIGGER pricing_score_stale
AFTER INSERT OR UPDATE OF 
  monthly_price, 
  period_months,      -- NOW CRITICAL: Used in EML term calculation
  mileage_per_year, 
  first_payment       -- CRITICAL: Used in EML upfront amortization
ON lease_pricing
FOR EACH ROW EXECUTE FUNCTION mark_listing_score_stale();
```

#### Legacy (v2.0)
Previous triggers monitored:
- Retail price changes
- Lease pricing updated (monthly_price, mileage_per_year, **first_payment**)
- **Note**: `period_months` was ignored in v2.0 since contract term wasn't used in scoring

### Reporting
- Monthly score distribution analysis
- Dealer average scores
- Score trends over time
- Conversion rate by score range

## Future Enhancements (EML v2.2+)

### Phase 1: Core EML Implementation (v2.1) - ✅ COMPLETED 2025-09-04
- **✅ Delivered**: Deployed with existing database fields (`first_payment`, `period_months`)
- **✅ Danish Context**: 70/30 weight for 12-month vs full-term economics implemented
- **✅ Backward Compatible**: Same UI, API shapes, and field names maintained
- **✅ Calibrated Anchors**: Anchor-based scoring with validation gates implemented

### Phase 2: Enhanced Fee Integration (v2.2) - PLANNED
- **Database Enhancement**: Add `establishment_fee`, `end_inspection_fee`, `early_exit_fee_months` columns
- **AI Extraction Updates**: Capture all lease fees from dealer PDFs
- **Complete EML Calculation**: Include all upfront and exit costs
- **Weight Optimization**: Reduce upfront component from 20% to 15% (minimize double-counting)

### Phase 3: Advanced Features (v2.3+)
- **Segment-Specific Scoring**: Different anchors for luxury vs economy vehicles
- **Quantile-Based Scoring**: Market percentile positioning vs fixed anchors
- **User Preferences**: Customizable 12-month vs full-term weight based on user profile
- **Business Lease Support**: Different scoring for business vs private leases

## EML Implementation Resources

For detailed EML implementation information, see:

- **[Complete Implementation Plan](./LEASE_SCORE_EML_IMPLEMENTATION_PLAN.md)** - Comprehensive technical guide
- **[EML Quick Reference](./EML_QUICK_REFERENCE.md)** - Summary of key changes and examples
- **[Current Session Log](./SESSION_LOG.md)** - Latest development updates

## Danish Market Context

### Why EML Matters for Denmark

1. **Early Termination Right**: Private lease contracts allow 12-month exit
2. **Consumer Behavior**: Most consider both short-term flexibility and full-term value  
3. **True Cost Representation**: High deposits significantly impact affordability
4. **Regulatory Alignment**: Scoring reflects actual Danish leasing regulations

### EML Impact Examples

**High Deposit Scenario** (Premium SUV):
- v2.0 Score: 95 (ignores 50,000 kr deposit impact)
- v2.1 Score: 49 (reflects 12-month exit cost reality)

**Zero Deposit Scenario** (Economy car):
- v2.0 Score: 81 (raw monthly rate)
- v2.1 Score: 77 (similar, no upfront to amortize)

This better aligns scoring with consumer value perception and market reality.
