import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CarListing, SimilarCarsResponse, ScoredListing } from '@/types'
import { getCarId } from '@/lib/utils'

export function useSimilarListings(currentCar: CarListing | null, targetCount: number = 8) {
  // Danish error messages for similar listings
  const danishMessages = {
    loadingMessage: 'Indlæser lignende biler...',
    errorMessage: 'Der opstod en fejl ved hentning af lignende biler',
    noSimilarMessage: 'Ingen lignende biler fundet',
    fallbackUsedMessage: 'Viser lignende biler i bredere kategori'
  }

  const query = useQuery({
    queryKey: ['similar-cars', currentCar ? getCarId(currentCar) : null, targetCount],
    queryFn: async () => {
      if (!currentCar) {
        throw new Error('No car provided')
      }

      const listingId = getCarId(currentCar)
      if (!listingId) {
        throw new Error('Invalid car ID')
      }

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
    enabled: !!currentCar && !!getCarId(currentCar),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Convert ScoredListing to CarListing format for backward compatibility
  const similarCars: CarListing[] = (query.data?.similar_cars || []).map((scoredCar: ScoredListing) => ({
    // Core fields
    listing_id: scoredCar.listing_id,
    id: scoredCar.listing_id, // Alias for backward compatibility
    make: scoredCar.make,
    model: scoredCar.model,
    variant: scoredCar.variant,
    body_type: scoredCar.body_type,
    fuel_type: scoredCar.fuel_type,
    transmission: scoredCar.transmission,
    monthly_price: scoredCar.monthly_price,
    
    // Image - map to expected field name for ListingCard compatibility
    image: scoredCar.image_url,
    
    // Additional metadata from scoring (optional)
    _score: scoredCar.score,
    _tier: scoredCar.tier,
    _match_reasons: scoredCar.match_reasons
  }))

  // Extract tier information for backward compatibility
  const tiersUsed = query.data?.tiers_used || []
  const activeTier = tiersUsed.length > 0 ? tiersUsed.join('+') : null
  const isFallbackTier = tiersUsed.includes('tier3')

  // Determine if we have minimum results based on tier success
  const hasMinimumResults = similarCars.length >= 1

  return {
    // Main data
    similarCars,
    isLoading: query.isLoading,
    error: query.error,
    
    // Tier information (backward compatibility)
    activeTier,
    hasMinimumResults,
    tierUsed: activeTier, // Alias for backward compatibility
    tiersUsed,
    isFallbackTier,
    
    // Danish UI messaging
    messages: danishMessages,
    
    // Additional metadata
    totalCandidates: query.data?.total_results || 0,
    
    // Debug information (development only)
    debugInfo: process.env.NODE_ENV === 'development' ? query.data?.debug_info : undefined,
    
    // Query status for advanced use cases
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    refetch: query.refetch
  }
}

// Advanced version with progressive tier fallback (for future enhancement)
export function useSimilarListingsAdvanced(currentCar: CarListing | null, targetCount: number = 6) {
  // This would implement progressive fallback logic
  // For now, return the basic implementation
  return useSimilarListings(currentCar, targetCount)
}