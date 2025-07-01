# Global State Management with Zustand

This directory contains the global state management system using Zustand for client-side state that needs to persist across components and sessions. The store architecture follows modern React patterns with TypeScript integration and performance optimizations.

## 🎯 Overview

The Zustand store system provides:
- **Lightweight global state** without the complexity of Redux
- **TypeScript integration** with full type safety
- **Persistence strategies** for filters and UI preferences
- **Performance optimization** with selective subscriptions
- **URL synchronization** for shareable filter states

## 📁 Store Structure

```
stores/
├── consolidatedFilterStore.ts    # Main filter state with persistence
├── themeStore.ts                # Theme and UI preferences
├── uiStore.ts                   # Global UI state (modals, loading)
├── adminStore.ts                # Admin-specific state
└── types.ts                     # Store-related TypeScript types
```

## 🔧 Core Stores

### **consolidatedFilterStore.ts** - Primary Filter Management

#### Advanced Filter State with Persistence
```typescript
interface FilterState {
  // Filter values
  makes: string[]
  models: string[]
  bodyTypes: string[]
  fuelTypes: string[]
  transmissionTypes: string[]
  driveTypes: string[]
  priceRange: [number, number]
  yearRange: [number, number]
  mileageMax: number
  
  // UI state
  filterOrder: string[]           // Track filter application order
  searchTerm: string
  sortBy: SortOption
  sortOrder: 'asc' | 'desc'
  
  // Persistence control
  lastUpdated: number
  version: number                 // For migration handling
}

export const useConsolidatedFilterStore = create<FilterState>()(
  persist(
    subscribeWithSelector((set, get) => {
      return {
        // Initial state
        makes: [],
        models: [],
        bodyTypes: [],
        fuelTypes: [],
        transmissionTypes: [],
        driveTypes: [],
        priceRange: [0, 50000],
        yearRange: [2020, 2024],
        mileageMax: 200000,
        filterOrder: [],
        searchTerm: '',
        sortBy: 'created_at',
        sortOrder: 'desc',
        lastUpdated: Date.now(),
        version: 1,
        
        // Actions with optimized updates
        setFilter: (key: FilterKey, value: any) => {
          set(state => {
            const newState = { ...state, [key]: value }
            
            // Update filter order for UX tracking
            if (key !== 'searchTerm' && key !== 'sortBy' && key !== 'sortOrder') {
              const newOrder = state.filterOrder.filter(f => f !== key)
              if (Array.isArray(value) ? value.length > 0 : value !== null) {
                newOrder.push(key)
              }
              newState.filterOrder = newOrder
            }
            
            newState.lastUpdated = Date.now()
            return newState
          })
        },
        
        // Optimized array operations
        toggleArrayFilter: (key: FilterKey, value: string) => {
          set(state => {
            const currentArray = state[key] as string[]
            const newArray = currentArray.includes(value)
              ? currentArray.filter(item => item !== value)
              : [...currentArray, value]
            
            return {
              ...state,
              [key]: newArray,
              filterOrder: updateFilterOrder(state.filterOrder, key, newArray.length > 0),
              lastUpdated: Date.now()
            }
          })
        },
        
        // Computed values with memoization
        getActiveFilters: () => {
          const state = get()
          return computeActiveFilters(state)
        },
        
        getFilterCount: () => {
          const activeFilters = get().getActiveFilters()
          return activeFilters.length
        },
        
        // Bulk operations
        clearFilters: () => {
          set(state => ({
            ...state,
            makes: [],
            models: [],
            bodyTypes: [],
            fuelTypes: [],
            transmissionTypes: [],
            driveTypes: [],
            priceRange: [0, 50000],
            yearRange: [2020, 2024],
            mileageMax: 200000,
            searchTerm: '',
            filterOrder: [],
            lastUpdated: Date.now()
          }))
        },
        
        clearCategory: (category: FilterCategory) => {
          const clearedKeys = getCategoryKeys(category)
          set(state => {
            const newState = { ...state }
            clearedKeys.forEach(key => {
              newState[key] = getDefaultValue(key)
            })
            newState.filterOrder = state.filterOrder.filter(f => !clearedKeys.includes(f))
            newState.lastUpdated = Date.now()
            return newState
          })
        }
      }
    }),
    {
      name: 'filter-storage',
      version: 1,
      
      // Custom persistence configuration
      partialize: (state) => ({
        // Only persist filter values, not UI state
        makes: state.makes,
        models: state.models,
        bodyTypes: state.bodyTypes,
        fuelTypes: state.fuelTypes,
        transmissionTypes: state.transmissionTypes,
        driveTypes: state.driveTypes,
        priceRange: state.priceRange,
        yearRange: state.yearRange,
        mileageMax: state.mileageMax,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        version: state.version
      }),
      
      // Migration strategy for schema changes
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migrate from v0 to v1
          return {
            ...persistedState,
            filterOrder: [],
            version: 1
          }
        }
        return persistedState
      }
    }
  )
)
```

