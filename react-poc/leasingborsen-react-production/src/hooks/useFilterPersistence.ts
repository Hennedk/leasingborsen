import { useCallback } from 'react'
import type { Filters } from '@/types'

interface LastAppliedFilters {
  filters: Partial<Filters>
  sortOrder: string
  timestamp: number
}

const STORAGE_KEY = 'leasingborsen_last_filters'
const FILTER_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Simple hook for persisting the last applied filter combination
 * 
 * Features:
 * - Save last applied filters to localStorage
 * - Restore filters when user returns to the site
 * - Automatic expiry after 7 days
 */
export const useFilterPersistence = () => {
  
  // Save current filters as the last applied combination
  const saveLastFilters = useCallback((
    filters: Partial<Filters>, 
    sortOrder: string = ''
  ) => {
    try {
      const lastFilters: LastAppliedFilters = {
        filters,
        sortOrder,
        timestamp: Date.now()
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lastFilters))
    } catch (error) {
      console.error('Error saving last applied filters:', error)
    }
  }, [])

  // Restore last applied filters if they exist and haven't expired
  const restoreLastFilters = useCallback((): { filters: Partial<Filters>, sortOrder: string } | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      
      const lastFilters: LastAppliedFilters = JSON.parse(stored)
      
      // Check if filters have expired
      const now = Date.now()
      if (now - lastFilters.timestamp > FILTER_EXPIRY) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      
      return {
        filters: lastFilters.filters || {},
        sortOrder: lastFilters.sortOrder || ''
      }
    } catch (error) {
      console.error('Error restoring last applied filters:', error)
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  }, [])

  // Clear stored filters
  const clearLastFilters = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing last applied filters:', error)
    }
  }, [])

  // Check if there are stored filters available
  const hasStoredFilters = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return false
      
      const lastFilters: LastAppliedFilters = JSON.parse(stored)
      const now = Date.now()
      
      return now - lastFilters.timestamp <= FILTER_EXPIRY
    } catch (error) {
      return false
    }
  }, [])

  return {
    saveLastFilters,
    restoreLastFilters,
    clearLastFilters,
    hasStoredFilters
  }
}