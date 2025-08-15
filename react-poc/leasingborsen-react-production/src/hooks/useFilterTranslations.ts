import { useMemo } from 'react'
import { filterTranslations, type FilterOption } from '@/lib/translations/filterTranslations'

/**
 * Custom hook for filter translations with memoization
 * 
 * Provides optimized access to filter translation functions and cached results.
 * All translation functions are memoized for performance.
 * 
 * Usage:
 * ```tsx
 * const { translateBodyType, getBodyTypeOptions } = useFilterTranslations()
 * const label = translateBodyType(car.body_type)
 * const options = getBodyTypeOptions()
 * ```
 */
export const useFilterTranslations = () => {
  // Memoize translation functions to avoid recreating on every render
  const translationFunctions = useMemo(() => ({
    /**
     * Translate body type database value to Danish display label
     */
    translateBodyType: (databaseValue: string): string => 
      filterTranslations.getBodyTypeLabel(databaseValue),

    /**
     * Translate fuel type database value to Danish display label
     */
    translateFuelType: (databaseValue: string): string => 
      filterTranslations.getFuelTypeLabel(databaseValue),

    /**
     * Translate transmission database value to Danish display label
     */
    translateTransmission: (databaseValue: string): string => 
      filterTranslations.getTransmissionLabel(databaseValue),

    /**
     * Get database value from Danish display label
     */
    getDatabaseValue: (
      category: 'bodyTypes' | 'fuelTypes' | 'transmissions',
      displayLabel: string
    ): string => filterTranslations.getDatabaseValue(category, displayLabel),

    /**
     * Batch translate multiple values for performance
     */
    batchTranslate: (
      category: 'bodyTypes' | 'fuelTypes' | 'transmissions',
      values: string[]
    ) => filterTranslations.batchTranslate(category, values)
  }), [])

  // Memoize filter options to avoid regenerating on every render
  const filterOptions = useMemo(() => ({
    /**
     * Get all body type options for filter dropdowns
     * Returns: { value: string, label: string, name: string }[]
     */
    getBodyTypeOptions: (): FilterOption[] => 
      filterTranslations.getAllBodyTypeOptions(),

    /**
     * Get all fuel type options for filter dropdowns
     * Returns: { value: string, label: string, name: string }[]
     */
    getFuelTypeOptions: (): FilterOption[] => 
      filterTranslations.getAllFuelTypeOptions(),

    /**
     * Get simplified fuel type options for filters (4 main categories)
     * Returns: { value: string, label: string, name: string }[]
     */
    getSimplifiedFuelTypeOptions: (): FilterOption[] => 
      filterTranslations.getSimplifiedFuelTypeOptions(),

    /**
     * Get all transmission options for filter dropdowns
     * Returns: { value: string, label: string, name: string }[]
     */
    getTransmissionOptions: (): FilterOption[] => 
      filterTranslations.getAllTransmissionOptions()
  }), [])

  // Memoize commonly needed combinations
  const combinedTranslations = useMemo(() => ({
    /**
     * Translate all filter fields for a car listing
     */
    translateCarFilters: (car: {
      body_type?: string
      fuel_type?: string  
      transmission?: string
    }) => ({
      bodyType: translationFunctions.translateBodyType(car.body_type || ''),
      fuelType: translationFunctions.translateFuelType(car.fuel_type || ''),
      transmission: translationFunctions.translateTransmission(car.transmission || '')
    }),

    /**
     * Get all filter options in one call
     */
    getAllFilterOptions: () => ({
      bodyTypes: filterOptions.getBodyTypeOptions(),
      fuelTypes: filterOptions.getFuelTypeOptions(),
      transmissions: filterOptions.getTransmissionOptions()
    })
  }), [translationFunctions, filterOptions])

  return {
    // Individual translation functions
    ...translationFunctions,
    
    // Filter option getters
    ...filterOptions,
    
    // Combined utilities
    ...combinedTranslations
  }
}

/**
 * Hook variant that only provides the translation functions (lighter weight)
 */
export const useFilterTranslationFunctions = () => {
  return useMemo(() => ({
    translateBodyType: filterTranslations.getBodyTypeLabel,
    translateFuelType: filterTranslations.getFuelTypeLabel,
    translateTransmission: filterTranslations.getTransmissionLabel
  }), [])
}

/**
 * Hook variant that only provides filter options (for filter components)
 */
export const useFilterOptions = () => {
  return useMemo(() => ({
    bodyTypeOptions: filterTranslations.getAllBodyTypeOptions(),
    fuelTypeOptions: filterTranslations.getAllFuelTypeOptions(),
    simplifiedFuelTypeOptions: filterTranslations.getSimplifiedFuelTypeOptions(), 
    transmissionOptions: filterTranslations.getAllTransmissionOptions()
  }), [])
}

/**
 * Type definitions for hook return values
 */
export type FilterTranslationHook = ReturnType<typeof useFilterTranslations>
export type FilterTranslationFunctions = ReturnType<typeof useFilterTranslationFunctions>
export type FilterOptionsHook = ReturnType<typeof useFilterOptions>