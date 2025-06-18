import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Seller } from './useSellers'

export interface CreateSellerData {
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  country?: string
  logo_url?: string
}

export interface UpdateSellerData extends Partial<CreateSellerData> {
  id: string
}

export const useCreateSeller = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSellerData): Promise<Seller> => {
      const { data: seller, error } = await supabase
        .from('sellers')
        .insert(data) // Let Supabase handle timestamps automatically
        .select()
        .single()

      if (error) {
        console.error('Error creating seller:', error)
        throw new Error('Der opstod en fejl ved oprettelse af sælger')
      }

      return seller
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      toast.success('Sælger blev oprettet succesfuldt')
    },
    onError: (error: Error) => {
      console.error('Failed to create seller:', error)
      toast.error(error.message || 'Kunne ikke oprette sælger')
    }
  })
}

export const useUpdateSeller = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSellerData): Promise<Seller> => {
      const { data: seller, error } = await supabase
        .from('sellers')
        .update(updates) // Let Supabase handle timestamps automatically
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating seller:', error)
        throw new Error('Der opstod en fejl ved opdatering af sælger')
      }

      return seller
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      queryClient.invalidateQueries({ queryKey: ['seller', data.id] })
      toast.success('Sælger blev opdateret succesfuldt')
    },
    onError: (error: Error) => {
      console.error('Failed to update seller:', error)
      toast.error(error.message || 'Kunne ikke opdatere sælger')
    }
  })
}

export const useDeleteSeller = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sellerId: string): Promise<void> => {
      // Check if seller has any listings
      const { data: listings, error: checkError } = await supabase
        .from('listings')
        .select('id')
        .eq('seller_id', sellerId)
        .limit(1)

      if (checkError) {
        console.error('Error checking seller listings:', checkError)
        throw new Error('Kunne ikke kontrollere sælgerens annoncer')
      }

      if (listings && listings.length > 0) {
        throw new Error('Kan ikke slette sælger med eksisterende annoncer')
      }

      // Delete the seller
      const { error } = await supabase
        .from('sellers')
        .delete()
        .eq('id', sellerId)

      if (error) {
        console.error('Error deleting seller:', error)
        throw new Error('Der opstod en fejl ved sletning af sælger')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      toast.success('Sælger blev slettet succesfuldt')
    },
    onError: (error: Error) => {
      console.error('Failed to delete seller:', error)
      toast.error(error.message || 'Kunne ikke slette sælger')
    }
  })
}

export const useBulkDeleteSellers = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sellerIds: string[]): Promise<void> => {
      // Check if any sellers have listings
      const { data: listings, error: checkError } = await supabase
        .from('listings')
        .select('seller_id')
        .in('seller_id', sellerIds)

      if (checkError) {
        console.error('Error checking seller listings:', checkError)
        throw new Error('Kunne ikke kontrollere sælgernes annoncer')
      }

      if (listings && listings.length > 0) {
        const sellersWithListings = [...new Set(listings.map(l => l.seller_id))]
        throw new Error(`Kan ikke slette ${sellersWithListings.length} sælger(e) med eksisterende annoncer`)
      }

      // Delete the sellers
      const { error } = await supabase
        .from('sellers')
        .delete()
        .in('id', sellerIds)

      if (error) {
        console.error('Error deleting sellers:', error)
        throw new Error('Der opstod en fejl ved sletning af sælgere')
      }
    },
    onSuccess: (_, sellerIds) => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      toast.success(`${sellerIds.length} sælger(e) blev slettet succesfuldt`)
    },
    onError: (error: Error) => {
      console.error('Failed to delete sellers:', error)
      toast.error(error.message || 'Kunne ikke slette sælgere')
    }
  })
}