import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { errorMessages } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'
// Type imports for Edge Function interfaces

/**
 * useAdminOperations - Centralized admin operations using Edge Functions
 * 
 * Replaces direct Supabase calls with secure Edge Function calls that use service role
 * Maintains existing interfaces for seamless integration with current components
 * Follows established patterns from existing mutation hooks
 */

// Types matching Edge Function interfaces
interface CreateListingParams {
  listingData: {
    seller_id: string
    make_id: string
    model_id: string
    variant?: string
    body_type_id?: string
    fuel_type_id?: string
    transmission_id?: string
    year?: number
    mileage?: number
    horsepower?: number
    engine_displacement?: number
    doors?: number
    seats?: number
    co2_emissions?: number
    wltp_range?: number
    color?: string
    exterior_color?: string
    interior_color?: string
    drivetrain?: string
    acceleration?: number
    max_speed?: number
    description?: string
    features?: string[]
    images?: string[]
    retail_price?: number
    // Additional fields following existing CarListing type
    owner_type?: string
    first_registration?: string
    last_service?: string
    next_service?: string
    warranty_type?: string
    warranty_end?: string
    leasing_company?: string
    financing_options?: string[]
    delivery_time?: string
    location?: string
    contact_person?: string
    availability?: string
    condition?: string
    service_history?: string
    modifications?: string
    damage_history?: string
    previous_owners?: number
    registration_number?: string
    vin?: string
    inspection_date?: string
    insurance_group?: string
    eco_label?: string
    noise_level?: number
    euro_norm?: string
    particle_filter?: boolean
    adblue?: boolean
    start_stop?: boolean
    cruise_control?: boolean
    air_conditioning?: boolean
    gps_navigation?: boolean
    parking_sensors?: boolean
    backup_camera?: boolean
    bluetooth?: boolean
    usb_ports?: number
    charging_ports?: string[]
    roof_type?: string
    window_tint?: boolean
    alloy_wheels?: boolean
    tire_size?: string
    spare_tire?: boolean
    floor_mats?: boolean
    cargo_cover?: boolean
    roof_rack?: boolean
    towing_capacity?: number
    payload_capacity?: number
    trunk_capacity?: number
    fuel_tank_capacity?: number
    battery_capacity?: number
    charging_time?: string
    consumption_combined?: number
    consumption_city?: number
    consumption_highway?: number
    electric_range?: number
    top_speed_electric?: number
    recovery_brake?: boolean
    heat_pump?: boolean
    preheating?: boolean
    solar_roof?: boolean
  }
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
    delivery_date?: string
    offer_valid_until?: string
    description?: string
    special_conditions?: string
    insurance_included?: boolean
    maintenance_included?: boolean
    roadside_assistance?: boolean
    replacement_car?: boolean
    early_termination_fee?: number
    excess_mileage_fee?: number
    damage_fee_limit?: number
  }>
}

interface UpdateListingParams {
  listingId: string
  listingData: Partial<CreateListingParams['listingData']>
  offers?: CreateListingParams['offers']
}

interface DeleteListingParams {
  listingId: string
}

interface AdminOperationResponse {
  success: boolean
  listingId?: string
  error?: string
  validationErrors?: string[]
}

