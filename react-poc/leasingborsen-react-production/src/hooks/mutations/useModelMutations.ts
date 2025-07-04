import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { toast } from 'sonner'

interface CreateModelInput {
  name: string
  make_id: string
}

/**
 * Hook for creating a new model in the reference data
 */
export function useCreateModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, make_id }: CreateModelInput) => {
      const { data, error } = await supabase
        .from('models')
        .insert({
          name,
          make_id
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate reference data queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllReferenceData() })
      queryClient.invalidateQueries({ queryKey: queryKeys.models() })
      
      toast.success(`Model "${data.name}" blev tilføjet`)
    },
    onError: (error: any) => {
      console.error('Error creating model:', error)
      toast.error(error.message || 'Kunne ikke tilføje model')
    }
  })
}

/**
 * Hook for checking if a model exists
 */
export function useCheckModelExists() {
  return useMutation({
    mutationFn: async ({ name, make_id }: { name: string; make_id: string }) => {
      const { data, error } = await supabase
        .from('models')
        .select('id, name')
        .eq('name', name)
        .eq('make_id', make_id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error
      }

      return { exists: !!data, model: data }
    }
  })
}