import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Define proper TypeScript interface for AI extraction needs
export interface DealerListing {
  listing_id: string
  make: string
  model: string
  variant: string
  horsepower: number | null
}

interface UseSellerListingsOptions {
  limit?: number
}

export function useSellerListings(sellerId?: string, options?: UseSellerListingsOptions) {
  const limit = options?.limit || 500 // Reasonable default to avoid payload bloat
  
  return useQuery({
    queryKey: ['seller-listings', sellerId, limit],
    queryFn: async (): Promise<DealerListing[]> => {
      if (!sellerId) return []
      
      // Fetch only the fields AI needs (reduced payload)
      const { data, error } = await supabase
        .from('full_listing_view')
        .select('listing_id, make, model, variant, horsepower')
        .eq('seller_id', sellerId)
        .order('make, model, variant')
        .limit(limit)
      
      if (error) {
        console.error('Error fetching seller listings:', error)
        throw error
      }
      
      // Deduplicate by listing_id (full_listing_view can have duplicates due to multiple pricing options)
      const uniqueListings = new Map<string, DealerListing>()
      data?.forEach(listing => {
        if (listing.listing_id && !uniqueListings.has(listing.listing_id)) {
          uniqueListings.set(listing.listing_id, {
            listing_id: listing.listing_id,
            make: listing.make || '',
            model: listing.model || '',
            variant: listing.variant || '',
            horsepower: listing.horsepower
          })
        }
      })
      
      const deduplicatedListings = Array.from(uniqueListings.values())
      
      console.log(`[useSellerListings] Fetched ${deduplicatedListings.length} unique listings for seller ${sellerId}`)
      
      return deduplicatedListings
    },
    enabled: !!sellerId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache - listings don't change frequently
    gcTime: 30 * 60 * 1000, // Keep for 30 minutes in garbage collection
    retry: 2, // Retry twice on failure
  })
}