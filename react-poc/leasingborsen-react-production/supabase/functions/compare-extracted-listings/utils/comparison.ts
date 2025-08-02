import type { ExtractedCar, ExistingListing, ListingMatch } from '../types.ts'
import { extractSpecsFromVariant, generateCompositeKey, calculateMatchConfidence } from './matching.ts'
import { compareOfferArrays, calculateTotalPrice } from './offers.ts'

/**
 * Compare extracted data with existing listing to find actual changes
 */
export function detectFieldChanges(extracted: ExtractedCar, existing: ExistingListing): Record<string, { old: any; new: any }> | null {
  const changes: Record<string, { old: any; new: any }> = {}
  
  // Compare basic fields
  if (extracted.variant !== existing.variant) {
    changes.variant = { old: existing.variant, new: extracted.variant }
  }
  
  if (extracted.horsepower !== existing.horsepower && extracted.horsepower !== undefined) {
    changes.horsepower = { old: existing.horsepower, new: extracted.horsepower }
  }
  
  if (extracted.fuel_type !== existing.fuel_type && extracted.fuel_type) {
    changes.fuel_type = { old: existing.fuel_type, new: extracted.fuel_type }
  }
  
  if (extracted.transmission !== existing.transmission && extracted.transmission) {
    changes.transmission = { old: existing.transmission, new: extracted.transmission }
  }
  
  
  if (extracted.year !== existing.year && extracted.year !== undefined) {
    changes.year = { old: existing.year, new: extracted.year }
  }
  
  if (extracted.wltp !== existing.wltp && extracted.wltp !== undefined) {
    changes.wltp = { old: existing.wltp, new: extracted.wltp }
  }
  
  if (extracted.co2_emission !== existing.co2_emission && extracted.co2_emission !== undefined) {
    changes.co2_emission = { old: existing.co2_emission, new: extracted.co2_emission }
  }
  
  if (extracted.co2_tax_half_year !== existing.co2_tax_half_year && extracted.co2_tax_half_year !== undefined) {
    changes.co2_tax_half_year = { old: existing.co2_tax_half_year, new: extracted.co2_tax_half_year }
  }
  
  if (extracted.consumption_l_100km !== existing.consumption_l_100km && extracted.consumption_l_100km !== undefined) {
    changes.consumption_l_100km = { old: existing.consumption_l_100km, new: extracted.consumption_l_100km }
  }
  
  if (extracted.consumption_kwh_100km !== existing.consumption_kwh_100km && extracted.consumption_kwh_100km !== undefined) {
    changes.consumption_kwh_100km = { old: existing.consumption_kwh_100km, new: extracted.consumption_kwh_100km }
  }
  
  // Compare offers/pricing - comprehensive comparison
  const extractedHasOffers = extracted.offers && extracted.offers.length > 0
  const existingHasOffers = existing.offers && existing.offers.length > 0
  
  if (extractedHasOffers || existingHasOffers) {
    // Check if number of offers changed
    const extractedOfferCount = extracted.offers?.length || 0
    const existingOfferCount = existing.offers?.length || 0
    
    if (extractedOfferCount !== existingOfferCount) {
      changes.offers = { 
        old: existingHasOffers ? `${existingOfferCount} tilbud` : 'Ingen tilbud', 
        new: extractedHasOffers ? `${extractedOfferCount} tilbud` : 'Ingen tilbud' 
      }
    } else if (extractedHasOffers && existingHasOffers) {
      // Same number of offers - compare content
      const offersChanged = compareOfferArrays(extracted.offers, existing.offers)
      if (offersChanged) {
        changes.offers = {
          old: `${existingOfferCount} tilbud (indhold ændret)`,
          new: `${extractedOfferCount} tilbud (nye priser/vilkår)`
        }
      }
    }
  }
  
  // Return null if no changes, otherwise return the changes object
  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Get variant tracking information from extracted car
 */
export function getVariantTracking(extracted: ExtractedCar): ListingMatch['variantTracking'] {
  if (extracted.variantSource) {
    return {
      source: extracted.variantSource,
      confidence: extracted.variantConfidence || 0,
      details: extracted.variantMatchDetails
    }
  }
  
  return {
    source: 'unknown',
    confidence: 0,
    details: null
  }
}

/**
 * Generate exact key for Level 1 matching - based on make, model, variant only
 * No listings can have the same make, model, variant combination
 */
export function generateExactKey(make: string, model: string, variant: string, transmission?: string): string {
  return `${make}|${model}|${variant}`.toLowerCase()
}

/**
 * Process existing listings into lookup maps for efficient matching
 */
export function createExistingListingMaps(deduplicatedExistingListings: any[]) {
  const existingByExactKey = new Map<string, ExistingListing>()
  const existingByCompositeKey = new Map<string, ExistingListing>()

  deduplicatedExistingListings.forEach((listing: any) => {
    // Construct offers array from individual pricing fields if no lease_pricing array exists
    const offers = listing.lease_pricing || (listing.monthly_price ? [{
      monthly_price: listing.monthly_price,
      first_payment: listing.first_payment,
      period_months: listing.period_months || 36,
      mileage_per_year: listing.mileage_per_year || 15000,
      total_price: calculateTotalPrice(listing.monthly_price, listing.period_months || 36, listing.first_payment)
    }] : [])

    const existingListing: ExistingListing = {
      id: listing.id,
      make: listing.make,
      model: listing.model,
      variant: listing.variant,
      horsepower: listing.horsepower,
      fuel_type: listing.fuel_type,
      transmission: listing.transmission,
      year: listing.year,
      wltp: listing.wltp,
      co2_emission: listing.co2_emission,
      co2_tax_half_year: listing.co2_tax_half_year,
      consumption_l_100km: listing.consumption_l_100km,
      consumption_kwh_100km: listing.consumption_kwh_100km,
      monthly_price: listing.monthly_price,
      offers: offers
    }

    // Exact key for Level 1 matching
    const exactKey = generateExactKey(listing.make, listing.model, listing.variant)
    if (!existingByExactKey.has(exactKey)) {
      existingByExactKey.set(exactKey, existingListing)
    }

    // Composite key for Level 2 matching
    const compositeKey = generateCompositeKey(
      listing.make, 
      listing.model, 
      listing.variant, 
      listing.horsepower, 
      listing.transmission
    )
    
    if (!existingByCompositeKey.has(compositeKey)) {
      existingByCompositeKey.set(compositeKey, existingListing)
    }
  })

  return { existingByExactKey, existingByCompositeKey }
}

/**
 * Find the best match for an extracted car among existing listings
 */
export function findBestMatch(
  car: ExtractedCar,
  existingByExactKey: Map<string, ExistingListing>,
  existingByCompositeKey: Map<string, ExistingListing>,
  alreadyMatchedIds: Set<string>
): {
  existingMatch: ExistingListing | null
  matchMethod: string
  confidence: number
} {
  // Level 1: Exact variant match
  const exactKey = generateExactKey(car.make, car.model, car.variant)
  const exactMatch = existingByExactKey.get(exactKey)
  
  if (exactMatch && !alreadyMatchedIds.has(exactMatch.id)) {
    return {
      existingMatch: exactMatch,
      matchMethod: 'exact',
      confidence: 1.0
    }
  }
  
  // Level 2: Composite key match
  const compositeKey = generateCompositeKey(
    car.make, 
    car.model, 
    car.variant, 
    car.horsepower, 
    car.transmission
  )
  const compositeMatch = existingByCompositeKey.get(compositeKey)
  
  if (compositeMatch && !alreadyMatchedIds.has(compositeMatch.id)) {
    return {
      existingMatch: compositeMatch,
      matchMethod: 'fuzzy',
      confidence: 0.95
    }
  }
  
  // Level 3: Algorithmic confidence matching
  let bestMatch: ExistingListing | null = null
  let bestConfidence = 0
  
  // Check all existing listings for algorithmic match
  for (const [key, existing] of existingByExactKey.entries()) {
    // Skip if this listing is already matched
    if (alreadyMatchedIds.has(existing.id)) {
      continue
    }
    
    // Only check same make/model
    if (existing.make.toLowerCase() === car.make.toLowerCase() && 
        existing.model.toLowerCase() === car.model.toLowerCase()) {
      
      const calcConfidence = calculateMatchConfidence(car, existing)
      // Threshold of 0.85 to be selective
      if (calcConfidence > bestConfidence && calcConfidence >= 0.85) {
        bestConfidence = calcConfidence
        bestMatch = existing
      }
    }
  }
  
  if (bestMatch && bestConfidence >= 0.85) {
    return {
      existingMatch: bestMatch,
      matchMethod: 'algorithmic',
      confidence: bestConfidence
    }
  }
  
  return {
    existingMatch: null,
    matchMethod: 'unmatched',
    confidence: 0
  }
}