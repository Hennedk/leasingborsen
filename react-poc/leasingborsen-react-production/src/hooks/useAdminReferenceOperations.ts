import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { errorMessages } from '@/lib/utils'

/**
 * useAdminReferenceOperations - Centralized admin reference data operations using Edge Functions
 * 
 * Replaces direct Supabase calls with secure Edge Function calls that use service role
 * Supports all reference tables: makes, models, body_types, fuel_types, transmissions, colours
 */

// Types matching Edge Function interfaces
const ALLOWED_TABLES = [
  'makes',
  'models', 
  'body_types',
  'fuel_types',
  'transmissions',
  'colours'
] as const

type AllowedTable = typeof ALLOWED_TABLES[number]

interface CreateReferenceParams {
  table: AllowedTable
  referenceData: {
    name: string
    make_id?: string // For models
    slug?: string
    [key: string]: any
  }
}

interface UpdateReferenceParams {
  table: AllowedTable
  referenceId: string
  referenceData: Partial<CreateReferenceParams['referenceData']>
}

interface DeleteReferenceParams {
  table: AllowedTable
  referenceId: string
}

interface BulkDeleteReferencesParams {
  table: AllowedTable
  referenceIds: string[]
}

interface AdminReferenceOperationResponse {
  success: boolean
  reference?: any
  references?: {
    deleted: string[]
    failed: string[]
  }
  referenceId?: string
  error?: string
  validationErrors?: string[]
}

