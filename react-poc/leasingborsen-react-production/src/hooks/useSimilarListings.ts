import { useMemo } from 'react'
import { useListings } from './useListings'
import type { CarListing } from '@/types'
import { getCarId } from '@/lib/utils'

// Helper function to detect rare/luxury brands that should constrain to same make
function isRareBrand(make: string | null | undefined): boolean {
  if (!make) return false
  
  const rareBrands = [
    'Lamborghini', 'Ferrari', 'McLaren', 'Bugatti', 'Koenigsegg', 
    'Pagani', 'Aston Martin', 'Bentley', 'Rolls-Royce', 'Maserati',
    'Lotus', 'Morgan', 'Alpine', 'Caterham'
  ]
  
  return rareBrands.includes(make)
}

// Helper function to check if a car matches tier criteria
function matchesTierCriteria(car: CarListing, currentCar: CarListing, tier: SimilarityTier): boolean {
  const filters = tier.getFilters(currentCar)
  
  // Check make constraint
  if (filters.makes && filters.makes.length > 0 && !filters.makes.includes(car.make)) {
    return false
  }
  
  // Check body type constraint
  if (filters.body_type && filters.body_type.length > 0 && !filters.body_type.includes(car.body_type)) {
    return false
  }
  
  // Check price constraints
  const carPrice = car.monthly_price || 0
  if (filters.price_min && carPrice < filters.price_min) {
    return false
  }
  if (filters.price_max && carPrice > filters.price_max) {
    return false
  }
  
  return true
}

// Helper function to build broad query scope for initial data fetch
function buildBroadQuery(currentCar: CarListing) {
  const basePrice = currentCar.monthly_price || 0
  
  return {
    price_min: Math.floor(basePrice * 0.6), // 60% price floor
    price_max: Math.ceil(basePrice * 1.4),  // 140% price ceiling
    // Add make constraint for rare brands to prevent excessive data fetching
    makes: isRareBrand(currentCar.make) ? [currentCar.make] : undefined
  }
}

interface SimilarityTier {
  name: string
  getFilters: (car: CarListing) => any
  minResults: number
}

