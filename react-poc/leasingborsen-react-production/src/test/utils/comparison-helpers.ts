import type { ExtractedCar, ExistingListing, ListingMatch } from '@/types'

/**
 * Create a test vehicle with default values
 */
export function createTestVehicle(overrides: Partial<ExtractedCar> = {}): ExtractedCar {
  return {
    make: 'TestMake',
    model: 'TestModel',
    variant: 'TestVariant',
    transmission: 'manual',
    fuel_type: 'benzin',
    body_type: 'sedan',
    horsepower: 150,
    year: 2024,
    wltp: 200,
    co2_emission: 120,
    monthly_price: 3000,
    offers: [],
    ...overrides
  }
}

/**
 * Create a test existing listing with default values
 */
export function createTestListing(overrides: Partial<ExistingListing> = {}): ExistingListing {
  return {
    id: `listing-${Math.random().toString(36).substr(2, 9)}`,
    make: 'TestMake',
    model: 'TestModel',
    variant: 'TestVariant',
    transmission: 'manual',
    fuel_type: 'benzin',
    body_type: 'sedan',
    horsepower: 150,
    year: 2024,
    wltp: 200,
    co2_emission: 120,
    monthly_price: 3000,
    offers: [],
    ...overrides
  }
}

/**
 * Create test vehicles with proper transmission data
 */
export const testVehicles = {
  toyotaManual: () => createTestVehicle({
    make: 'Toyota',
    model: 'AYGO X',
    variant: 'Pulse',
    transmission: 'manual',
    horsepower: 72,
    monthly_price: 2195
  }),
  
  toyotaAutomatic: () => createTestVehicle({
    make: 'Toyota',
    model: 'AYGO X',
    variant: 'Pulse',
    transmission: 'automatic',
    horsepower: 72,
    monthly_price: 2395
  }),
  
  vwGolfGTI: (transmission: 'manual' | 'automatic' = 'automatic') => createTestVehicle({
    make: 'Volkswagen',
    model: 'Golf',
    variant: 'GTI',
    transmission,
    horsepower: 245,
    fuel_type: 'benzin',
    body_type: 'hatchback',
    monthly_price: transmission === 'manual' ? 3799 : 3999
  }),
  
  bmwX3: () => createTestVehicle({
    make: 'BMW',
    model: 'X3',
    variant: 'xDrive30d',
    transmission: 'automatic',
    horsepower: 286,
    fuel_type: 'diesel',
    body_type: 'suv',
    monthly_price: 6500
  })
}

/**
 * Create test offers
 */
export function createTestOffers(basePrice: number, variants: { mileage: number, supplement: number }[]) {
  return variants.map(({ mileage, supplement }) => ({
    monthly_price: basePrice + supplement,
    first_payment: 0,
    period_months: 36,
    mileage_per_year: mileage
  }))
}

/**
 * Mock Edge Function response for comparison
 */
export function mockComparisonResponse(
  matches: ListingMatch[],
  summary?: Partial<any>
) {
  const defaultSummary = {
    totalExtracted: matches.filter(m => m.extracted).length,
    totalExisting: matches.filter(m => m.existing).length,
    totalMatched: matches.filter(m => m.existing && m.changeType !== 'delete').length,
    totalNew: matches.filter(m => m.changeType === 'create').length,
    totalUpdated: matches.filter(m => m.changeType === 'update').length,
    totalUnchanged: matches.filter(m => m.changeType === 'unchanged').length,
    totalDeleted: matches.filter(m => m.changeType === 'delete').length,
    totalMissingModels: matches.filter(m => m.changeType === 'missing_model').length,
    exactMatches: matches.filter(m => m.matchMethod === 'exact').length,
    fuzzyMatches: matches.filter(m => m.matchMethod === 'fuzzy' || m.matchMethod === 'algorithmic').length,
    ...summary
  }

  return {
    success: true,
    matches,
    summary: defaultSummary
  }
}

/**
 * Assert change types correctly for a set of matches
 */