**Key Features:**
- **Filter Order Tracking**: Remembers the order filters were applied for better UX
- **Computed Values**: Memoized active filter computation for performance
- **Optimized Updates**: Minimal re-renders with targeted state updates
- **Persistence Control**: Selective persistence of relevant state only
- **Migration Support**: Schema evolution with version tracking

### **themeStore.ts** - UI Theme Management

#### Theme State with System Preference Detection
```typescript
interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  actualTheme: 'light' | 'dark'        // Resolved theme after system detection
  colorMode: 'default' | 'high-contrast'
  fontSize: 'small' | 'medium' | 'large'
  reducedMotion: boolean
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      actualTheme: 'light',
      colorMode: 'default',
      fontSize: 'medium',
      reducedMotion: false,
      
      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme })
        
        // Apply theme to document
        const actualTheme = theme === 'system' 
          ? detectSystemTheme() 
          : theme
          
        document.documentElement.classList.toggle('dark', actualTheme === 'dark')
        set({ actualTheme })
      },
      
      setColorMode: (colorMode: 'default' | 'high-contrast') => {
        set({ colorMode })
        document.documentElement.classList.toggle('high-contrast', colorMode === 'high-contrast')
      },
      
      toggleTheme: () => {
        const { actualTheme } = get()
        get().setTheme(actualTheme === 'light' ? 'dark' : 'light')
      },
      
      // Accessibility helpers
      setAccessibilityPreferences: (preferences: AccessibilityPreferences) => {
        set({
          fontSize: preferences.fontSize,
          reducedMotion: preferences.reducedMotion,
          colorMode: preferences.colorMode
        })
        
        // Apply CSS custom properties
        applyAccessibilityStyles(preferences)
      }
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        theme: state.theme,
        colorMode: state.colorMode,
        fontSize: state.fontSize,
        reducedMotion: state.reducedMotion
      })
    }
  )
)

// System theme detection
const detectSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState()
    if (store.theme === 'system') {
      store.setTheme('system') // Trigger re-evaluation
    }
  })
}
```

### **uiStore.ts** - Global UI State