export const useAdminReferenceOperations = () => {
  const queryClient = useQueryClient()

  // Create reference mutation
  const createReferenceMutation = useMutation({
    mutationFn: async ({ table, referenceData }: CreateReferenceParams): Promise<AdminReferenceOperationResponse> => {
      console.log('🔄 Creating reference via Edge Function:', { 
        table,
        name: referenceData.name
      })

      const { data, error } = await supabase.functions.invoke('admin-reference-operations', {
        body: { 
          operation: 'create', 
          table,
          referenceData 
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

      console.log('✅ Reference created successfully:', data.referenceId)
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [variables.table] })
      queryClient.invalidateQueries({ queryKey: [variables.table, data.referenceId] })
      
      toast.success('Element oprettet')
    },
    onError: (error: Error) => {
      console.error('Create reference error:', error)
      toast.error(error.message || errorMessages.createError)
    }
  })

  // Update reference mutation
  const updateReferenceMutation = useMutation({
    mutationFn: async ({ table, referenceId, referenceData }: UpdateReferenceParams): Promise<AdminReferenceOperationResponse> => {
      console.log('🔄 Updating reference via Edge Function:', { 
        table,
        referenceId,
        updates: Object.keys(referenceData)
      })

      const { data, error } = await supabase.functions.invoke('admin-reference-operations', {
        body: { 
          operation: 'update', 
          table,
          referenceId, 
          referenceData 
        }
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

      console.log('✅ Reference updated successfully:', referenceId)
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [variables.table] })
      queryClient.invalidateQueries({ queryKey: [variables.table, variables.referenceId] })
      
      toast.success('Element opdateret')
    },
    onError: (error: Error) => {
      console.error('Update reference error:', error)
      toast.error(error.message || errorMessages.updateError)
    }
  })

  // Delete reference mutation
  const deleteReferenceMutation = useMutation({
    mutationFn: async ({ table, referenceId }: DeleteReferenceParams): Promise<AdminReferenceOperationResponse> => {
      console.log('🔄 Deleting reference via Edge Function:', { table, referenceId })

      const { data, error } = await supabase.functions.invoke('admin-reference-operations', {
        body: { 
          operation: 'delete', 
          table,
          referenceId 
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

      console.log('✅ Reference deleted successfully:', referenceId)
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [variables.table] })
      queryClient.removeQueries({ queryKey: [variables.table, variables.referenceId] })
      
      toast.success('Element slettet')
    },
    onError: (error: Error) => {
      console.error('Delete reference error:', error)
      toast.error(error.message || errorMessages.deleteError)
    }
  })

  // Bulk delete references mutation
  const bulkDeleteReferencesMutation = useMutation({
    mutationFn: async ({ table, referenceIds }: BulkDeleteReferencesParams): Promise<AdminReferenceOperationResponse> => {
      console.log('🔄 Bulk deleting references via Edge Function:', { table, count: referenceIds.length })

      const { data, error } = await supabase.functions.invoke('admin-reference-operations', {
        body: { 
          operation: 'bulkDelete', 
          table,
          referenceIds 
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

      console.log('✅ Bulk delete completed:', data.references)
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: [variables.table] })
      
      const { deleted, failed } = data.references || { deleted: [], failed: [] }
      
      if (deleted.length > 0) {
        toast.success(`${deleted.length} element(er) slettet`)
      }
      
      if (failed.length > 0) {
        toast.error(`${failed.length} element(er) kunne ikke slettes (er i brug)`)
      }
    },
    onError: (error: Error) => {
      console.error('Bulk delete references error:', error)
      toast.error(error.message || errorMessages.deleteError)
    }
  })

  // Return interface matching existing patterns
  return {
    // Mutation functions
    createReference: createReferenceMutation.mutateAsync,
    updateReference: updateReferenceMutation.mutateAsync,
    deleteReference: deleteReferenceMutation.mutateAsync,
    bulkDeleteReferences: bulkDeleteReferencesMutation.mutateAsync,
    
    // Loading states
    isCreating: createReferenceMutation.isPending,
    isUpdating: updateReferenceMutation.isPending,
    isDeleting: deleteReferenceMutation.isPending,
    isBulkDeleting: bulkDeleteReferencesMutation.isPending,
    isLoading: createReferenceMutation.isPending || updateReferenceMutation.isPending || 
               deleteReferenceMutation.isPending || bulkDeleteReferencesMutation.isPending,
    
    // Error states
    createError: createReferenceMutation.error,
    updateError: updateReferenceMutation.error,
    deleteError: deleteReferenceMutation.error,
    bulkDeleteError: bulkDeleteReferencesMutation.error,
    
    // Utility functions
    reset: () => {
      createReferenceMutation.reset()
      updateReferenceMutation.reset()
      deleteReferenceMutation.reset()
      bulkDeleteReferencesMutation.reset()
    }
  }
}

// Individual hooks for backward compatibility with existing code

// Makes operations
export const useCreateMake = () => {
  const { createReference, isCreating, createError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (makeData: { name: string; slug?: string }) => {
      return createReference({ table: 'makes', referenceData: makeData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (makeData: { name: string; slug?: string }) => {
      createReference({ table: 'makes', referenceData: makeData }).catch(() => {})
    }
  }
}

export const useUpdateMake = () => {
  const { updateReference, isUpdating, updateError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      return updateReference({ table: 'makes', referenceId: id, referenceData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      updateReference({ table: 'makes', referenceId: id, referenceData }).catch(() => {})
    }
  }
}

export const useDeleteMake = () => {
  const { deleteReference, isDeleting, deleteError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (makeId: string) => {
      return deleteReference({ table: 'makes', referenceId: makeId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (makeId: string) => {
      deleteReference({ table: 'makes', referenceId: makeId }).catch(() => {})
    }
  }
}

// Models operations
export const useCreateModel = () => {
  const { createReference, isCreating, createError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (modelData: { name: string; make_id: string; slug?: string }) => {
      return createReference({ table: 'models', referenceData: modelData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (modelData: { name: string; make_id: string; slug?: string }) => {
      createReference({ table: 'models', referenceData: modelData }).catch(() => {})
    }
  }
}

export const useUpdateModel = () => {
  const { updateReference, isUpdating, updateError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      return updateReference({ table: 'models', referenceId: id, referenceData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      updateReference({ table: 'models', referenceId: id, referenceData }).catch(() => {})
    }
  }
}

export const useDeleteModel = () => {
  const { deleteReference, isDeleting, deleteError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (modelId: string) => {
      return deleteReference({ table: 'models', referenceId: modelId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (modelId: string) => {
      deleteReference({ table: 'models', referenceId: modelId }).catch(() => {})
    }
  }
}

// Body Types operations
export const useCreateBodyType = () => {
  const { createReference, isCreating, createError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (bodyTypeData: { name: string; slug?: string }) => {
      return createReference({ table: 'body_types', referenceData: bodyTypeData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (bodyTypeData: { name: string; slug?: string }) => {
      createReference({ table: 'body_types', referenceData: bodyTypeData }).catch(() => {})
    }
  }
}

export const useUpdateBodyType = () => {
  const { updateReference, isUpdating, updateError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      return updateReference({ table: 'body_types', referenceId: id, referenceData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      updateReference({ table: 'body_types', referenceId: id, referenceData }).catch(() => {})
    }
  }
}

export const useDeleteBodyType = () => {
  const { deleteReference, isDeleting, deleteError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (bodyTypeId: string) => {
      return deleteReference({ table: 'body_types', referenceId: bodyTypeId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (bodyTypeId: string) => {
      deleteReference({ table: 'body_types', referenceId: bodyTypeId }).catch(() => {})
    }
  }
}

// Fuel Types operations
export const useCreateFuelType = () => {
  const { createReference, isCreating, createError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (fuelTypeData: { name: string; slug?: string }) => {
      return createReference({ table: 'fuel_types', referenceData: fuelTypeData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (fuelTypeData: { name: string; slug?: string }) => {
      createReference({ table: 'fuel_types', referenceData: fuelTypeData }).catch(() => {})
    }
  }
}

export const useUpdateFuelType = () => {
  const { updateReference, isUpdating, updateError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      return updateReference({ table: 'fuel_types', referenceId: id, referenceData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      updateReference({ table: 'fuel_types', referenceId: id, referenceData }).catch(() => {})
    }
  }
}

export const useDeleteFuelType = () => {
  const { deleteReference, isDeleting, deleteError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (fuelTypeId: string) => {
      return deleteReference({ table: 'fuel_types', referenceId: fuelTypeId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (fuelTypeId: string) => {
      deleteReference({ table: 'fuel_types', referenceId: fuelTypeId }).catch(() => {})
    }
  }
}

// Transmissions operations
export const useCreateTransmission = () => {
  const { createReference, isCreating, createError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (transmissionData: { name: string; slug?: string }) => {
      return createReference({ table: 'transmissions', referenceData: transmissionData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (transmissionData: { name: string; slug?: string }) => {
      createReference({ table: 'transmissions', referenceData: transmissionData }).catch(() => {})
    }
  }
}

export const useUpdateTransmission = () => {
  const { updateReference, isUpdating, updateError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      return updateReference({ table: 'transmissions', referenceId: id, referenceData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      updateReference({ table: 'transmissions', referenceId: id, referenceData }).catch(() => {})
    }
  }
}

export const useDeleteTransmission = () => {
  const { deleteReference, isDeleting, deleteError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (transmissionId: string) => {
      return deleteReference({ table: 'transmissions', referenceId: transmissionId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (transmissionId: string) => {
      deleteReference({ table: 'transmissions', referenceId: transmissionId }).catch(() => {})
    }
  }
}

// Colours operations
export const useCreateColour = () => {
  const { createReference, isCreating, createError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (colourData: { name: string; slug?: string }) => {
      return createReference({ table: 'colours', referenceData: colourData })
    },
    isPending: isCreating,
    error: createError,
    mutate: (colourData: { name: string; slug?: string }) => {
      createReference({ table: 'colours', referenceData: colourData }).catch(() => {})
    }
  }
}

export const useUpdateColour = () => {
  const { updateReference, isUpdating, updateError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      return updateReference({ table: 'colours', referenceId: id, referenceData })
    },
    isPending: isUpdating,
    error: updateError,
    mutate: (params: { id: string; [key: string]: any }) => {
      const { id, ...referenceData } = params
      updateReference({ table: 'colours', referenceId: id, referenceData }).catch(() => {})
    }
  }
}

export const useDeleteColour = () => {
  const { deleteReference, isDeleting, deleteError } = useAdminReferenceOperations()
  
  return {
    mutateAsync: async (colourId: string) => {
      return deleteReference({ table: 'colours', referenceId: colourId })
    },
    isPending: isDeleting,
    error: deleteError,
    mutate: (colourId: string) => {
      deleteReference({ table: 'colours', referenceId: colourId }).catch(() => {})
    }
  }
}