# Comparison Engine Test Implementation Plan

## Overview
This plan addresses the missing unit tests that would have prevented the transmission matching bug discovered in production. The testing documentation specified comprehensive tests, but they were never implemented.

## Background
A critical bug was found where the comparison engine incorrectly suggested creating new listings and deleting existing ones for vehicles that differed only by transmission type (e.g., Toyota AYGO X Pulse Manual vs Automatic). The root cause was that the matching key only included `make|model|variant` and ignored `transmission`.

## Current State Analysis
- **Test Infrastructure**: Already set up (Vitest, testing libraries, factories)
- **Existing Test**: Basic comparison-engine.test.ts exists but doesn't test the actual Edge Function logic
- **Missing**: Tests for the actual `compare-extracted-listings` Edge Function logic

## Implementation Plan

### 1. Create Edge Function Unit Tests (Priority 1)
**File**: `supabase/functions/compare-extracted-listings/__tests__/index.test.ts`

This will test the actual comparison logic from the Edge Function, including:
- Exact key matching with transmission differentiation
- Composite key matching
- Algorithmic confidence matching
- Change detection (CREATE, UPDATE, DELETE, UNCHANGED)
- Edge cases (Toyota transmission variants, multiple offers, etc.)

### 2. Create Integration Tests (Priority 2)
**File**: `src/services/comparison/__tests__/comparison-integration.test.ts`

This will test the full comparison workflow:
- Calling the Edge Function from the frontend
- Handling response data
- Error scenarios
- Large dataset performance

### 3. Update Existing Test File (Priority 3)
**File**: `src/services/comparison/__tests__/comparison-engine.test.ts`

Enhance the existing test to:
- Import actual comparison logic utilities
- Test against real Edge Function behavior
- Add the missing transmission test case

### 4. Create Test Utilities
**File**: `src/test/utils/comparison-helpers.ts`

Helper functions for:
- Creating test vehicles with proper transmission data
- Mocking Edge Function responses
- Asserting change types correctly

## Key Test Cases to Implement

### Critical Bug Prevention Tests

#### 1. Transmission Differentiation Test (would have caught the bug)
```typescript
test('should treat same model with different transmissions as separate vehicles', () => {
  const existing = [
    { 
      make: 'Toyota', 
      model: 'AYGO X', 
      variant: 'Pulse', 
      transmission: 'manual',
      monthly_price: 2195 
    }
  ]
  const extracted = [
    { 
      make: 'Toyota', 
      model: 'AYGO X', 
      variant: 'Pulse', 
      transmission: 'automatic',
      monthly_price: 2395 
    }
  ]
  
  const result = await compareListings(existing, extracted)
  
  // Should create new automatic version, not update the manual
  expect(result.changes.filter(c => c.changeType === 'create')).toHaveLength(1)
  expect(result.changes.filter(c => c.changeType === 'delete')).toHaveLength(1)
  expect(result.changes.filter(c => c.changeType === 'update')).toHaveLength(0)
})
```

#### 2. Exact Key Generation Test
```typescript
test('exact key should include transmission for differentiation', () => {
  const key1 = generateExactKey('Toyota', 'AYGO X', 'Pulse', 'manual')
  const key2 = generateExactKey('Toyota', 'AYGO X', 'Pulse', 'automatic')
  
  expect(key1).toBe('toyota|aygo x|pulse|manual')
  expect(key2).toBe('toyota|aygo x|pulse|automatic')
  expect(key1).not.toBe(key2)
})
```

#### 3. Multiple Offers Comparison Test
```typescript
test('should correctly compare vehicles with multiple lease offers', () => {
  const existing = [{
    make: 'VW',
    model: 'ID.4',
    variant: 'GTX',
    offers: [
      { monthly_price: 4999, mileage_per_year: 15000 },
      { monthly_price: 5499, mileage_per_year: 20000 }
    ]
  }]
  
  const extracted = [{
    make: 'VW',
    model: 'ID.4',
    variant: 'GTX',
    offers: [
      { monthly_price: 5499, mileage_per_year: 20000 }, // Same offers, different order
      { monthly_price: 4999, mileage_per_year: 15000 }
    ]
  }]
  
  const result = await compareListings(existing, extracted)
  
  // Should detect as unchanged despite different order
  expect(result.changes.filter(c => c.changeType === 'unchanged')).toHaveLength(1)
  expect(result.changes.filter(c => c.changeType === 'update')).toHaveLength(0)
})
```

### Edge Case Tests

#### 1. Toyota Transmission Handling
```typescript
test('Toyota: should handle transmission in variant name', () => {
  const extracted = [
    { make: 'Toyota', model: 'Aygo X', variant: 'Active 72 HK' },
    { make: 'Toyota', model: 'Aygo X', variant: 'Active 72 HK Automatik' }
  ]
  
  const processed = processExtractedVehicles(extracted)
  
  // Both should have same variant but different transmission
  expect(processed[0].variant).toBe('Active 72 HK')
  expect(processed[1].variant).toBe('Active 72 HK')
  expect(processed[0].transmission).not.toBe(processed[1].transmission)
})
```

