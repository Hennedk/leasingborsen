import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Listing interaction mutation hooks
 * 
 * Handles user interactions with listings like favoriting, bookmarking, etc.
 * Uses optimistic update patterns for better UX
 */

/**
 * Optimistic update for listing favorite/bookmark status
 * (Example of optimistic updates pattern)
 */
export function useToggleListingFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, isFavorite }: { listingId: string; isFavorite: boolean }) => {
      // Simulate API call for favorite status
      await new Promise(resolve => setTimeout(resolve, 300))
      return { listingId, isFavorite }
    },
    onMutate: async ({ listingId, isFavorite }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: queryKeys.listingDetail(listingId) })

      // Snapshot the previous value
      const previousListing = queryClient.getQueryData(queryKeys.listingDetail(listingId))

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.listingDetail(listingId), (old: any) => ({
        ...old,
        data: { ...old?.data, is_favorite: isFavorite }
      }))

      // Return a context object with the snapshotted value
      return { previousListing }
    },
    onError: (_, { listingId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousListing) {
        queryClient.setQueryData(queryKeys.listingDetail(listingId), context.previousListing)
      }
    },
    onSettled: (_, __, { listingId }) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: queryKeys.listingDetail(listingId) })
    },
  })
}

/**
 * Track listing view/impression
 */
export function useTrackListingView() {
  return useMutation({
    mutationFn: async ({ listingId, userId }: { listingId: string; userId?: string }) => {
      // Simulate tracking API call
      await new Promise(resolve => setTimeout(resolve, 100))
      return { listingId, userId, timestamp: new Date().toISOString() }
    },
    onError: (error) => {
      // Silent fail for tracking - don't disrupt user experience
      console.warn('Failed to track listing view:', error)
    }
  })
}

/**
 * Report listing for inappropriate content
 */
export function useReportListing() {
  return useMutation({
    mutationFn: async ({ 
      listingId, 
      reason, 
      description 
    }: { 
      listingId: string
      reason: string
      description?: string
    }) => {
      // Simulate report API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return { listingId, reason, description, reportedAt: new Date().toISOString() }
    },
    onSuccess: () => {
      console.log('Listing reported successfully')
    },
    onError: (error) => {
      console.error('Failed to report listing:', error)
    }
  })
}