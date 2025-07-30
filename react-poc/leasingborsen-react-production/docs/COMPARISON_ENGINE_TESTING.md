# Comparison Engine Testing Documentation

## Overview
This document describes the comprehensive test suite implemented for the comparison engine, addressing the critical transmission matching bug and ensuring robust comparison logic.

## Test Structure

### 1. Edge Function Unit Tests
Location: `supabase/functions/compare-extracted-listings/__tests__/`

#### Core Test Files
- **index.test.ts** - Main comparison logic tests including the transmission bug fix
- **matching.test.ts** - Variant extraction and matching algorithm tests
- **offers.test.ts** - Offer comparison and normalization tests
- **performance.test.ts** - Large dataset and performance tests
- **test-data.ts** - Shared test fixtures and data generators

#### Key Test Scenarios
1. **Transmission Differentiation** (Prevents the critical bug)
   - Tests that Toyota AYGO X Manual and Automatic are treated as separate vehicles
   - Validates exact key generation includes transmission
   - Ensures no false matches between different transmissions

2. **Multiple Offers Comparison**
   - Tests offer arrays with different ordering
   - Validates mixed array/object format handling
   - Ensures price changes are detected correctly

3. **Fuzzy Matching**
   - Tests variant name variations (e.g., "M Sport" vs "M-Sport")
   - Validates horsepower tolerance (±5 HP)
   - Ensures transmission differences prevent matching

4. **Edge Cases**
   - Hyundai equipment variants treated as separate
   - Toyota "Automatik" in variant name handling
   - Partial inventory upload deletion logic

### 2. Frontend Integration Tests
Location: `src/services/comparison/__tests__/`

- **comparison-integration.test.ts** - Full workflow testing with React hooks
- **comparison-engine.test.ts** - Enhanced with real comparison logic

### 3. Test Utilities
Location: `src/test/utils/` and `src/test/fixtures/`

- **comparison-helpers.ts** - Test vehicle creation and assertion helpers
- **comparison-data.ts** - Real-world test scenarios based on production data

## Running Tests

### Local Development
```bash
# Run all comparison tests
npm run test:comparison

# Run Edge Function tests (requires Deno)
cd supabase/functions/compare-extracted-listings
deno test --allow-read --allow-env __tests__/*.test.ts

# Run with coverage
npm run test:coverage -- --coverage.include='**/comparison/**'

# Run specific test file
npm run test src/services/comparison/__tests__/comparison-integration.test.ts
```

### CI/CD Pipeline
Tests run automatically on:
- Push to `main` or `test/staging` branches
- Pull requests to `main`
- Changes to comparison-related files

GitHub Actions workflow: `.github/workflows/test-comparison.yml`

## Test Coverage Goals
- **Functions**: 90% coverage
- **Branches**: 80% coverage  
- **Lines**: 85% coverage
- **Statements**: 85% coverage

Critical paths require 100% coverage:
- Transmission differentiation logic
- Exact key generation
- Offer comparison logic

## Key Test Cases

### 1. Transmission Bug Prevention Test
```typescript
test('should treat same model with different transmissions as separate vehicles', () => {
  const existing = [{ 
    make: 'Toyota', 
    model: 'AYGO X', 
    variant: 'Pulse', 
    transmission: 'manual',
    monthly_price: 2195 
  }]
  
  const extracted = [{ 
    make: 'Toyota', 
    model: 'AYGO X', 
    variant: 'Pulse', 
    transmission: 'automatic',
    monthly_price: 2395 
  }]
  
  // Should create new automatic, not update manual
  expect(result.creates).toBe(1)
  expect(result.deletes).toBe(1)
  expect(result.updates).toBe(0)
})
```

### 2. Exact Key Generation Test
```typescript
test('exact key should include transmission for differentiation', () => {
  const key1 = generateExactKey('Toyota', 'AYGO X', 'Pulse', 'manual')
  const key2 = generateExactKey('Toyota', 'AYGO X', 'Pulse', 'automatic')
  
  expect(key1).toBe('toyota|aygo x|pulse|manual')
  expect(key2).toBe('toyota|aygo x|pulse|automatic')
  expect(key1).not.toBe(key2)
})
```

### 3. Multiple Offers Test
```typescript
test('should correctly compare vehicles with multiple lease offers', () => {
  const existing = {
    offers: [
      { monthly_price: 4999, mileage_per_year: 15000 },
      { monthly_price: 5499, mileage_per_year: 20000 }
    ]
  }
  
  const extracted = {
    offers: [
      { monthly_price: 5499, mileage_per_year: 20000 }, // Same, different order
      { monthly_price: 4999, mileage_per_year: 15000 }
    ]
  }
  
  expect(compareOfferArrays(extracted.offers, existing.offers)).toBe(false)
})
```

## Performance Benchmarks
- 1,000 listings: < 2 seconds
- 5,000 listings: < 10 seconds
- Map lookup: < 0.1ms average
- Deduplication: < 50ms for 3,000 records

## Debugging Failed Tests

### Common Issues
1. **Transmission not included in key**: Check `generateExactKey` includes transmission parameter
2. **Offers showing as changed**: Verify offer normalization and sorting logic
3. **False positive matches**: Check confidence threshold (should be ≥ 0.85)
4. **Performance degradation**: Review algorithmic matching logic for O(n²) patterns

### Debug Commands
```bash
# Run single test with console output
npm run test -- --reporter=verbose matching.test.ts

# Debug Edge Function test
cd supabase/functions/compare-extracted-listings
deno test --allow-read --allow-env --filter "transmission" __tests__/index.test.ts
```

## Future Improvements
1. Add property-based testing for edge cases
2. Implement snapshot testing for large comparison results
3. Add visual regression testing for UI components
4. Create performance regression tracking

## Lessons Learned
1. **Always include all differentiators in matching keys** - The transmission bug occurred because transmission wasn't in the exact key
2. **Test with real production data patterns** - Toyota's "Automatik" in variant names revealed edge cases
3. **Order-independent comparison is critical** - Offer arrays can be in any order
4. **Performance testing prevents surprises** - Large dealer inventories revealed O(n²) issues

This comprehensive test suite ensures the comparison engine handles all known edge cases and prevents regression of critical bugs like the transmission matching issue.