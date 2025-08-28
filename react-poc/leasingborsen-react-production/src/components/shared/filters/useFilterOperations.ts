import { useCallback, useMemo } from 'react'
import { usePersistentFilterStore } from '@/stores/consolidatedFilterStore'
import type { Make, Model } from '@/types'

/**
 * useFilterOperations - Shared filter operations and calculations
 * 
 * Centralizes filter logic that's shared between mobile and desktop filter components
 */
export const useFilterOperations = () => {
  const filterStore = usePersistentFilterStore()
  
  const {
    makes,
    models,
    fuel_type,
    transmission,
    body_type,
    price_min,
    price_max,
    seats_min,
    seats_max,
    mileage_selected,
    toggleArrayFilter,
    resetFilters,
    setFilter
  } = filterStore

  // Helper function to get models for a specific make
  const getModelsForMake = useCallback((makeName: string, referenceData: any) => {
    if (!referenceData?.makes || !referenceData?.models) return []
    const make = referenceData.makes.find((m: Make) => m.name === makeName)
    if (!make) return []
    return referenceData.models.filter((model: Model) => model.make_id === make.id)
  }, [])

  // Enhanced toggle functions with model cleanup
  const toggleMake = useCallback((makeName: string, referenceData: any) => {
    toggleArrayFilter('makes', makeName)
    // Clear models when removing a make
    if (makes.includes(makeName)) {
      const modelsToRemove = getModelsForMake(makeName, referenceData)
      modelsToRemove.forEach((model: Model) => {
        if (models.includes(model.name)) {
          toggleArrayFilter('models', model.name)
        }
      })
    }
  }, [makes, models, toggleArrayFilter, getModelsForMake])

  const toggleModel = useCallback((modelName: string) => {
    toggleArrayFilter('models', modelName)
  }, [toggleArrayFilter])

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    return [
      makes.length > 0 ? makes : null,
      models.length > 0 ? models : null, 
      body_type.length > 0 ? body_type : null, 
      fuel_type.length > 0 ? fuel_type : null, 
      transmission.length > 0 ? transmission : null, 
      price_min, 
      price_max, 
      seats_min, 
      seats_max,
      mileage_selected && mileage_selected !== 15000 ? mileage_selected : null
    ].filter(value => value !== null && value !== undefined).length
  }, [makes.length, models.length, body_type.length, fuel_type.length, transmission.length, price_min, price_max, seats_min, seats_max, mileage_selected])

  // Handle filter changes for numeric fields
  const handleFilterChange = useCallback((key: string, value: string | number) => {
    const isNumericField = ['price_min', 'price_max', 'seats_min', 'seats_max'].includes(key)
    const isMileageField = key === 'mileage_selected'
    
    if (isMileageField) {
      setFilter(key as any, value)
    } else if (isNumericField && value !== 'all' && value !== '') {
      const numericValue = parseInt(value as string)
      setFilter(key as any, numericValue)
    } else {
      if (isNumericField) {
        setFilter(key as any, null)
      }
    }
  }, [setFilter])

  // Array filter toggle helper
  const handleArrayFilterToggle = useCallback((key: string, value: string) => {
    toggleArrayFilter(key as any, value)
  }, [toggleArrayFilter])

  // Reset all filters
  const handleResetAllFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  return {
    // Current filter values
    selectedMakes: makes,
    selectedModels: models,
    fuelTypes: fuel_type,
    transmissions: transmission,
    bodyTypes: body_type,
    priceMin: price_min,
    priceMax: price_max,
    seatsMin: seats_min,
    seatsMax: seats_max,
    mileageSelected: mileage_selected || 15000,
    
    // Calculated values
    activeFiltersCount,
    
    // Helper functions
    getModelsForMake,
    
    // Operations
    toggleMake,
    toggleModel,
    handleFilterChange,
    handleArrayFilterToggle,
    handleResetAllFilters
  }
}