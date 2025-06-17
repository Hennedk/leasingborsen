import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import type { ReferenceData } from '@/types'

export function useReferenceData() {
  return useQuery({
    queryKey: queryKeys.referenceDataAll(),
    queryFn: async (): Promise<ReferenceData> => {
      const [makesResult, modelsResult, bodyTypesResult, fuelTypesResult, transmissionsResult] = await Promise.all([
        supabase.from('makes').select('*').order('name'),
        supabase.from('models').select('*').order('name'), 
        supabase.from('body_types').select('*').order('name'),
        supabase.from('fuel_types').select('*').order('name'),
        supabase.from('transmissions').select('*').order('name')
      ])

      if (makesResult.error) throw makesResult.error
      if (modelsResult.error) throw modelsResult.error
      if (bodyTypesResult.error) throw bodyTypesResult.error
      if (fuelTypesResult.error) throw fuelTypesResult.error
      if (transmissionsResult.error) throw transmissionsResult.error

      return {
        makes: makesResult.data || [],
        models: modelsResult.data || [],
        bodyTypes: bodyTypesResult.data || [],
        fuelTypes: fuelTypesResult.data || [],
        transmissions: transmissionsResult.data || []
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour - reference data changes very rarely
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep reference data in cache longer
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: true, // Refetch when network reconnects
  })
}

// Individual reference data hooks for more granular caching
export function useMakes() {
  return useQuery({
    queryKey: queryKeys.makes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('makes')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

export function useModels(makeId?: string) {
  return useQuery({
    queryKey: queryKeys.models(makeId),
    queryFn: async () => {
      let query = supabase.from('models').select('*')
      
      if (makeId) {
        query = query.eq('make_id', makeId)
      }
      
      const { data, error } = await query.order('name')
      
      if (error) throw error
      return data || []
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: makeId ? !!makeId : true, // Only run if makeId is provided when filtering
  })
}