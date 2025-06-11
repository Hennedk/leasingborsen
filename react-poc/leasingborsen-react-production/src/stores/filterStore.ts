import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Filters, FilterChip, SortOrder } from '@/types'

interface FilterState extends Filters {
  resultCount: number
  isLoading: boolean
  sortOrder: SortOrder
  filterOrder: string[]
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  resetFilters: () => void
  setResultCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setSortOrder: (order: SortOrder) => void
  getActiveFilters: () => FilterChip[]
}

const defaultFilters: Filters = {
  make: '',
  model: '',
  body_type: '',
  fuel_type: '',
  transmission: '',
  price_min: null,
  price_max: null,
  seats_min: null,
  seats_max: null,
  horsepower: null
}

export const useFilterStore = create<FilterState>()(
  subscribeWithSelector((set, get) => ({
    ...defaultFilters,
    resultCount: 0,
    isLoading: false,
    sortOrder: '',
    filterOrder: [],
    
    setFilter: (key, value) => {
      set((state) => {
        const newState = { ...state, [key]: value }
        let newFilterOrder = [...state.filterOrder]
        
        // Handle filter order tracking
        const filterKey = key as string
        
        // Handle composite filters (price, seats)
        let trackingKey = filterKey
        if (filterKey === 'price_min' || filterKey === 'price_max') {
          trackingKey = 'price'
        } else if (filterKey === 'seats_min' || filterKey === 'seats_max') {
          trackingKey = 'seats'
        }
        
        // If filter is being set (not cleared)
        const isFilterActive = value !== null && value !== '' && value !== undefined
        
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
        
        // Reset model when make changes
        if (key === 'make') {
          newState.model = ''
          // Also remove model from filter order if make is cleared
          if (!isFilterActive) {
            newState.filterOrder = newState.filterOrder.filter(k => k !== 'model')
          }
        }
        
        return newState
      })
    },
    
    resetFilters: () => {
      set({ 
        ...defaultFilters,
        resultCount: 0,
        isLoading: false,
        sortOrder: '',
        filterOrder: []
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
      
      // Transmission labels mapping
      const transmissionLabels: Record<string, string> = {
        'Automatic': 'Automatisk gear',
        'Manual': 'Manuelt gear'
      }
      
      // Create a map of all possible filters
      const filterMap: Record<string, FilterChip | null> = {
        make: state.make ? { key: 'make', label: state.make, value: state.make } : null,
        model: state.model ? { key: 'model', label: state.model, value: state.model } : null,
        fuel_type: state.fuel_type ? { key: 'fuel_type', label: state.fuel_type, value: state.fuel_type } : null,
        body_type: state.body_type ? { key: 'body_type', label: state.body_type, value: state.body_type } : null,
        transmission: state.transmission ? { 
          key: 'transmission', 
          label: transmissionLabels[state.transmission] || state.transmission, 
          value: state.transmission 
        } : null,
        seats: (state.seats_min !== null || state.seats_max !== null) ? {
          key: 'seats', 
          label: `Sæder: ${state.seats_min ?? ''} - ${state.seats_max ?? ''}`, 
          value: `${state.seats_min ?? ''}-${state.seats_max ?? ''}`
        } : null,
        price: (state.price_min !== null || state.price_max !== null) ? {
          key: 'price', 
          label: `Pris: ${state.price_min ? state.price_min.toLocaleString('da-DK') : ''} - ${state.price_max ? state.price_max.toLocaleString('da-DK') : ''} kr./måned`, 
          value: `${state.price_min ?? ''}-${state.price_max ?? ''}`
        } : null,
        horsepower: state.horsepower !== null ? { 
          key: 'horsepower', 
          label: `Min ${state.horsepower} hk`, 
          value: state.horsepower 
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
  }))
)