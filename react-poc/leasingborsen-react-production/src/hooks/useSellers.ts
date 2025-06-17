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
  created_at: string
  updated_at?: string
}

export const useSellers = () => {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async (): Promise<Seller[]> => {
      try {
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .order('name')

        if (error) {
          console.error('Error fetching sellers:', error)
          throw new Error('Der opstod en fejl ved hentning af sælgere')
        }

        return data || []
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
        const { data, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('id', sellerId)
          .single()

        if (error) {
          console.error('Error fetching seller:', error)
          throw new Error('Der opstod en fejl ved hentning af sælger')
        }

        return data
      } catch (error) {
        console.error('Error in useSeller:', error)
        throw error
      }
    },
    enabled: !!sellerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}