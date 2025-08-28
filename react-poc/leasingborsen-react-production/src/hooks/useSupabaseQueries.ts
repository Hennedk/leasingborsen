import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CarListingQueries, ReferenceDataQueries } from '@/lib/supabase'
import type { FilterOptions } from '@/types'

// Query keys for React Query caching
export const QUERY_KEYS = {
  listings: (filters: Partial<FilterOptions>, sortOrder: string, offset: number) => 
    ['listings', filters, sortOrder, offset] as const,
  listingById: (id: string) => ['listing', id] as const,
  listingCount: (filters: Partial<FilterOptions>, sortOrder?: string) => ['listing-count', filters, sortOrder] as const,
  makes: () => ['makes'] as const,
  models: (makeId?: string) => ['models', makeId] as const,
  bodyTypes: () => ['body-types'] as const,
  fuelTypes: () => ['fuel-types'] as const,
  transmissions: () => ['transmissions'] as const,
  colours: () => ['colours'] as const,
} as const

// Car listings hooks
export const useListings = (
  filters: Partial<FilterOptions> = {}, 
  limit = 20, 
  sortOrder = '', 
  offset = 0
) => {
  return useQuery({
    queryKey: QUERY_KEYS.listings(filters, sortOrder, offset),
    queryFn: () => CarListingQueries.getListings(filters, limit, sortOrder, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors, but not for data errors
      if (failureCount < 2 && error?.message?.includes('network')) {
        return true
      }
      return false
    }
  })
}

export const useListingById = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.listingById(id),
    queryFn: () => CarListingQueries.getListingById(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!id, // Only run if id is provided
    refetchOnWindowFocus: false,
  })
}

export const useListingCount = (filters: Partial<FilterOptions> = {}, sortOrder = '') => {
  return useQuery({
    queryKey: QUERY_KEYS.listingCount(filters, sortOrder),
    queryFn: () => CarListingQueries.getListingCount(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

// Reference data hooks
export const useMakes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.makes(),
    queryFn: () => ReferenceDataQueries.getMakes(),
    staleTime: 30 * 60 * 1000, // 30 minutes (reference data changes rarely)
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  })
}

export const useModels = (makeId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.models(makeId),
    queryFn: () => ReferenceDataQueries.getModels(makeId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!makeId, // Only run if makeId is provided
    refetchOnWindowFocus: false,
  })
}

export const useBodyTypes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.bodyTypes(),
    queryFn: () => ReferenceDataQueries.getBodyTypes(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  })
}

export const useFuelTypes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.fuelTypes(),
    queryFn: () => ReferenceDataQueries.getFuelTypes(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  })
}

export const useTransmissions = () => {
  return useQuery({
    queryKey: QUERY_KEYS.transmissions(),
    queryFn: () => ReferenceDataQueries.getTransmissions(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  })
}

export const useColours = () => {
  return useQuery({
    queryKey: QUERY_KEYS.colours(),
    queryFn: () => ReferenceDataQueries.getColours(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  })
}

// Utility hook for prefetching data
export const usePrefetchListings = () => {
  const queryClient = useQueryClient()
  
  const prefetchListings = (filters: Partial<FilterOptions> = {}, sortOrder = '', offset = 0) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.listings(filters, sortOrder, offset),
      queryFn: () => CarListingQueries.getListings(filters, 20, sortOrder, offset),
      staleTime: 5 * 60 * 1000,
    })
  }
  
  const prefetchListing = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.listingById(id),
      queryFn: () => CarListingQueries.getListingById(id),
      staleTime: 10 * 60 * 1000,
    })
  }
  
  return { prefetchListings, prefetchListing }
}

// Hook for invalidating queries after data mutations
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient()
  
  const invalidateListings = () => {
    queryClient.invalidateQueries({ queryKey: ['listings'] })
    queryClient.invalidateQueries({ queryKey: ['listing-count'] })
  }
  
  const invalidateListing = (id: string) => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.listingById(id) })
  }
  
  const invalidateReferenceData = () => {
    queryClient.invalidateQueries({ queryKey: ['makes'] })
    queryClient.invalidateQueries({ queryKey: ['models'] })
    queryClient.invalidateQueries({ queryKey: ['body-types'] })
    queryClient.invalidateQueries({ queryKey: ['fuel-types'] })
    queryClient.invalidateQueries({ queryKey: ['transmissions'] })
    queryClient.invalidateQueries({ queryKey: ['colours'] })
  }
  
  return { 
    invalidateListings, 
    invalidateListing, 
    invalidateReferenceData 
  }
}