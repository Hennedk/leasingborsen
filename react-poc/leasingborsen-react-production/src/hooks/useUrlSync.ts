import { useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFilterStore } from '@/stores/filterStore'
import type { SortOrder } from '@/types'

/**
 * Custom hook for URL synchronization with filter state
 * Extracted from Listings.tsx to improve maintainability and reduce component complexity
 * 
 * Handles:
 * - Reading URL parameters on mount
 * - Syncing filter state with URL
 * - Managing complex array-based filters
 * - Sort order synchronization
 */
export const useUrlSync = () => {
  const [searchParams] = useSearchParams()
  const {
    makes = [],
    models = [],
    body_type,
    fuel_type,
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max,
    sortOrder,
    setFilter,
    setSortOrder
  } = useFilterStore()

  // Parse array parameters from URL
  const parseArrayParam = useCallback((param: string | null): string[] => {
    if (!param) return []
    return param.split(',').filter(Boolean)
  }, [])

  // Parse numeric parameter from URL
  const parseNumericParam = useCallback((param: string | null): number | null => {
    if (!param) return null
    const parsed = parseInt(param)
    return isNaN(parsed) ? null : parsed
  }, [])

  // Check if arrays are different (for optimization)
  const arraysAreDifferent = useCallback((a: string[], b: string[]): boolean => {
    return JSON.stringify(a.sort()) !== JSON.stringify(b.sort())
  }, [])

  // Initialize filters from URL params
  useEffect(() => {
    const urlMake = searchParams.get('make')
    const urlModel = searchParams.get('model')
    const urlBodyType = searchParams.get('body_type')
    const urlFuelType = searchParams.get('fuel_type')
    const urlTransmission = searchParams.get('transmission')
    const urlPriceMin = searchParams.get('price_min')
    const urlPriceMax = searchParams.get('price_max')
    const urlSeatsMin = searchParams.get('seats_min')
    const urlSeatsMax = searchParams.get('seats_max')
    const urlSort = searchParams.get('sort')

    // Handle single make parameter
    if (urlMake && !makes.includes(urlMake)) {
      setFilter('makes', [urlMake])
    }

    // Handle single model parameter
    if (urlModel && !models.includes(urlModel)) {
      setFilter('models', [urlModel])
    }
    
    // Handle array-based filters with proper comparison
    const urlBodyTypeArray = parseArrayParam(urlBodyType)
    if (urlBodyTypeArray.length > 0 && arraysAreDifferent(urlBodyTypeArray, body_type || [])) {
      setFilter('body_type', urlBodyTypeArray)
    }

    const urlFuelTypeArray = parseArrayParam(urlFuelType)
    if (urlFuelTypeArray.length > 0 && arraysAreDifferent(urlFuelTypeArray, fuel_type || [])) {
      setFilter('fuel_type', urlFuelTypeArray)
    }

    const urlTransmissionArray = parseArrayParam(urlTransmission)
    if (urlTransmissionArray.length > 0 && arraysAreDifferent(urlTransmissionArray, transmission || [])) {
      setFilter('transmission', urlTransmissionArray)
    }
    
    // Handle numeric filters
    const parsedPriceMin = parseNumericParam(urlPriceMin)
    if (parsedPriceMin !== null && parsedPriceMin !== price_min) {
      setFilter('price_min', parsedPriceMin)
    }

    const parsedPriceMax = parseNumericParam(urlPriceMax)
    if (parsedPriceMax !== null && parsedPriceMax !== price_max) {
      setFilter('price_max', parsedPriceMax)
    }

    const parsedSeatsMin = parseNumericParam(urlSeatsMin)
    if (parsedSeatsMin !== null && parsedSeatsMin !== seats_min) {
      setFilter('seats_min', parsedSeatsMin)
    }

    const parsedSeatsMax = parseNumericParam(urlSeatsMax)
    if (parsedSeatsMax !== null && parsedSeatsMax !== seats_max) {
      setFilter('seats_max', parsedSeatsMax)
    }

    // Handle sort order
    if (urlSort && urlSort !== sortOrder) {
      setSortOrder(urlSort as SortOrder)
    }
  }, [
    searchParams,
    makes,
    models,
    body_type,
    fuel_type,
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max,
    sortOrder,
    setFilter,
    setSortOrder,
    parseArrayParam,
    parseNumericParam,
    arraysAreDifferent
  ])

  return {
    // Return current filter state for convenience
    currentFilters: {
      makes,
      models,
      body_type,
      fuel_type,
      transmission,
      price_min,
      price_max,
      seats_min,
      seats_max
    },
    sortOrder
  }
}