import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryKeys'
import type { AdminListing } from '@/types/admin'

interface BulkCalculationResult {
  success: boolean
  processed: number
  errors: number
  total: number
  message: string
  results: Array<{
    listing_id: string
    score?: number
    error?: string
    success: boolean
  }>
}

export const useBulkLeaseScoreCalculation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (selectedListings: AdminListing[]): Promise<BulkCalculationResult> => {
      const listingsWithRetailPrice = selectedListings.filter(listing => listing.retail_price)
      
      if (listingsWithRetailPrice.length === 0) {
        throw new Error('Ingen af de valgte annoncer har detailpris - score kan ikke beregnes')
      }

      // Call the batch calculation Edge Function with specific listing IDs
      const listingIds = listingsWithRetailPrice.map(listing => listing.listing_id).join(',')
      const { data, error } = await supabase.functions.invoke(
        `batch-calculate-lease-scores?ids=${listingIds}&force=true`,
        {
          method: 'GET',
        }
      )

      if (error) {
        console.error('Bulk calculation error:', error)
        throw new Error(error.message || 'Der opstod en fejl ved beregning af scores')
      }

      return data as BulkCalculationResult
    },

    onSuccess: (result) => {
      // Show success toast with details
      if (result.processed > 0) {
        toast.success(
          `Score beregnet for ${result.processed} af ${result.total} annoncer`,
          {
            description: result.errors > 0 
              ? `${result.errors} annoncer fejlede - se detaljer i konsollen`
              : 'Alle valgte annoncer er blevet opdateret'
          }
        )
      } else {
        toast.warning('Ingen scores blev beregnet', {
          description: 'Kontroller at annoncerne har detailpriser og prismuligheder'
        })
      }

      // Invalidate the admin listings query to refresh the data
      queryClient.invalidateQueries({ queryKey: queryKeys.admin })
      queryClient.invalidateQueries({ queryKey: queryKeys.listings })
      
      // Log detailed results for debugging
      if (result.errors > 0) {
        console.group('Bulk Score Calculation Results')
        result.results
          .filter(r => !r.success)
          .forEach(r => console.error(`Listing ${r.listing_id}:`, r.error))
        console.groupEnd()
      }
    },

    onError: (error) => {
      console.error('Bulk score calculation failed:', error)
      toast.error('Score beregning fejlede', {
        description: error instanceof Error ? error.message : 'Ukendt fejl opstod'
      })
    }
  })
}