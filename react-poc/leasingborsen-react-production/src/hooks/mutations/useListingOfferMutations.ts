import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { CarListing } from '@/lib/supabase'
import type { OfferFormData } from '@/lib/validations'

/**
 * Complex listing mutation hooks that handle offers
 * 
 * Handles listing operations that involve both listing data and associated offers
 * Uses transaction-like patterns for data consistency
 */

/**
 * Helper function to deduplicate offers based on unique constraints
 */
function deduplicateOffers(offers: any[]) {
  const constraintMap = new Map<string, any>()
  
  offers.forEach((option: any) => {
    const constraintKey = `${option.listing_id}-${option.mileage_per_year}-${option.first_payment}-${option.period_months}`
    const existing = constraintMap.get(constraintKey)
    if (!existing || option.monthly_price > existing.monthly_price) {
      constraintMap.set(constraintKey, option)
    }
  })

  return Array.from(constraintMap.values())
}

/**
 * Helper function to prepare offer inserts from form data
 */
function prepareOfferInserts(listingId: string, offers: OfferFormData[]) {
  return offers.map(offer => ({
    listing_id: listingId,
    monthly_price: Number(offer.monthly_price),
    first_payment: offer.first_payment ? Number(offer.first_payment) : null,
    period_months: Number(offer.period_months),
    mileage_per_year: Number(offer.mileage_per_year)
  }))
}

/**
 * Complex mutation for updating listing with offers in a transaction-like approach
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

          // Prepare and deduplicate offer inserts
          const offerInserts = prepareOfferInserts(listingId, offers)
          const deduplicatedOffers = deduplicateOffers(offerInserts)
          
          console.log(`🔍 Offer deduplication: ${offerInserts.length} offers → ${deduplicatedOffers.length} unique offers`)

          const { error: insertError } = await supabase
            .from('lease_pricing')
            .insert(deduplicatedOffers)

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
      
      // Update the specific listing in cache with fresh data
      queryClient.setQueryData(queryKeys.listingDetail(listingId), { data: data.updatedListing, error: null })
      
      // Only invalidate listing lists (not individual listing details) to prevent form reset
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.listings,
        predicate: (query) => {
          // Only invalidate listing collections, not individual listing details
          return query.queryKey.length > 1 && query.queryKey[1] !== listingId
        }
      })
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
          const offerInserts = prepareOfferInserts(newListing.id, offers)
          const deduplicatedOffers = deduplicateOffers(offerInserts)
          
          console.log(`🔍 Create offer deduplication: ${offerInserts.length} offers → ${deduplicatedOffers.length} unique offers`)

          const { error: insertError } = await supabase
            .from('lease_pricing')
            .insert(deduplicatedOffers)

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