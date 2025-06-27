import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OpenAI } from 'https://esm.sh/openai@4.20.1'

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
  fuel_type?: string
  transmission?: string
  body_type?: string
  // UUID fields for database updates
  make_id?: string
  model_id?: string  
  fuel_type_id?: string
  transmission_id?: string
  body_type_id?: string
  seats?: number
  doors?: number
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  offers: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
}

interface ExistingListing {
  id: string
  make: string
  model: string
  variant: string
  horsepower?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  year?: number
  wltp?: number
  co2_emission?: number
  co2_tax_half_year?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  monthly_price?: number
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
}

interface MatchResult {
  extracted: ExtractedCar
  existing?: ExistingListing
  matchType: 'exact' | 'fuzzy' | 'unmatched'
  confidence: number
  changeType: 'create' | 'update' | 'unchanged'
  changes?: Record<string, { old: any; new: any }>
}

interface OfferComparison {
  hasChanges: boolean
  changes: Record<string, { old: any; new: any }>
}

// Compare offers between existing and extracted listings
// Strategy: If ANY difference exists, suggest replacing ALL offers
function compareOffers(
  existingOffers: Array<{ monthly_price: number; first_payment?: number; period_months?: number; mileage_per_year?: number }>,
  extractedOffers: Array<{ monthly_price: number; first_payment?: number; period_months?: number; mileage_per_year?: number }>
): OfferComparison {
  const changes: Record<string, { old: any; new: any }> = {}
  
  // Deep equality check for offers arrays
  const offersEqual = JSON.stringify(sortOffersForComparison(existingOffers)) === 
                      JSON.stringify(sortOffersForComparison(extractedOffers))
  
  if (!offersEqual) {
    // ANY difference in offers = replace ALL offers
    changes['offers_replacement'] = {
      old: formatOffersForDisplay(existingOffers),
      new: formatOffersForDisplay(extractedOffers)
    }
    
    // Add detailed summary for review
    changes['offers_summary'] = {
      old: `${existingOffers.length} eksisterende tilbud`,
      new: `${extractedOffers.length} nye tilbud (alle tilbud erstattes)`
    }
  }

  return { hasChanges: !offersEqual, changes }
}

// Helper function to sort offers for consistent comparison
function sortOffersForComparison(offers: Array<{ monthly_price: number; first_payment?: number; period_months?: number; mileage_per_year?: number }>) {
  return offers
    .map(offer => ({
      monthly_price: offer.monthly_price,
      first_payment: offer.first_payment || 0,
      period_months: offer.period_months || 36,
      mileage_per_year: offer.mileage_per_year || 15000
    }))
    .sort((a, b) => {
      // Sort by monthly_price first, then by other fields for consistent ordering
      if (a.monthly_price !== b.monthly_price) return a.monthly_price - b.monthly_price
      if (a.first_payment !== b.first_payment) return a.first_payment - b.first_payment
      if (a.period_months !== b.period_months) return a.period_months - b.period_months
      return a.mileage_per_year - b.mileage_per_year
    })
}

