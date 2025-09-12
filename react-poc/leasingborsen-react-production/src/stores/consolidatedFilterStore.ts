import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist, createJSONStorage } from 'zustand/middleware'
import { filterTranslations } from '@/lib/translations/filterTranslations'
import type { Filters, FilterChip, SortOrder, CarSelection } from '@/types'
import { 
  trackFiltersChange, 
  trackFiltersApply, 
  computeSearchFingerprint,
  getAccurateLatency,
  type FilterMethod,
  type ApplyTrigger,
  type AllowedFilterKey,
  type SearchResults 
} from '@/analytics/filters'
import { recomputeResultsSessionId } from '@/analytics/resultsSession'

// Map store state to canonical filters used for RSID fingerprinting
function buildCanonicalFilters(state: Pick<FilterState, 'makes'|'models'|'fuel_type'|'body_type'|'price_min'|'price_max'|'mileage_selected'|'sortOrder'>): Record<string, any> {
  const canonical: Record<string, any> = {}
  if (state.makes && state.makes.length > 0) canonical.make = state.makes.join(',')
  if (state.models && state.models.length > 0) canonical.model = state.models.join(',')
  if (state.fuel_type && state.fuel_type.length > 0) canonical.fuel_type = state.fuel_type.join(',')
  if (state.body_type && state.body_type.length > 0) canonical.body_type = state.body_type.join(',')
  if (state.price_min != null) canonical.price_min = state.price_min
  if (state.price_max != null) canonical.price_max = state.price_max
  if (state.mileage_selected != null) canonical.mileage_km_per_year = state.mileage_selected
  if (state.sortOrder) canonical.sort_option = state.sortOrder
  return canonical
}

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
  
  // Analytics tracking state (not persisted)
  _resultsSessionId: string | null
  _lastSearchFingerprint: string
  _lastSettledFilters: Record<string, any>
  _lastResultsCount: number
  _pendingChanges: Set<AllowedFilterKey>
  _searchStartTime: number | null
  
  // Overlay tracking state (not persisted)
  _overlayId: string | null
  _overlayOpenTime: number | null
  _overlayChangedKeys: Set<AllowedFilterKey>
  
  // URL navigation tracking (not persisted)
  _isUrlNavigation: boolean
  _resetTrigger: ApplyTrigger | null
  
  // Actions
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K], method?: FilterMethod) => void
  toggleArrayFilter: (key: 'makes' | 'models' | 'body_type' | 'fuel_type' | 'transmission', value: string, method?: FilterMethod) => void
  resetFilters: (method?: ApplyTrigger) => void
  setResultCount: (count: number) => void
  setLoading: (loading: boolean) => void
  setSortOrder: (order: SortOrder, method?: FilterMethod) => void
  setSelectedCars: (cars: CarSelection[]) => void
  getActiveFilters: () => FilterChip[]
  
  // Analytics integration
  handleResultsSettled: (results: SearchResults, latency?: number) => void
  markSearchPending: () => void
  getActiveFilterCount: () => number
  
  // Overlay tracking integration
  startOverlaySession: (overlayId: string) => void
  closeOverlaySession: () => void
  getOverlayState: () => { overlayId: string | null, openTime: number | null, changedKeys: AllowedFilterKey[] }
  getWhitelistedFilters: () => Record<string, string | number | boolean>
  
  // URL navigation tracking
  setUrlNavigation: (isNavigation: boolean) => void
  setApplyTrigger: (trigger: ApplyTrigger | null) => void
  
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
  horsepower_max: null,
  mileage_selected: null
}

