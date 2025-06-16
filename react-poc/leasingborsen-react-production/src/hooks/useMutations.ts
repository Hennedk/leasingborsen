import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { CarListing } from '@/lib/supabase'

/**
 * Mutation hooks for data modifications
 * These handle optimistic updates and cache invalidation
 */

export function useCreateListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (listing: Partial<CarListing>) => {
      const { data, error } = await supabase
        .from('listings')
        .insert(listing)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all listings queries when a new listing is created
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
    },
    onError: (error) => {
      console.error('Failed to create listing:', error)
    }
  })
}

export function useUpdateListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CarListing> }) => {
      const { data, error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data, { id }) => {
      // Update the specific listing in cache
      queryClient.setQueryData(queryKeys.listingDetail(id), { data, error: null })
      
      // Invalidate listings queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
    },
    onError: (error) => {
      console.error('Failed to update listing:', error)
    }
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id }
    },
    onSuccess: (_, id) => {
      // Remove the listing from cache
      queryClient.removeQueries({ queryKey: queryKeys.listingDetail(id) })
      
      // Invalidate listings queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
    },
    onError: (error) => {
      console.error('Failed to delete listing:', error)
    }
  })
}

/**
 * Mutation for refreshing data manually
 */
export function useRefreshData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: { 
      includeListings?: boolean
      includeReferenceData?: boolean 
    } = {}) => {
      const { includeListings = true, includeReferenceData = false } = options

      if (includeListings) {
        await queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      }
      
      if (includeReferenceData) {
        await queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllReferenceData() })
      }

      return { success: true }
    },
    onSuccess: (_, options) => {
      console.log('Data refreshed successfully', options)
    },
    onError: (error) => {
      console.error('Failed to refresh data:', error)
    }
  })
}

/**
 * Optimistic update for listing favorite/bookmark status
 * (Example of optimistic updates pattern)
 */
export function useToggleListingFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, isFavorite }: { listingId: string; isFavorite: boolean }) => {
      // Simulate API call for favorite status
      await new Promise(resolve => setTimeout(resolve, 300))
      return { listingId, isFavorite }
    },
    onMutate: async ({ listingId, isFavorite }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.listingDetail(listingId) })

      // Snapshot the previous value
      const previousListing = queryClient.getQueryData(queryKeys.listingDetail(listingId))

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.listingDetail(listingId), (old: any) => ({
        ...old,
        data: { ...old?.data, is_favorite: isFavorite }
      }))

      // Return a context object with the snapshotted value
      return { previousListing }
    },
    onError: (_, { listingId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousListing) {
        queryClient.setQueryData(queryKeys.listingDetail(listingId), context.previousListing)
      }
    },
    onSettled: (_, __, { listingId }) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: queryKeys.listingDetail(listingId) })
    },
  })
}