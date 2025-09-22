import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'
import {
  calculateLeaseScoreSimple,
  type LeaseScoreInput,
} from '../_shared/leaseScore.ts'
import {
  selectOfferWithFallback,
  type SelectBestOfferResult,
} from '../_shared/offerSelection.ts'

interface SimilarCarsRequest {
  listing_id: string
  target_count?: number
  debug?: boolean
  current_mileage?: number
  current_term?: number  
  current_deposit?: number
}

interface SimilarCarsResponse {
  similar_cars: ScoredListing[]
  debug_info?: DebugInfo
  total_results: number
  tiers_used: string[]
}

interface ScoredListing {
  listing_id: string
  make: string
  model: string
  variant: string
  monthly_price: number
  body_type: string
  fuel_type: string
  transmission: string
  score: number
  tier: string
  match_reasons: string[]
  image_url?: string
  horsepower?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  selected_mileage?: number
  selected_term?: number
  selected_deposit?: number
  selected_lease_score?: number
}

interface DebugInfo {
  source_car: any
  tier_results: {
    tier1: { candidates: number; selected: number; results: ScoredListing[] }
    tier2: { candidates: number; selected: number; results: ScoredListing[] }
    tier3: { candidates: number; selected: number; results: ScoredListing[] }
  }
  config_used: SimilarCarsConfig
  performance: {
    query_time_ms: number
    processing_time_ms: number
    total_time_ms: number
  }
}

interface SimilarCarsConfig {
  tiers: {
    tier1: { weight: number; maxResults: number }  // Same Make & Model
    tier2: { weight: number; maxResults: number }  // Same Body Type & Fuel, Similar Price
    tier3: { weight: number; maxResults: number }  // Fallback - Wider Price Range
  }
  scoring: {
    model: { weight: number }
    priceRange: { tolerance: number; weight: number }
    bodyType: { weight: number }
    fuel: { weight: number }
    transmission: { weight: number }
    makeBonus: { weight: number }  // Bonus for same make in tier 2
  }
  priceTolerances: {
    tier2: number  // ±25-35% for tier 2
    tier3: number  // Wider range for tier 3
  }
}

