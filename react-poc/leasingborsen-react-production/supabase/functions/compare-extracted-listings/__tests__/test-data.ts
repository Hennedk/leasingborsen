import type { ExtractedCar, ExistingListing } from "../types.ts"

// Test data for Toyota transmission bug scenario
export const toyotaTestData = {
  existingManual: {
    id: "toyota-1",
    make: "Toyota",
    model: "AYGO X",
    variant: "Pulse",
    transmission: "manual",
    fuel_type: "benzin",
    horsepower: 72,
    monthly_price: 2195,
    offers: [
      { monthly_price: 2195, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
    ]
  } as ExistingListing,
  
  extractedAutomatic: {
    make: "Toyota",
    model: "AYGO X",
    variant: "Pulse",
    transmission: "automatic",
    fuel_type: "benzin",
    horsepower: 72,
    monthly_price: 2395,
    offers: [
      { monthly_price: 2395, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
    ]
  } as ExtractedCar,

  extractedWithAutomatikInName: {
    make: "Toyota",
    model: "AYGO X",
    variant: "Pulse Automatik",
    transmission: "automatic",
    fuel_type: "benzin",
    horsepower: 72
  } as ExtractedCar
}

// Test data for VW multiple offers scenario
export const vwTestData = {
  existingWithMultipleOffers: {
    id: "vw-1",
    make: "VW",
    model: "ID.4",
    variant: "GTX",
    transmission: "automatic",
    fuel_type: "el",
     "suv",
    horsepower: 299,
    offers: [
      { monthly_price: 4999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
      { monthly_price: 5499, first_payment: 0, period_months: 36, mileage_per_year: 20000 },
      { monthly_price: 5999, first_payment: 0, period_months: 36, mileage_per_year: 25000 }
    ]
  } as ExistingListing,

  extractedWithReorderedOffers: {
    make: "VW",
    model: "ID.4",
    variant: "GTX",
    transmission: "automatic",
    fuel_type: "el",
     "suv",
    horsepower: 299,
    offers: [
      { monthly_price: 5999, first_payment: 0, period_months: 36, mileage_per_year: 25000 },
      { monthly_price: 4999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
      { monthly_price: 5499, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
    ]
  } as ExtractedCar,

  extractedWithPriceChange: {
    make: "VW",
    model: "ID.4",
    variant: "GTX",
    transmission: "automatic",
    fuel_type: "el",
     "suv",
    horsepower: 299,
    offers: [
      { monthly_price: 5299, first_payment: 0, period_months: 36, mileage_per_year: 15000 }, // Price changed
      { monthly_price: 5799, first_payment: 0, period_months: 36, mileage_per_year: 20000 }, // Price changed
      { monthly_price: 6299, first_payment: 0, period_months: 36, mileage_per_year: 25000 }  // Price changed
    ]
  } as ExtractedCar
}

// Test data for partial inventory upload scenario
export const partialInventoryTestData = {
  existingInventory: [
    {
      id: "vw-golf-1",
      make: "VW",
      model: "Golf",
      variant: "GTI",
      transmission: "automatic",
      fuel_type: "benzin",
        offers: []
    },
    {
      id: "vw-passat-1",
      make: "VW",
      model: "Passat",
      variant: "Elegance",
      transmission: "automatic",
      fuel_type: "diesel",
       offers: []
    },
    {
      id: "vw-tiguan-1",
      make: "VW",
      model: "Tiguan",
      variant: "R-Line",
      transmission: "automatic",
      fuel_type: "benzin",
       offers: []
    }
  ] as ExistingListing[],

  extractedPartial: [
    {
      make: "VW",
      model: "Golf",
      variant: "GTI",
      transmission: "automatic",
      fuel_type: "benzin",
     }
  ] as ExtractedCar[]
}

// Test data for fuzzy matching scenarios
export const fuzzyMatchTestData = {
  bmwVariantDifferences: {
    existing: {
      id: "bmw-1",
      make: "BMW",
      model: "X3",
      variant: "xDrive30d M Sport",
      transmission: "automatic",
      fuel_type: "diesel",
       horsepower: 286,
      offers: []
    } as ExistingListing,
    
    extracted: {
      make: "BMW",
      model: "X3",
      variant: "xDrive 30d M-Sport", // Minor formatting differences
      transmission: "automatic",
      fuel_type: "diesel",
       horsepower: 286
    } as ExtractedCar
  },

  mercedesHorsepowerClose: {
    existing: {
      id: "mercedes-1",
      make: "Mercedes",
      model: "GLC",
      variant: "300 d 4MATIC",
      transmission: "automatic",
      fuel_type: "diesel",
       horsepower: 245,
      offers: []
    } as ExistingListing,
    
    extracted: {
      make: "Mercedes",
      model: "GLC",
      variant: "300d 4MATIC",
      transmission: "automatic",
      fuel_type: "diesel",
       horsepower: 243 // Close HP (rounding difference)
    } as ExtractedCar
  }
}

// Test data for Hyundai equipment variants
export const hyundaiTestData = {
  baseVariant: {
    make: "Hyundai",
    model: "IONIQ 5",
    variant: "Ultimate 325 HK 4WD",
    transmission: "automatic",
    fuel_type: "el",
   } as ExtractedCar,

  equipmentVariant: {
    make: "Hyundai",
    model: "IONIQ 5",
    variant: "Ultimate 325 HK 4WD – 20\" alufælge, soltag",
    transmission: "automatic",
    fuel_type: "el",
   } as ExtractedCar
}

// Test data for performance testing
export function generateLargeDataset(count: number): { existing: ExistingListing[], extracted: ExtractedCar[] } {
  const makes = ["VW", "BMW", "Mercedes", "Audi", "Toyota"]
  const models = ["Golf", "3 Series", "C-Class", "A4", "Corolla"]
  const variants = ["Base", "Sport", "Luxury", "Performance", "Eco"]
  const transmissions = ["manual", "automatic"]
  
  const existing: ExistingListing[] = []
  const extracted: ExtractedCar[] = []
  
  for (let i = 0; i < count; i++) {
    const makeIndex = i % makes.length
    const modelIndex = i % models.length
    const variantIndex = i % variants.length
    const transmissionIndex = i % transmissions.length
    
    const listing: ExistingListing = {
      id: `listing-${i}`,
      make: makes[makeIndex],
      model: models[modelIndex],
      variant: variants[variantIndex],
      transmission: transmissions[transmissionIndex],
      fuel_type: "benzin",
       monthly_price: 3000 + (i * 10),
      offers: []
    }
    
    existing.push(listing)
    
    // Create extracted cars with some variations
    if (i < count * 0.5) {
      // 50% unchanged
      extracted.push({
        make: listing.make,
        model: listing.model,
        variant: listing.variant,
        transmission: listing.transmission,
        fuel_type: listing.fuel_type,
      })
    } else if (i < count * 0.75) {
      // 25% with price updates
      extracted.push({
        make: listing.make,
        model: listing.model,
        variant: listing.variant,
        transmission: listing.transmission,
        fuel_type: listing.fuel_type,
        monthly_price: listing.monthly_price! + 100
      })
    }
    // 25% will be missing (marked for deletion)
  }
  
  // Add some new cars
  for (let i = 0; i < count * 0.25; i++) {
    extracted.push({
      make: "Tesla",
      model: "Model 3",
      variant: `Variant ${i}`,
      transmission: "automatic",
      fuel_type: "el",
     })
  }
  
  return { existing, extracted }
}