#### Modal and Loading State Management
```typescript
interface UIState {
  // Modal management
  modals: {
    listingDetails: { isOpen: boolean; listingId?: string }
    filterOverlay: { isOpen: boolean }
    confirmDialog: { isOpen: boolean; config?: ConfirmConfig }
    imageGallery: { isOpen: boolean; images?: string[]; activeIndex?: number }
  }
  
  // Loading states
  globalLoading: boolean
  loadingStates: Record<string, boolean>
  
  // Toast notifications
  toasts: Toast[]
  
  // Mobile UI state
  mobileNavOpen: boolean
  mobileFilterOpen: boolean
  
  // Admin UI state
  adminSidebarCollapsed: boolean
  adminQuickActions: boolean
}

export const useUIStore = create<UIState>()((set, get) => ({
  modals: {
    listingDetails: { isOpen: false },
    filterOverlay: { isOpen: false },
    confirmDialog: { isOpen: false },
    imageGallery: { isOpen: false }
  },
  globalLoading: false,
  loadingStates: {},
  toasts: [],
  mobileNavOpen: false,
  mobileFilterOpen: false,
  adminSidebarCollapsed: false,
  adminQuickActions: true,
  
  // Modal actions
  openModal: (modalName: keyof UIState['modals'], config?: any) => {
    set(state => ({
      modals: {
        ...state.modals,
        [modalName]: { isOpen: true, ...config }
      }
    }))
  },
  
  closeModal: (modalName: keyof UIState['modals']) => {
    set(state => ({
      modals: {
        ...state.modals,
        [modalName]: { isOpen: false }
      }
    }))
  },
  
  closeAllModals: () => {
    set(state => ({
      modals: Object.keys(state.modals).reduce((acc, key) => ({
        ...acc,
        [key]: { isOpen: false }
      }), {} as UIState['modals'])
    }))
  },
  
  // Loading state management
  setLoading: (key: string, loading: boolean) => {
    set(state => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading
      }
    }))
  },
  
  // Toast management
  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    set(state => ({
      toasts: [...state.toasts, { ...toast, id }]
    }))
    
    // Auto-remove after duration
    setTimeout(() => {
      get().removeToast(id)
    }, toast.duration || 5000)
  },
  
  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }))
  }
}))
```

## 🎨 Store Patterns & Best Practices

### **Selective Subscriptions for Performance**
```tsx
// ✅ Good: Subscribe to specific state slices
const makes = useConsolidatedFilterStore(state => state.makes)
const setMakes = useConsolidatedFilterStore(state => state.setFilter)

// ❌ Bad: Subscribe to entire store causes unnecessary re-renders
const store = useConsolidatedFilterStore()
```

### **Computed Values with Memoization**
```typescript
// Compute active filters efficiently
const computeActiveFilters = (state: FilterState): ActiveFilter[] => {
  const activeFilters: ActiveFilter[] = []
  
  // Use filter order for consistent UX
  state.filterOrder.forEach(filterKey => {
    const value = state[filterKey]
    if (isFilterActive(filterKey, value)) {
      activeFilters.push({
        key: filterKey,
        value,
        label: getFilterLabel(filterKey, value),
        category: getFilterCategory(filterKey)
      })
    }
  })
  
  return activeFilters
}

// Memoized selector
export const useActiveFilters = () => {
  return useConsolidatedFilterStore(
    useCallback(state => state.getActiveFilters(), [])
  )
}
```

### **Persistence Configuration**
```typescript
// Strategic persistence partitioning
const persistConfig = {
  name: 'filter-storage',
  version: 1,
  
  // Only persist user preferences, not temporary UI state
  partialize: (state: FilterState) => ({
    makes: state.makes,
    models: state.models,
    priceRange: state.priceRange,
    sortBy: state.sortBy,
    // Exclude: searchTerm, filterOrder (temporary)
  }),
  
  // Handle schema migrations
  migrate: (persistedState: any, version: number) => {
    if (version === 0) {
      return migrateFromV0ToV1(persistedState)
    }
    return persistedState
  }
}
```

## 🔄 Integration Patterns

### **React Query Integration**
```tsx
// Combine Zustand filters with React Query
const useFilteredListings = () => {
  const filters = useConsolidatedFilterStore(state => ({
    makes: state.makes,
    priceRange: state.priceRange,
    sortBy: state.sortBy
  }))
  
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => fetchListings(filters),
    enabled: !!filters, // Only fetch when filters exist
    staleTime: 5 * 60 * 1000 // 5-minute cache
  })
}
```

### **URL Synchronization**
```tsx
// Two-way sync between Zustand store and URL
export const useUrlSync = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useConsolidatedFilterStore()
  
  // URL → Store
  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    if (hasFilterChanges(filters, urlFilters)) {
      applyFiltersToStore(urlFilters)
    }
  }, [searchParams])
  
  // Store → URL
  useEffect(() => {
    const urlParams = convertFiltersToUrl(filters)
    setSearchParams(urlParams, { replace: true })
  }, [filters])
}
```

## 🧪 Testing Store Logic

