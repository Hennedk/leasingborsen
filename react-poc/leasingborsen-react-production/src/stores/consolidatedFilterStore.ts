import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Filters, FilterChip, SortOrder, CarSelection } from '@/types'

/* Claude Change Summary:
 * Consolidated filterStore.ts (274 lines) + persistentFilterStore.ts (143 lines) 
 * into single well-structured store with integrated persistence.
 * Eliminated confusion about which store to use and simplified the API.
 * Related to: CODEBASE_IMPROVEMENTS_ADMIN.md Critical Issue #4
 */

interface FilterState extends Filters {
  resultCount: number
  isLoading: boolean
  sortOrder: SortOrder
  filterOrder: string[]
  selectedCars: CarSelection[]
  
  // Actions
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  toggleArrayFilter: (key: 'makes' | 'models' | 'body_type' | 'fuel_type' | 'transmission', value: string) => void
  resetFilters: () => void
  setResultCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setSortOrder: (order: SortOrder) => void
  setSelectedCars: (cars: CarSelection[]) => void
  getActiveFilters: () => FilterChip[]
  
  // Persistence helpers
  hasStoredFilters: () => boolean
}

const defaultFilters: Filters = {
  makes: [],
  models: [],
  body_type: [],
  fuel_type: [],
  transmission: [],
  price_min: null,
  price_max: null,
  seats_min: null,
  seats_max: null,
  horsepower_min: null,
  horsepower_max: null
}

const persistenceConfig = {
  name: 'leasingborsen-filters', // localStorage key
  storage: createJSONStorage(() => localStorage),
  // Only persist filter values and sort order, not UI state
  partialize: (state: FilterState) => ({
    makes: state.makes,
    models: state.models,
    body_type: state.body_type,
    fuel_type: state.fuel_type,
    transmission: state.transmission,
    price_min: state.price_min,
    price_max: state.price_max,
    seats_min: state.seats_min,
    seats_max: state.seats_max,
    horsepower_min: state.horsepower_min,
    horsepower_max: state.horsepower_max,
    sortOrder: state.sortOrder,
    filterOrder: state.filterOrder
  }),
  // Custom onRehydrateStorage to handle URL conflict
  onRehydrateStorage: () => {
    return (state: FilterState | undefined, error: unknown) => {
      if (error) {
        console.error('Failed to rehydrate filter store:', error)
        return
      }
      
      // Check if URL has filter parameters
      const urlParams = new URLSearchParams(window.location.search)
      const hasUrlFilters = ['make', 'model', 'body_type', 'fuel_type', 'transmission', 'price_min', 'price_max', 'seats_min', 'seats_max', 'sort']
        .some(param => urlParams.has(param))
      
      if (hasUrlFilters) {
        console.log('🔗 URL filters detected, clearing persisted state to prevent conflict')
        // Clear persisted filters to let URL take precedence
        return {
          ...state,
          ...defaultFilters,
          sortOrder: '' as SortOrder,
          filterOrder: []
        }
      }
      
      console.log('💾 Restored filters from localStorage')
      return state
    }
  }
}

