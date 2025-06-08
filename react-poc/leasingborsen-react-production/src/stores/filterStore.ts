import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { FilterOptions } from '@/lib/supabase'

interface FilterState extends FilterOptions {
  resultCount: number
  isLoading: boolean
  setFilter: <K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) => void
  resetFilters: () => void
  setResultCount: (count: number) => void
  setLoading: (loading: boolean) => void
}

const defaultFilters: FilterOptions = {
  make: '',
  model: '',
  body_type: '',
  price_max: null
}

export const useFilterStore = create<FilterState>()(
  subscribeWithSelector((set) => ({
    ...defaultFilters,
    resultCount: 0,
    isLoading: false,
    
    setFilter: (key, value) => {
      set((state) => {
        const newState = { ...state, [key]: value }
        
        // Reset model when make changes
        if (key === 'make') {
          newState.model = ''
        }
        
        return newState
      })
    },
    
    resetFilters: () => {
      set({ 
        ...defaultFilters,
        resultCount: 0,
        isLoading: false 
      })
    },
    
    setResultCount: (count) => {
      set({ resultCount: count })
    },
    
    setLoading: (loading) => {
      set({ isLoading: loading })
    }
  }))
)