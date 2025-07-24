# Total Price Calculation Inconsistency Fix Plan

## 🎯 Issue Identified
`total_price` should be a calculated field using the formula:
```
total_price = (period_months × monthly_price) + first_payment
```

However, AI extraction and database calculations show inconsistencies, causing false "unchanged" classifications.

## 📊 Current State Analysis

### Database Function (Correct Calculation)
Our `get_dealer_existing_listings` migration calculates:
```sql
(lp.monthly_price * lp.period_months) + COALESCE(lp.first_payment, 0)
```
Result: `(13795 × 36) + 80000 = 576,620`

### AI Extraction (Inconsistent)
From extraction data: `total_price: 582,715`
Expected: `(13795 × 36) + 80000 = 576,620`
**Difference: 6,095 kr** 

## 🚨 Problem Sources

1. **AI may be extracting wrong total_price from PDF** - possibly including fees/taxes
2. **Inconsistent calculation standards** between AI and database
3. **Comparison logic trusts AI's total_price** instead of calculating it

## 💡 Proposed Solution

### Phase 1: Standardize Total Price Calculation
1. **Remove total_price from AI extraction schema** - don't extract it
2. **Always calculate total_price** in both database and comparison functions
3. **Make calculation consistent everywhere**: `months × monthly + first_payment`

### Phase 2: Update Comparison Logic
1. **Remove total_price comparison** from offers comparison
2. **Focus on core fields**: monthly_price, first_payment, period_months, mileage_per_year
3. **Calculate total_price dynamically** when needed for display

### Phase 3: Update AI Prompt
1. **Remove total_price from extraction schema**
2. **Focus AI on extracting**: monthly_price, first_payment, period_months, mileage_per_year
3. **Let system calculate total_price consistently**

## ✅ Expected Benefits

1. **Eliminate calculation discrepancies** - one source of truth
2. **Improve change detection accuracy** - focus on actual pricing changes
3. **Reduce AI extraction complexity** - fewer fields to extract accurately
4. **Consistent user experience** - same calculations everywhere

## 🔧 Implementation Steps

1. Update AI extraction schema to remove total_price
2. Update comparison functions to calculate rather than compare total_price
3. Update database functions to always calculate total_price
4. Test with real extraction to verify consistency
5. Deploy and verify accuracy improvement

## 📈 Expected Impact

**Current Issue**: Listings with identical pricing marked as "unchanged" due to 6,095 kr total_price calculation difference

**After Fix**: Only actual pricing field changes will trigger "update" status, eliminating false negatives

## Files to Modify

- `supabase/functions/ai-extract-vehicles/schema.ts` - Remove total_price from schema
- `supabase/functions/compare-extracted-listings/index.ts` - Remove total_price comparison
- AI prompts - Remove total_price extraction instructions
- Database functions - Ensure consistent calculation

**Status**: Ready for implementation when prioritized
**Effort**: ~4 hours
**Priority**: Medium (affects accuracy but current 88.4% accuracy is good)