export const useConsolidatedFilterStore = create<FilterState>()(
  persist(
    subscribeWithSelector((set, get) => {
      // Ensure state has all required properties with defaults
      const initialState = {
        ...defaultFilters,
        resultCount: 0,
        isLoading: false,
        sortOrder: '' as SortOrder,
        filterOrder: [],
        selectedCars: [],
        // Explicitly ensure these exist
        body_type: [],
        fuel_type: [],
        transmission: []
      }
      
      return {
        ...initialState,
      
      setFilter: (key, value) => {
        set((state) => {
          const newState = { ...state, [key]: value }
          let newFilterOrder = [...state.filterOrder]
          
          // Handle filter order tracking
          const filterKey = key as string
          
          // Handle composite filters (price, seats, horsepower)
          let trackingKey = filterKey
          if (filterKey === 'price_min' || filterKey === 'price_max') {
            trackingKey = 'price'
          } else if (filterKey === 'seats_min' || filterKey === 'seats_max') {
            trackingKey = 'seats'
          } else if (filterKey === 'horsepower_min' || filterKey === 'horsepower_max') {
            trackingKey = 'horsepower'
          }
          
          // If filter is being set (not cleared)
          const isFilterActive = value !== null && value !== undefined && 
            (Array.isArray(value) ? value.length > 0 : (value as any) !== '')
          
          if (isFilterActive) {
            // Remove from current position if exists
            newFilterOrder = newFilterOrder.filter(k => k !== trackingKey)
            // Add to beginning (newest first)
            newFilterOrder.unshift(trackingKey)
          } else {
            // Remove from order when filter is cleared
            newFilterOrder = newFilterOrder.filter(k => k !== trackingKey)
          }
          
          newState.filterOrder = newFilterOrder
          
          return newState
        })
      },

      toggleArrayFilter: (key, value) => {
        set((state) => {
          const currentArray = state[key] as string[]
          const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value]
          
          let newFilterOrder = [...state.filterOrder]
          const isFilterActive = newArray.length > 0
          
          if (isFilterActive) {
            // Remove from current position if exists
            newFilterOrder = newFilterOrder.filter(k => k !== key)
            // Add to beginning (newest first)
            newFilterOrder.unshift(key)
          } else {
            // Remove from order when filter is cleared
            newFilterOrder = newFilterOrder.filter(k => k !== key)
          }
          
          return {
            ...state,
            [key]: newArray,
            filterOrder: newFilterOrder
          }
        })
      },

      setSelectedCars: (cars: CarSelection[]) => {
        set((state) => {
          let newFilterOrder = [...state.filterOrder]
          const isFilterActive = cars.length > 0
          
          if (isFilterActive) {
            newFilterOrder = newFilterOrder.filter(k => k !== 'selectedCars')
            newFilterOrder.unshift('selectedCars')
          } else {
            newFilterOrder = newFilterOrder.filter(k => k !== 'selectedCars')
          }
          
          return {
            ...state,
            selectedCars: cars,
            filterOrder: newFilterOrder
          }
        })
      },
      
      resetFilters: () => {
        set({ 
          ...defaultFilters,
          resultCount: 0,
          isLoading: false,
          sortOrder: '' as SortOrder,
          filterOrder: [],
          // Explicitly reset arrays
          selectedCars: [],
          body_type: [],
          fuel_type: [],
          transmission: []
        })
      },
      
      setResultCount: (count) => {
        set({ resultCount: count })
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading })
      },
      
      setSortOrder: (order) => {
        set({ sortOrder: order })
      },
      
      getActiveFilters: () => {
        const state = get()
        const activeFilters: FilterChip[] = []
        
        // Ensure all array properties exist with fallbacks
        const selectedCars = state.selectedCars || []
        const makes = state.makes || []
        const models = state.models || []
        const fuel_type = state.fuel_type || []
        const body_type = state.body_type || []
        const transmission = state.transmission || []
        
        // Transmission labels mapping
        const transmissionLabels: Record<string, string> = {
          'Automatic': 'Automatisk gear',
          'Manual': 'Manuelt gear'
        }
        
        // Add individual make chips
        makes.forEach(make => {
          activeFilters.push({
            key: `make:${make}`,
            label: make,
            value: make
          })
        })
        
        // Add individual model chips
        models.forEach(model => {
          activeFilters.push({
            key: `model:${model}`,
            label: model,
            value: model
          })
        })
        
        // Add selectedCars as combined chip (if any)
        if (selectedCars.length > 0) {
          activeFilters.push({
            key: 'selectedCars',
            label: selectedCars.map((car: CarSelection) => {
              const modelCount = car.models.length
              if (modelCount === 0) return car.makeName
              if (modelCount === 1) return `${car.makeName} ${car.models[0].name}`
              return `${car.makeName} (${modelCount} modeller)`
            }).join(', '),
            value: selectedCars.map((car: CarSelection) => `${car.makeId}:${car.models.map((m: any) => m.id).join(',')}`).join('|')
          })
        }
        
        // Add filter chips for all active filters
        // Fuel type filters
        if (fuel_type.length > 0) {
          fuel_type.forEach(fuelType => {
            activeFilters.push({
              key: `fuel_type:${fuelType}`,
              label: fuelType,
              value: fuelType
            })
          })
        }
        
        // Body type filters
        if (body_type.length > 0) {
          body_type.forEach(bodyType => {
            activeFilters.push({
              key: `body_type:${bodyType}`,
              label: bodyType,
              value: bodyType
            })
          })
        }
        
        // Transmission filters
        if (transmission.length > 0) {
          transmission.forEach(trans => {
            activeFilters.push({
              key: `transmission:${trans}`,
              label: transmissionLabels[trans] || trans,
              value: trans
            })
          })
        }
        
        // Seats range filter
        if (state.seats_min !== null || state.seats_max !== null) {
          activeFilters.push({
            key: 'seats',
            label: `${state.seats_min ?? ''} - ${state.seats_max ?? ''} sæder`,
            value: `${state.seats_min ?? ''}-${state.seats_max ?? ''}`
          })
        }
        
        // Price range filter
        if (state.price_min !== null || state.price_max !== null) {
          activeFilters.push({
            key: 'price',
            label: `${state.price_min ? state.price_min.toLocaleString('da-DK') : ''} - ${state.price_max ? state.price_max.toLocaleString('da-DK') : ''} kr/md`,
            value: `${state.price_min ?? ''}-${state.price_max ?? ''}`
          })
        }
        
        return activeFilters
      },

      hasStoredFilters: () => {
        const stored = localStorage.getItem('leasingborsen-filters')
        if (!stored) return false
        
        try {
          const parsed = JSON.parse(stored)
          const state = parsed.state
          if (!state) return false
          
          // Check if there are any active filters
          const hasActiveFilters = Object.entries(state).some(([key, value]) => {
            if (key === 'sortOrder') return value !== ''
            if (Array.isArray(value)) return value.length > 0
            if (typeof value === 'string') return value !== ''
            return value !== null && value !== undefined
          })
          
          return hasActiveFilters
        } catch {
          return false
        }
      }
      }
    }),
    persistenceConfig
  )
)

// Alias for backwards compatibility during migration
export const usePersistentFilterStore = useConsolidatedFilterStore
export const useFilterStore = useConsolidatedFilterStore