export function assertChangeTypes(
  matches: ListingMatch[],
  expected: {
    create?: number
    update?: number
    unchanged?: number
    delete?: number
    missing_model?: number
  }
) {
  const actual = {
    create: matches.filter(m => m.changeType === 'create').length,
    update: matches.filter(m => m.changeType === 'update').length,
    unchanged: matches.filter(m => m.changeType === 'unchanged').length,
    delete: matches.filter(m => m.changeType === 'delete').length,
    missing_model: matches.filter(m => m.changeType === 'missing_model').length
  }

  Object.entries(expected).forEach(([type, count]) => {
    if (count !== undefined) {
      expect(actual[type as keyof typeof actual]).toBe(count)
    }
  })
}

/**
 * Generate test data for performance testing
 */
export function generatePerformanceTestData(count: number) {
  const existing: ExistingListing[] = []
  const extracted: ExtractedCar[] = []
  
  // Generate existing listings
  for (let i = 0; i < count; i++) {
    existing.push(createTestListing({
      id: `perf-${i}`,
      make: `Make${i % 10}`,
      model: `Model${i % 5}`,
      variant: `Variant${i % 3}`,
      monthly_price: 3000 + (i * 10)
    }))
  }
  
  // Generate extracted cars with variations
  for (let i = 0; i < count; i++) {
    if (i < count * 0.6) {
      // 60% unchanged
      extracted.push(createTestVehicle({
        make: existing[i].make,
        model: existing[i].model,
        variant: existing[i].variant,
        monthly_price: existing[i].monthly_price
      }))
    } else if (i < count * 0.8) {
      // 20% with price updates
      extracted.push(createTestVehicle({
        make: existing[i].make,
        model: existing[i].model,
        variant: existing[i].variant,
        monthly_price: existing[i].monthly_price! + 200
      }))
    }
    // 20% missing (will be marked for deletion)
  }
  
  // Add 20% new cars
  for (let i = 0; i < count * 0.2; i++) {
    extracted.push(createTestVehicle({
      make: 'NewMake',
      model: `NewModel${i}`,
      variant: `NewVariant${i}`,
      monthly_price: 4000 + (i * 10)
    }))
  }
  
  return { existing, extracted }
}

/**
 * Test data for specific scenarios
 */
export const scenarioTestData = {
  // Toyota transmission bug scenario
  transmissionDifferentiation: {
    existing: [
      createTestListing({
        id: 'toyota-manual',
        make: 'Toyota',
        model: 'AYGO X',
        variant: 'Pulse',
        transmission: 'manual',
        monthly_price: 2195
      })
    ],
    extracted: [
      createTestVehicle({
        make: 'Toyota',
        model: 'AYGO X',
        variant: 'Pulse',
        transmission: 'automatic',
        monthly_price: 2395
      })
    ],
    expectedChanges: { create: 1, delete: 1 }
  },
  
  // Multiple offers scenario
  multipleOffers: {
    existing: createTestListing({
      id: 'vw-multi',
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
      offers: createTestOffers(4999, [
        { mileage: 15000, supplement: 0 },
        { mileage: 20000, supplement: 500 },
        { mileage: 25000, supplement: 1000 }
      ])
    }),
    extracted: createTestVehicle({
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
      offers: createTestOffers(4999, [
        { mileage: 25000, supplement: 1000 }, // Same offers, different order
        { mileage: 15000, supplement: 0 },
        { mileage: 20000, supplement: 500 }
      ])
    }),
    expectedChanges: { unchanged: 1 }
  },
  
  // Partial inventory upload
  partialInventory: {
    existing: [
      createTestListing({ id: 'vw-1', model: 'Golf' }),
      createTestListing({ id: 'vw-2', model: 'Passat' }),
      createTestListing({ id: 'vw-3', model: 'Tiguan' })
    ],
    extracted: [
      createTestVehicle({ model: 'Golf' }) // Only Golf in extracted
    ],
    expectedChanges: { unchanged: 1, delete: 2 }
  }
}