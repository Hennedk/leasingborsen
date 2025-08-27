import { useEffect, useCallback, useRef } from 'react'
import { useNavigate, getRouteApi } from '@tanstack/react-router'
import { useFilterStore } from '@/stores/consolidatedFilterStore'
import type { SortOrder } from '@/types'

const listingsRoute = getRouteApi('/listings')

// Type for search parameters returned by the listings route
type ListingsSearchParams = {
  page?: number
  limit?: number
  make?: string
  model?: string
  makes?: string[]
  models?: string[]
  body_type?: string
  fuel_type?: string
  transmission?: string
  price_min?: number
  price_max?: number
  seats_min?: number
  seats_max?: number
  horsepower_min?: number
  horsepower_max?: number
  sort?: SortOrder
  view?: 'grid' | 'list'
  q?: string
  showFilters?: string
} | Record<string, never> // Allow empty object for fallback

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
  const navigate = useNavigate({ from: '/listings' })
  // Try to get search params, fallback to empty object if not on listings route
  let searchParams: ListingsSearchParams = {}
  try {
    searchParams = listingsRoute.useSearch()
  } catch {
    // Not on listings route, use empty search params
    searchParams = {}
  }
  
  const isInitialLoad = useRef(true)
  const isUpdatingUrl = useRef(false)
  const isUpdatingFilters = useRef(false) // New flag to track filter updates
  
  // Fix for React error #185 - track URL sync state
  const hasAppliedUrlFilters = useRef(false)
  const isHydrating = useRef(true)
  const urlSnapshot = useRef<URLSearchParams | null>(null)
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
    setSortOrder,
    resetFilters
  } = useFilterStore()

  // Parse array parameters from URL
  const parseArrayParam = useCallback((param: string | string[] | undefined | null): string[] => {
    if (!param) return []
    if (Array.isArray(param)) return param
    return String(param).split(',').filter(Boolean)
  }, [])

  // Parse numeric parameter from URL
  const parseNumericParam = useCallback((param: string | number | undefined): number | null => {
    if (param === undefined || param === null) return null
    const parsed = typeof param === 'number' ? param : parseInt(String(param))
    return isNaN(parsed) ? null : parsed
  }, [])

  // Store filter change context in sessionStorage for scroll restoration hook
  const setFilterChangeContext = useCallback((isFilterChange: boolean, source?: string) => {
    try {
      const context = {
        isFilterChange,
        timestamp: Date.now(),
        source: source || 'unknown',
        pathname: window.location.pathname // Track which page triggered the change
      }
      sessionStorage.setItem('leasingborsen-filter-context', JSON.stringify(context))
      console.log('[FilterContext] Set filter change context:', context)
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Initialize filters from URL params (URL → Filters, one-time only)
  useEffect(() => {
    // Skip if already applied URL filters
    if (hasAppliedUrlFilters.current) return
    
    // Skip if updating URL ourselves
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false
      return
    }
    
    const urlMake = searchParams.make
    const urlModel = searchParams.model
    const urlBodyType = searchParams.body_type
    const urlFuelType = searchParams.fuel_type
    const urlTransmission = searchParams.transmission
    const urlPriceMin = searchParams.price_min
    const urlPriceMax = searchParams.price_max
    const urlSeatsMin = searchParams.seats_min
    const urlSeatsMax = searchParams.seats_max
    const urlSort = searchParams.sort

    // Check if there are any URL parameters that indicate a fresh search
    const hasUrlFilters = urlMake || urlModel || urlBodyType || urlFuelType || 
                         urlTransmission || urlPriceMin || urlPriceMax || 
                         urlSeatsMin || urlSeatsMax || urlSort

    if (hasUrlFilters) {
      // This is URL-driven filter change, not user interaction
      setFilterChangeContext(false, 'url-sync-complete')
      
      // Take snapshot of URL - create URLSearchParams from searchParams object
      urlSnapshot.current = new URLSearchParams()
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlSnapshot.current?.set(key, String(value))
        }
      })
      
      // Apply URL parameters synchronously to override existing state
      // Handle single make parameter
      if (urlMake) {
        setFilter('makes', [urlMake])
      }

      // Handle single model parameter
      if (urlModel) {
        setFilter('models', [urlModel])
      }
      
      // Handle array-based filters
      const urlBodyTypeArray = parseArrayParam(urlBodyType)
      if (urlBodyTypeArray.length > 0) {
        setFilter('body_type', urlBodyTypeArray)
      }

      const urlFuelTypeArray = parseArrayParam(urlFuelType)
      if (urlFuelTypeArray.length > 0) {
        setFilter('fuel_type', urlFuelTypeArray)
      }

      const urlTransmissionArray = parseArrayParam(urlTransmission)
      if (urlTransmissionArray.length > 0) {
        setFilter('transmission', urlTransmissionArray)
      }

      // Handle numeric parameters
      const parsedPriceMin = parseNumericParam(urlPriceMin)
      if (parsedPriceMin !== null) {
        setFilter('price_min', parsedPriceMin)
      }

      const parsedPriceMax = parseNumericParam(urlPriceMax)
      if (parsedPriceMax !== null) {
        setFilter('price_max', parsedPriceMax)
      }

      const parsedSeatsMin = parseNumericParam(urlSeatsMin)
      if (parsedSeatsMin !== null) {
        setFilter('seats_min', parsedSeatsMin)
      }

      const parsedSeatsMax = parseNumericParam(urlSeatsMax)
      if (parsedSeatsMax !== null) {
        setFilter('seats_max', parsedSeatsMax)
      }

      // Handle sort order
      if (urlSort) {
        setSortOrder(urlSort as SortOrder)
      }
      
      // Mark as applied to prevent re-run
      hasAppliedUrlFilters.current = true
    }
    
    // Mark hydration complete
    isHydrating.current = false
    
    // Mark initial load as complete
    isInitialLoad.current = false
  }, [searchParams, setFilter, setSortOrder, resetFilters, parseArrayParam, parseNumericParam, setFilterChangeContext]) // ← Only depend on searchParams and functions, not filter values

  // Sync filter state changes back to URL (after initial load)
  useEffect(() => {
    // Skip during hydration
    if (isHydrating.current) return
    
    // Skip if we just applied URL filters
    if (hasAppliedUrlFilters.current && isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    
    if (isInitialLoad.current) return
    
    // This is a filter change triggered by user interaction
    isUpdatingFilters.current = true
    setFilterChangeContext(true, 'user-filter-change')
    
    // Set flag to prevent circular updates
    isUpdatingUrl.current = true
    
    // Create new search object
    const newSearch: Partial<ListingsSearchParams> = { ...searchParams }
    
    // Handle make parameter
    if (makes.length > 0) {
      newSearch.make = makes[0] // Use first make for now
    } else {
      delete newSearch.make
    }
    
    // Handle model parameter  
    if (models.length > 0) {
      newSearch.model = models[0] // Use first model for now
    } else {
      delete newSearch.model
    }
    
    // Handle array-based filters with proper removal
    if (body_type && body_type.length > 0) {
      newSearch.body_type = body_type.join(',')
    } else {
      delete newSearch.body_type
    }
    
    if (fuel_type && fuel_type.length > 0) {
      newSearch.fuel_type = fuel_type.join(',')
    } else {
      delete newSearch.fuel_type
    }
    
    if (transmission && transmission.length > 0) {
      newSearch.transmission = transmission.join(',')
    } else {
      delete newSearch.transmission
    }
    
    // Handle numeric filters with proper removal
    if (price_min !== null && price_min !== undefined) {
      newSearch.price_min = price_min
    } else {
      delete newSearch.price_min
    }
    
    if (price_max !== null && price_max !== undefined) {
      newSearch.price_max = price_max
    } else {
      delete newSearch.price_max
    }
    
    if (seats_min !== null && seats_min !== undefined) {
      newSearch.seats_min = seats_min
    } else {
      delete newSearch.seats_min
    }
    
    if (seats_max !== null && seats_max !== undefined) {
      newSearch.seats_max = seats_max
    } else {
      delete newSearch.seats_max
    }
    
    // Handle sort order
    if (sortOrder !== 'lease_score_desc') {
      newSearch.sort = sortOrder
    } else {
      delete newSearch.sort
    }
    
    // Always update URL to reflect current state using TanStack Router navigation
    navigate({ 
      search: newSearch,
      replace: true 
    })
    
    // Reset filter update flag after navigation
    setTimeout(() => {
      isUpdatingFilters.current = false
    }, 0)
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
    navigate,
    setFilterChangeContext
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
    sortOrder,
    isUpdatingFilters: isUpdatingFilters.current
  }
}