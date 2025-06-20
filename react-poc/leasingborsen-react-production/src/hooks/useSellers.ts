import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Seller {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  address?: string | null
  country?: string | null
  logo_url?: string | null
  created_at?: string // Made optional in case DB doesn't have this column
  updated_at?: string | null // Made optional since DB doesn't have this column
  // Import-related fields
  total_listings?: number
  last_import_date?: string
  batch_config?: any
}

export const useSellers = () => {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async (): Promise<Seller[]> => {
      try {
        // Get sellers with aggregated import data
        const { data: sellersData, error: sellersError } = await supabase
          .from('sellers')
          .select('*')
          .order('name')

        if (sellersError) {
          console.error('Error fetching sellers:', sellersError)
          throw new Error('Der opstod en fejl ved hentning af sælgere')
        }

        if (!sellersData || sellersData.length === 0) {
          return []
        }

        // Get listings count for each seller
        const sellerIds = sellersData.map(s => s.id)
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('seller_id')
          .in('seller_id', sellerIds)

        if (listingsError) {
          console.error('Error fetching listings count:', listingsError)
        }

        // Get last import dates from batch_imports table
        const { data: batchData, error: batchError } = await supabase
          .from('batch_imports')
          .select('seller_id, created_at')
          .in('seller_id', sellerIds)
          .order('created_at', { ascending: false })

        if (batchError) {
          console.error('Error fetching batch imports:', batchError)
        }

        // Aggregate data
        const listingsCount = listingsData?.reduce((acc, listing) => {
          acc[listing.seller_id] = (acc[listing.seller_id] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        const lastImportDates = batchData?.reduce((acc, batch) => {
          if (!acc[batch.seller_id]) {
            acc[batch.seller_id] = batch.created_at
          }
          return acc
        }, {} as Record<string, string>) || {}

        // Combine seller data with import information
        const enrichedSellers: Seller[] = sellersData.map(seller => ({
          ...seller,
          total_listings: listingsCount[seller.id] || 0,
          last_import_date: lastImportDates[seller.id] || undefined,
          batch_config: null // TODO: Add batch config if needed
        }))

        return enrichedSellers
      } catch (error) {
        console.error('Error in useSellers:', error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useSeller = (sellerId: string) => {
  return useQuery({
    queryKey: ['seller', sellerId],
    queryFn: async (): Promise<Seller | null> => {
      if (!sellerId) return null

      try {
        // Get seller data
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', sellerId)
          .single()

        if (sellerError) {
          console.error('Error fetching seller:', sellerError)
          throw new Error('Der opstod en fejl ved hentning af sælger')
        }

        if (!sellerData) return null

        // Get listings count for this seller
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('seller_id')
          .eq('seller_id', sellerId)

        if (listingsError) {
          console.error('Error fetching listings count:', listingsError)
        }

        // Get last import date from batch_imports table
        const { data: batchData, error: batchError } = await supabase
          .from('batch_imports')
          .select('created_at')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (batchError) {
          console.error('Error fetching batch imports:', batchError)
        }

        // Combine seller data with import information
        const enrichedSeller: Seller = {
          ...sellerData,
          total_listings: listingsData?.length || 0,
          last_import_date: batchData?.[0]?.created_at || null,
          batch_config: null // TODO: Add batch config if needed
        }

        return enrichedSeller
      } catch (error) {
        console.error('Error in useSeller:', error)
        throw error
      }
    },
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}