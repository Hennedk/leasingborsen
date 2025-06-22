import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { CarListing } from '@/lib/supabase'

/**
 * Basic CRUD mutation hooks for car listings
 * 
 * Handles fundamental create, read, update, delete operations
 * Separated from complex operations for better maintainability
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
      
      // Only invalidate listing lists (not individual listing details) to prevent form reset
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.listings,
        predicate: (query) => {
          // Only invalidate listing collections, not individual listing details
          return query.queryKey.length > 1 && query.queryKey[1] !== id
        }
      })
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