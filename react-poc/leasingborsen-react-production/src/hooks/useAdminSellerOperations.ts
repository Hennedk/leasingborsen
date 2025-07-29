import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { errorMessages } from '@/lib/utils'

/**
 * useAdminSellerOperations - Centralized admin seller operations using Edge Functions
 * 
 * Replaces direct Supabase calls with secure Edge Function calls that use service role
 * Maintains existing interfaces for seamless integration with current components
 */

// Types matching Edge Function interfaces
interface SellerPDFUrl {
  name: string
  url: string
}

interface CreateSellerParams {
  sellerData: {
    name: string
    email?: string
    phone?: string
    company?: string
    address?: string
    country?: string
    logo_url?: string
    pdf_url?: string
    pdf_urls?: SellerPDFUrl[]
    make_id?: string
  }
}

interface UpdateSellerParams {
  sellerId: string
  sellerData: Partial<CreateSellerParams['sellerData']>
}

interface DeleteSellerParams {
  sellerId: string
}

interface BulkDeleteSellersParams {
  sellerIds: string[]
}

interface AdminSellerOperationResponse {
  success: boolean
  seller?: any
  sellers?: {
    deleted: string[]
    failed: string[]
  }
  sellerId?: string
  error?: string
  validationErrors?: string[]
}

