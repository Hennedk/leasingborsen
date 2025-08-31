# Lease Score System - Leasingborsen Platform (v2.0)

Comprehensive documentation for the intelligent car leasing value scoring system with deposit-based flexibility scoring.

## Overview

The lease score system provides intelligent scoring of car listings based on value analysis across multiple pricing offers. Each listing can have multiple lease pricing options, and the system calculates the best possible score.

**Version 2.0 Updates**: 
- **Deposit-based scoring**: Uses upfront payment flexibility instead of contract term-based scoring, better aligning with user value perception
- **Centralized implementation**: Single source of truth in `supabase/functions/_shared/leaseScore.ts` eliminates duplicate code and prevents inconsistencies
- **Version tracking**: All scores tagged with `calculation_version: '2.0'` for rollback capability

## Scoring Algorithm (v2.0)

The lease score uses a weighted scoring system (0-100 scale):

```typescript
// v2.0 Scoring weights and calculation
const totalScore = Math.round(
  (monthlyRateScore * 0.45) +     // 45% - Monthly rate vs retail price
  (mileageScore * 0.35) +         // 35% - Mileage allowance value  
  (upfrontScore * 0.20)          // 20% - Upfront payment flexibility (NEW)
)
```

## Score Components Breakdown

### 1. Monthly Rate Score (45% weight)
Evaluates the monthly payment as a percentage of retail price.

**Calculation**: `(monthlyPrice / retailPrice) * 100`

**Score Bands**:
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

### Implementation Example (v2.0)
```typescript
// Multiple offers processing with v2.0 formula
const scores = listing.lease_pricing.map(pricing => ({
  pricingId: pricing.id,
  score: calculateLeaseScore({
    retailPrice: listing.retail_price,
    monthlyPrice: pricing.monthly_price,
    mileagePerYear: pricing.mileage_per_year,
    firstPayment: pricing.first_payment || 0,  // NEW: Deposit-based scoring
    contractMonths: pricing.period_months        // Kept for compatibility but ignored
  })
}))

// Use the best score (highest total)
const bestScore = scores.reduce((best, current) => 
  current.score.totalScore > best.score.totalScore ? current : best
)

// Store result with v2.0 breakdown
await updateListing({
  lease_score: bestScore.score.totalScore,
  lease_score_breakdown: {
    ...bestScore.score,                        // Includes calculation_version: '2.0'
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

-- Example v2.0 breakdown JSON structure
{
  "totalScore": 85,
  "monthlyRateScore": 90,
  "monthlyRatePercent": 1.05,
  "mileageScore": 75,
  "mileageNormalized": 15000,
  "upfrontScore": 90,                    // NEW: Deposit-based scoring
  "firstPaymentPercent": 5.0,            // NEW: Deposit as % of retail
  "calculation_version": "2.0",          // NEW: Version tracking
  "pricing_id": "uuid-of-winning-offer",
  // Backwards compatibility
  "flexibilityScore": 90                 // Maps to upfrontScore temporarily
}
```

### View Updates
The `full_listing_view` has been updated to include all lease score fields for efficient querying.

## Edge Functions

### Individual Calculation
**Endpoint**: `calculate-lease-score`

**Request (v2.0)**:
```json
{
  "retailPrice": 350000,
  "monthlyPrice": 3675,
  "mileagePerYear": 15000,
  "firstPayment": 17500,        // NEW: 5% deposit
  "contractMonths": 36          // Kept for compatibility but ignored
}
```

**Response (v2.0)**:
```json
{
  "totalScore": 85,
  "monthlyRateScore": 90,
  "monthlyRatePercent": 1.05,
  "mileageScore": 75,
  "mileageNormalized": 15000,
  "upfrontScore": 90,           // NEW: 5% deposit scores 90 points
  "firstPaymentPercent": 5.0,   // NEW: Deposit percentage
  "calculation_version": "2.0"  // NEW: Version tracking
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

### Update Triggers (v2.0)
Scores are automatically marked stale when:
- Retail price changes
- Lease pricing updated (monthly_price, period_months, mileage_per_year, **first_payment**)
- New pricing option added
- Pricing option deleted

**New in v2.0**: The trigger now monitors `first_payment` changes since deposit amounts directly affect upfront scores.

### Reporting
- Monthly score distribution analysis
- Dealer average scores
- Score trends over time
- Conversion rate by score range