import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  total_price?: number
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

interface ComparisonRequest {
  extractedCars: ExtractedCar[]
  sellerId?: string
}

interface ComparisonResult {
  newListings: ExtractedCar[]
  potentialUpdates: Array<{
    extracted: ExtractedCar
    existing: ExistingListing
    confidence: number
    matchMethod: string
  }>
  summary: {
    totalExtracted: number
    newListings: number
    potentialUpdates: number
  }
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
  if (original.includes('dsg') || original.includes('s tronic') || original.includes('automatgear')) {
    transmission = 'automatic'
    coreVariant = coreVariant.replace(/\b(?:dsg\d*|s[\s-]?tronic|automatgear)\b/gi, '').trim()
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { extractedCars, sellerId }: ComparisonRequest = await req.json()

    if (!extractedCars || !Array.isArray(extractedCars)) {
      throw new Error('extractedCars must be an array')
    }

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

    // Create lookup maps for existing listings with enhanced fuzzy matching
    const existingByExactKey = new Map()
    const existingByCompositeKey = new Map()
    const existingListingsArray: ExistingListing[] = []

    existingListings?.forEach((listing: any) => {
      // Exact key for Level 1 matching
      const exactKey = `${listing.make}|${listing.model}|${listing.variant}`.toLowerCase()
      if (!existingByExactKey.has(exactKey)) {
        existingByExactKey.set(exactKey, {
          id: listing.listing_id,
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
          offers: listing.lease_pricing || []
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
          id: listing.listing_id,
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
          offers: listing.lease_pricing || []
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
    const newListings: ExtractedCar[] = []
    const potentialUpdates: Array<{
      extracted: ExtractedCar
      existing: ExistingListing
      confidence: number
      matchMethod: string
    }> = []

    for (const car of enrichedExtractedCars) {
      let matchFound = false
      let matchMethod = ''
      let existingMatch: ExistingListing | null = null
      let confidence = 0

      // Level 1: Exact variant match
      const exactKey = `${car.make}|${car.model}|${car.variant}`.toLowerCase()
      const exactMatch = existingByExactKey.get(exactKey)
      
      if (exactMatch) {
        matchFound = true
        matchMethod = 'exact'
        existingMatch = exactMatch
        confidence = 1.0
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
        
        if (compositeMatch) {
          matchFound = true
          matchMethod = 'fuzzy'
          existingMatch = compositeMatch
          confidence = 0.95
        }
      }
      
      // Level 3: Algorithmic confidence matching
      if (!matchFound) {
        let bestMatch: ExistingListing | null = null
        let bestConfidence = 0
        
        // Check all existing listings for algorithmic match
        for (const [key, existing] of existingByExactKey.entries()) {
          // Only check same make/model
          if (existing.make.toLowerCase() === car.make.toLowerCase() && 
              existing.model.toLowerCase() === car.model.toLowerCase()) {
            
            const calcConfidence = calculateMatchConfidence(car, existing)
            if (calcConfidence > bestConfidence && calcConfidence >= 0.8) {
              bestConfidence = calcConfidence
              bestMatch = existing
            }
          }
        }
        
        if (bestMatch && bestConfidence >= 0.8) {
          matchFound = true
          matchMethod = 'fuzzy'
          existingMatch = bestMatch
          confidence = bestConfidence
        }
      }

      // Categorize result
      if (matchFound && existingMatch) {
        potentialUpdates.push({
          extracted: car,
          existing: existingMatch,
          confidence,
          matchMethod
        })
      } else {
        newListings.push(car)
      }
    }

    const result: ComparisonResult = {
      newListings,
      potentialUpdates,
      summary: {
        totalExtracted: extractedCars.length,
        newListings: newListings.length,
        potentialUpdates: potentialUpdates.length
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in compare-extracted-listings:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        details: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})