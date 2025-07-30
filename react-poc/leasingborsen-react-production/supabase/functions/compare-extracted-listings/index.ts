import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced interface with variant tracking
interface ExtractedCar {
  make: string
  model: string
  variant: string
  horsepower?: number
  engine_info?: string
  fuel_type: string
  transmission: string
  body_type: string
  seats?: number
  doors?: number
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  monthly_price?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
  // New variant tracking fields
  variantSource?: "existing" | "reference" | "inferred"
  variantConfidence?: number
  variantMatchDetails?: {
    matchedId?: string
    matchScore?: number
    matchCriteria?: string[]
  }
}

interface ExistingListing {
  id: string
  make: string
  model: string
  variant: string
  horsepower?: number
  fuel_type: string
  transmission: string
  body_type: string
  year?: number
  wltp?: number
  co2_emission?: number
  co2_tax_half_year?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  monthly_price?: number
  offers: any[]
}

interface ListingMatch {
  extracted: ExtractedCar | null
  existing: ExistingListing | null
  confidence: number
  matchMethod: string
  changeType: 'create' | 'update' | 'unchanged' | 'missing_model' | 'delete'
  changes?: Record<string, { old: any; new: any }>
  // New variant tracking fields
  variantTracking?: {
    source: "existing" | "reference" | "inferred" | "unknown"
    confidence: number
    details?: any
  }
}

interface ComparisonRequest {
  extractedCars: ExtractedCar[]
  sellerId?: string
  sessionName?: string
}

interface ComparisonResult {
  matches: ListingMatch[]
  summary: {
    totalExtracted: number
    totalExisting: number
    totalMatched: number
    totalNew: number
    totalUpdated: number
    totalUnchanged: number
    totalDeleted: number
    totalMissingModels: number
    exactMatches: number
    fuzzyMatches: number
    // New variant tracking summary
    variantSources?: {
      existing: number
      reference: number
      inferred: number
      unknown: number
    }
    avgVariantConfidence?: number
  }
}

/**
 * Calculate total price consistently using the formula: (period_months × monthly_price) + first_payment
 */
function calculateTotalPrice(monthlyPrice: number, periodMonths: number, firstPayment?: number): number {
  return (periodMonths * monthlyPrice) + (firstPayment || 0)
}

/**
 * Compare two offer arrays to detect if content has changed
 */
function compareOfferArrays(extractedOffers: any[], existingOffers: any[]): boolean {
  if (!extractedOffers || !existingOffers) return true
  if (extractedOffers.length !== existingOffers.length) return true
  
  // Handle both array format [monthly_price, first_payment, period_months, mileage_per_year] 
  // and object format {monthly_price, first_payment, period_months, mileage_per_year}
  const normalizeOffer = (offer: any) => {
    if (Array.isArray(offer)) {
      return {
        monthly_price: offer[0] || 0,
        first_payment: offer[1] || 0,
        period_months: offer[2] || 36,
        mileage_per_year: offer[3] || 15000
      }
    }
    return {
      monthly_price: offer.monthly_price || 0,
      first_payment: offer.first_payment || 0,
      period_months: offer.period_months || 36,
      mileage_per_year: offer.mileage_per_year || 15000
    }
  }
  
  // Normalize both arrays to object format
  const normalizedExtracted = extractedOffers.map(normalizeOffer)
  const normalizedExisting = existingOffers.map(normalizeOffer)
  
  // Sort both arrays by multiple fields for consistent comparison
  const sortComparator = (a: any, b: any) => {
    // Primary sort: monthly_price
    if (a.monthly_price !== b.monthly_price) return a.monthly_price - b.monthly_price
    // Secondary sort: first_payment (for same monthly price)
    if (a.first_payment !== b.first_payment) return a.first_payment - b.first_payment
    // Tertiary sort: mileage_per_year (for same monthly price and down payment)
    return a.mileage_per_year - b.mileage_per_year
  }
  
  const sortedExtracted = [...normalizedExtracted].sort(sortComparator)
  const sortedExisting = [...normalizedExisting].sort(sortComparator)
  
  // Compare each offer
  for (let i = 0; i < sortedExtracted.length; i++) {
    const extracted = sortedExtracted[i]
    const existing = sortedExisting[i]
    
    // Compare key pricing fields
    if (extracted.monthly_price !== existing.monthly_price) return true
    if (extracted.first_payment !== existing.first_payment) return true
    if (extracted.period_months !== existing.period_months) return true
    if (extracted.mileage_per_year !== existing.mileage_per_year) return true
  }
  
  return false
}