// Configuration constants
const SIMILAR_CARS_CONFIG: SimilarCarsConfig = {
  tiers: {
    tier1: { weight: 1.0, maxResults: 3 },  // Same make & model
    tier2: { weight: 0.9, maxResults: 4 },  // Cross-brand but same use case
    tier3: { weight: 0.7, maxResults: 3 }   // Fallback with wider range
  },
  scoring: {
    model: { weight: 0.5 },              // High weight for model matching in tier 1
    priceRange: { tolerance: 0.3, weight: 0.3 },
    bodyType: { weight: 0.25 },          // Important for tier 2
    fuel: { weight: 0.25 },              // Important for tier 2
    transmission: { weight: 0.1 },
    makeBonus: { weight: 0.15 }          // Bonus for same make in tier 2
  },
  priceTolerances: {
    tier2: 0.3,  // ±30% for tier 2 (25-35% range)
    tier3: 0.6   // ±60% for tier 3 fallback
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Apply rate limiting
  return rateLimiters.general(req, async (req) => {
    const startTime = Date.now()
    
    try {
      if (req.method !== 'POST') {
        return new Response(
          JSON.stringify({ error: 'Metode ikke tilladt' }),
          { 
            status: 405, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        )
      }

      const { 
        listing_id, 
        target_count = 8, 
        debug = false,
        current_mileage,
        current_term,
        current_deposit
      } = await req.json() as SimilarCarsRequest

      if (!listing_id) {
        return new Response(
          JSON.stringify({ error: 'listing_id er påkrævet' }),
          { 
            status: 400, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        )
      }

      // Initialize Supabase client
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const queryStart = Date.now()

      // Single query to get all data (source car + all potential matches)
      const { data: allListings, error } = await supabase
        .from('full_listing_view')
        .select(`
          id,
          make,
          model,
          variant,
          monthly_price,
          body_type,
          fuel_type,
          transmission,
          image,
          horsepower,
          first_payment,
          period_months,
          mileage_per_year,
          retail_price,
          lease_score,
          lease_pricing
        `)
        .neq('id', listing_id)

      if (error) {
        console.error('Database query error:', error)
        return new Response(
          JSON.stringify({ error: 'Der opstod en fejl ved hentning af data' }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        )
      }

      // Get source car
      const { data: sourceCar, error: sourceError } = await supabase
        .from('full_listing_view')
        .select('*')
        .eq('id', listing_id)
        .single()

      if (sourceError || !sourceCar) {
        return new Response(
          JSON.stringify({ error: 'Kilde bil ikke fundet' }),
          { 
            status: 404, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            } 
          }
        )
      }

      const queryTime = Date.now() - queryStart
      const processingStart = Date.now()

      // Process tiers with in-memory scoring
      const debugInfo: DebugInfo = {
        source_car: sourceCar,
        tier_results: {
          tier1: { candidates: 0, selected: 0, results: [] },
          tier2: { candidates: 0, selected: 0, results: [] },
          tier3: { candidates: 0, selected: 0, results: [] }
        },
        config_used: SIMILAR_CARS_CONFIG,
        performance: {
          query_time_ms: queryTime,
          processing_time_ms: 0,
          total_time_ms: 0
        }
      }

      let allResults: ScoredListing[] = []
      const usedTiers: string[] = []

      // Tier 1: Same Make & Model
      const tier1Candidates = allListings.filter(car => 
        car.make === sourceCar.make && 
        isSameModel(car.model, sourceCar.model) &&
        car.variant !== sourceCar.variant  // Different trims/variants
      )
      
      const tier1Results = tier1Candidates
        .map(car => scoreCar(car, sourceCar, 'tier1', SIMILAR_CARS_CONFIG, current_mileage, current_term, current_deposit))
        .sort((a, b) => b.score - a.score)
        .slice(0, SIMILAR_CARS_CONFIG.tiers.tier1.maxResults)

      if (tier1Results.length > 0) {
        allResults.push(...tier1Results)
        usedTiers.push('tier1')
      }

      debugInfo.tier_results.tier1 = {
        candidates: tier1Candidates.length,
        selected: tier1Results.length,
        results: debug ? tier1Results : []
      }

      // Tier 2: Same Body Type & Fuel, Similar Price (±25-35%)
      const sourcePrice = sourceCar.monthly_price
      const tier2PriceMin = sourcePrice * (1 - SIMILAR_CARS_CONFIG.priceTolerances.tier2)
      const tier2PriceMax = sourcePrice * (1 + SIMILAR_CARS_CONFIG.priceTolerances.tier2)
      
      const tier2Candidates = allListings.filter(car => 
        car.body_type === sourceCar.body_type &&
        car.fuel_type === sourceCar.fuel_type &&
        car.monthly_price >= tier2PriceMin &&
        car.monthly_price <= tier2PriceMax &&
        !allResults.some(result => result.listing_id === car.id)
      )
      
      const tier2Results = tier2Candidates
        .map(car => scoreCar(car, sourceCar, 'tier2', SIMILAR_CARS_CONFIG, current_mileage, current_term, current_deposit))
        .sort((a, b) => b.score - a.score)
        .slice(0, SIMILAR_CARS_CONFIG.tiers.tier2.maxResults)

      if (tier2Results.length > 0) {
        allResults.push(...tier2Results)
        usedTiers.push('tier2')
      }

      debugInfo.tier_results.tier2 = {
        candidates: tier2Candidates.length,
        selected: tier2Results.length,
        results: debug ? tier2Results : []
      }

      // Tier 3: Fallback - Wider Price Range
      if (allResults.length < target_count) {
        const tier3PriceMin = sourcePrice * (1 - SIMILAR_CARS_CONFIG.priceTolerances.tier3)
        const tier3PriceMax = sourcePrice * (1 + SIMILAR_CARS_CONFIG.priceTolerances.tier3)
        
        const tier3Candidates = allListings.filter(car => 
          car.body_type === sourceCar.body_type &&
          car.monthly_price >= tier3PriceMin &&
          car.monthly_price <= tier3PriceMax &&
          !allResults.some(result => result.listing_id === car.id)
        )
        
        const tier3Results = tier3Candidates
          .map(car => scoreCar(car, sourceCar, 'tier3', SIMILAR_CARS_CONFIG, current_mileage, current_term, current_deposit))
          .sort((a, b) => b.score - a.score)
          .slice(0, SIMILAR_CARS_CONFIG.tiers.tier3.maxResults)

        if (tier3Results.length > 0) {
          allResults.push(...tier3Results)
          usedTiers.push('tier3')
        }

        debugInfo.tier_results.tier3 = {
          candidates: tier3Candidates.length,
          selected: tier3Results.length,
          results: debug ? tier3Results : []
        }
      }

      // Final result limiting and sorting
      const finalResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, target_count)

      const processingTime = Date.now() - processingStart
      const totalTime = Date.now() - startTime

      debugInfo.performance = {
        query_time_ms: queryTime,
        processing_time_ms: processingTime,
        total_time_ms: totalTime
      }

      const response: SimilarCarsResponse = {
        similar_cars: finalResults,
        total_results: finalResults.length,
        tiers_used: usedTiers,
        ...(debug && { debug_info: debugInfo })
      }

      return new Response(
        JSON.stringify(response),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )

    } catch (error) {
      console.error('Similar cars error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Der opstod en fejl ved hentning af lignende biler'
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }
  })
})


// Helper function for model matching with variant handling
function isSameModel(model1: string, model2: string): boolean {
  const normalize = (model: string) => model
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w]/g, '')
    .replace(/\d+hk$/, '')      // Remove horsepower suffix
    .replace(/max\+?$/, '')     // Remove Max+ variants
    .replace(/(pro|life|style|business|comfort|sport)$/, '')  // Remove trim levels
  
  const normalized1 = normalize(model1)
  const normalized2 = normalize(model2)
  
  // Exact match or substring match for variants (ID.3 matches ID.3 Pro)
  return normalized1 === normalized2 || 
         normalized1.includes(normalized2) || 
         normalized2.includes(normalized1)
}