#### 2. Partial Inventory Upload
```typescript
test('should handle partial inventory uploads correctly', () => {
  const existing = [
    { make: 'VW', model: 'Golf', variant: 'GTI' },
    { make: 'VW', model: 'Passat', variant: 'Elegance' },
    { make: 'VW', model: 'Tiguan', variant: 'R-Line' }
  ]
  
  // Only Golf in extracted (partial upload)
  const extracted = [
    { make: 'VW', model: 'Golf', variant: 'GTI' }
  ]
  
  const result = await compareListings(existing, extracted, { sellerId: 'test-dealer' })
  
  // Should mark Passat and Tiguan for deletion
  expect(result.changes.filter(c => c.changeType === 'delete')).toHaveLength(2)
  expect(result.changes.filter(c => c.changeType === 'unchanged')).toHaveLength(1)
})
```

### Performance Tests

#### 1. Large Dataset Handling
```typescript
test('should handle large datasets efficiently', () => {
  const existing = generateVehicles(1000)
  const extracted = [
    ...existing.slice(0, 500),                        // 500 unchanged
    ...existing.slice(500, 750).map(updatePrice),    // 250 updates
    ...generateVehicles(250)                          // 250 new
  ]
  
  const start = Date.now()
  const result = await compareListings(existing, extracted)
  const duration = Date.now() - start
  
  expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
  expect(result.summary.totalUnchanged).toBe(500)
  expect(result.summary.totalUpdated).toBe(250)
  expect(result.summary.totalNew).toBe(250)
  expect(result.summary.totalDeleted).toBe(250)
})
```

#### 2. Deduplication Logic Test
```typescript
test('should handle full_listing_view duplicates correctly', () => {
  // Simulate full_listing_view with duplicates due to lease_pricing JOIN
  const duplicatedListings = [
    { id: '1', make: 'VW', model: 'Golf', lease_pricing_id: 'a' },
    { id: '1', make: 'VW', model: 'Golf', lease_pricing_id: 'b' }, // Same car, different offer
    { id: '2', make: 'VW', model: 'Passat', lease_pricing_id: 'c' }
  ]
  
  const deduplicated = deduplicateListings(duplicatedListings)
  
  expect(deduplicated).toHaveLength(2)
  expect(deduplicated.find(l => l.id === '1')).toBeDefined()
  expect(deduplicated.find(l => l.id === '2')).toBeDefined()
})
```

## Testing Strategy

### Unit Test Coverage Goals
- **Comparison Logic**: 95% coverage
- **Edge Cases**: 100% coverage for known patterns
- **Error Handling**: 90% coverage

### Test Execution Plan
1. Run tests locally with: `npm run test:comparison`
2. Add to CI/CD pipeline
3. Run before each deployment
4. Monitor test performance metrics

### Continuous Integration
```yaml
# .github/workflows/test.yml
- name: Run Comparison Tests
  run: |
    npm run test:comparison
    npm run test:coverage -- --coverage.include='**/compare-extracted-listings/**'
```

## File Structure
```
supabase/functions/compare-extracted-listings/
├── __tests__/
│   ├── index.test.ts          # Edge Function unit tests
│   ├── matching.test.ts       # Key generation tests
│   ├── offers.test.ts         # Offer comparison tests
│   └── test-data.ts           # Test fixtures
├── index.ts                   # Main Edge Function
└── utils/                     # Extract utilities for testing
    ├── comparison.ts          # Comparison logic
    ├── matching.ts            # Key generation logic
    └── offers.ts              # Offer comparison logic

src/services/comparison/
├── __tests__/
│   ├── comparison-engine.test.ts      # Enhanced existing tests
│   └── comparison-integration.test.ts # New integration tests
└── comparison-service.ts              # Frontend service

src/test/
├── utils/
│   └── comparison-helpers.ts  # Test utilities
└── fixtures/
    └── comparison-data.ts     # Test data
```

## Success Metrics
1. **Bug Prevention**: No more transmission matching errors
2. **Test Execution Time**: < 2 seconds for unit tests
3. **Coverage**: > 90% for critical comparison logic
4. **Confidence**: Team can deploy without manual testing

## Implementation Timeline
- **Day 1**: Implement Edge Function unit tests (8 hours)
  - Extract comparison logic into testable modules
  - Write comprehensive unit tests
  - Achieve 90%+ coverage
  
- **Day 2**: Create integration tests and test utilities (6 hours)
  - Build test utilities and helpers
  - Implement integration tests
  - Test error scenarios
  
- **Day 3**: Enhance existing tests and add CI/CD integration (4 hours)
  - Update existing comparison-engine.test.ts
  - Add tests to CI/CD pipeline
  - Document testing procedures

## Lessons Learned
1. **Critical business logic must have tests before deployment**
2. **Matching logic should be explicit about all comparison criteria**
3. **Edge cases from different dealers need specific test coverage**
4. **Performance testing prevents regression in large datasets**

## Next Steps
1. Review this plan with the team
2. Prioritize implementation based on current bug reports
3. Set up monitoring for test coverage metrics
4. Schedule regular test reviews

This comprehensive test suite will ensure that bugs like the transmission matching issue are caught before they reach production, improving system reliability and reducing debugging time.