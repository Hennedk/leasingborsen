import { useEffect, useCallback, useRef } from 'react'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const isInitialLoad = useRef(true)
  const isUpdatingUrl = useRef(false)
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
    // Skip if we're in the middle of updating the URL ourselves
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false
      return
    }
    
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
    
    // Mark initial load as complete
    isInitialLoad.current = false
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

  // Sync filter state changes back to URL (after initial load)
  useEffect(() => {
    if (isInitialLoad.current) return
    
    // Set flag to prevent circular updates
    isUpdatingUrl.current = true
    
    const params = new URLSearchParams(searchParams)
    
    // Handle make parameter
    if (makes.length > 0) {
      params.set('make', makes[0]) // Use first make for now
    } else {
      params.delete('make')
    }
    
    // Handle model parameter  
    if (models.length > 0) {
      params.set('model', models[0]) // Use first model for now
    } else {
      params.delete('model')
    }
    
    // Handle array-based filters with proper removal
    if (body_type && body_type.length > 0) {
      params.set('body_type', body_type.join(','))
    } else {
      params.delete('body_type')
    }
    
    if (fuel_type && fuel_type.length > 0) {
      params.set('fuel_type', fuel_type.join(','))
    } else {
      params.delete('fuel_type')
    }
    
    if (transmission && transmission.length > 0) {
      params.set('transmission', transmission.join(','))
    } else {
      params.delete('transmission')
    }
    
    // Handle numeric filters with proper removal
    if (price_min !== null && price_min !== undefined) {
      params.set('price_min', price_min.toString())
    } else {
      params.delete('price_min')
    }
    
    if (price_max !== null && price_max !== undefined) {
      params.set('price_max', price_max.toString())
    } else {
      params.delete('price_max')
    }
    
    if (seats_min !== null && seats_min !== undefined) {
      params.set('seats_min', seats_min.toString())
    } else {
      params.delete('seats_min')
    }
    
    if (seats_max !== null && seats_max !== undefined) {
      params.set('seats_max', seats_max.toString())
    } else {
      params.delete('seats_max')
    }
    
    // Handle sort order
    if (sortOrder !== '') {
      params.set('sort', sortOrder)
    } else {
      params.delete('sort')
    }
    
    // Always update URL to reflect current state
    setSearchParams(params, { replace: true })
  }, [
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
    searchParams,
    setSearchParams
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