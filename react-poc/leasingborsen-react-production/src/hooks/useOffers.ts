import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OfferFormData } from '@/lib/validations'

export interface Offer {
  id: string
  listing_id: string
  monthly_price: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  created_at: string
  updated_at: string
}

export const useOffers = (listingId: string) => {
  return useQuery({
    queryKey: ['offers', listingId],
    queryFn: async (): Promise<Offer[]> => {
      if (!listingId) return []

      try {
        console.log('🔍 Fetching offers for listing:', listingId)
        
        const { data, error } = await supabase
          .from('lease_pricing')
          .select('*')
          .eq('listing_id', listingId)
          .order('monthly_price')

        if (error) {
          console.error('Error fetching offers from lease_pricing:', error)
          throw new Error('Der opstod en fejl ved hentning af tilbud')
        }

        console.log('✅ Found offers from lease_pricing for', listingId, ':', data?.length || 0, 'offers')
        console.log('📊 Offer details:', data)
        return data || []
      } catch (error) {
        console.error('Error in useOffers:', error)
        throw error
      }
    },
    enabled: !!listingId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export const useCreateOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, offer }: { listingId: string; offer: OfferFormData }) => {
      try {
        console.log('🔄 Creating offer for listing:', listingId, 'with data:', offer)
        
        const { data, error } = await supabase
          .from('lease_pricing')
          .insert([{
            listing_id: listingId,
            monthly_price: Number(offer.monthly_price),
            first_payment: offer.first_payment ? Number(offer.first_payment) : null,
            period_months: offer.period_months ? Number(offer.period_months) : null,
            mileage_per_year: offer.mileage_per_year ? Number(offer.mileage_per_year) : null
          }])
          .select()
          .single()

        if (error) {
          console.error('Error creating offer:', error)
          throw new Error('Der opstod en fejl ved oprettelse af tilbud')
        }

        console.log('✅ Offer created successfully:', data)
        return data
      } catch (error) {
        console.error('Error in useCreateOffer:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      console.log('🔄 Invalidating queries for listing:', data.listing_id)
      // Invalidate and refetch offers for this listing
      queryClient.invalidateQueries({ queryKey: ['offers', data.listing_id] })
      
      // Also force refetch the specific query
      queryClient.refetchQueries({ queryKey: ['offers', data.listing_id] })
      
      // Update listings cache if it exists
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export const useUpdateOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ offerId, updates }: { offerId: string; updates: Partial<OfferFormData> }) => {
      try {
        const { data, error } = await supabase
          .from('lease_pricing')
          .update(updates)
          .eq('id', offerId)
          .select()
          .single()

        if (error) {
          console.error('Error updating offer:', error)
          throw new Error('Der opstod en fejl ved opdatering af tilbud')
        }

        return data
      } catch (error) {
        console.error('Error in useUpdateOffer:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch offers for this listing
      queryClient.invalidateQueries({ queryKey: ['offers', data.listing_id] })
      
      // Update listings cache if it exists
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export const useDeleteOffer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (offerId: string) => {
      try {
        // Get the offer first to know which listing to invalidate
        const { data: offer } = await supabase
          .from('lease_pricing')
          .select('listing_id')
          .eq('id', offerId)
          .single()

        const { error } = await supabase
          .from('lease_pricing')
          .delete()
          .eq('id', offerId)

        if (error) {
          console.error('Error deleting offer:', error)
          throw new Error('Der opstod en fejl ved sletning af tilbud')
        }

        return { deletedId: offerId, listingId: offer?.listing_id }
      } catch (error) {
        console.error('Error in useDeleteOffer:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      if (data.listingId) {
        // Invalidate and refetch offers for this listing
        queryClient.invalidateQueries({ queryKey: ['offers', data.listingId] })
        
        // Update listings cache if it exists
        queryClient.invalidateQueries({ queryKey: ['listings'] })
      }
    },
  })
}