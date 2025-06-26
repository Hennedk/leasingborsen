import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'
import { toast } from 'sonner'
import { useReferenceData } from '@/hooks/useReferenceData'
import { cacheUtils } from '@/lib/cacheUtils'

interface BatchCarData {
  make: string
  model: string
  body_type: string
  fuel_type: string
  transmission: string
  variant?: string
  horsepower?: number
  seats?: number
  doors?: number
  colour?: string
  description?: string
  co2_emission?: number
  co2_tax_half_year?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  wltp?: number
  images?: string[]
  offers: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
}

interface BatchCreationResult {
  totalCars: number
  successfulCars: number
  failedCars: number
  createdListingIds: string[]
  errors: string[]
}

interface BatchCreationProgress {
  currentCar: number
  totalCars: number
  currentCarName: string
  isProcessing: boolean
}

/**
 * Hook for creating multiple car listings with the same seller
 * Processes cars one by one to provide progress feedback and error handling
 */
export const useBatchListingCreation = () => {
  const queryClient = useQueryClient()
  const { data: referenceData, refetch: refetchReferenceData } = useReferenceData()
  const [progress, setProgress] = useState<BatchCreationProgress>({
    currentCar: 0,
    totalCars: 0,
    currentCarName: '',
    isProcessing: false
  })

  /**
   * Helper function to refresh reference data when encountering "not found" errors
   */
  const refreshReferenceDataAndRetry = useCallback(async () => {
    try {
      console.log('🔄 Refreshing reference data cache due to missing models...')
      
      // Invalidate and refetch reference data
      await cacheUtils.invalidateReferenceData(queryClient)
      await refetchReferenceData()
      
      console.log('✅ Reference data refreshed successfully')
      
      toast.success('Reference data opdateret - prøv igen', {
        description: 'Cache er blevet opdateret med de nyeste modeller'
      })
      
      return true
    } catch (error) {
      console.error('❌ Error refreshing reference data:', error)
      toast.error('Fejl ved opdatering af reference data')
      return false
    }
  }, [queryClient, refetchReferenceData])

  /**
   * Check if an error is related to missing reference data
   */
  const isReferenceDataError = (error: string): boolean => {
    const referenceErrors = [
      'not found in database',
      'not found for',
      'Available models:',
      'Available:'
    ]
    return referenceErrors.some(errorPattern => error.includes(errorPattern))
  }

  const createSingleListing = async (sellerId: string, carData: BatchCarData): Promise<string> => {
    if (!referenceData) {
      throw new Error('Reference data ikke indlæst')
    }

    // Find reference data IDs
    const makeId = referenceData.makes?.find(m => m.name === carData.make)?.id
    
    // First find make, then filter models by that make
    const modelId = referenceData.models?.find(m => 
      m.name === carData.model && m.make_id === makeId
    )?.id
    
    const bodyTypeId = referenceData.bodyTypes?.find(bt => bt.name === carData.body_type)?.id
    const fuelTypeId = referenceData.fuelTypes?.find(ft => ft.name === carData.fuel_type)?.id
    const transmissionId = referenceData.transmissions?.find(t => t.name === carData.transmission)?.id
    
    // Note: Color support is not currently implemented in the active database schema
    // The system uses lease_pricing table, not listing_offers which would have color support
    if (carData.colour) {
      console.warn(`Color "${carData.colour}" specified but color support is not implemented in current schema`)
    }

    // Enhanced error reporting
    if (!makeId) {
      throw new Error(`Make "${carData.make}" not found in database`)
    }
    if (!modelId) {
      const toyotaModels = referenceData.models?.filter(m => m.make_id === makeId).map(m => m.name) || []
      throw new Error(`Model "${carData.model}" not found for ${carData.make}. Available models: ${toyotaModels.join(', ')}`)
    }
    if (!bodyTypeId) {
      const availableBodyTypes = referenceData.bodyTypes?.map(bt => bt.name) || []
      throw new Error(`Body type "${carData.body_type}" not found. Available: ${availableBodyTypes.join(', ')}`)
    }
    if (!fuelTypeId) {
      const availableFuelTypes = referenceData.fuelTypes?.map(ft => ft.name) || []
      throw new Error(`Fuel type "${carData.fuel_type}" not found. Available: ${availableFuelTypes.join(', ')}`)
    }
    if (!transmissionId) {
      const availableTransmissions = referenceData.transmissions?.map(t => t.name) || []
      throw new Error(`Transmission "${carData.transmission}" not found. Available: ${availableTransmissions.join(', ')}`)
    }
    
    // Create the listing first - only include columns that exist in the listings table
    const listingData = {
      make_id: makeId,
      model_id: modelId,
      body_type_id: bodyTypeId,
      fuel_type_id: fuelTypeId,
      transmission_id: transmissionId,
      variant: carData.variant || null,
      horsepower: carData.horsepower || null,
      seats: carData.seats || null,
      doors: carData.doors || null,
      description: carData.description || null,
      co2_emission: carData.co2_emission || null,
      co2_tax_half_year: carData.co2_tax_half_year || null,
      consumption_l_100km: carData.consumption_l_100km || null,
      consumption_kwh_100km: carData.consumption_kwh_100km || null,
      wltp: carData.wltp || null,
      seller_id: sellerId
      // Note: colour and listing_status belong in listing_offers table, not listings table
    }

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingData)
      .select('id')
      .single()

    if (listingError) {
      throw new Error(`Fejl ved oprettelse af bil: ${listingError.message}`)
    }

    const listingId = listing.id

    // Create offers for this listing
    if (carData.offers && carData.offers.length > 0) {
      const offerInserts = carData.offers.map(offer => ({
        listing_id: listingId,
        monthly_price: Number(offer.monthly_price),
        first_payment: offer.first_payment ? Number(offer.first_payment) : 0, // Default to 0 if not provided
        period_months: offer.period_months ? Number(offer.period_months) : 36,
        mileage_per_year: offer.mileage_per_year ? Number(offer.mileage_per_year) : 15000
      }))

      const { error: offersError } = await supabase
        .from('lease_pricing')
        .insert(offerInserts)

      if (offersError) {
        // If offers fail, we should delete the listing to maintain consistency
        await supabase.from('listings').delete().eq('id', listingId)
        throw new Error(`Fejl ved oprettelse af tilbud: ${offersError.message}`)
      }
    }

    // Handle images if provided
    if (carData.images && carData.images.length > 0) {
      // For now, we'll store the first image as the main image
      // TODO: Implement proper image handling for multiple images
      const { error: imageError } = await supabase
        .from('listings')
        .update({ image: carData.images[0] })
        .eq('id', listingId)

      if (imageError) {
        console.warn(`Could not set image for listing ${listingId}:`, imageError)
        // Don't fail the entire creation for image issues
      }
    }

    return listingId
  }

  const batchCreateMutation = useMutation({
    mutationFn: async ({ sellerId, cars }: { sellerId: string; cars: BatchCarData[] }): Promise<BatchCreationResult> => {
      const result: BatchCreationResult = {
        totalCars: cars.length,
        successfulCars: 0,
        failedCars: 0,
        createdListingIds: [],
        errors: []
      }

      setProgress({
        currentCar: 0,
        totalCars: cars.length,
        currentCarName: '',
        isProcessing: true
      })

      for (let i = 0; i < cars.length; i++) {
        const car = cars[i]
        const carName = `${car.make} ${car.model} ${car.variant || ''}`.trim()
        
        setProgress(prev => ({
          ...prev,
          currentCar: i + 1,
          currentCarName: carName
        }))

        try {
          const listingId = await createSingleListing(sellerId, car)
          result.createdListingIds.push(listingId)
          result.successfulCars++
          
          // Small delay to prevent overwhelming the database
          if (i < cars.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        } catch (error) {
          result.failedCars++
          const errorMessage = error instanceof Error ? error.message : 'Ukendt fejl'
          result.errors.push(`${carName}: ${errorMessage}`)
          console.error(`Failed to create listing for ${carName}:`, error)
        }
      }

      setProgress(prev => ({ ...prev, isProcessing: false }))
      return result
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.listingsAll() })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminListings() })
      
      // Show success/error summary
      if (result.successfulCars === result.totalCars) {
        toast.success(`Alle ${result.successfulCars} biler oprettet succesfuldt!`)
      } else if (result.successfulCars > 0) {
        toast.warning(`${result.successfulCars} af ${result.totalCars} biler oprettet`, {
          description: `${result.failedCars} fejlede. Se detaljer for mere info.`
        })
      } else {
        toast.error('Ingen biler blev oprettet', {
          description: 'Alle forsøg fejlede. Tjek data og prøv igen.'
        })
      }
    },
    onError: (error) => {
      setProgress(prev => ({ ...prev, isProcessing: false }))
      toast.error('Batch oprettelse fejlede', {
        description: error instanceof Error ? error.message : 'Ukendt fejl'
      })
    }
  })

  const createBatchListings = useCallback(async (sellerId: string, cars: BatchCarData[]): Promise<BatchCreationResult> => {
    if (!sellerId || cars.length === 0) {
      throw new Error('Sælger ID og bil data er påkrævet')
    }

    return batchCreateMutation.mutateAsync({ sellerId, cars })
  }, [batchCreateMutation])

  const resetProgress = useCallback(() => {
    setProgress({
      currentCar: 0,
      totalCars: 0,
      currentCarName: '',
      isProcessing: false
    })
  }, [])

  return {
    createBatchListings,
    progress,
    resetProgress,
    refreshReferenceDataAndRetry,
    isReferenceDataError,
    isLoading: batchCreateMutation.isPending,
    error: batchCreateMutation.error
  }
}