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
  
  console.log(`[useSellerListings] Hook called with:`, {
    sellerId,
    sellerIdType: typeof sellerId,
    limit,
    isValidUUID: sellerId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId) : false
  })
  
  return useQuery({
    queryKey: ['seller-listings', sellerId, limit],
    queryFn: async (): Promise<DealerListing[]> => {
      if (!sellerId) {
        console.log(`[useSellerListings] No sellerId provided, returning empty array`)
        return []
      }
      
      // Fetch only the fields AI needs (reduced payload)
      const { data, error } = await supabase
        .from('full_listing_view')
        .select('id, make, model, variant, horsepower')
        .eq('seller_id', sellerId)
        .order('make, model, variant')
        .limit(limit)
      
      if (error) {
        console.error(`[useSellerListings] ❌ Error fetching seller listings for seller ${sellerId}:`, {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Failed to load dealer listings: ${error.message}`)
      }
      
      // Deduplicate by id (full_listing_view can have duplicates due to multiple pricing options)
      const uniqueListings = new Map<string, DealerListing>()
      data?.forEach(listing => {
        if (listing.id && !uniqueListings.has(listing.id)) {
          uniqueListings.set(listing.id, {
            listing_id: listing.id,
            make: listing.make || '',
            model: listing.model || '',
            variant: listing.variant || '',
            horsepower: listing.horsepower
          })
        }
      })
      
      const deduplicatedListings = Array.from(uniqueListings.values())
      
      console.log(`[useSellerListings] 📊 Database query result:`, {
        sellerId,
        rawDataLength: data?.length || 0,
        uniqueListingsCount: deduplicatedListings.length,
        sampleRawData: data?.slice(0, 2) || [],
        queryUsed: 'full_listing_view with seller_id eq filter'
      })
      
      if (deduplicatedListings.length === 0) {
        console.warn(`[useSellerListings] ⚠️  No listings found for seller ${sellerId}`)
        console.warn(`[useSellerListings] 🔍 Debug info:`, {
          sellerIdType: typeof sellerId,
          sellerIdLength: sellerId?.length,
          isValidUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId || ''),
          queryTable: 'full_listing_view',
          queryFilter: `seller_id = '${sellerId}'`
        })
      } else {
        console.log(`[useSellerListings] ✅ Sample listings for seller ${sellerId}:`, 
          deduplicatedListings.slice(0, 3).map(l => `${l.make} ${l.model} ${l.variant} (${l.horsepower} HP)`))
      }
      
      return deduplicatedListings
    },
    enabled: !!sellerId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache - listings don't change frequently
    gcTime: 30 * 60 * 1000, // Keep for 30 minutes in garbage collection
    retry: 2, // Retry twice on failure
  })
}