export const useAdminSellerOperations = () => {
  const queryClient = useQueryClient()

  // Create seller mutation
  const createSellerMutation = useMutation({
    mutationFn: async ({ sellerData }: CreateSellerParams): Promise<AdminSellerOperationResponse> => {
      console.log('🔄 Creating seller via Edge Function:', { 
        name: sellerData.name,
        email: sellerData.email,
        company: sellerData.company
      })

      const { data, error } = await supabase.functions.invoke('admin-seller-operations', {
        body: { 
          operation: 'create', 
          sellerData 
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || errorMessages.createError)
      }

      if (!data?.success) {
        const errorMsg = data?.error || errorMessages.createError
        const validationErrors = data?.validationErrors
        
        if (validationErrors && validationErrors.length > 0) {
          // Show validation errors as individual toasts
          validationErrors.forEach((error: string) => toast.error(error))
          throw new Error(validationErrors.join(', '))
        }
        
        throw new Error(errorMsg)
      }

      console.log('✅ Seller created successfully:', data.sellerId)
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      queryClient.invalidateQueries({ queryKey: ['seller', data.sellerId] })
      
      toast.success('Sælger oprettet')
    },
    onError: (error: Error) => {
      console.error('Create seller error:', error)
      toast.error(error.message || errorMessages.createError)
    }
  })

  // Update seller mutation
  const updateSellerMutation = useMutation({
    mutationFn: async ({ sellerId, sellerData }: UpdateSellerParams): Promise<AdminSellerOperationResponse> => {
      console.log('🔄 Updating seller via Edge Function:', { 
        sellerId,
        updates: Object.keys(sellerData)
      })
      console.log('📊 Full sellerData being sent:', sellerData)
      
      const requestBody = { 
        operation: 'update', 
        sellerId, 
        sellerData 
      }
      console.log('📤 Complete request body:', requestBody)

      const { data, error } = await supabase.functions.invoke('admin-seller-operations', {
        body: requestBody
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || errorMessages.updateError)
      }

      if (!data?.success) {
        const errorMsg = data?.error || errorMessages.updateError
        const validationErrors = data?.validationErrors
        
        if (validationErrors && validationErrors.length > 0) {
          // Show validation errors as individual toasts
          validationErrors.forEach((error: string) => toast.error(error))
          throw new Error(validationErrors.join(', '))
        }
        
        throw new Error(errorMsg)
      }

      console.log('✅ Seller updated successfully:', sellerId)
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      queryClient.invalidateQueries({ queryKey: ['seller', variables.sellerId] })
      
      toast.success('Sælger opdateret')
    },
    onError: (error: Error) => {
      console.error('Update seller error:', error)
      toast.error(error.message || errorMessages.updateError)
    }
  })

  // Delete seller mutation
  const deleteSellerMutation = useMutation({
    mutationFn: async ({ sellerId }: DeleteSellerParams): Promise<AdminSellerOperationResponse> => {
      console.log('🔄 Deleting seller via Edge Function:', sellerId)

      const { data, error } = await supabase.functions.invoke('admin-seller-operations', {
        body: { 
          operation: 'delete', 
          sellerId 
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || errorMessages.deleteError)
      }

      if (!data?.success) {
        const errorMsg = data?.error || errorMessages.deleteError
        throw new Error(errorMsg)
      }

      console.log('✅ Seller deleted successfully:', sellerId)
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      queryClient.removeQueries({ queryKey: ['seller', variables.sellerId] })
      
      toast.success('Sælger slettet')
    },
    onError: (error: Error) => {
      console.error('Delete seller error:', error)
      toast.error(error.message || errorMessages.deleteError)
    }
  })

  // Bulk delete sellers mutation
  const bulkDeleteSellersMutation = useMutation({
    mutationFn: async ({ sellerIds }: BulkDeleteSellersParams): Promise<AdminSellerOperationResponse> => {
      console.log('🔄 Bulk deleting sellers via Edge Function:', sellerIds.length)

      const { data, error } = await supabase.functions.invoke('admin-seller-operations', {
        body: { 
          operation: 'bulkDelete', 
          sellerIds 
        }
      })

      if (error) {
        console.error('Edge Function error:', error)
        throw new Error(error.message || errorMessages.deleteError)
      }

      if (!data?.success) {
        const errorMsg = data?.error || errorMessages.deleteError
        throw new Error(errorMsg)
      }

      console.log('✅ Bulk delete completed:', data.sellers)
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      
      const { deleted, failed } = data.sellers || { deleted: [], failed: [] }
      
      if (deleted.length > 0) {
        toast.success(`${deleted.length} sælger(e) slettet`)
      }
      
      if (failed.length > 0) {
        toast.error(`${failed.length} sælger(e) kunne ikke slettes (har annoncer)`)
      }
    },
    onError: (error: Error) => {
      console.error('Bulk delete sellers error:', error)
      toast.error(error.message || errorMessages.deleteError)
    }
  })

  // Return interface matching existing patterns
  return {
    // Mutation functions
    createSeller: createSellerMutation.mutateAsync,
    updateSeller: updateSellerMutation.mutateAsync,
    deleteSeller: deleteSellerMutation.mutateAsync,
    bulkDeleteSellers: bulkDeleteSellersMutation.mutateAsync,
    
    // Loading states
    isCreating: createSellerMutation.isPending,
    isUpdating: updateSellerMutation.isPending,
    isDeleting: deleteSellerMutation.isPending,
    isBulkDeleting: bulkDeleteSellersMutation.isPending,
    isLoading: createSellerMutation.isPending || updateSellerMutation.isPending || 
               deleteSellerMutation.isPending || bulkDeleteSellersMutation.isPending,
    
    // Error states
    createError: createSellerMutation.error,
    updateError: updateSellerMutation.error,
    deleteError: deleteSellerMutation.error,
    bulkDeleteError: bulkDeleteSellersMutation.error,
    
    // Utility functions
    reset: () => {
      createSellerMutation.reset()
      updateSellerMutation.reset()
      deleteSellerMutation.reset()
      bulkDeleteSellersMutation.reset()
    }
  }
}

// Individual hooks for backward compatibility with existing code
export const useCreateSeller = () => {
  const { createSeller, isCreating, createError } = useAdminSellerOperations()
  
  return {
    mutateAsync: async (sellerData: CreateSellerParams['sellerData']) => {
      return createSeller({ sellerData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (sellerData: CreateSellerParams['sellerData']) => {
      createSeller({ sellerData }).catch(() => {})
    }
  }
}

export const useUpdateSeller = () => {
  const { updateSeller, isUpdating, updateError } = useAdminSellerOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...sellerData } = params
      return updateSeller({ sellerId: id, sellerData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...sellerData } = params
      updateSeller({ sellerId: id, sellerData }).catch(() => {})
    }
  }
}

export const useDeleteSeller = () => {
  const { deleteSeller, isDeleting, deleteError } = useAdminSellerOperations()
  
  return {
    mutateAsync: async (sellerId: string) => {
      return deleteSeller({ sellerId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (sellerId: string) => {
      deleteSeller({ sellerId }).catch(() => {})
    }
  }
}

export const useBulkDeleteSellers = () => {
  const { bulkDeleteSellers, isBulkDeleting, bulkDeleteError } = useAdminSellerOperations()
  
  return {
    mutateAsync: bulkDeleteSellers,
    isPending: isBulkDeleting,
    error: bulkDeleteError,
    mutate: (params: BulkDeleteSellersParams) => bulkDeleteSellers(params).catch(() => {}) // Silent error handling for fire-and-forget
  }
}