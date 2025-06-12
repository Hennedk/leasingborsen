import { useEffect, useRef } from 'react'
import { useFilterStore } from './filterStore'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'
import type { Filters, SortOrder } from '@/types'

/**
 * Custom hook that integrates filter persistence with the existing filter store
 * 
 * Features:
 * - Automatically saves filters when they change
 * - Restores last applied filters on mount
 * - Debounces save operations to avoid excessive localStorage writes
 */
export const usePersistentFilterStore = () => {
  const filterStore = useFilterStore()
  const { saveLastFilters, restoreLastFilters, hasStoredFilters } = useFilterPersistence()
  
  // Track if we've restored filters on initial load
  const hasRestoredRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get current filter state for persistence
  const getCurrentFilters = (): Partial<Filters> => {
    const {
      makes,
      models,
      body_type,
      fuel_type,
      transmission,
      price_min,
      price_max,
      seats_min,
      seats_max
    } = filterStore
    
    return {
      makes,
      models,
      body_type,
      fuel_type,
      transmission,
      price_min,
      price_max,
      seats_min,
      seats_max
    }
  }
  
  // Debounced save function to avoid excessive localStorage writes
  const debouncedSave = (filters: Partial<Filters>, sortOrder: SortOrder) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      // Only save if there are active filters or non-default sort order
      const hasActiveFilters = Object.values(filters).some(value => {
        if (Array.isArray(value)) return value.length > 0
        if (typeof value === 'string') return value !== ''
        return value !== null && value !== undefined
      })
      
      if (hasActiveFilters || sortOrder !== '') {
        console.log('💾 Saving filters to localStorage:', { filters, sortOrder })
        saveLastFilters(filters, sortOrder)
      }
    }, 1000) // 1 second delay
  }
  
  // Restore filters on initial mount only if no URL parameters are present
  useEffect(() => {
    if (!hasRestoredRef.current && hasStoredFilters()) {
      // Small delay to ensure URL sync completes first
      const timer = setTimeout(() => {
        // Check if there are any filter-related URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const hasUrlFilters = ['make', 'model', 'body_type', 'fuel_type', 'transmission', 'price_min', 'price_max', 'seats_min', 'seats_max', 'sort']
          .some(param => urlParams.has(param))
        
        // Only restore from localStorage if no URL filters are present
        if (!hasUrlFilters) {
          const restored = restoreLastFilters()
          
          if (restored) {
            const { filters, sortOrder } = restored
            
            console.log('🔄 Restoring saved filters:', { filters, sortOrder })
            
            // Apply restored filters to store
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                filterStore.setFilter(key as keyof Filters, value as any)
              }
            })
            
            // Apply restored sort order
            if (sortOrder) {
              filterStore.setSortOrder(sortOrder as SortOrder)
            }
          }
        } else {
          console.log('🔗 URL filters detected, skipping persistence restoration')
        }
        
        hasRestoredRef.current = true
      }, 100) // 100ms delay
      
      return () => clearTimeout(timer)
    }
  }, [hasStoredFilters, restoreLastFilters, filterStore])
  
  // Save filters whenever they change (with debouncing)
  useEffect(() => {
    if (hasRestoredRef.current) {
      const currentFilters = getCurrentFilters()
      debouncedSave(currentFilters, filterStore.sortOrder)
    }
  }, [
    filterStore.makes,
    filterStore.models,
    filterStore.body_type,
    filterStore.fuel_type,
    filterStore.transmission,
    filterStore.price_min,
    filterStore.price_max,
    filterStore.seats_min,
    filterStore.seats_max,
    filterStore.sortOrder
  ])
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])
  
  return {
    ...filterStore,
    hasStoredFilters: hasStoredFilters()
  }
}