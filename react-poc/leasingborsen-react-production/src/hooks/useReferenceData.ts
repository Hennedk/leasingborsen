import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface Make {
  id: string
  name: string
}

interface Model {
  id: string
  name: string
  make_id: string
}

interface BodyType {
  name: string
}

interface ReferenceData {
  makes: Make[]
  models: Model[]
  bodyTypes: BodyType[]
}

export function useReferenceData() {
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: async (): Promise<ReferenceData> => {
      const [makesResult, modelsResult, bodyTypesResult] = await Promise.all([
        supabase.from('makes').select('*').order('name'),
        supabase.from('models').select('*').order('name'), 
        supabase.from('body_types').select('*').order('name')
      ])

      if (makesResult.error) throw makesResult.error
      if (modelsResult.error) throw modelsResult.error
      if (bodyTypesResult.error) throw bodyTypesResult.error

      return {
        makes: makesResult.data || [],
        models: modelsResult.data || [],
        bodyTypes: bodyTypesResult.data || []
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}