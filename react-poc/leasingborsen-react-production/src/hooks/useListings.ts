import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { CarListingQueries, type FilterOptions } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { SortOrder } from '@/types'

export function useListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder: SortOrder = '') {
  return useQuery({
    queryKey: queryKeys.listingsWithFilters(filters, limit, sortOrder),
    queryFn: () => CarListingQueries.getListings(filters, limit, sortOrder),
    staleTime: 3 * 60 * 1000, // 3 minutes - shorter for more up-to-date listings
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  })
}

export function useInfiniteListings(filters: Partial<FilterOptions> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.listingsInfinite(filters),
    queryFn: ({ pageParam = 0 }) => 
      CarListingQueries.getListings(filters, 20, '', pageParam * 20), // Proper pagination offset
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => 
      lastPage.data && lastPage.data.length === 20 ? pages.length : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes for infinite queries
    maxPages: 10, // Limit to prevent memory issues
  })
}

export function useListing(id: string) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: queryKeys.listingDetail(id),
    queryFn: () => CarListingQueries.getListingById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes - individual listings change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Try to initialize from listings cache if available
    initialData: () => {
      // Try to find this listing in any cached listings
      const queryCache = queryClient.getQueryCache()
      const listingsQueries = queryCache.findAll({ queryKey: queryKeys.listingsAll() })
      
      for (const query of listingsQueries) {
        const data = query.state.data as any
        if (data?.data?.length) {
          const foundListing = data.data.find((listing: any) => 
            listing.listing_id === id || listing.id === id
          )
          if (foundListing) {
            return { data: foundListing, error: null }
          }
        }
      }
      return undefined
    },
  })
}

export function useListingCount(filters: Partial<FilterOptions> = {}) {
  return useQuery({
    queryKey: queryKeys.listingsCount(filters),
    queryFn: () => CarListingQueries.getListingCount(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
  })
}