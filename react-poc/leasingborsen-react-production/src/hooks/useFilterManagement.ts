import { useCallback } from 'react'
import { usePersistentFilterStore } from '@/stores/consolidatedFilterStore'
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
      mileage: () => setFilter('mileage_selected', null),
      makes: () => setFilter('makes', []),
      models: () => setFilter('models', []),
      body_type: () => setFilter('body_type', []),
      fuel_type: () => setFilter('fuel_type', []),
      transmission: () => setFilter('transmission', [])
    }

    // Handle prefixed keys (make:Toyota, fuel_type:Electric, etc.)
    if (key.includes(':')) {
      const [prefix, value] = key.split(':')
      
      // Map singular prefix to plural filter key to match store property names
      const prefixToFilterKey: Record<string, keyof Filters> = {
        'make': 'makes',
        'model': 'models',
        'fuel_type': 'fuel_type',
        'body_type': 'body_type',
        'transmission': 'transmission'
      }
      
      const filterKey = prefixToFilterKey[prefix] as keyof Filters
      if (!filterKey) return // Invalid prefix
      
      // Get current array from currentFilters and remove the specific value
      const currentArray = (currentFilters as any)[filterKey] as string[]
      
      if (Array.isArray(currentArray)) {
        const updatedArray = currentArray.filter(item => item !== value)
        console.log(`🗑️ Removing filter: ${prefix}:${value} from ${filterKey}`, { 
          before: currentArray, 
          after: updatedArray 
        })
        setFilter(filterKey, updatedArray)
        return
      } else {
        console.warn(`❌ Filter removal failed: ${filterKey} is not an array in currentFilters`, {
          filterKey,
          currentArray,
          currentFilters
        })
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