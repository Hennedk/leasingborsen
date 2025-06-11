import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ReferenceData } from '@/types'

export function useReferenceData() {
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: async (): Promise<ReferenceData> => {
      const [makesResult, modelsResult, bodyTypesResult, fuelTypesResult] = await Promise.all([
        supabase.from('makes').select('*').order('name'),
        supabase.from('models').select('*').order('name'), 
        supabase.from('body_types').select('*').order('name'),
        supabase.from('fuel_types').select('*').order('name')
      ])

      if (makesResult.error) throw makesResult.error
      if (modelsResult.error) throw modelsResult.error
      if (bodyTypesResult.error) throw bodyTypesResult.error
      if (fuelTypesResult.error) throw fuelTypesResult.error

      return {
        makes: makesResult.data || [],
        models: modelsResult.data || [],
        bodyTypes: bodyTypesResult.data || [],
        fuelTypes: fuelTypesResult.data || []
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}