function scoreCar(
  car: any, 
  sourceCar: any, 
  tier: string, 
  config: SimilarCarsConfig,
  currentMileage?: number,
  currentTerm?: number,
  currentDeposit?: number
): ScoredListing {
  let score = 0
  const matchReasons: string[] = []

  // Model scoring (high weight for tier 1)
  if (tier === 'tier1' && isSameModel(car.model, sourceCar.model)) {
    score += config.scoring.model.weight * config.tiers[tier as keyof typeof config.tiers].weight
    matchReasons.push('Same model/variant')
  }

  // Price proximity scoring
  const priceRatio = Math.abs(car.monthly_price - sourceCar.monthly_price) / sourceCar.monthly_price
  const priceScore = Math.max(0, 1 - (priceRatio / config.scoring.priceRange.tolerance))
  score += priceScore * config.scoring.priceRange.weight * config.tiers[tier as keyof typeof config.tiers].weight

  if (priceScore > 0.7) {
    matchReasons.push(`Lignende pris (${Math.round((1-priceRatio) * 100)}% match)`)
  }

  // Body type scoring (important for tier 2 & 3)
  if (car.body_type === sourceCar.body_type) {
    score += config.scoring.bodyType.weight * config.tiers[tier as keyof typeof config.tiers].weight
    matchReasons.push('Same karosseri type')
  }

  // Fuel type scoring (important for tier 2)
  if (car.fuel_type === sourceCar.fuel_type) {
    score += config.scoring.fuel.weight * config.tiers[tier as keyof typeof config.tiers].weight
    matchReasons.push('Same brændstof type')
  }

  // Transmission scoring
  if (car.transmission === sourceCar.transmission) {
    score += config.scoring.transmission.weight * config.tiers[tier as keyof typeof config.tiers].weight
    matchReasons.push('Same transmission')
  }

  // Make bonus (for tier 2 - bonus if same make but cross-brand matching)
  if (tier === 'tier2' && car.make === sourceCar.make) {
    score += config.scoring.makeBonus.weight * config.tiers[tier as keyof typeof config.tiers].weight
    matchReasons.push('Same mærke bonus')
  }

  // Calculate dynamic lease score based on current configuration
  let dynamicLeaseScore: number | undefined = undefined
  let selectedOffer: SelectBestOfferResult = null

  if (car.lease_pricing && car.retail_price) {
    try {
      const leasePricing = typeof car.lease_pricing === 'string'
        ? JSON.parse(car.lease_pricing)
        : car.lease_pricing

      const hasUserConfig = [currentMileage, currentTerm, currentDeposit].some(
        (value) => value !== undefined
      )

      const targetMileage = currentMileage ?? 15000
      const targetDeposit = currentDeposit ?? 35000

      const { offer, stage } = selectOfferWithFallback({
        leasePricing,
        targetMileage,
        targetDeposit,
        targetTerm: currentTerm,
        isUserSpecified: hasUserConfig,
      })

      selectedOffer = offer

      if (stage === 'flexible') {
        console.warn('similar-cars: flexible fallback used', {
          listingId: car.id,
          targetMileage,
          currentTerm,
          targetDeposit,
          hasUserConfig,
        })
      } else if (stage === 'cheapest') {
        if (offer) {
          console.warn('similar-cars: cheapest fallback used', {
            listingId: car.id,
            cheapestMonthlyPrice: offer.monthly_price,
            targetMileage,
            currentTerm,
            targetDeposit,
            hasUserConfig,
          })
        } else {
          console.error('similar-cars: no offer could be selected', {
            listingId: car.id,
            leasePricingLength: Array.isArray(leasePricing)
              ? leasePricing.length
              : 0,
            targetMileage,
            currentTerm,
            targetDeposit,
            hasUserConfig,
          })
        }
      }

      if (selectedOffer?.monthly_price) {
        dynamicLeaseScore = calculateLeaseScoreSimple({
          monthlyPrice: selectedOffer.monthly_price,
          retailPrice: car.retail_price,
          mileagePerYear: selectedOffer.mileage_per_year,
          firstPayment: selectedOffer.first_payment || 0,
          contractMonths: selectedOffer.period_months,
        })
      }
    } catch (error) {
      console.warn('Error calculating dynamic lease score:', error)
    }
  }
  
  // Use selected offer data or fall back to car defaults
  const displayedOffer = selectedOffer || {
    monthly_price: car.monthly_price,
    mileage_per_year: car.mileage_per_year,
    period_months: car.period_months,
    first_payment: car.first_payment
  }

  return {
    listing_id: car.id,
    make: car.make,
    model: car.model,
    variant: car.variant,
    monthly_price: displayedOffer.monthly_price,
    body_type: car.body_type,
    fuel_type: car.fuel_type,
    transmission: car.transmission,
    score: Math.round(score * 1000) / 1000,
    tier,
    match_reasons: matchReasons,
    image_url: car.image,
    horsepower: car.horsepower,
    first_payment: displayedOffer.first_payment,
    period_months: displayedOffer.period_months,
    mileage_per_year: displayedOffer.mileage_per_year,
    selected_mileage: displayedOffer.mileage_per_year,
    selected_term: displayedOffer.period_months,
    selected_deposit: displayedOffer.first_payment,
    selected_lease_score: dynamicLeaseScore || car.lease_score, // Use dynamic score or fallback
    retail_price: car.retail_price
  }
}
