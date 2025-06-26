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
function compareOffers(
  existingOffers: Array<{ monthly_price: number; first_payment?: number; period_months?: number; mileage_per_year?: number }>,
  extractedOffers: Array<{ monthly_price: number; first_payment?: number; period_months?: number; mileage_per_year?: number }>
): OfferComparison {
  const changes: Record<string, { old: any; new: any }> = {}
  let hasChanges = false

  // If different number of offers, that's a change
  if (existingOffers.length !== extractedOffers.length) {
    hasChanges = true
    changes['offer_count'] = { 
      old: existingOffers.length, 
      new: extractedOffers.length 
    }
  }

  // Compare each offer position (sorted by monthly price)
  const sortedExisting = [...existingOffers].sort((a, b) => a.monthly_price - b.monthly_price)
  const sortedExtracted = [...extractedOffers].sort((a, b) => a.monthly_price - b.monthly_price)

  const maxOffers = Math.max(sortedExisting.length, sortedExtracted.length)
  
  for (let i = 0; i < maxOffers; i++) {
    const existing = sortedExisting[i]
    const extracted = sortedExtracted[i]
    
    if (!existing && extracted) {
      // New offer added
      hasChanges = true
      changes[`offer_${i + 1}_new`] = {
        old: null,
        new: `${extracted.monthly_price} kr/md (${extracted.period_months || '?'} mdr, ${extracted.mileage_per_year || '?'} km/år)`
      }
    } else if (existing && !extracted) {
      // Offer removed
      hasChanges = true
      changes[`offer_${i + 1}_removed`] = {
        old: `${existing.monthly_price} kr/md (${existing.period_months || '?'} mdr, ${existing.mileage_per_year || '?'} km/år)`,
        new: null
      }
    } else if (existing && extracted) {
      // Compare offer details
      const fieldsToCompare: Array<{ field: keyof typeof existing; label: string }> = [
        { field: 'monthly_price', label: 'monthly_price' },
        { field: 'first_payment', label: 'first_payment' },
        { field: 'period_months', label: 'period_months' },
        { field: 'mileage_per_year', label: 'mileage_per_year' }
      ]

      for (const { field, label } of fieldsToCompare) {
        if (existing[field] !== extracted[field]) {
          hasChanges = true
          changes[`offer_${i + 1}_${label}`] = {
            old: existing[field] || '–',
            new: extracted[field] || '–'
          }
        }
      }
    }
  }

  // Add summary of most significant changes
  if (hasChanges) {
    const priceChanges = Object.entries(changes)
      .filter(([key]) => key.includes('monthly_price'))
      .map(([key, change]) => `${change.old} → ${change.new}`)
    
    if (priceChanges.length > 0) {
      changes['pricing_summary'] = {
        old: `${existingOffers.length} tilbud`,
        new: `${extractedOffers.length} tilbud (ændringer: ${priceChanges.slice(0, 3).join(', ')}${priceChanges.length > 3 ? '...' : ''})`
      }
    }
  }

  return { hasChanges, changes }
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
          monthly_price: listing.monthly_price,
          offers: listing.lease_pricing || []
        })
      }
    })

    // Process each extracted car
    const matches: MatchResult[] = []
    
    for (const extracted of extractedCars) {
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
      extractedCars.map(car => 
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
      totalExtracted: extractedCars.length,
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