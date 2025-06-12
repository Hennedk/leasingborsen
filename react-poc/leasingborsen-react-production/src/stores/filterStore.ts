import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Filters, FilterChip, SortOrder, CarSelection } from '@/types'

interface FilterState extends Filters {
  resultCount: number
  isLoading: boolean
  sortOrder: SortOrder
  filterOrder: string[]
  selectedCars: CarSelection[]
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  toggleArrayFilter: (key: 'makes' | 'models' | 'body_type' | 'fuel_type' | 'transmission', value: string) => void
  resetFilters: () => void
  setResultCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setSortOrder: (order: SortOrder) => void
  setSelectedCars: (cars: CarSelection[]) => void
  getActiveFilters: () => FilterChip[]
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
  seats_max: null
}

export const useFilterStore = create<FilterState>()(
  subscribeWithSelector((set, get) => {
    // Ensure state has all required properties with defaults
    const initialState = {
      ...defaultFilters,
      resultCount: 0,
      isLoading: false,
      sortOrder: '' as SortOrder,
      filterOrder: [],
      // Explicitly ensure these exist
      selectedCars: [],
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
      
      // Add individual filter chips in the order they were added (newest first)
      for (const filterKey of state.filterOrder) {
        // Skip makes and models as they're already added individually
        if (filterKey === 'makes' || filterKey === 'models') {
          continue
        }
        
        // Handle array-based filters (create individual chips for each value)
        if (filterKey === 'fuel_type' && fuel_type.length > 0) {
          fuel_type.forEach(fuelType => {
            activeFilters.push({
              key: `fuel_type:${fuelType}`,
              label: fuelType,
              value: fuelType
            })
          })
        } else if (filterKey === 'body_type' && body_type.length > 0) {
          body_type.forEach(bodyType => {
            activeFilters.push({
              key: `body_type:${bodyType}`,
              label: bodyType,
              value: bodyType
            })
          })
        } else if (filterKey === 'transmission' && transmission.length > 0) {
          transmission.forEach(trans => {
            activeFilters.push({
              key: `transmission:${trans}`,
              label: transmissionLabels[trans] || trans,
              value: trans
            })
          })
        } else if (filterKey === 'seats' && (state.seats_min !== null || state.seats_max !== null)) {
          activeFilters.push({
            key: 'seats',
            label: `${state.seats_min ?? ''} - ${state.seats_max ?? ''} sæder`,
            value: `${state.seats_min ?? ''}-${state.seats_max ?? ''}`
          })
        } else if (filterKey === 'price' && (state.price_min !== null || state.price_max !== null)) {
          activeFilters.push({
            key: 'price',
            label: `${state.price_min ? state.price_min.toLocaleString('da-DK') : ''} - ${state.price_max ? state.price_max.toLocaleString('da-DK') : ''} kr/md`,
            value: `${state.price_min ?? ''}-${state.price_max ?? ''}`
          })
        }
      }
      
      return activeFilters
    }
    }
  })
)