const persistenceConfig = {
  name: 'leasingborsen-filters', // localStorage key
  storage: createJSONStorage(() => localStorage),
  // Only persist filter values and sort order, not UI state or analytics tracking
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
    mileage_selected: state.mileage_selected,
    sortOrder: state.sortOrder,
    filterOrder: state.filterOrder
    // Note: Analytics tracking state (prefixed with _) is intentionally excluded
  }),
  // Simplified onRehydrateStorage to avoid state conflicts
  onRehydrateStorage: () => {
    return (state: FilterState | undefined, error: unknown) => {
      if (error) {
        console.error('Failed to rehydrate filter store:', error)
        return state
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
        sortOrder: 'lease_score_desc' as SortOrder,
        filterOrder: [],
        selectedCars: [],
        // Explicitly ensure these exist
        body_type: [],
        fuel_type: [],
        transmission: [],
        // Analytics tracking state (not persisted)
        _resultsSessionId: null,
        _lastSearchFingerprint: '',
        _lastSettledFilters: {},
        _lastResultsCount: 0,
        _pendingChanges: new Set<AllowedFilterKey>(),
        _searchStartTime: null,
        
        // Overlay tracking state (not persisted)
        _overlayId: null,
        _overlayOpenTime: null,
        _overlayChangedKeys: new Set<AllowedFilterKey>(),
        
        // URL navigation tracking (not persisted)
        _isUrlNavigation: false,
        _resetTrigger: null
      }
      
      return {
        ...initialState,
      
      setFilter: (key, value, method = 'dropdown') => {
        const previousValue = get()[key]
        
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
          
          // Analytics: Add to pending changes and mark search as pending
          // Skip tracking for URL-driven restorations (method === 'url')
          if (key in newState && method !== 'url') { // Ensure key is valid and not URL restoration
            newState._pendingChanges = new Set([...state._pendingChanges, key as AllowedFilterKey])
            if (!newState._searchStartTime) {
              newState._searchStartTime = Date.now()
            }
            
            // Overlay: Track changes during overlay session
            if (state._overlayId) {
              newState._overlayChangedKeys = new Set([...state._overlayChangedKeys, key as AllowedFilterKey])
            }
          }
          
          return newState
        })
        
        // Analytics: Track filter change (after state update)
        if (key !== 'sortOrder' as any) { // Skip tracking sortOrder changes here (handled in setSortOrder)
          try {
            const state = get()
            const canonical = buildCanonicalFilters(state)
            const resultsSessionId = recomputeResultsSessionId(canonical)
            if (state._resultsSessionId !== resultsSessionId) {
              set((prev) => ({ ...prev, _resultsSessionId: resultsSessionId }))
            }
            const filterAction = 
              previousValue == null && value != null ? 'add' :
              previousValue != null && value == null ? 'clear' :
              Array.isArray(value) && Array.isArray(previousValue) ?
                (value.length > previousValue.length ? 'add' :
                 value.length < previousValue.length ? 'remove' : 'update') :
              'update'
            
            // Ensure store has RSID
            if (!state._resultsSessionId) {
              set((prev) => ({ ...prev, _resultsSessionId: resultsSessionId }))
            }
            
            trackFiltersChange({
              filter_key: key as AllowedFilterKey,
              filter_action: filterAction,
              filter_value: Array.isArray(value) ? value.join(',') : value as string | number | boolean | null,
              previous_value: Array.isArray(previousValue) ? previousValue.join(',') : previousValue as string | number | boolean | null,
              filter_method: method,
              total_active_filters: get().getActiveFilterCount(),
              results_session_id: resultsSessionId
            })
          } catch (error) {
            console.error('[Analytics] Failed to track filter change:', error)
          }
        }
      },

      toggleArrayFilter: (key, value, method = 'checkbox') => {
        const previousArray = get()[key] as string[]
        
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
          
          // Analytics: Add to pending changes and mark search as pending
          // Skip tracking for URL-driven restorations (method === 'url')
          const newState = {
            ...state,
            [key]: newArray,
            filterOrder: newFilterOrder,
            _pendingChanges: method !== 'url' ? 
              new Set([...state._pendingChanges, key as AllowedFilterKey]) :
              state._pendingChanges
          }
          
          if (!newState._searchStartTime && method !== 'url') {
            newState._searchStartTime = Date.now()
          }
          
          // Overlay: Track changes during overlay session
          if (state._overlayId && method !== 'url') {
            newState._overlayChangedKeys = new Set([...state._overlayChangedKeys, key as AllowedFilterKey])
          }
          
          return newState
        })
        
        // Analytics: Track filter change
        try {
          const state = get()
          const canonical = buildCanonicalFilters(state)
          const resultsSessionId = recomputeResultsSessionId(canonical)
          if (state._resultsSessionId !== resultsSessionId) {
            set((prev) => ({ ...prev, _resultsSessionId: resultsSessionId }))
          }
          const isRemoving = previousArray.includes(value)
          const filterAction = isRemoving ? 'remove' : 'add'
          
          // Ensure store has RSID
          if (!state._resultsSessionId) {
            set((prev) => ({ ...prev, _resultsSessionId: resultsSessionId }))
          }
          
          trackFiltersChange({
            filter_key: key as AllowedFilterKey,
            filter_action: filterAction,
            filter_value: value as string | number | boolean | null,
            previous_value: previousArray.join(','),
            filter_method: method,
            total_active_filters: get().getActiveFilterCount(),
            results_session_id: resultsSessionId
          })
        } catch (error) {
          console.error('[Analytics] Failed to track array filter toggle:', error)
        }
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
      
      resetFilters: (method = 'reset_button') => {
        const previousState = get()
        
        set({ 
          ...defaultFilters,
          resultCount: 0,
          isLoading: false,
          sortOrder: 'lease_score_desc' as SortOrder,
          filterOrder: [],
          // Explicitly reset arrays
          selectedCars: [],
          body_type: [],
          fuel_type: [],
          transmission: [],
          // Analytics: Reset tracking state but preserve session for the apply event
          _lastSettledFilters: {},
          _pendingChanges: new Set(['makes', 'models', 'selectedCars', 'fuel_type', 'body_type', 'transmission', 'price_min', 'price_max'] as AllowedFilterKey[]),
          _searchStartTime: Date.now(),
          _resultsSessionId: previousState._resultsSessionId, // Keep same session
          _lastSearchFingerprint: previousState._lastSearchFingerprint,
          _lastResultsCount: previousState._lastResultsCount,
          // Overlay: Reset overlay state
          _overlayId: null,
          _overlayOpenTime: null,
          _overlayChangedKeys: new Set<AllowedFilterKey>(),
          // URL navigation: Set reset trigger
          _isUrlNavigation: false,
          _resetTrigger: method
        })
        
        // Analytics: Track individual clear events for each active filter
        try {
          const state = get()
          const canonical = buildCanonicalFilters(state)
          const resultsSessionId = recomputeResultsSessionId(canonical)
          const activeFilters = previousState.getActiveFilters()
          
          set((prev) => ({ ...prev, _resultsSessionId: resultsSessionId }))
          
          // Track clear action for each active filter
          activeFilters.forEach(filter => {
            const [filterType, _filterValue] = filter.key.split(':')
            if (filterType) {
              trackFiltersChange({
                filter_key: filterType as AllowedFilterKey,
                filter_action: 'clear',
                filter_value: null,
                previous_value: filter.value,
                filter_method: 'url',
                total_active_filters: 0, // After reset
                results_session_id: resultsSessionId
              })
            }
          })
        } catch (error) {
          console.error('[Analytics] Failed to track filter reset:', error)
        }
      },
      
      setResultCount: (count) => {
        set({ resultCount: count })
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading })
      },
      
      setSortOrder: (order, method = 'dropdown') => {
        const previousOrder = get().sortOrder
        
        set((state) => ({
          ...state,
          sortOrder: order,
          // Analytics: Mark search as pending if sort changed (skip for URL restorations)
          _pendingChanges: order !== previousOrder && method !== 'url' ? 
            new Set([...state._pendingChanges, 'sortOrder' as AllowedFilterKey]) : 
            state._pendingChanges,
          _searchStartTime: order !== previousOrder && method !== 'url' && !state._searchStartTime ? Date.now() : state._searchStartTime,
          // Overlay: Track changes during overlay session (skip for URL restorations)
          _overlayChangedKeys: order !== previousOrder && method !== 'url' && state._overlayId ? 
            new Set([...state._overlayChangedKeys, 'sortOrder' as AllowedFilterKey]) : 
            state._overlayChangedKeys
        }))
        
        // Analytics: Track sort order change
        if (order !== previousOrder) {
          try {
            const state = get()
            const canonical = buildCanonicalFilters(state)
            const resultsSessionId = recomputeResultsSessionId(canonical)
            set((prev) => ({ ...prev, _resultsSessionId: resultsSessionId }))
            
            trackFiltersChange({
              filter_key: 'sortOrder' as AllowedFilterKey,
              filter_action: 'update',
              filter_value: order,
              previous_value: previousOrder,
              filter_method: method,
              total_active_filters: get().getActiveFilterCount(),
              results_session_id: resultsSessionId
            })
          } catch (error) {
            console.error('[Analytics] Failed to track sort order change:', error)
          }
        }
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
        
        // Note: Using centralized translation system instead of hardcoded labels
        
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
              label: filterTranslations.getFuelTypeLabel(fuelType),
              value: fuelType
            })
          })
        }
        
        // Body type filters
        if (body_type.length > 0) {
          body_type.forEach(bodyType => {
            activeFilters.push({
              key: `body_type:${bodyType}`,
              label: filterTranslations.getBodyTypeLabel(bodyType),
              value: bodyType
            })
          })
        }
        
        // Transmission filters
        if (transmission.length > 0) {
          transmission.forEach(trans => {
            activeFilters.push({
              key: `transmission:${trans}`,
              label: filterTranslations.getTransmissionLabel(trans),
              value: trans
            })
          })
        }
        
        // Seats range filter
        if (state.seats_min !== null || state.seats_max !== null) {
          let label = ''
          if (state.seats_min !== null && state.seats_max !== null) {
            label = `${state.seats_min} - ${state.seats_max} sæder`
          } else if (state.seats_min !== null) {
            label = `Fra ${state.seats_min} sæder`
          } else if (state.seats_max !== null) {
            label = `Maks ${state.seats_max} sæder`
          }
          
          activeFilters.push({
            key: 'seats',
            label,
            value: `${state.seats_min ?? ''}-${state.seats_max ?? ''}`
          })
        }
        
        // Price range filter
        if (state.price_min !== null || state.price_max !== null) {
          let label = ''
          if (state.price_min !== null && state.price_max !== null) {
            label = `${state.price_min.toLocaleString('da-DK')} - ${state.price_max.toLocaleString('da-DK')} kr./md.`
          } else if (state.price_min !== null) {
            label = `Fra ${state.price_min.toLocaleString('da-DK')} kr./md.`
          } else if (state.price_max !== null) {
            label = `Maks ${state.price_max.toLocaleString('da-DK')} kr./md.`
          }
          
          activeFilters.push({
            key: 'price',
            label,
            value: `${state.price_min ?? ''}-${state.price_max ?? ''}`
          })
        }
        
        // Mileage filter (only show if explicitly selected)
        if (state.mileage_selected != null) {
          activeFilters.push({
            key: 'mileage',
            label: state.mileage_selected === 35000 
              ? '35.000+ km/år'  // Special label for 35k+
              : `${state.mileage_selected.toLocaleString('da-DK')} km/år`,
            value: state.mileage_selected.toString()
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
          
          // Check if there are any active filters (excluding default values)
          const hasActiveFilters = Object.entries(state).some(([key, value]) => {
            if (key === 'sortOrder') return value !== ''
            if (key === 'mileage_selected') return value != null
            if (Array.isArray(value)) return value.length > 0
            if (typeof value === 'string') return value !== ''
            return value !== null && value !== undefined
          })
          
          return hasActiveFilters
        } catch {
          return false
        }
      },

      // Analytics integration methods
      handleResultsSettled: (results, _latency = 0) => {
        const state = get()
        
        // Check if session should reset based on search fingerprint
        const newFingerprint = computeSearchFingerprint({
          makes: state.makes,
          models: state.models,
          selectedCars: state.selectedCars,
          fuel_type: state.fuel_type,
          body_type: state.body_type,
          transmission: state.transmission,
          price_min: state.price_min,
          price_max: state.price_max,
          mileage_selected: state.mileage_selected,
          seats_min: state.seats_min,
          seats_max: state.seats_max,
          horsepower_min: state.horsepower_min,
          horsepower_max: state.horsepower_max
        })
        
        // Central RSID handling: recompute based on canonical filters
        const canonical = buildCanonicalFilters(state)
        const currentRSID = recomputeResultsSessionId(canonical)
        set((prev) => ({ ...prev, _resultsSessionId: currentRSID, _lastSearchFingerprint: newFingerprint }))
        
        // Only emit filters_apply if we have pending changes
        if (state._pendingChanges.size > 0) {
          try {
            const whitelistedFilters = state.getWhitelistedFilters()
            const changedFilters = Array.from(state._pendingChanges)
            
            // Determine apply_trigger based on context
            let applyTrigger: ApplyTrigger = 'auto' // Default for user interactions
            if (state._resetTrigger) {
              applyTrigger = state._resetTrigger
            } else if (state._isUrlNavigation) {
              applyTrigger = 'url_navigation'
            }
            
            trackFiltersApply({
              results_session_id: currentRSID,
              filters_applied: whitelistedFilters,
              filters_count: Object.keys(whitelistedFilters).length,
              changed_filters: changedFilters,
              changed_keys_count: changedFilters.length,
              apply_trigger: applyTrigger,
              previous_results_count: state._lastResultsCount,
              results_count: results.count,
              results_delta: results.count - state._lastResultsCount,
              is_zero_results: results.count === 0,
              latency_ms: getAccurateLatency(),
              overlay_id: state._overlayId || undefined
            }, newFingerprint)
          } catch (error) {
            console.error('[Analytics] Failed to track filters apply:', error)
          }
        }
        
        // Update settled state and reset navigation flags
        set((prev) => ({
          ...prev,
          _lastSettledFilters: state.getWhitelistedFilters(),
          _lastResultsCount: results.count,
          _pendingChanges: new Set(),
          _searchStartTime: null,
          _lastSearchFingerprint: newFingerprint,
          _resultsSessionId: currentRSID, // Ensure final state has the RSID
          // Reset navigation flags after use
          _isUrlNavigation: false,
          _resetTrigger: null
        }))
      },

      markSearchPending: () => {
        set((state) => ({
          ...state,
          _searchStartTime: state._searchStartTime || Date.now()
        }))
      },

      getActiveFilterCount: () => {
        const state = get()
        let count = 0
        
        if (state.makes.length > 0) count++
        if (state.models.length > 0) count++
        if (state.selectedCars.length > 0) count++
        if (state.fuel_type.length > 0) count++
        if (state.body_type.length > 0) count++
        if (state.transmission.length > 0) count++
        if (state.price_min !== null || state.price_max !== null) count++
        if (state.mileage_selected !== null) count++
        if (state.seats_min !== null || state.seats_max !== null) count++
        if (state.horsepower_min !== null || state.horsepower_max !== null) count++
        if (state.sortOrder !== 'lease_score_desc') count++ // Non-default sort
        
        return count
      },

      getWhitelistedFilters: () => {
        const state = get()
        const filters: Record<string, string | number | boolean> = {}
        
        // Only include non-empty/non-default filters
        if (state.makes.length > 0) {
          filters.makes = state.makes.join(',')
        }
        if (state.models.length > 0) {
          filters.models = state.models.join(',')
        }
        if (state.selectedCars.length > 0) {
          filters.selectedCars = JSON.stringify(state.selectedCars)
        }
        if (state.fuel_type.length > 0) {
          filters.fuel_type = state.fuel_type.join(',')
        }
        if (state.body_type.length > 0) {
          filters.body_type = state.body_type.join(',')
        }
        if (state.transmission.length > 0) {
          filters.transmission = state.transmission.join(',')
        }
        if (state.price_min !== null) {
          filters.price_min = state.price_min
        }
        if (state.price_max !== null) {
          filters.price_max = state.price_max
        }
        if (state.mileage_selected !== null) {
          filters.mileage_selected = state.mileage_selected
        }
        if (state.seats_min !== null) {
          filters.seats_min = state.seats_min
        }
        if (state.seats_max !== null) {
          filters.seats_max = state.seats_max
        }
        if (state.horsepower_min !== null) {
          filters.horsepower_min = state.horsepower_min
        }
        if (state.horsepower_max !== null) {
          filters.horsepower_max = state.horsepower_max
        }
        if (state.sortOrder !== 'lease_score_desc') {
          filters.sortOrder = state.sortOrder
        }
        
        return filters
      },

      // Overlay session management
      startOverlaySession: (overlayId: string) => {
        set((state) => ({
          ...state,
          _overlayId: overlayId,
          _overlayOpenTime: Date.now(),
          _overlayChangedKeys: new Set<AllowedFilterKey>()
        }))
      },

      closeOverlaySession: () => {
        set((state) => ({
          ...state,
          _overlayId: null,
          _overlayOpenTime: null,
          _overlayChangedKeys: new Set<AllowedFilterKey>()
        }))
      },

      getOverlayState: () => {
        const state = get()
        return {
          overlayId: state._overlayId,
          openTime: state._overlayOpenTime,
          changedKeys: Array.from(state._overlayChangedKeys)
        }
      },

      // URL navigation tracking methods
      setUrlNavigation: (isNavigation: boolean) => {
        set((state) => ({
          ...state,
          _isUrlNavigation: isNavigation
        }))
      },

      setApplyTrigger: (trigger: ApplyTrigger | null) => {
        set((state) => ({
          ...state,
          _resetTrigger: trigger
        }))
      }
      }
    }),
    persistenceConfig
  )
)

// Alias for backwards compatibility during migration
export const usePersistentFilterStore = useConsolidatedFilterStore
export const useFilterStore = useConsolidatedFilterStore
