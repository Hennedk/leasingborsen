import { useCallback } from 'react'
import { usePersistentFilterStore } from '@/stores/persistentFilterStore'
import { useUrlSync } from '@/hooks/useUrlSync'
import type { Filters } from '@/types'

/**
 * Custom hook for managing filter operations
 * Extracts complex filter removal logic from components
 */
export const useFilterManagement = () => {
  const { setFilter } = usePersistentFilterStore()
  const { currentFilters } = useUrlSync()
  
  const handleRemoveFilter = useCallback((key: string) => {
    // Define filter removal actions as a lookup object
    const filterActions: Record<string, () => void> = {
      seats: () => {
        setFilter('seats_min', null)
        setFilter('seats_max', null)
      },
      price: () => {
        setFilter('price_min', null)
        setFilter('price_max', null)
      },
      makes: () => setFilter('makes', []),
      models: () => setFilter('models', []),
      body_type: () => setFilter('body_type', []),
      fuel_type: () => setFilter('fuel_type', []),
      transmission: () => setFilter('transmission', [])
    }

    // Handle prefixed keys (make:Toyota, fuel_type:Electric, etc.)
    if (key.includes(':')) {
      const [prefix, value] = key.split(':')
      const filterKey = prefix as keyof Filters
      
      // Get current array from currentFilters and remove the specific value
      const currentArray = (currentFilters as any)[filterKey] as string[]
      
      if (Array.isArray(currentArray)) {
        const updatedArray = currentArray.filter(item => item !== value)
        setFilter(filterKey, updatedArray)
        return
      }
    }

    // Handle direct filter removal
    const action = filterActions[key]
    if (action) {
      action()
    }
  }, [setFilter, currentFilters])

  return { handleRemoveFilter }
}