import { useCallback, useMemo } from 'react'
import { usePersistentFilterStore } from '@/stores/consolidatedFilterStore'

/**
 * useFilterOperations - Centralized filter operations and calculations
 * 
 * Handles filter toggles, clearing, and active filter counting
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
    toggleArrayFilter,
    resetFilters,
    setFilter
  } = filterStore

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (makes.length > 0) count++
    if (models.length > 0) count++
    if (fuel_type.length > 0) count++
    if (transmission.length > 0) count++
    if (body_type.length > 0) count++
    if (price_min !== null) count++
    if (price_max !== null) count++
    if (seats_min !== null) count++
    if (seats_max !== null) count++
    return count
  }, [
    makes.length,
    models.length,
    fuel_type.length,
    transmission.length,
    body_type.length,
    price_min,
    price_max,
    seats_min,
    seats_max
  ])

  // Toggle array-based filters (fuel, transmission, body type)
  const handleArrayFilterToggle = useCallback((key: string, value: string) => {
    toggleArrayFilter(key as any, value)
  }, [toggleArrayFilter])

  // Handle single filter changes (price, seats)
  const handleFilterChange = useCallback((key: string, value: string | number) => {
    if (value === '' || value === 'all') {
      setFilter(key as any, null)
    } else {
      setFilter(key as any, value)
    }
  }, [setFilter])

  // Clear all filters
  const handleClearAll = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  // Convenience functions for specific filters
  const toggleMake = useCallback((makeName: string) => {
    toggleArrayFilter('makes', makeName)
  }, [toggleArrayFilter])

  const toggleModel = useCallback((modelName: string) => {
    toggleArrayFilter('models', modelName)
  }, [toggleArrayFilter])

  return {
    // Current filter values (with consistent naming)
    selectedMakes: makes,
    selectedModels: models,
    fuelTypes: fuel_type,
    transmissions: transmission,
    bodyTypes: body_type,
    priceMin: price_min,
    priceMax: price_max,
    seatsMin: seats_min,
    seatsMax: seats_max,
    // Calculated values
    activeFiltersCount,
    // Operations
    toggleMake,
    toggleModel,
    handleArrayFilterToggle,
    handleFilterChange,
    handleClearAll
  }
}