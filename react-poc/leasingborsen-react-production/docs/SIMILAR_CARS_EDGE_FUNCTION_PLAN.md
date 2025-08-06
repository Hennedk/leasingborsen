# Similar Cars Edge Function Implementation Plan

## Overview

Replace client-side similar cars logic with a Supabase Edge Function to eliminate architectural flaws in the current price-sorted candidate pool system. This addresses the core issue where expensive cars don't show relevant alternatives due to limited candidate pools.

## Problem Statement

Current client-side implementation has fundamental flaws:
- Price-sorted queries create brand clustering by price point
- Limited candidate pool (60 cars) excludes relevant alternatives for expensive cars
- VW ID.3 cars appear at position 27+ but only first 18-60 are fetched
- Architecture doesn't scale with 200+ listings

## 3-Tier Matching System

### Configuration-Driven Scoring
```typescript
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
```

### Tier 1: Same Make & Model
- **Logic**: Strongest match for loyalty and true alternatives
- **Matching**: Exact make AND model match, different trims/variants
- **Scoring**: Price proximity, mileage, transmission preference
- **Target**: 2-3 results
- **Example**: VW ID.4 → other ID.4s (different trims/mileage/price)

### Tier 2: Same Body Type & Fuel, Similar Price (±25-35%)
- **Logic**: Cross-brand, same vehicle "shape" and use case
- **Matching**: Same body type AND fuel type, within ±25-35% price range
- **Scoring**: Price proximity + fuel match + body type match
- **Bonus**: Extra points if make also matches (but don't force it)
- **Target**: 3-4 results
- **Example**: VW ID.4 (electric SUV/crossover) → Ford Mustang Mach-E, Skoda Enyaq, Hyundai Ioniq 5

### Tier 3: Fallback - Wider Price Range
- **Logic**: Broader compatibility with relaxed constraints
- **Matching**: Same body type within wider price range (±50-60%)
- **Scoring**: Price proximity + body type match + fuel preference
- **Target**: 2-3 results
- **Example**: VW ID.4 → Any electric or hybrid SUV/crossover in broader price range

## Edge Function Structure

### File: `supabase/functions/get-similar-cars/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

interface SimilarCarsRequest {
  listing_id: string
  target_count?: number
  debug?: boolean
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

      const { listing_id, target_count = 8, debug = false } = await req.json() as SimilarCarsRequest

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
          listing_id,
          make,
          model,
          variant,
          monthly_price,
          body_type,
          fuel_type,
          transmission,
          image_url
        `)
        .neq('listing_id', listing_id)

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
        .eq('listing_id', listing_id)
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
        .map(car => scoreCar(car, sourceCar, 'tier1', SIMILAR_CARS_CONFIG))
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
        !allResults.some(result => result.listing_id === car.listing_id)
      )
      
      const tier2Results = tier2Candidates
        .map(car => scoreCar(car, sourceCar, 'tier2', SIMILAR_CARS_CONFIG))
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
          !allResults.some(result => result.listing_id === car.listing_id)
        )
        
        const tier3Results = tier3Candidates
          .map(car => scoreCar(car, sourceCar, 'tier3', SIMILAR_CARS_CONFIG))
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
  config: SimilarCarsConfig
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

  return {
    listing_id: car.listing_id,
    make: car.make,
    model: car.model,
    variant: car.variant,
    monthly_price: car.monthly_price,
    body_type: car.body_type,
    fuel_type: car.fuel_type,
    transmission: car.transmission,
    score: Math.round(score * 1000) / 1000,
    tier,
    match_reasons: matchReasons,
    image_url: car.image_url
  }
}
```

## Client Integration

### Replace useSimilarListings Hook
```typescript
// src/hooks/useSimilarListings.ts - Updated to use Edge Function
export function useSimilarListings(listingId: string, targetCount = 8) {
  return useQuery({
    queryKey: ['similar-cars', listingId, targetCount],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-similar-cars', {
        body: { 
          listing_id: listingId, 
          target_count: targetCount,
          debug: process.env.NODE_ENV === 'development'
        }
      })

      if (error) {
        console.error('Similar cars error:', error)
        throw new Error('Der opstod en fejl ved hentning af lignende biler')
      }

      return data as SimilarCarsResponse
    },
    enabled: !!listingId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}
```

### Update Component Usage
```typescript
// src/components/SimilarCarsSection.tsx
const { data: similarCarsData, isLoading, error } = useSimilarListings(listingId, 8)

if (isLoading) return <SimilarCarsSkeleton />
if (error) return <div>Der opstod en fejl ved indlæsning af lignende biler</div>

const { similar_cars, debug_info } = similarCarsData || {}
```

## Testing Strategy

### Edge Function Tests
```typescript
// supabase/functions/get-similar-cars/test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'

Deno.test('Similar cars - same make matching', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/get-similar-cars', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      listing_id: 'bmw-x3-test-id', 
      debug: true 
    })
  })
  
  const result = await response.json()
  assertEquals(result.tiers_used.includes('tier1'), true)
})
```

## Deployment

### Function Deployment
```bash
supabase functions deploy get-similar-cars --project-ref <project-id>
```

### Environment Variables
Handled automatically by Supabase Edge Functions runtime:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Performance Characteristics

### Expected Performance
- **Query Time**: 50-100ms (single query for 231 cars)
- **Processing Time**: 10-30ms (in-memory scoring)
- **Total Response**: <150ms
- **Memory Usage**: ~2MB (all listings in memory)

### Rate Limiting
- Applied via `rateLimiters.general` (60 requests/minute per IP)
- Suitable for user-facing similar cars requests
- CORS support for frontend integration

## Benefits Over Client Implementation

1. **Eliminates Candidate Pool Limits**: Processes all 231 cars in memory
2. **Sophisticated Scoring**: Multi-tier weighted scoring system  
3. **Performance**: Single DB query + fast in-memory processing
4. **Scalability**: Server-side processing, client gets final results
5. **Configuration-Driven**: Easy to tune scoring weights and tiers
6. **Debug Mode**: Comprehensive debugging for development
7. **Danish Localization**: All error messages in Danish
8. **Type Safety**: Full TypeScript interfaces throughout

## Implementation Priority

**Store for later implementation** - This comprehensive plan addresses the core architectural flaw in the similar cars system and provides a production-ready solution with proper error handling, Danish localization, and performance optimization.