export const useAdminOperations = () => {
  const queryClient = useQueryClient()
  const { getAccessToken, isAdminAuthenticated } = useAuth()

  // Create listing mutation
  const createListingMutation = useMutation({
    mutationFn: async ({ listingData, offers }: CreateListingParams): Promise<AdminOperationResponse> => {
      // Check authentication first
      if (!isAdminAuthenticated) {
        throw new Error('Du skal være logget ind som administrator for at udføre denne handling')
      }

      const accessToken = getAccessToken()
      if (!accessToken) {
        throw new Error('Manglende adgangstoken - log venligst ind igen')
      }

      console.log('🔄 Creating listing via Edge Function:', {
        seller_id: listingData.seller_id,
        make_id: listingData.make_id,
        model_id: listingData.model_id,
        offers_count: offers?.length || 0
      })

      // Use direct fetch with user's access token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      console.log('🔄 Calling Edge Function with user authentication')

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-listing-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`, // Use user's access token
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          operation: 'create',
          listingData,
          offers
        })
      })
      
      const responseText = await response.text()
      console.log('📥 Raw Edge Function response:', { 
        status: response.status, 
        statusText: response.statusText,
        responseText 
      })
      
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse Edge Function response:', parseError)
        throw new Error(`Edge Function returned invalid JSON: ${responseText}`)
      }
      
      if (!response.ok) {
        const errorMsg = data?.error || `HTTP ${response.status}: ${response.statusText}`
        const validationErrors = data?.validationErrors
        const debugInfo = data?.debug
        
        // Log detailed debug info
        console.error('Edge Function error details:', { 
          status: response.status,
          errorMsg, 
          validationErrors,
          debugInfo,
          fullResponse: data
        })
        
        if (validationErrors && validationErrors.length > 0) {
          console.error('Validation errors:', validationErrors)
          // Show validation errors as individual toasts
          validationErrors.forEach((error: string) => toast.error(error))
          throw new Error(validationErrors.join(', '))
        }
        
        throw new Error(errorMsg)
      }

      if (!data?.success) {
        const errorMsg = data?.error || errorMessages.createError
        const validationErrors = data?.validationErrors
        const debugInfo = data?.debug
        
        // Log detailed debug info
        if (debugInfo) {
          console.error('Edge Function debug info:', debugInfo)
        }
        
        if (validationErrors && validationErrors.length > 0) {
          console.error('Validation errors:', validationErrors)
          // Show validation errors as individual toasts
          validationErrors.forEach((error: string) => toast.error(error))
          throw new Error(validationErrors.join(', '))
        }
        
        console.error('Edge Function error details:', { errorMsg, debugInfo })
        throw new Error(errorMsg)
      }

      console.log('✅ Listing created successfully:', data.listingId)
      return data
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.listingsAll() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminListings() })
      queryClient.invalidateQueries({ queryKey: queryKeys.listingDetail(data.listingId!) })
      
      toast.success('Annonce oprettet')
    },
    onError: (error: Error) => {
      console.error('Create listing error:', error)
      toast.error(error.message || errorMessages.createError)
    }
  })

  // Update listing mutation
  const updateListingMutation = useMutation({
    mutationFn: async ({ listingId, listingData, offers }: UpdateListingParams): Promise<AdminOperationResponse> => {
      console.log('🔄 Updating listing via Edge Function:', { 
        listingId,
        updates: Object.keys(listingData),
        offers_count: offers?.length || 0
      })

      const { data, error } = await supabase.functions.invoke('admin-listing-operations', {
        body: { 
          operation: 'update', 
          listingId, 
          listingData, 
          offers 
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

      console.log('✅ Listing updated successfully:', listingId)
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.listingsAll() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminListings() })
      queryClient.invalidateQueries({ queryKey: queryKeys.listingDetail(variables.listingId) })
      
      toast.success('Annonce opdateret')
    },
    onError: (error: Error) => {
      console.error('Update listing error:', error)
      toast.error(error.message || errorMessages.updateError)
    }
  })

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: async ({ listingId }: DeleteListingParams): Promise<AdminOperationResponse> => {
      console.log('🔄 Deleting listing via Edge Function:', listingId)

      const { data, error } = await supabase.functions.invoke('admin-listing-operations', {
        body: { 
          operation: 'delete', 
          listingId 
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

      console.log('✅ Listing deleted successfully:', listingId)
      return data
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.listingsAll() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminListings() })
      queryClient.removeQueries({ queryKey: queryKeys.listingDetail(variables.listingId) })
      
      toast.success('Annonce slettet')
    },
    onError: (error: Error) => {
      console.error('Delete listing error:', error)
      toast.error(error.message || errorMessages.deleteError)
    }
  })

  // Return interface matching existing patterns
  return {
    // Mutation functions
    createListing: createListingMutation.mutateAsync,
    updateListing: updateListingMutation.mutateAsync,
    deleteListing: deleteListingMutation.mutateAsync,
    
    // Loading states
    isCreating: createListingMutation.isPending,
    isUpdating: updateListingMutation.isPending,
    isDeleting: deleteListingMutation.isPending,
    isLoading: createListingMutation.isPending || updateListingMutation.isPending || deleteListingMutation.isPending,
    
    // Error states
    createError: createListingMutation.error,
    updateError: updateListingMutation.error,
    deleteError: deleteListingMutation.error,
    
    // Utility functions
    reset: () => {
      createListingMutation.reset()
      updateListingMutation.reset()
      deleteListingMutation.reset()
    },
    
    // Maintain compatibility with existing useCreateListingWithOffers interface
    mutateAsync: createListingMutation.mutateAsync,
    isPending: createListingMutation.isPending,
    error: createListingMutation.error
  }
}

// Individual hooks for backward compatibility with existing code
export const useCreateListingWithOffers = () => {
  const { createListing, isCreating, createError } = useAdminOperations()
  
  return {
    mutateAsync: createListing,
    isPending: isCreating,
    error: createError,
    mutate: (params: CreateListingParams) => createListing(params).catch(() => {}) // Silent error handling for fire-and-forget
  }
}

export const useUpdateListingWithOffers = () => {
  const { updateListing, isUpdating, updateError } = useAdminOperations()
  
  return {
    mutateAsync: updateListing,
    isPending: isUpdating,
    error: updateError,
    mutate: (params: UpdateListingParams) => updateListing(params).catch(() => {}) // Silent error handling for fire-and-forget
  }
}

export const useDeleteListing = () => {
  const { deleteListing, isDeleting, deleteError } = useAdminOperations()
  
  return {
    mutateAsync: deleteListing,
    isPending: isDeleting,
    error: deleteError,
    mutate: (params: DeleteListingParams) => deleteListing(params).catch(() => {}) // Silent error handling for fire-and-forget
  }
}