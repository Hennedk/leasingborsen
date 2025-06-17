import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { CarListing } from '@/lib/supabase'
import type { OfferFormData } from '@/lib/validations'

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
 * Mutation for managing lease pricing offers
 */
export function useUpdateListingWithOffers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      listingId, 
      listingUpdates, 
      offers 
    }: { 
      listingId: string
      listingUpdates: Partial<CarListing>
      offers?: OfferFormData[]
    }) => {
      // Start a transaction-like approach
      try {
        // 1. Update the main listing
        const { data: updatedListing, error: listingError } = await supabase
          .from('listings')
          .update(listingUpdates)
          .eq('id', listingId)
          .select()
          .single()

        if (listingError) throw listingError

        // 2. Only update offers if they are provided (for separated saves)
        if (offers && offers.length > 0) {
          // Clear existing lease pricing for this listing
          const { error: deleteError } = await supabase
            .from('lease_pricing')
            .delete()
            .eq('listing_id', listingId)

          if (deleteError) throw deleteError

          // Insert new lease pricing offers
          const offerInserts = offers.map(offer => ({
            listing_id: listingId,
            monthly_price: Number(offer.monthly_price),
            first_payment: offer.first_payment ? Number(offer.first_payment) : null,
            period_months: Number(offer.period_months),
            mileage_per_year: Number(offer.mileage_per_year)
          }))

          const { error: insertError } = await supabase
            .from('lease_pricing')
            .insert(offerInserts)

          if (insertError) throw insertError
        }

        return { updatedListing, offersCount: offers?.length || 0 }
      } catch (error) {
        console.error('Transaction failed:', error)
        throw error
      }
    },
    onSuccess: (data, { listingId }) => {
      console.log('✅ Listing and offers updated successfully:', data)
      
      // Update the specific listing in cache
      queryClient.setQueryData(queryKeys.listingDetail(listingId), { data: data.updatedListing, error: null })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['offers', listingId] })
    },
    onError: (error) => {
      console.error('❌ Failed to update listing with offers:', error)
    }
  })
}

export function useCreateListingWithOffers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      listingData, 
      offers 
    }: { 
      listingData: Partial<CarListing>
      offers?: OfferFormData[]
    }) => {
      try {
        // 1. Create the main listing
        const { data: newListing, error: listingError } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single()

        if (listingError) throw listingError

        // 2. Insert lease pricing offers
        if (offers && offers.length > 0) {
          const offerInserts = offers.map(offer => ({
            listing_id: newListing.id,
            monthly_price: Number(offer.monthly_price),
            first_payment: offer.first_payment ? Number(offer.first_payment) : null,
            period_months: Number(offer.period_months),
            mileage_per_year: Number(offer.mileage_per_year)
          }))

          const { error: insertError } = await supabase
            .from('lease_pricing')
            .insert(offerInserts)

          if (insertError) throw insertError
        }

        return { newListing, offersCount: offers?.length || 0 }
      } catch (error) {
        console.error('Create transaction failed:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      console.log('✅ Listing and offers created successfully:', data)
      
      // Invalidate all listings queries when a new listing is created
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
    },
    onError: (error) => {
      console.error('❌ Failed to create listing with offers:', error)
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