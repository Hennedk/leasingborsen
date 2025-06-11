import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { CarListingQueries, type FilterOptions } from '@/lib/supabase'
import type { SortOrder } from '@/types'

export function useListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder: SortOrder = '') {
  return useQuery({
    queryKey: ['listings', filters, limit, sortOrder],
    queryFn: () => CarListingQueries.getListings(filters, limit, sortOrder),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useInfiniteListings(filters: Partial<FilterOptions> = {}) {
  return useInfiniteQuery({
    queryKey: ['listings-infinite', filters],
    queryFn: () => 
      CarListingQueries.getListings(filters, 20), // TODO: Implement proper pagination
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => 
      lastPage.data && lastPage.data.length === 20 ? pages.length : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => CarListingQueries.getListingById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

export function useListingCount(filters: Partial<FilterOptions> = {}) {
  return useQuery({
    queryKey: ['listing-count', filters],
    queryFn: () => CarListingQueries.getListingCount(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}