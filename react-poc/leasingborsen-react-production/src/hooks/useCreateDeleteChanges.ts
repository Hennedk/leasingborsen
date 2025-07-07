import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface CreateDeleteChangesParams {
  sessionId: string
  listings: Array<{
    listing_id: string
    make: string
    model: string
    variant?: string
  }>
  reason: string
}

/**
 * Hook to create delete changes for unmapped listings
 * These changes will appear in the extraction review and can be applied
 * to soft-delete the listings
 */
export const useCreateDeleteChanges = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sessionId, listings, reason }: CreateDeleteChangesParams) => {
      // Create extraction_listing_changes records for each selected listing
      const changes = listings.map(listing => ({
        session_id: sessionId,
        existing_listing_id: listing.listing_id,
        change_type: 'delete',
        change_status: 'pending',
        confidence_score: 1.0,
        extracted_data: {}, // Empty for delete changes
        field_changes: null,
        change_summary: `Slet: ${listing.make} ${listing.model} ${listing.variant || ''}`.trim(),
        match_method: 'manual',
        match_details: {
          reason: reason,
          source: 'unmapped_listings'
        },
        review_notes: reason
      }))

      const { error } = await supabase
        .from('extraction_listing_changes')
        .insert(changes)

      if (error) {
        console.error('Supabase error details:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(error.message || 'Failed to create delete changes')
      }
      
      return changes // Return the input data since we don't need the inserted records
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['session-changes'] })
      queryClient.invalidateQueries({ queryKey: ['delete-changes'] })
      queryClient.invalidateQueries({ queryKey: ['unmapped-dealer-listings'] })
      
      toast.success(`${data.length} bil(er) markeret til sletning`, {
        description: 'Ændringerne kan nu gennemgås og anvendes'
      })
    },
    onError: (error) => {
      console.error('Error creating delete changes:', error)
      toast.error('Kunne ikke markere biler til sletning', {
        description: error instanceof Error ? error.message : 'Ukendt fejl'
      })
    }
  })
}