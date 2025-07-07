import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ListingChange } from './useListingComparison'

interface UnmappedListing {
  listing_id: string
  make: string
  model: string
  variant: string
  horsepower?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  monthly_price?: number
  created_at: string
  updated_at: string
  image?: string
  wltp?: number
  co2_emission?: number
}

/**
 * Hook to fetch dealer listings that were not included in an extraction session
 * This helps identify:
 * 1. Cars that the AI failed to extract from the PDF
 * 2. Cars that are no longer offered by the dealer (discontinued)
 */
export const useUnmappedDealerListings = (sessionId: string | null, sellerId: string | null) => {
  return useQuery({
    queryKey: ['unmapped-dealer-listings', sessionId, sellerId],
    queryFn: async () => {
      if (!sessionId || !sellerId) return []

      // First, get all existing listing IDs that were matched in this session
      const { data: sessionChanges, error: changesError } = await supabase
        .from('extraction_listing_changes')
        .select('existing_listing_id')
        .eq('session_id', sessionId)
        .not('existing_listing_id', 'is', null)

      if (changesError) throw changesError

      const matchedListingIds = sessionChanges?.map(change => change.existing_listing_id) || []

      // Then, get all current listings for this dealer
      let query = supabase
        .from('full_listing_view')
        .select(`
          listing_id,
          make,
          model,
          variant,
          horsepower,
          fuel_type,
          transmission,
          body_type,
          monthly_price,
          created_at,
          updated_at,
          image,
          wltp,
          co2_emission
        `)
        .eq('seller_id', sellerId)
        .order('make')
        .order('model')
        .order('variant')

      // Exclude matched listings
      if (matchedListingIds.length > 0) {
        query = query.not('listing_id', 'in', `(${matchedListingIds.join(',')})`)
      }

      const { data, error } = await query

      if (error) throw error

      // Remove duplicates (full_listing_view can have multiple rows per listing due to pricing options)
      const uniqueListings = new Map<string, UnmappedListing>()
      data?.forEach(listing => {
        if (!uniqueListings.has(listing.listing_id)) {
          uniqueListings.set(listing.listing_id, listing)
        }
      })

      return Array.from(uniqueListings.values())
    },
    enabled: !!sessionId && !!sellerId
  })
}

/**
 * Hook to get delete changes from an extraction session
 * These are existing listings that were identified as not present in the PDF
 */
export const useDeleteChanges = (sessionId: string | null) => {
  return useQuery({
    queryKey: ['delete-changes', sessionId],
    queryFn: async () => {
      if (!sessionId) return []

      const { data, error } = await supabase
        .from('extraction_listing_changes')
        .select('*')
        .eq('session_id', sessionId)
        .eq('change_type', 'delete')
        .order('existing_listing_id')

      if (error) throw error
      return data as ListingChange[]
    },
    enabled: !!sessionId
  })
}