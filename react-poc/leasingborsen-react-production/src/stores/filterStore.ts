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
  seats_max: null,
  horsepower_min: null,
  horsepower_max: null
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
      const filters: FilterChip[] = []
      
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
      
      // Create a map of all possible filters
      const filterMap: Record<string, FilterChip | null> = {
        selectedCars: selectedCars.length > 0 ? {
          key: 'selectedCars',
          label: selectedCars.map((car: CarSelection) => {
            const modelCount = car.models.length
            if (modelCount === 0) return car.makeName
            if (modelCount === 1) return `${car.makeName} ${car.models[0].name}`
            return `${car.makeName} (${modelCount} modeller)`
          }).join(', '),
          value: selectedCars.map((car: CarSelection) => `${car.makeId}:${car.models.map((m: any) => m.id).join(',')}`).join('|')
        } : null,
        makes: makes.length > 0 ? {
          key: 'makes',
          label: makes.join(', '),
          value: makes.join(',')
        } : null,
        models: models.length > 0 ? {
          key: 'models',
          label: models.join(', '),
          value: models.join(',')
        } : null,
        fuel_type: fuel_type.length > 0 ? { 
          key: 'fuel_type', 
          label: fuel_type.join(', '), 
          value: fuel_type.join(',') 
        } : null,
        body_type: body_type.length > 0 ? { 
          key: 'body_type', 
          label: body_type.join(', '), 
          value: body_type.join(',') 
        } : null,
        transmission: transmission.length > 0 ? { 
          key: 'transmission', 
          label: transmission.map(t => transmissionLabels[t] || t).join(', '), 
          value: transmission.join(',') 
        } : null,
        seats: (state.seats_min !== null || state.seats_max !== null) ? {
          key: 'seats', 
          label: `${state.seats_min ?? ''} - ${state.seats_max ?? ''} sæder`, 
          value: `${state.seats_min ?? ''}-${state.seats_max ?? ''}`
        } : null,
        price: (state.price_min !== null || state.price_max !== null) ? {
          key: 'price', 
          label: `${state.price_min ? state.price_min.toLocaleString('da-DK') : ''} - ${state.price_max ? state.price_max.toLocaleString('da-DK') : ''} kr/md`, 
          value: `${state.price_min ?? ''}-${state.price_max ?? ''}`
        } : null,
        horsepower: (state.horsepower_min !== null || state.horsepower_max !== null) ? {
          key: 'horsepower', 
          label: `${state.horsepower_min ? state.horsepower_min.toLocaleString('da-DK') : ''} - ${state.horsepower_max ? state.horsepower_max.toLocaleString('da-DK') : ''} hk`, 
          value: `${state.horsepower_min ?? ''}-${state.horsepower_max ?? ''}`
        } : null
      }
      
      // Return filters in the order they were added (newest first)
      for (const filterKey of state.filterOrder) {
        const filter = filterMap[filterKey]
        if (filter) {
          filters.push(filter)
        }
      }
      
      return filters
    }
    }
  })
)