import type { ExtractedCar, ExistingListing, ListingMatch } from '@/types'

// Real-world test data based on actual production scenarios

export const toyotaTransmissionScenario = {
  description: 'Toyota AYGO X with different transmissions should be treated as separate vehicles',
  
  existing: [
    {
      id: 'toyota-aygo-manual-1',
      make: 'Toyota',
      model: 'AYGO X',
      variant: 'Pulse',
      transmission: 'manual',
      fuel_type: 'benzin',
      body_type: 'hatchback',
      horsepower: 72,
      year: 2024,
      monthly_price: 2195,
      first_payment: 0,
      period_months: 36,
      mileage_per_year: 15000,
      offers: [
        { monthly_price: 2195, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
    }
  ] as ExistingListing[],
  
  extracted: [
    {
      make: 'Toyota',
      model: 'AYGO X',
      variant: 'Pulse',
      transmission: 'automatic',
      fuel_type: 'benzin',
      body_type: 'hatchback',
      horsepower: 72,
      year: 2024,
      monthly_price: 2395,
      first_payment: 0,
      period_months: 36,
      mileage_per_year: 15000,
      offers: [
        { monthly_price: 2395, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 1,  // Should create the automatic version
    updates: 0,  // Should NOT update the manual version
    deletes: 1,  // Manual version not in extracted = delete
    unchanged: 0
  }
}

export const vwMultipleOffersScenario = {
  description: 'VW ID.4 with multiple lease offers in different order should be detected as unchanged',
  
  existing: [
    {
      id: 'vw-id4-gtx-1',
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'suv',
      horsepower: 299,
      year: 2024,
      wltp: 520,
      co2_emission: 0,
      offers: [
        { monthly_price: 4999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 5499, first_payment: 0, period_months: 36, mileage_per_year: 20000 },
        { monthly_price: 5999, first_payment: 0, period_months: 36, mileage_per_year: 25000 }
      ]
    }
  ] as ExistingListing[],
  
  extracted: [
    {
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'suv',
      horsepower: 299,
      year: 2024,
      wltp: 520,
      co2_emission: 0,
      offers: [
        { monthly_price: 5999, first_payment: 0, period_months: 36, mileage_per_year: 25000 },
        { monthly_price: 4999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 5499, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
      ]
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 0,
    updates: 0,
    deletes: 0,
    unchanged: 1  // Should be unchanged despite different order
  }
}

export const fordMerprisScenario = {
  description: 'Ford with merpris (additional mileage pricing) should be expanded correctly',
  
  existing: [],
  
  extracted: [
    {
      make: 'Ford',
      model: 'Fiesta',
      variant: 'Titanium',
      transmission: 'manual',
      fuel_type: 'benzin',
      body_type: 'hatchback',
      horsepower: 100,
      year: 2024,
      offers: [
        { monthly_price: 2495, first_payment: 0, period_months: 36, mileage_per_year: 10000 },
        { monthly_price: 2695, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 2895, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
      ]
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 1,  // One vehicle with multiple offers
    updates: 0,
    deletes: 0,
    unchanged: 0
  }
}

export const hyundaiEquipmentVariantsScenario = {
  description: 'Hyundai with equipment variants should be treated as separate vehicles',
  
  existing: [],
  
  extracted: [
    {
      make: 'Hyundai',
      model: 'IONIQ 5',
      variant: 'Ultimate 325 HK 4WD',
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'suv',
      horsepower: 325,
      offers: []
    },
    {
      make: 'Hyundai',
      model: 'IONIQ 5',
      variant: 'Ultimate 325 HK 4WD – 20" alufælge, soltag',
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'suv',
      horsepower: 325,
      offers: []
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 2,  // Both variants should be created separately
    updates: 0,
    deletes: 0,
    unchanged: 0
  }
}

export const partialInventoryUploadScenario = {
  description: 'Uploading partial inventory (e.g., only Golf models) marks other models for deletion',
  
  existing: [
    {
      id: 'vw-golf-1',
      make: 'VW',
      model: 'Golf',
      variant: 'GTI',
      transmission: 'automatic',
      fuel_type: 'benzin',
      body_type: 'hatchback',
      offers: []
    },
    {
      id: 'vw-passat-1',
      make: 'VW',
      model: 'Passat',
      variant: 'Elegance',
      transmission: 'automatic',
      fuel_type: 'diesel',
      body_type: 'stationcar',
      offers: []
    },
    {
      id: 'vw-tiguan-1',
      make: 'VW',
      model: 'Tiguan',
      variant: 'R-Line',
      transmission: 'automatic',
      fuel_type: 'benzin',
      body_type: 'suv',
      offers: []
    }
  ] as ExistingListing[],
  
  extracted: [
    {
      make: 'VW',
      model: 'Golf',
      variant: 'GTI',
      transmission: 'automatic',
      fuel_type: 'benzin',
      body_type: 'hatchback',
      offers: []
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 0,
    updates: 0,
    deletes: 2,  // Passat and Tiguan should be marked for deletion
    unchanged: 1  // Golf remains unchanged
  }
}

export const fuzzyMatchingScenario = {
  description: 'BMW with minor variant name differences should be matched',
  
  existing: [
    {
      id: 'bmw-x3-1',
      make: 'BMW',
      model: 'X3',
      variant: 'xDrive30d M Sport',
      transmission: 'automatic',
      fuel_type: 'diesel',
      body_type: 'suv',
      horsepower: 286,
      year: 2024,
      monthly_price: 6500,
      offers: []
    }
  ] as ExistingListing[],
  
  extracted: [
    {
      make: 'BMW',
      model: 'X3',
      variant: 'xDrive 30d M-Sport',  // Minor formatting differences
      transmission: 'automatic',
      fuel_type: 'diesel',
      body_type: 'suv',
      horsepower: 286,
      year: 2024,
      monthly_price: 6750,  // Price update
      offers: []
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 0,
    updates: 1,  // Should match and update despite variant name differences
    deletes: 0,
    unchanged: 0
  }
}

export const missingModelReferenceScenario = {
  description: 'Vehicle with model not in reference data should be marked as missing_model',
  
  existing: [],
  
  extracted: [
    {
      make: 'Tesla',
      model: 'Cybertruck',  // Assuming this doesn't exist in models table
      variant: 'Dual Motor',
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'pickup',
      offers: [],
      model_id: undefined  // No model_id means model doesn't exist
    }
  ] as ExtractedCar[],
  
  expectedResult: {
    creates: 0,
    updates: 0,
    deletes: 0,
    unchanged: 0,
    missing_models: 1
  }
}

// Performance test scenario generator
export function generateLargeDatasetScenario(size: number) {
  const existing: ExistingListing[] = []
  const extracted: ExtractedCar[] = []
  
  const makes = ['VW', 'BMW', 'Mercedes', 'Audi', 'Toyota', 'Ford', 'Hyundai', 'Kia', 'Peugeot', 'Renault']
  const models = ['Model1', 'Model2', 'Model3', 'Model4', 'Model5']
  const variants = ['Base', 'Sport', 'Luxury', 'Performance', 'Eco']
  const transmissions = ['manual', 'automatic']
  const fuelTypes = ['benzin', 'diesel', 'el', 'hybrid']
  
  // Generate existing listings
  for (let i = 0; i < size; i++) {
    existing.push({
      id: `perf-${i}`,
      make: makes[i % makes.length],
      model: models[i % models.length],
      variant: variants[i % variants.length],
      transmission: transmissions[i % transmissions.length],
      fuel_type: fuelTypes[i % fuelTypes.length],
      body_type: 'sedan',
      horsepower: 100 + (i % 200),
      year: 2020 + (i % 5),
      monthly_price: 2000 + (i % 20) * 100,
      offers: []
    })
  }
  
  // Generate extracted data with variations
  // 50% unchanged
  for (let i = 0; i < size * 0.5; i++) {
    const listing = existing[i]
    extracted.push({
      make: listing.make,
      model: listing.model,
      variant: listing.variant,
      transmission: listing.transmission,
      fuel_type: listing.fuel_type,
      body_type: listing.body_type,
      horsepower: listing.horsepower,
      year: listing.year,
      monthly_price: listing.monthly_price,
      offers: []
    })
  }
  
  // 25% with updates
  for (let i = Math.floor(size * 0.5); i < size * 0.75; i++) {
    const listing = existing[i]
    extracted.push({
      make: listing.make,
      model: listing.model,
      variant: listing.variant,
      transmission: listing.transmission,
      fuel_type: listing.fuel_type,
      body_type: listing.body_type,
      horsepower: listing.horsepower,
      year: listing.year,
      monthly_price: listing.monthly_price! + 200,  // Price increase
      offers: []
    })
  }
  
  // 25% missing (will be marked for deletion)
  // Don't add them to extracted
  
  // Add 25% new vehicles
  for (let i = 0; i < size * 0.25; i++) {
    extracted.push({
      make: 'NewMake',
      model: `NewModel${i}`,
      variant: `NewVariant${i}`,
      transmission: 'automatic',
      fuel_type: 'el',
      body_type: 'suv',
      horsepower: 200,
      year: 2024,
      monthly_price: 5000 + (i % 10) * 100,
      offers: []
    })
  }
  
  return {
    description: `Large dataset with ${size} existing listings`,
    existing,
    extracted,
    expectedResult: {
      creates: Math.floor(size * 0.25),
      updates: Math.floor(size * 0.25),
      deletes: Math.floor(size * 0.25),
      unchanged: Math.floor(size * 0.5)
    }
  }
}