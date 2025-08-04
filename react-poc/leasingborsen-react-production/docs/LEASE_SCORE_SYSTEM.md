# Lease Score System - Leasingborsen Platform

Comprehensive documentation for the intelligent car leasing value scoring system.

## Overview

The lease score system provides intelligent scoring of car listings based on value analysis across multiple pricing offers. Each listing can have multiple lease pricing options, and the system calculates the best possible score.

## Scoring Algorithm

The lease score uses a weighted scoring system (0-100 scale):

```typescript
// Scoring weights and calculation
const totalScore = Math.round(
  (monthlyRateScore * 0.45) +     // 45% - Monthly rate vs retail price
  (mileageScore * 0.35) +         // 35% - Mileage allowance value  
  (flexibilityScore * 0.20)       // 20% - Contract term flexibility
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
- Normalized to 15,000 km baseline: `mileagePerYear / 15000`
- Higher mileage allowance = better value = higher score
- Linear scaling from 50-100 points

**Examples**:
- 10,000 km/year = ~67 points
- 15,000 km/year = 75 points (baseline)
- 20,000 km/year = ~83 points
- 25,000 km/year = ~92 points

### 3. Flexibility Score (20% weight)
Evaluates contract term flexibility.

**Score Mapping**:
- 24 months: 50 points (less flexible)
- 36 months: 75 points (standard)
- 48+ months: 100 points (most flexible)

## Multi-Offer Processing

When a listing has multiple lease offers, the system:

1. **Calculates Individual Scores**: Each pricing option gets its own score
2. **Selects Best Score**: The highest total score becomes the listing's official score
3. **Stores Winner Details**: The winning offer's pricing_id and breakdown are stored

### Implementation Example
```typescript
// Multiple offers processing
const scores = listing.lease_pricing.map(pricing => ({
  pricingId: pricing.id,
  score: calculateLeaseScore({
    retailPrice: listing.retail_price,
    monthlyPrice: pricing.monthly_price,
    contractMonths: pricing.period_months,
    mileagePerYear: pricing.mileage_per_year
  })
}))

// Use the best score (highest total)
const bestScore = scores.reduce((best, current) => 
  current.score.totalScore > best.score.totalScore ? current : best
)

// Store result
await updateListing({
  lease_score: bestScore.score.totalScore,
  lease_score_breakdown: bestScore.score,
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

-- Example breakdown JSON structure
{
  "totalScore": 85,
  "monthlyRateScore": 90,
  "mileageScore": 83,
  "flexibilityScore": 75,
  "monthlyRate": 1.05,
  "pricingId": "uuid-of-winning-offer"
}
```

### View Updates
The `full_listing_view` has been updated to include all lease score fields for efficient querying.

## Edge Functions

### Individual Calculation
**Endpoint**: `calculate-lease-score`

**Request**:
```json
{
  "retailPrice": 350000,
  "monthlyPrice": 3675,
  "contractMonths": 36,
  "mileagePerYear": 15000
}
```

**Response**:
```json
{
  "totalScore": 85,
  "monthlyRateScore": 90,
  "mileageScore": 75,
  "flexibilityScore": 75,
  "monthlyRate": 1.05
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
Scores are automatically marked stale when:
- Retail price changes
- Lease pricing updated
- New pricing option added
- Pricing option deleted

### Reporting
- Monthly score distribution analysis
- Dealer average scores
- Score trends over time
- Conversion rate by score range