/**
 * Compare extracted data with existing listing to find actual changes
 */
function detectFieldChanges(extracted: ExtractedCar, existing: ExistingListing): Record<string, { old: any; new: any }> | null {
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
    
    // REMOVED: Primary offer comparison for backward compatibility
    // This was causing false positives when offer arrays had different ordering
    // but identical content. The comprehensive compareOfferArrays function above
    // already handles all offer comparisons correctly with proper sorting.
  }
  
  // Return null if no changes, otherwise return the changes object
  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Enhanced variant processing utility - extracts HP, transmission, and AWD info
 */
function extractSpecsFromVariant(variant: string): { 
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
  if (original.includes('dsg') || original.includes('s tronic') || original.includes('automatgear') || original.includes('automatic')) {
    transmission = 'automatic'
    coreVariant = coreVariant.replace(/\b(?:dsg\d*|s[\s-]?tronic|automatgear|automatic)\b/gi, '').trim()
  } else if (original.includes('manual')) {
    transmission = 'manual'
    coreVariant = coreVariant.replace(/\bmanual\b/gi, '').trim()
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
function generateCompositeKey(make: string, model: string, variant: string, horsepower?: number, transmission?: string): string {
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
function calculateMatchConfidence(extracted: ExtractedCar, existing: ExistingListing): number {
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
 * Get variant tracking information from extracted car
 */
function getVariantTracking(extracted: ExtractedCar): ListingMatch['variantTracking'] {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply rate limiting for comparison operations
  return rateLimiters.general(req, async (req) => {
    try {
    const { extractedCars, sellerId, sessionName }: ComparisonRequest = await req.json()

    if (!extractedCars || !Array.isArray(extractedCars)) {
      throw new Error('extractedCars must be an array')
    }

    console.log(`[compare-extracted-listings] Processing ${extractedCars.length} extracted cars for seller ${sellerId}`)
    
    // Track variant sources
    const variantSources = {
      existing: 0,
      reference: 0,
      inferred: 0,
      unknown: 0
    }
    let totalVariantConfidence = 0
    let variantTrackingCount = 0

    // Count variant sources from extracted cars
    extractedCars.forEach(car => {
      if (car.variantSource) {
        variantSources[car.variantSource]++
        totalVariantConfidence += car.variantConfidence || 0
        variantTrackingCount++
      } else {
        variantSources.unknown++
      }
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch reference data
    const [makesResult, modelsResult] = await Promise.all([
      supabase.from('makes').select('id, name'),
      supabase.from('models').select('id, name, make_id')
    ])

    if (makesResult.error) throw makesResult.error
    if (modelsResult.error) throw modelsResult.error

    // Create lookup maps
    const makesMap = new Map()
    makesResult.data.forEach((make: any) => {
      makesMap.set(make.name.toLowerCase(), make.id)
    })

    const modelsMap = new Map()
    modelsResult.data.forEach((model: any) => {
      const key = `${model.name.toLowerCase()}|${model.make_id}`
      modelsMap.set(key, model.id)
    })

    // Build query for existing listings
    let existingQuery = supabase.from('full_listing_view').select('*')
    
    // Filter by seller if provided
    if (sellerId) {
      existingQuery = existingQuery.eq('seller_id', sellerId)
    }

    const { data: existingListings, error: existingError } = await existingQuery
    if (existingError) throw existingError

    console.log(`[compare-extracted-listings] Found ${existingListings?.length || 0} existing listings for comparison`)

    // Deduplicate existing listings by ID (full_listing_view creates duplicates due to lease_pricing JOIN)
    const uniqueExistingListings = new Map()
    existingListings?.forEach((listing: any) => {
      if (!uniqueExistingListings.has(listing.id)) {
        uniqueExistingListings.set(listing.id, listing)
      }
    })
    
    const deduplicatedExistingListings = Array.from(uniqueExistingListings.values())
    console.log(`[compare-extracted-listings] After deduplication: ${deduplicatedExistingListings.length} unique listings`)

    // Create lookup maps for existing listings with enhanced fuzzy matching
    const existingByExactKey = new Map()
    const existingByCompositeKey = new Map()

    deduplicatedExistingListings.forEach((listing: any) => {
      // Construct offers array from individual pricing fields if no lease_pricing array exists
      const offers = listing.lease_pricing || (listing.monthly_price ? [{
        monthly_price: listing.monthly_price,
        first_payment: listing.first_payment,
        period_months: listing.period_months || 36, // Default to 36 months if not specified
        mileage_per_year: listing.mileage_per_year || 15000, // Default to 15000 km/year if not specified
        total_price: calculateTotalPrice(listing.monthly_price, listing.period_months || 36, listing.first_payment)
      }] : [])

      // Exact key for Level 1 matching
      const exactKey = `${listing.make}|${listing.model}|${listing.variant}`.toLowerCase()
      if (!existingByExactKey.has(exactKey)) {
        existingByExactKey.set(exactKey, {
          id: listing.id,
          make: listing.make,
          model: listing.model,
          variant: listing.variant,
          horsepower: listing.horsepower,
          fuel_type: listing.fuel_type,
          transmission: listing.transmission,
          body_type: listing.body_type,
          year: listing.year,
          wltp: listing.wltp,
          co2_emission: listing.co2_emission,
          co2_tax_half_year: listing.co2_tax_half_year,
          consumption_l_100km: listing.consumption_l_100km,
          consumption_kwh_100km: listing.consumption_kwh_100km,
          monthly_price: listing.monthly_price,
          offers: offers
        })
      }

      // Composite key for Level 2 matching (enhanced fuzzy)
      const compositeKey = generateCompositeKey(
        listing.make, 
        listing.model, 
        listing.variant, 
        listing.horsepower, 
        listing.transmission
      )
      
      if (!existingByCompositeKey.has(compositeKey)) {
        existingByCompositeKey.set(compositeKey, {
          id: listing.id,
          make: listing.make,
          model: listing.model,
          variant: listing.variant,
          horsepower: listing.horsepower,
          fuel_type: listing.fuel_type,
          transmission: listing.transmission,
          body_type: listing.body_type,
          year: listing.year,
          wltp: listing.wltp,
          co2_emission: listing.co2_emission,
          co2_tax_half_year: listing.co2_tax_half_year,
          consumption_l_100km: listing.consumption_l_100km,
          consumption_kwh_100km: listing.consumption_kwh_100km,
          monthly_price: listing.monthly_price,
          offers: offers
        })
      }
    })

    // Enrich extracted cars with UUID mappings
    const enrichedExtractedCars = extractedCars.map(car => {
      const makeId = makesMap.get(car.make?.toLowerCase() || '')
      const modelKey = `${car.model?.toLowerCase() || ''}|${makeId}`
      const modelId = modelsMap.get(modelKey)
      
      return {
        ...car,
        make_id: makeId,
        model_id: modelId,
      }
    })

    // Compare cars using enhanced multi-level matching
    const matches: ListingMatch[] = []
    let exactMatchCount = 0
    let fuzzyMatchCount = 0
    
    // Track which existing listings have already been matched to prevent duplicates
    const alreadyMatchedIds = new Set<string>()

    for (const car of enrichedExtractedCars) {
      let matchFound = false
      let matchMethod = ''
      let existingMatch: ExistingListing | null = null
      let confidence = 0

      console.log(`[compare-extracted-listings] Matching car: ${car.make} ${car.model} ${car.variant}`)

      // Level 1: Exact variant match
      const exactKey = `${car.make}|${car.model}|${car.variant}`.toLowerCase()
      const exactMatch = existingByExactKey.get(exactKey)
      console.log(`[compare-extracted-listings] Exact key: "${exactKey}", found: ${!!exactMatch}`)
      
      if (exactMatch && !alreadyMatchedIds.has(exactMatch.id)) {
        matchFound = true
        matchMethod = 'exact'
        existingMatch = exactMatch
        confidence = 1.0
        exactMatchCount++
        alreadyMatchedIds.add(exactMatch.id)
      }
      
      // Level 2: Composite key match (enhanced fuzzy)
      if (!matchFound) {
        const compositeKey = generateCompositeKey(
          car.make, 
          car.model, 
          car.variant, 
          car.horsepower, 
          car.transmission
        )
        const compositeMatch = existingByCompositeKey.get(compositeKey)
        
        if (compositeMatch && !alreadyMatchedIds.has(compositeMatch.id)) {
          matchFound = true
          matchMethod = 'fuzzy'
          existingMatch = compositeMatch
          confidence = 0.95
          fuzzyMatchCount++
          alreadyMatchedIds.add(compositeMatch.id)
        }
      }
      
      // Level 3: Algorithmic confidence matching
      if (!matchFound) {
        let bestMatch: ExistingListing | null = null
        let bestConfidence = 0
        
        // Check all existing listings for algorithmic match
        for (const [key, existing] of existingByExactKey.entries()) {
          // Skip if this listing is already matched to prevent duplicates
          if (alreadyMatchedIds.has(existing.id)) {
            continue
          }
          
          // Only check same make/model
          if (existing.make.toLowerCase() === car.make.toLowerCase() && 
              existing.model.toLowerCase() === car.model.toLowerCase()) {
            
            const calcConfidence = calculateMatchConfidence(car, existing)
            // Increase threshold from 0.8 to 0.85 to be more selective
            if (calcConfidence > bestConfidence && calcConfidence >= 0.85) {
              bestConfidence = calcConfidence
              bestMatch = existing
            }
          }
        }
        
        if (bestMatch && bestConfidence >= 0.85) {
          matchFound = true
          matchMethod = 'algorithmic'
          existingMatch = bestMatch
          confidence = bestConfidence
          fuzzyMatchCount++
          alreadyMatchedIds.add(bestMatch.id)
        }
      }

      // Determine change type and categorize
      if (matchFound && existingMatch) {
        // Check for actual changes
        const changes = detectFieldChanges(car, existingMatch)
        
        if (changes) {
          // There are actual changes - this is an update
          matches.push({
            extracted: car,
            existing: existingMatch,
            confidence,
            matchMethod,
            changeType: 'update',
            changes,
            variantTracking: getVariantTracking(car)
          })
        } else {
          // No changes detected - this listing is unchanged
          matches.push({
            extracted: car,
            existing: existingMatch,
            confidence,
            matchMethod,
            changeType: 'unchanged',
            variantTracking: getVariantTracking(car)
          })
        }
      } else {
        // No match found - check if model exists before creating
        if (!car.model_id) {
          // Model doesn't exist in reference data
          matches.push({
            extracted: car,
            existing: null as any,
            confidence: 1.0,
            matchMethod: 'model_not_found',
            changeType: 'missing_model',
            variantTracking: getVariantTracking(car)
          })
        } else {
          // This is a new listing
          matches.push({
            extracted: car,
            existing: null as any,
            confidence: 1.0,
            matchMethod: 'unmatched',
            changeType: 'create',
            variantTracking: getVariantTracking(car)
          })
        }
      }
    }

    // Use the alreadyMatchedIds set that was tracked during matching
    // This prevents the duplicate counting issue we had before
    const matchedExistingIds = alreadyMatchedIds

    // Find existing listings that weren't matched (potential deletes)
    // ALL unmatched listings from the seller will be marked for deletion
    const unmatchedExistingListings = deduplicatedExistingListings.filter(listing => {
      // Mark for deletion if this specific listing wasn't matched
      return !matchedExistingIds.has(listing.id)
    })

    // console.log(`[compare-extracted-listings] Found ${unmatchedExistingListings.length} unmatched listings to mark for deletion`)

    // Add unmatched existing listings as "delete" type changes
    // First, deduplicate by listing_id to avoid creating multiple delete records for the same listing
    const uniqueUnmatchedListings = new Map<string, any>()
    for (const unmatchedListing of unmatchedExistingListings) {
      uniqueUnmatchedListings.set(unmatchedListing.id, unmatchedListing)
    }
    
    // console.log(`[compare-extracted-listings] After deduplication: ${uniqueUnmatchedListings.size} unique unmatched listings`)
    
    for (const unmatchedListing of uniqueUnmatchedListings.values()) {
      const offers = unmatchedListing.lease_pricing || (unmatchedListing.monthly_price ? [{
        monthly_price: unmatchedListing.monthly_price,
        first_payment: unmatchedListing.first_payment,
        period_months: unmatchedListing.period_months || 36,
        mileage_per_year: unmatchedListing.mileage_per_year || 15000,
        total_price: calculateTotalPrice(unmatchedListing.monthly_price, unmatchedListing.period_months || 36, unmatchedListing.first_payment)
      }] : [])

      matches.push({
        extracted: null as any,
        existing: {
          id: unmatchedListing.id,
          make: unmatchedListing.make,
          model: unmatchedListing.model,
          variant: unmatchedListing.variant,
          horsepower: unmatchedListing.horsepower,
          fuel_type: unmatchedListing.fuel_type,
          transmission: unmatchedListing.transmission,
          body_type: unmatchedListing.body_type,
          year: unmatchedListing.year,
          wltp: unmatchedListing.wltp,
          co2_emission: unmatchedListing.co2_emission,
          co2_tax_half_year: unmatchedListing.co2_tax_half_year,
          consumption_l_100km: unmatchedListing.consumption_l_100km,
          consumption_kwh_100km: unmatchedListing.consumption_kwh_100km,
          monthly_price: unmatchedListing.monthly_price,
          offers: offers
        },
        confidence: 1.0,
        matchMethod: 'unmatched',
        changeType: 'delete' as const,
        variantTracking: {
          source: 'unknown',
          confidence: 0
        }
      })
    }

    // Count change types
    const newCount = matches.filter(m => m.changeType === 'create').length
    const updateCount = matches.filter(m => m.changeType === 'update').length
    const unchangedCount = matches.filter(m => m.changeType === 'unchanged').length
    const missingModelCount = matches.filter(m => m.changeType === 'missing_model').length
    const deleteCount = matches.filter(m => m.changeType === 'delete').length

    console.log(`[compare-extracted-listings] Comparison complete: ${newCount} new, ${updateCount} updates, ${unchangedCount} unchanged, ${missingModelCount} missing models, ${deleteCount} potential deletes`)
    console.log(`[compare-extracted-listings] Variant sources: existing=${variantSources.existing}, reference=${variantSources.reference}, inferred=${variantSources.inferred}, unknown=${variantSources.unknown}`)

    // Validation: Check for mathematical consistency to catch bugs
    const totalMatches = exactMatchCount + fuzzyMatchCount
    const uniqueMatchedCount = matchedExistingIds.size
    const totalNonDeleteMatches = matches.filter(m => m.existing && m.changeType !== 'delete').length
    
    // Log validation warnings if inconsistencies detected
    if (totalMatches > uniqueMatchedCount) {
      console.warn(`[VALIDATION WARNING] Total matches (${totalMatches}) exceeds unique matched listings (${uniqueMatchedCount}). Possible duplicate matches.`)
    }
    
    if (extractedCars.length > 0 && existingListings && existingListings.length > 0) {
      const expectedCreates = Math.max(0, extractedCars.length - existingListings.length)
      if (newCount < expectedCreates / 2) { // Allow some tolerance
        console.warn(`[VALIDATION WARNING] Very few creates (${newCount}) detected when ${extractedCars.length} extracted vs ${existingListings.length} existing. Possible over-matching.`)
      }
    }

    const result: ComparisonResult = {
      matches,
      summary: {
        totalExtracted: extractedCars.length,
        totalExisting: deduplicatedExistingListings.length,
        totalMatched: totalNonDeleteMatches,
        totalNew: newCount,
        totalUpdated: updateCount,
        totalUnchanged: unchangedCount,
        totalDeleted: deleteCount,
        totalMissingModels: missingModelCount,
        exactMatches: exactMatchCount,
        fuzzyMatches: fuzzyMatchCount,
        // Add variant tracking summary
        variantSources: variantSources,
        avgVariantConfidence: variantTrackingCount > 0 ? totalVariantConfidence / variantTrackingCount : 0
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in compare-extracted-listings:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message, 
        details: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  }) // End of rate limiting wrapper
})