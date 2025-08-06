import { useMemo } from 'react'
import { useListings } from './useListings'
import type { CarListing } from '@/types'
import { getCarId } from '@/lib/utils'

interface SimilarityTier {
  name: string
  getFilters: (car: CarListing) => any
  minResults: number
}

export function useSimilarListings(currentCar: CarListing | null, targetCount: number = 6) {
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
      minResults: 3
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
      minResults: 3
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

  // Try each tier until we have enough results
  const activeTier = useMemo(() => {
    if (!currentCar) return null
    
    // Start with tier 2 (same make + body type) as it provides good balance
    // TODO: Implement progressive fallback in future enhancement
    return similarityTiers[1] 
  }, [currentCar, similarityTiers])

  const filters = useMemo(() => {
    if (!currentCar || !activeTier) return {}
    return activeTier.getFilters(currentCar)
  }, [currentCar, activeTier])

  const { 
    data: similarListingsResponse, 
    isLoading, 
    error 
  } = useListings(filters, targetCount * 2, '') // Fetch extra to account for filtering

  // Filter out the current car and limit results
  const similarCars = useMemo(() => {
    if (!currentCar || !similarListingsResponse?.data) return []
    
    const currentCarId = getCarId(currentCar)
    const cars = similarListingsResponse.data
    
    const filtered = cars.filter(car => {
      // Use the ID normalization helper to handle both id and listing_id fields
      const carId = getCarId(car)
      return carId !== currentCarId && 
             car.id !== currentCarId && 
             car.listing_id !== currentCarId
    })
    
    return filtered.slice(0, targetCount)
  }, [currentCar, similarListingsResponse?.data, targetCount])

  return {
    similarCars,
    isLoading,
    error,
    activeTier: activeTier?.name,
    hasMinimumResults: similarCars.length >= (activeTier?.minResults || 1)
  }
}

// Advanced version with progressive tier fallback (for future enhancement)
export function useSimilarListingsAdvanced(currentCar: CarListing | null, targetCount: number = 6) {
  // This would implement progressive fallback logic
  // For now, return the basic implementation
  return useSimilarListings(currentCar, targetCount)
}