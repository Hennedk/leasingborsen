import type { ExtractedCar, ExistingListing } from '@/types'

export function createExtractedCar(overrides: Partial<ExtractedCar> = {}): ExtractedCar {
  return {
    make: 'VW',
    model: 'Golf',
    variant: 'GTI',
    horsepower: 245,
    fuel_type: 'benzin',
    transmission: 'manual',
    body_type: 'hatchback',
    year: 2023,
    wltp: 170,
    co2_emission: 147,
    consumption_l_100km: 7.4,
    monthly_price: 4999,
    offers: [
      {
        monthly_price: 4999,
        first_payment: 0,
        period_months: 36,
        mileage_per_year: 15000
      }
    ],
    ...overrides
  }
}

export function createExistingListing(overrides: Partial<ExistingListing> = {}): ExistingListing {
  return {
    id: crypto.randomUUID(),
    make: 'VW',
    model: 'Golf',
    variant: 'GTI',
    horsepower: 245,
    fuel_type: 'benzin',
    transmission: 'manual',
    body_type: 'hatchback',
    year: 2023,
    wltp: 170,
    co2_emission: 147,
    consumption_l_100km: 7.4,
    monthly_price: 4999,
    offers: [
      {
        monthly_price: 4999,
        first_payment: 0,
        period_months: 36,
        mileage_per_year: 15000
      }
    ],
    ...overrides
  }
}

// Danish-specific test cases
export const danishVariants = [
  { 
    input: 'Active 72 HK', 
    expected: { 
      horsepower: 72, 
      coreVariant: 'Active',
      transmission: undefined,
      awd: false
    } 
  },
  { 
    input: 'Elegance 150 HK DSG', 
    expected: { 
      horsepower: 150, 
      coreVariant: 'Elegance', 
      transmission: 'automatic',
      awd: false
    } 
  },
  { 
    input: 'Sportline 190 HK 4MOTION', 
    expected: { 
      horsepower: 190, 
      coreVariant: 'Sportline', 
      transmission: undefined,
      awd: true
    } 
  },
  {
    input: 'GTX Performance+ 299 HK DSG7 quattro',
    expected: {
      horsepower: 299,
      coreVariant: 'GTX Performance+',
      transmission: 'automatic',
      awd: true
    }
  },
  {
    input: 'ID.4 GTX 299 HK Automatik',
    expected: {
      horsepower: 299,
      coreVariant: 'ID.4 GTX',
      transmission: 'automatic',
      awd: false
    }
  },
  {
    input: 'e-tron GT 476 HK',
    expected: {
      horsepower: 476,
      coreVariant: 'GT',
      transmission: undefined,
      awd: false
    }
  }
]

// Edge cases for testing
export const edgeCaseVehicles = [
  {
    name: 'Toyota bZ4X transmission bug',
    existing: { 
      id: '1',
      make: 'Toyota', 
      model: 'bZ4X', 
      variant: 'Executive', 
      transmission: 'automatic',
      offers: []
    },
    extracted: { 
      make: 'Toyota', 
      model: 'bZ4X', 
      variant: 'Executive', 
      transmission: undefined 
    },
    expectedMatch: true,
    expectedMatchMethod: 'exact'
  },
  {
    name: 'Multiple offers same total different structure',
    existing: { 
      id: '2',
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
      offers: [
        { monthly_price: 3000, first_payment: 10000, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 3500, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
    },
    extracted: {
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
      offers: [
        { monthly_price: 3500, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 3000, first_payment: 10000, period_months: 36, mileage_per_year: 15000 }
      ]
    },
    expectedChange: false // Same offers, different order
  },
  {
    name: 'Horsepower range tolerance',
    existing: {
      id: '3',
      make: 'BMW',
      model: '320i',
      variant: 'Sport',
      horsepower: 184,
      offers: []
    },
    extracted: {
      make: 'BMW',
      model: '320i',
      variant: 'Sport',
      horsepower: 186 // Slight difference (within tolerance)
    },
    expectedConfidence: 0.85 // Should still be high confidence
  },
  {
    name: 'Variant with multiple specifications',
    existing: {
      id: '4',
      make: 'Audi',
      model: 'A4',
      variant: '2.0 TFSI 190 HK S tronic Sport quattro',
      horsepower: 190,
      transmission: 'automatic',
      offers: []
    },
    extracted: {
      make: 'Audi',
      model: 'A4',
      variant: '2.0 TFSI 190 HK S tronic Sport quattro'
    },
    expectedMatch: true,
    expectedMatchMethod: 'exact'
  },
  {
    name: 'Danish special characters',
    existing: {
      id: '5',
      make: 'Citroën',
      model: 'C3',
      variant: 'Shine+ 110 HK',
      offers: []
    },
    extracted: {
      make: 'Citroen', // Without special characters
      model: 'C3',
      variant: 'Shine+ 110 HK'
    },
    expectedMatch: false // Different make due to character difference
  }
]

// Test data generators
export function generateVehicles(count: number, baseVehicle?: Partial<ExtractedCar>): ExtractedCar[] {
  const vehicles: ExtractedCar[] = []
  const makes = ['VW', 'BMW', 'Toyota', 'Audi', 'Mercedes']
  const models = ['Golf', '320i', 'Corolla', 'A4', 'C-Class']
  const variants = ['Sport', 'Elegance', 'GTI', 'Style', 'Premium']
  
  for (let i = 0; i < count; i++) {
    vehicles.push(createExtractedCar({
      make: makes[i % makes.length],
      model: models[i % models.length],
      variant: `${variants[i % variants.length]} ${i + 1}`,
      horsepower: 150 + (i * 10),
      monthly_price: 3000 + (i * 100),
      ...baseVehicle
    }))
  }
  
  return vehicles
}

export function updatePrice(vehicle: ExtractedCar, newPrice: number): ExtractedCar {
  return {
    ...vehicle,
    monthly_price: newPrice,
    offers: vehicle.offers?.map(offer => ({
      ...offer,
      monthly_price: newPrice
    }))
  }
}

// Common test scenarios
export const testScenarios = {
  identicalVehicles: {
    extracted: createExtractedCar({
      make: 'VW',
      model: 'Golf',
      variant: 'GTI 245 HK',
      horsepower: 245
    }),
    existing: createExistingListing({
      make: 'VW',
      model: 'Golf',
      variant: 'GTI 245 HK',
      horsepower: 245
    })
  },
  
  priceChangeOnly: {
    extracted: createExtractedCar({
      monthly_price: 4599
    }),
    existing: createExistingListing({
      monthly_price: 4999
    })
  },
  
  newVehicle: {
    extracted: createExtractedCar({
      make: 'Tesla',
      model: 'Model 3',
      variant: 'Long Range'
    }),
    existing: [] // No matching vehicle
  },
  
  transmissionVariants: {
    extracted: [
      createExtractedCar({
        make: 'Toyota',
        model: 'AYGO X',
        variant: 'Pulse',
        transmission: 'manual'
      }),
      createExtractedCar({
        make: 'Toyota',
        model: 'AYGO X',
        variant: 'Pulse',
        transmission: 'automatic'
      })
    ],
    existing: [
      createExistingListing({
        make: 'Toyota',
        model: 'AYGO X',
        variant: 'Pulse',
        transmission: 'manual'
      })
    ]
  }
}