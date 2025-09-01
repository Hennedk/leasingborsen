import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { CarListingQueries, type FilterOptions } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { SortOrder } from '@/types'

export function useListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder: SortOrder = 'lease_score_desc') {
  return useQuery({
    queryKey: queryKeys.listingsWithFilters(filters, limit, sortOrder),
    queryFn: () => CarListingQueries.getListings(filters, limit, sortOrder),
    staleTime: 3 * 60 * 1000, // 3 minutes - shorter for more up-to-date listings
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  })
}

export function useInfiniteListings(filters: Partial<FilterOptions> = {}, sortOrder: SortOrder = 'lease_score_desc') {
  return useInfiniteQuery({
    queryKey: queryKeys.listingsInfinite(filters, sortOrder),
    queryFn: ({ pageParam = 0 }) => 
      CarListingQueries.getListings(filters, 20, sortOrder, pageParam * 20), // Proper pagination offset with sort
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      // Continue loading if we got a full page of results
      if (lastPage.data && lastPage.data.length === 20) {
        return pages.length
      }
      // Stop loading if we have less than a full page
      return undefined
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - longer stale time for better navigation
    gcTime: 30 * 60 * 1000, // 30 minutes for infinite queries - keep data longer
    maxPages: 50, // Increased limit for better UX (1000 total listings max)
    refetchOnWindowFocus: false, // Don't refetch infinite queries on focus
    refetchOnMount: false, // Don't refetch on mount to preserve scroll position
    refetchOnReconnect: false, // Don't refetch on network reconnection
  })
}

export function useListing(
  id: string, 
  offerSettings?: {
    selectedDeposit?: number
    selectedMileage?: number
    selectedTerm?: number
  }
) {
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: queryKeys.listingDetail(id, offerSettings),
    queryFn: () => CarListingQueries.getListingById(id, {
      targetDeposit: offerSettings?.selectedDeposit,
      targetMileage: offerSettings?.selectedMileage,
      targetTerm: offerSettings?.selectedTerm
    }),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes - individual listings change less frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: (previous) => previous, // Reuse previous result to avoid full skeleton
    refetchOnMount: false, // Avoid forcing loading state when remounting with cached data
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

export function useListingCount(filters: Partial<FilterOptions> = {}, sortOrder: SortOrder = 'lease_score_desc') {
  return useQuery({
    queryKey: queryKeys.listingsCount(filters, sortOrder),
    queryFn: () => CarListingQueries.getListingCount(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Keep previous data while refetching for smooth UX
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    retry: (failureCount) => failureCount < 2,
  })
}
