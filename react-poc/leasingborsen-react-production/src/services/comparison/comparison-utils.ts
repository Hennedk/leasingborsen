// This file exports the same utilities as the Edge Function for use in frontend tests
// Import types from the hook where they're defined
import type { ExtractedCar } from '@/hooks/useListingComparison'

// Re-export for test usage
export type { ExtractedCar }

// Define ExistingListing type locally (matches the structure used in comparison)
export interface ExistingListing {
  id: string
  make: string
  model: string
  variant: string
  horsepower?: number
  transmission?: string
  fuel_type?: string
  body_type?: string
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  monthly_price?: number
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
  [key: string]: any
}

/**
 * Generate exact key for Level 1 matching - based on make, model, variant only
 * No listings can have the same make, model, variant combination
 */
export function generateExactKey(make: string, model: string, variant: string, _transmission?: string): string {
  // transmission parameter kept for API compatibility but not used in exact matching
  return `${make}|${model}|${variant}`.toLowerCase()
}

/**
 * Enhanced variant processing utility - extracts HP, transmission, and AWD info
 */
export function extractSpecsFromVariant(variant: string): { 
  coreVariant: string
  horsepower?: number
  transmission?: string
  awd?: boolean
} {
  const original = variant.toLowerCase()
  let coreVariant = variant
  let horsepower: number | undefined
  let transmission: string | undefined
  let awd = false

  // Extract horsepower (150 HK, 150HK, 150 hp)
  const hpMatch = original.match(/(\d+)\s*(?:hk|hp)\b/i)
  if (hpMatch) {
    horsepower = parseInt(hpMatch[1])
    coreVariant = coreVariant.replace(new RegExp(hpMatch[0], 'gi'), '').trim()
  }

  // Extract transmission info
  if (original.includes('dsg') || original.includes('s tronic') || original.includes('automatgear') || 
      original.includes('automatic') || original.includes('automatik')) {
    transmission = 'automatic'
    coreVariant = coreVariant.replace(/\b(?:dsg\d*|s[\s-]?tronic|automatgear|automatic|automatik)\b/gi, '').trim()
  } else if (original.includes('manual') || original.includes('manuel')) {
    transmission = 'manual'
    coreVariant = coreVariant.replace(/\b(?:manual|manuel)\b/gi, '').trim()
  }

  // Check for AWD/4WD indicators
  if (original.includes('quattro') || original.includes('4motion') || original.includes('awd') || 
      original.includes('4wd') || original.includes('xdrive') || original.includes('allrad')) {
    awd = true
    coreVariant = coreVariant.replace(/\b(?:quattro|4motion|awd|4wd|xdrive|allrad)\b/gi, '').trim()
  }

  // Remove fuel type modifiers that are redundant
  coreVariant = coreVariant
    .replace(/\b(mild\s*hybrid|hybrid|phev|ev|e-tron)\b/gi, '')
    .replace(/\b(tsi|tfsi|tdi|fsi|etsi)\b/gi, '') // Remove engine type codes
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .trim()

  return { coreVariant, horsepower, transmission, awd }
}

/**
 * Generate composite key including technical specs for enhanced matching
 */
export function generateCompositeKey(make: string, model: string, variant: string, horsepower?: number, transmission?: string): string {
  const specs = extractSpecsFromVariant(variant)
  const hp = horsepower || specs.horsepower
  const trans = transmission || specs.transmission
  
  let key = `${make}|${model}|${specs.coreVariant}`.toLowerCase()
  if (hp) key += `|${hp}hp`
  if (trans) key += `|${trans}`
  if (specs.awd) key += `|awd`
  
  return key
}

/**
 * Calculate match confidence based on multiple factors
 */
export function calculateMatchConfidence(extracted: ExtractedCar, existing: ExistingListing): number {
  let confidence = 0.0

  // Core variant similarity (most important)
  const extractedSpecs = extractSpecsFromVariant(extracted.variant)
  const existingSpecs = extractSpecsFromVariant(existing.variant)
  
  if (extractedSpecs.coreVariant.toLowerCase() === existingSpecs.coreVariant.toLowerCase()) {
    confidence += 0.4
  } else if (extractedSpecs.coreVariant.toLowerCase().includes(existingSpecs.coreVariant.toLowerCase()) ||
             existingSpecs.coreVariant.toLowerCase().includes(extractedSpecs.coreVariant.toLowerCase())) {
    confidence += 0.2
  }

  // Horsepower match (critical differentiator)
  const extractedHp = extracted.horsepower || extractedSpecs.horsepower
  const existingHp = existing.horsepower || existingSpecs.horsepower
  
  if (extractedHp && existingHp) {
    if (extractedHp === existingHp) {
      confidence += 0.3
    } else if (Math.abs(extractedHp - existingHp) <= 5) {
      confidence += 0.15 // Close HP might be rounding difference
    }
  }

  // Transmission match (critical differentiator)
  const extractedTrans = extracted.transmission || extractedSpecs.transmission
  const existingTrans = existing.transmission || existingSpecs.transmission
  
  if (extractedTrans && existingTrans) {
    if (extractedTrans === existingTrans) {
      confidence += 0.2
    }
  }

  // AWD match
  if (extractedSpecs.awd === existingSpecs.awd) {
    confidence += 0.1
  }

  return Math.min(confidence, 1.0)
}

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
  
  if (extracted.body_type !== existing.body_type && extracted.body_type) {
    changes.body_type = { old: existing.body_type, new: extracted.body_type }
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
  
  // Check offers for price changes (ExtractedCar doesn't have monthly_price directly)
  const extractedPrice = extracted.offers?.[0]?.monthly_price
  if (extractedPrice !== existing.monthly_price && extractedPrice !== undefined) {
    changes.monthly_price = { old: existing.monthly_price, new: extractedPrice }
  }
  
  // Return null if no changes, otherwise return the changes object
  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Process existing listings into lookup maps for efficient matching
 */
export function createExistingListingMaps(deduplicatedExistingListings: ExistingListing[]) {
  const existingByExactKey = new Map<string, ExistingListing>()
  const existingByCompositeKey = new Map<string, ExistingListing>()

  deduplicatedExistingListings.forEach((listing: ExistingListing) => {
    // Exact key for Level 1 matching
    const exactKey = generateExactKey(listing.make, listing.model, listing.variant)
    if (!existingByExactKey.has(exactKey)) {
      existingByExactKey.set(exactKey, listing)
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
      existingByCompositeKey.set(compositeKey, listing)
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
  for (const [, existing] of existingByExactKey.entries()) {
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