### **Store Testing Patterns**
```typescript
describe('consolidatedFilterStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useConsolidatedFilterStore.getState().clearFilters()
  })
  
  it('toggles array filters correctly', () => {
    const { toggleArrayFilter, makes } = useConsolidatedFilterStore.getState()
    
    // Add filter
    toggleArrayFilter('makes', 'Toyota')
    expect(useConsolidatedFilterStore.getState().makes).toEqual(['Toyota'])
    
    // Remove filter
    toggleArrayFilter('makes', 'Toyota')
    expect(useConsolidatedFilterStore.getState().makes).toEqual([])
  })
  
  it('computes active filters correctly', () => {
    const store = useConsolidatedFilterStore.getState()
    
    store.setFilter('makes', ['Toyota', 'BMW'])
    store.setFilter('priceRange', [10000, 30000])
    
    const activeFilters = store.getActiveFilters()
    expect(activeFilters).toHaveLength(2)
    expect(activeFilters[0].key).toBe('makes')
  })
  
  it('maintains filter order for UX', () => {
    const store = useConsolidatedFilterStore.getState()
    
    store.setFilter('makes', ['Toyota'])
    store.setFilter('bodyTypes', ['SUV'])
    store.setFilter('fuelTypes', ['Electric'])
    
    expect(store.filterOrder).toEqual(['makes', 'bodyTypes', 'fuelTypes'])
  })
})
```

### **Persistence Testing**
```typescript
describe('Store Persistence', () => {
  it('persists filter state correctly', () => {
    const store = useConsolidatedFilterStore.getState()
    
    // Set some filters
    store.setFilter('makes', ['Toyota'])
    store.setFilter('priceRange', [15000, 25000])
    
    // Simulate page reload
    const persistedData = localStorage.getItem('filter-storage')
    const parsed = JSON.parse(persistedData)
    
    expect(parsed.state.makes).toEqual(['Toyota'])
    expect(parsed.state.priceRange).toEqual([15000, 25000])
  })
  
  it('handles migration from v0 to v1', () => {
    const v0Data = {
      makes: ['Toyota'],
      priceRange: [10000, 30000]
      // Missing: filterOrder, version
    }
    
    const migrated = migrateFromV0ToV1(v0Data)
    
    expect(migrated.filterOrder).toEqual([])
    expect(migrated.version).toBe(1)
  })
})
```

## 🚀 Usage Examples

### **Basic Filter Management**
```tsx
const FilterComponent = () => {
  const makes = useConsolidatedFilterStore(state => state.makes)
  const toggleMake = useConsolidatedFilterStore(state => state.toggleArrayFilter)
  const clearFilters = useConsolidatedFilterStore(state => state.clearFilters)
  
  return (
    <div>
      {AVAILABLE_MAKES.map(make => (
        <Checkbox
          key={make}
          checked={makes.includes(make)}
          onChange={() => toggleMake('makes', make)}
        >
          {make}
        </Checkbox>
      ))}
      
      <Button onClick={clearFilters}>
        Ryd alle filtre
      </Button>
    </div>
  )
}
```

### **Theme Integration**
```tsx
const ThemeToggle = () => {
  const { theme, actualTheme, setTheme } = useThemeStore()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(actualTheme === 'light' ? 'dark' : 'light')}
    >
      {actualTheme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  )
}
```

### **Modal Management**
```tsx
const ListingCard = ({ listing }) => {
  const openModal = useUIStore(state => state.openModal)
  
  return (
    <Card onClick={() => 
      openModal('listingDetails', { listingId: listing.id })
    }>
      {/* Card content */}
    </Card>
  )
}

const ListingDetailsModal = () => {
  const modal = useUIStore(state => state.modals.listingDetails)
  const closeModal = useUIStore(state => state.closeModal)
  
  return (
    <Dialog 
      open={modal.isOpen} 
      onOpenChange={() => closeModal('listingDetails')}
    >
      {/* Modal content */}
    </Dialog>
  )
}
```

---

*The Zustand store system provides efficient, type-safe global state management with persistence and performance optimizations tailored for the leasingbørsen application.*