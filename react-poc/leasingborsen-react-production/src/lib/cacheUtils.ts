import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Utility functions for cache management
 */

export const cacheUtils = {
  /**
   * Invalidate all reference data cache
   */
  invalidateReferenceData: async (queryClient: QueryClient) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.referenceDataAll() })
    await queryClient.invalidateQueries({ queryKey: queryKeys.models() })
    await queryClient.invalidateQueries({ queryKey: queryKeys.makes() })
    await queryClient.invalidateQueries({ queryKey: queryKeys.bodyTypes() })
    await queryClient.invalidateQueries({ queryKey: queryKeys.fuelTypes() })
    await queryClient.invalidateQueries({ queryKey: queryKeys.transmissions() })
  },

  /**
   * Force refetch all reference data
   */
  refetchReferenceData: async (queryClient: QueryClient) => {
    await queryClient.refetchQueries({ queryKey: queryKeys.referenceDataAll() })
    await queryClient.refetchQueries({ queryKey: queryKeys.models() })
    await queryClient.refetchQueries({ queryKey: queryKeys.makes() })
  },

  /**
   * Clear all cache data
   */
  clearAllCache: (queryClient: QueryClient) => {
    queryClient.clear()
  },

  /**
   * Check if reference data is cached
   */
  isReferenceDataCached: (queryClient: QueryClient) => {
    const referenceData = queryClient.getQueryData(queryKeys.referenceDataAll())
    const models = queryClient.getQueryData(queryKeys.models())
    return {
      referenceData: !!referenceData,
      models: !!models,
      hasCachedData: !!(referenceData || models)
    }
  }
}