// Helper function to format offers for display in UI
function formatOffersForDisplay(offers: Array<{ monthly_price: number; first_payment?: number; period_months?: number; mileage_per_year?: number }>) {
  if (!offers || offers.length === 0) return 'Ingen tilbud'
  
  return offers
    .map(offer => {
      const price = `${offer.monthly_price.toLocaleString('da-DK')} kr/md`
      const period = offer.period_months ? `${offer.period_months} mdr` : '36 mdr'
      const mileage = offer.mileage_per_year ? `${offer.mileage_per_year.toLocaleString('da-DK')} km/år` : '15.000 km/år'
      const firstPayment = offer.first_payment ? ` (${offer.first_payment.toLocaleString('da-DK')} kr udbetaling)` : ''
      return `${price}, ${period}, ${mileage}${firstPayment}`
    })
    .join(' | ')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { extractedCars, sellerId, sessionName } = await req.json()

    if (!extractedCars || !Array.isArray(extractedCars)) {
      throw new Error('Missing or invalid extractedCars array')
    }

    if (!sellerId) {
      throw new Error('Missing sellerId')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Initialize OpenAI for fuzzy matching
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null

    // Fetch reference data for UUID mapping
    const [makesResult, modelsResult, fuelTypesResult, transmissionsResult, bodyTypesResult] = await Promise.all([
      supabase.from('makes').select('id, name'),
      supabase.from('models').select('id, name, make_id'),
      supabase.from('fuel_types').select('id, name'),
      supabase.from('transmissions').select('id, name'),
      supabase.from('body_types').select('id, name')
    ])

    if (makesResult.error || modelsResult.error || fuelTypesResult.error || 
        transmissionsResult.error || bodyTypesResult.error) {
      throw new Error('Failed to fetch reference data for UUID mapping')
    }

    // Create lookup maps for name -> UUID conversion
    const makesMap = new Map(makesResult.data.map(m => [m.name.toLowerCase(), m.id]))
    const modelsMap = new Map(modelsResult.data.map(m => [`${m.name.toLowerCase()}|${m.make_id}`, m.id]))
    const fuelTypesMap = new Map(fuelTypesResult.data.map(f => [f.name.toLowerCase(), f.id]))
    const transmissionsMap = new Map(transmissionsResult.data.map(t => [t.name.toLowerCase(), t.id]))
    const bodyTypesMap = new Map(bodyTypesResult.data.map(b => [b.name.toLowerCase(), b.id]))

    // Fetch existing listings for the seller with all offers
    const { data: existingListings, error: fetchError } = await supabase
      .from('full_listing_view')
      .select(`
        *,
        lease_pricing (
          monthly_price,
          first_payment,
          period_months,
          mileage_per_year
        )
      `)
      .eq('seller_id', sellerId)

    if (fetchError) {
      throw new Error(`Failed to fetch existing listings: ${fetchError.message}`)
    }

    // Group existing listings by unique car (make/model/variant)
    const existingByKey = new Map<string, ExistingListing>()
    existingListings?.forEach(listing => {
      const key = `${listing.make}|${listing.model}|${listing.variant}`.toLowerCase()
      if (!existingByKey.has(key)) {
        existingByKey.set(key, {
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
        fuel_type_id: fuelTypesMap.get(car.fuel_type?.toLowerCase() || ''),
        transmission_id: transmissionsMap.get(car.transmission?.toLowerCase() || ''),
        body_type_id: bodyTypesMap.get(car.body_type?.toLowerCase() || '')
      }
    })

    // Process each extracted car
    const matches: MatchResult[] = []
    
    for (const extracted of enrichedExtractedCars) {
      // Try exact match first
      const exactKey = `${extracted.make}|${extracted.model}|${extracted.variant}`.toLowerCase()
      let match = existingByKey.get(exactKey)
      let matchType: 'exact' | 'fuzzy' | 'unmatched' = 'exact'
      let confidence = 1.0

      // If no exact match, try fuzzy matching with AI
      if (!match && openai) {
        const fuzzyMatch = await findFuzzyMatch(
          extracted,
          Array.from(existingByKey.values()),
          openai
        )
        
        if (fuzzyMatch) {
          match = fuzzyMatch.listing
          matchType = 'fuzzy'
          confidence = fuzzyMatch.confidence
        }
      }

      // Determine change type and what changed
      let changeType: 'create' | 'update' | 'unchanged' = 'create'
      let changes: Record<string, { old: any; new: any }> = {}

      if (match) {
        // Compare fields to detect changes
        const fieldsToCompare = [
          'horsepower', 'fuel_type', 'transmission', 'body_type',
          'year', 'wltp', 'co2_emission', 'consumption_l_100km',
          'consumption_kwh_100km', 'co2_tax_half_year'
        ]

        let hasChanges = false
        for (const field of fieldsToCompare) {
          const oldValue = match[field as keyof ExistingListing]
          const newValue = extracted[field as keyof ExtractedCar]
          
          if (oldValue !== newValue && (oldValue || newValue)) {
            hasChanges = true
            changes[field] = { old: oldValue, new: newValue }
          }
        }

        // Compare offers comprehensively
        const offerChanges = compareOffers(match.offers || [], extracted.offers || [])
        if (offerChanges.hasChanges) {
          hasChanges = true
          Object.assign(changes, offerChanges.changes)
        }

        changeType = hasChanges ? 'update' : 'unchanged'
      }

      matches.push({
        extracted,
        existing: match,
        matchType: match ? matchType : 'unmatched',
        confidence,
        changeType,
        changes: Object.keys(changes).length > 0 ? changes : undefined
      })
    }

    // Find deleted listings (existing but not in extracted)
    const extractedKeys = new Set(
      enrichedExtractedCars.map(car => 
        `${car.make}|${car.model}|${car.variant}`.toLowerCase()
      )
    )
    
    const deletedListings = Array.from(existingByKey.entries())
      .filter(([key]) => !extractedKeys.has(key))
      .map(([_, listing]) => ({
        existing: listing,
        changeType: 'delete' as const,
        matchType: 'exact' as const,
        confidence: 1.0
      }))

    // Combine all results
    const allMatches = [...matches, ...deletedListings]

    // Calculate summary statistics
    const summary = {
      totalExtracted: enrichedExtractedCars.length,
      totalExisting: existingByKey.size,
      totalMatched: matches.filter(m => m.existing).length,
      totalNew: matches.filter(m => m.changeType === 'create').length,
      totalUpdated: matches.filter(m => m.changeType === 'update').length,
      totalUnchanged: matches.filter(m => m.changeType === 'unchanged').length,
      totalDeleted: deletedListings.length,
      exactMatches: matches.filter(m => m.matchType === 'exact').length,
      fuzzyMatches: matches.filter(m => m.matchType === 'fuzzy').length
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: allMatches,
        summary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error comparing listings:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function findFuzzyMatch(
  extracted: ExtractedCar,
  existingListings: ExistingListing[],
  openai: OpenAI
): Promise<{ listing: ExistingListing; confidence: number } | null> {
  try {
    const prompt = `
You are a car listing matcher. Compare this extracted car with existing listings and find the best match.

Extracted Car:
- Make: ${extracted.make}
- Model: ${extracted.model}
- Variant: ${extracted.variant}
- Engine: ${extracted.engine_info || 'N/A'}
- Horsepower: ${extracted.horsepower || 'N/A'} HP
- Fuel: ${extracted.fuel_type || 'N/A'}
- Transmission: ${extracted.transmission || 'N/A'}

Existing Listings:
${existingListings.map((listing, idx) => `
${idx}. ${listing.make} ${listing.model} ${listing.variant}
   - Horsepower: ${listing.horsepower || 'N/A'} HP
   - Fuel: ${listing.fuel_type || 'N/A'}
   - Transmission: ${listing.transmission || 'N/A'}
`).join('\n')}

If there's a match (same car but possibly different variant names or minor differences), 
respond with: MATCH:<index>:<confidence>
Where index is the listing number and confidence is 0.0-1.0

If no match exists, respond with: NO_MATCH

Consider these matching rules:
- Same make and model is required
- Variant names might differ slightly (e.g., "Style" vs "Style Plus")
- Engine specs should be similar
- Minor spelling differences should be ignored
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 50
    })

    const response = completion.choices[0].message.content?.trim() || ''
    
    if (response.startsWith('MATCH:')) {
      const parts = response.split(':')
      const index = parseInt(parts[1])
      const confidence = parseFloat(parts[2])
      
      if (!isNaN(index) && index >= 0 && index < existingListings.length) {
        return {
          listing: existingListings[index],
          confidence: Math.min(Math.max(confidence, 0), 1)
        }
      }
    }
  } catch (error) {
    console.error('Fuzzy matching error:', error)
  }
  
  return null
}