export function useSimilarListings(currentCar: CarListing | null, targetCount: number = 6) {
  // Danish error messages for similar listings
  const danishMessages = {
    loadingMessage: 'Indlæser lignende biler...',
    errorMessage: 'Der opstod en fejl ved hentning af lignende biler',
    noSimilarMessage: 'Ingen lignende biler fundet', // Should rarely appear with fallback
    fallbackUsedMessage: 'Viser lignende biler i bredere kategori'
  }
  // Define similarity tiers - progressively broader criteria
  const similarityTiers: SimilarityTier[] = useMemo(() => [
    // Tier 1: Same make + model variations (tightest match)
    {
      name: 'same_make_model',
      getFilters: (car: CarListing) => ({
        makes: [car.make],
        models: [car.model],
        price_min: Math.floor((car.monthly_price || 0) * 0.9),
        price_max: Math.ceil((car.monthly_price || 0) * 1.1)
      }),
      minResults: 1 // Always include exact model matches if found
    },
    // Tier 2: Same make + body type 
    {
      name: 'same_make_body',
      getFilters: (car: CarListing) => ({
        makes: [car.make],
        body_type: car.body_type ? [car.body_type] : [],
        price_min: Math.floor((car.monthly_price || 0) * 0.8),
        price_max: Math.ceil((car.monthly_price || 0) * 1.2)
      }),
      minResults: 1 // Always include same make + body type if found
    },
    // Tier 3: Same make + broader price range
    {
      name: 'same_make_broad',
      getFilters: (car: CarListing) => ({
        makes: [car.make],
        price_min: Math.floor((car.monthly_price || 0) * 0.75),
        price_max: Math.ceil((car.monthly_price || 0) * 1.25)
      }),
      minResults: 2
    },
    // Tier 4: Same body type + broader price (cross-brand)
    {
      name: 'same_body_cross_brand',
      getFilters: (car: CarListing) => ({
        body_type: car.body_type ? [car.body_type] : [],
        price_min: Math.floor((car.monthly_price || 0) * 0.7),
        price_max: Math.ceil((car.monthly_price || 0) * 1.3)
      }),
      minResults: 2
    },
    // Tier 5: Fallback - just price range (any car in similar price range)
    {
      name: 'price_only',
      getFilters: (car: CarListing) => ({
        price_min: Math.floor((car.monthly_price || 0) * 0.6),
        price_max: Math.ceil((car.monthly_price || 0) * 1.4)
      }),
      minResults: 1
    }
  ], [])

  // Use broad query strategy for initial data fetch
  const broadQueryFilters = useMemo(() => {
    if (!currentCar) return {}
    return buildBroadQuery(currentCar)
  }, [currentCar])

  const { 
    data: similarListingsResponse, 
    isLoading, 
    error 
  } = useListings(broadQueryFilters, targetCount * 3, '') // Fetch extra to enable progressive filtering

  // Progressive tier fallback with client-side filtering
  const { similarCars, activeTier } = useMemo(() => {
    if (!currentCar || !similarListingsResponse?.data) {
      return { similarCars: [], activeTier: null }
    }
    
    const currentCarId = getCarId(currentCar)
    const allCandidates = similarListingsResponse.data
    
    // Filter out the current car first
    const candidateCars = allCandidates.filter(car => {
      // Use the ID normalization helper to handle both id and listing_id fields
      const carId = getCarId(car)
      return carId !== currentCarId && 
             car.id !== currentCarId && 
             car.listing_id !== currentCarId
    })
    
    // Progressive stacking: collect results from all tiers in priority order
    let stackedResults: CarListing[] = []
    let tiersUsed: string[] = []
    
    for (const tier of similarityTiers) {
      const tierMatches = candidateCars.filter(car => 
        matchesTierCriteria(car, currentCar, tier)
      )
      
      // Add new matches that aren't already included (deduplication)
      const newMatches = tierMatches.filter(car => 
        !stackedResults.some(existing => getCarId(existing) === getCarId(car))
      )
      
      if (newMatches.length > 0) {
        stackedResults.push(...newMatches)
        tiersUsed.push(tier.name)
        
        // Stop if we've reached our target count
        if (stackedResults.length >= targetCount) {
          break
        }
      }
    }
    
    // Final fallback: if no tier matches found, use any available cars
    if (stackedResults.length === 0 && candidateCars.length > 0) {
      stackedResults = candidateCars.slice(0, targetCount)
      tiersUsed = ['fallback']
    }
    
    return {
      similarCars: stackedResults.slice(0, targetCount),
      activeTier: tiersUsed.length > 0 ? tiersUsed.join('+') : null,
      tiersUsed: tiersUsed
    }
  }, [currentCar, similarListingsResponse?.data, targetCount, similarityTiers])

  // Calculate hasMinimumResults based on results achieved
  const hasMinimumResults = useMemo(() => {
    if (!activeTier || activeTier.includes('fallback')) return similarCars.length > 0
    
    // With progressive stacking, we consider it successful if we have results
    // The minimum is more about having relevant matches than hitting specific counts
    return similarCars.length >= 1
  }, [activeTier, similarCars.length])

  return {
    similarCars,
    isLoading,
    error,
    activeTier,
    hasMinimumResults,
    // Additional metadata for Danish UI messaging
    messages: danishMessages,
    // Information about tier usage for analytics/debugging
    tiersUsed: activeTier ? activeTier.split('+') : [],
    isFallbackTier: activeTier?.includes('fallback') || false,
    tierUsed: activeTier, // Kept for backward compatibility
    totalCandidates: similarListingsResponse?.data?.length || 0
  }
}

// Advanced version with progressive tier fallback (for future enhancement)
export function useSimilarListingsAdvanced(currentCar: CarListing | null, targetCount: number = 6) {
  // This would implement progressive fallback logic
  // For now, return the basic implementation
  return useSimilarListings(currentCar, targetCount)
}