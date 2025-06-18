import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryInvalidation } from '@/lib/queryKeys'

/**
 * General data management mutations
 * Handles cache invalidation and data refresh operations
 */

/**
 * Mutation for refreshing data manually
 */
export function useRefreshData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: { 
      includeListings?: boolean
      includeReferenceData?: boolean 
    } = {}) => {
      const { includeListings = true, includeReferenceData = false } = options

      if (includeListings) {
        await queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      }
      
      if (includeReferenceData) {
        await queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllReferenceData() })
      }

      return { success: true }
    },
    onSuccess: (_, options) => {
      console.log('Data refreshed successfully', options)
    },
    onError: (error) => {
      console.error('Failed to refresh data:', error)
    }
  })
}