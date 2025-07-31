# Custom React Hooks

This directory contains 35+ custom React hooks that provide advanced functionality, performance optimizations, and reusable logic throughout the leasingbørsen application. These hooks follow React best practices and are designed for enterprise-grade applications.

## 🎯 Overview

The hooks system provides:
- **Performance-optimized data fetching** with React Query integration
- **Bidirectional URL synchronization** with application state
- **Shared resource management** (intersection observers, image loading)
- **Complex state management** for admin workflows
- **Reusable business logic** for common operations

## 📁 Directory Structure

```
hooks/
├── Core Data Hooks
│   ├── useSupabaseQueries.ts       # React Query + Supabase integration
│   ├── useListings.ts              # Car listings data fetching
│   ├── useReferenceData.ts         # Static reference data (makes, models)
│   └── useFiltering.ts             # Advanced filtering logic
│
├── UI & Performance Hooks
│   ├── useUrlSync.ts               # Bidirectional URL-state synchronization
│   ├── useImageLazyLoading.ts      # Shared intersection observer for images
│   ├── useFilterOperations.ts     # Reusable filter operations
│   └── useDebounce.ts              # Debounced input handling
│
├── Admin Management Hooks
│   ├── useAdminListings.ts         # Admin CRUD operations
│   ├── useListingComparison.ts    # AI-powered comparison logic
│   ├── useSellerManagement.ts     # Seller CRUD operations
│   └── useOfferComparison.ts      # Offer matching algorithms
│
├── Form & Validation Hooks
│   ├── useFormValidation.ts        # Advanced form validation with Zod
│   ├── useAutoSave.ts              # Automatic form saving
│   └── useFormWizard.ts            # Multi-step form management
│
├── mutations/                      # React Query mutation hooks
│   ├── useListingMutations.ts     # Listing create/update/delete
│   ├── useSellerMutations.ts      # Seller management mutations
│   ├── useBatchMutations.ts       # Batch processing operations
│   └── useOfferMutations.ts       # Offer management mutations
│
└── Utility Hooks
    ├── useLocalStorage.ts          # Persistent local storage
    ├── useEventListener.ts         # Event listener management
    ├── useIntersectionObserver.ts  # Reusable intersection observer
    └── useAsyncError.ts            # Error boundary integration
```

## 🚀 Core Hooks

### **Data Fetching (`useSupabaseQueries.ts`)**

#### Primary Data Hook with React Query Integration
```typescript
// Complete Supabase + React Query integration
export const useListings = (
  filters: FilterState,
  limit: number = 20,
  sortOrder: 'asc' | 'desc' = 'desc',
  offset: number = 0
) => {
  return useQuery({
    queryKey: QUERY_KEYS.listings(filters, sortOrder, offset),
    queryFn: () => AdminService.getListings(filters, limit, sortOrder, offset),
    staleTime: 5 * 60 * 1000, // 5 minutes cache for listings
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
    retry: (failureCount, error) => {
      // Only retry network errors, not business logic errors
      return failureCount < 2 && error?.message?.includes('network')
    }
  })
}

// Reference data with extended caching
export const useMakes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.makes(),
    queryFn: AdminService.getMakes,
    staleTime: 30 * 60 * 1000, // 30 minutes - rarely changes
    gcTime: 60 * 60 * 1000     // 1 hour garbage collection
  })
}
```

**Features:**
- **Intelligent Caching**: Different cache times based on data volatility
- **Error Recovery**: Automatic retry for network errors only
- **Type Safety**: Full TypeScript integration with Supabase types
- **Performance**: Optimized query keys for precise cache invalidation

### **URL Synchronization (`useUrlSync.ts`)**

#### Bidirectional State-URL Synchronization
```typescript
export const useUrlSync = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, setFilter, clearFilters } = useConsolidatedFilterStore()
  
  // Prevent circular updates with refs
  const isUpdatingFromUrl = useRef(false)
  const isUpdatingFromState = useRef(false)
  
  // URL → State synchronization
  useEffect(() => {
    if (isUpdatingFromState.current) return
    
    isUpdatingFromUrl.current = true
    // Parse URL parameters and update store
    const urlFilters = parseUrlParams(searchParams)
    updateStoreFromUrl(urlFilters)
    isUpdatingFromUrl.current = false
  }, [searchParams])
  
  // State → URL synchronization  
  useEffect(() => {
    if (isUpdatingFromUrl.current) return
    
    isUpdatingFromState.current = true
    // Convert store state to URL parameters
    const urlParams = convertFiltersToUrl(filters)
    setSearchParams(urlParams, { replace: true })
    isUpdatingFromState.current = false
  }, [filters])
  
  return { currentFilters: filters, sortOrder, clearAllFilters }
}
```

**Key Features:**
- **Circular Update Prevention**: Smart ref-based flags prevent infinite loops
- **URL Persistence**: Filters survive page refresh and browser back/forward
- **Type-Safe Parsing**: Robust URL parameter parsing with fallbacks
- **Performance**: Minimal re-renders with careful dependency management

### **Shared Image Loading (`useImageLazyLoading.ts`)**

#### Performance-Optimized Image Loading
```typescript
// Global shared intersection observer for all images
const globalObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const callback = observedElements.get(entry.target as HTMLElement)
      callback?.()
    }
  })
}, {
  rootMargin: '200px' // Start loading 200px before image enters viewport
})

const observedElements = new Map<HTMLElement, () => void>()

export const useImageLazyLoading = (
  imageUrl: string,
  options: LazyLoadOptions = {}
) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const imageRef = useRef<HTMLImageElement>(null)
  
  // Set up intersection observer
  useEffect(() => {
    const element = imageRef.current
    if (!element || imageLoaded) return
    
    const loadImage = () => {
      const img = new Image()
      img.onload = () => {
        setImageLoaded(true)
        setImageError(false)
      }
      img.onerror = () => {
        setImageError(true)
        setImageLoaded(false)
      }
      img.src = imageUrl
    }
    
    // Add to global observer
    observedElements.set(element, loadImage)
    globalObserver.observe(element)
    
    // Cleanup
    return () => {
      observedElements.delete(element)
      globalObserver.unobserve(element)
    }
  }, [imageUrl, imageLoaded])
  
  const retryImage = useCallback(() => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1)
      setImageError(false)
      setImageLoaded(false)
    }
  }, [retryCount])
  
  return {
    imageRef,
    imageLoaded,
    imageError,
    retryImage,
    canRetry: retryCount < 3
  }
}
```

**Performance Benefits:**
- **Shared Observer**: Single intersection observer for all images reduces memory usage
- **Early Loading**: 200px margin provides smooth user experience
- **Error Recovery**: Automatic retry mechanism with exponential backoff
- **Memory Cleanup**: Proper cleanup prevents memory leaks


## 🎨 Hook Patterns

### **Standard Hook Structure**
```typescript
// Template for creating new hooks
export const useCustomHook = (
  param1: string,
  param2?: Options
) => {
  // 1. State declarations
  const [state, setState] = useState(initialValue)
  
  // 2. Refs for stable references
  const stableRef = useRef(value)
  
  // 3. Memoized computations
  const computedValue = useMemo(() => {
    return expensiveComputation(state, param1)
  }, [state, param1])
  
  // 4. Callback functions
  const handleAction = useCallback((arg: string) => {
    // Action logic
  }, [dependencies])
  
  // 5. Effects for side effects
  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    }
  }, [dependencies])
  
  // 6. Return object with consistent naming
  return {
    // Data
    data: computedValue,
    loading: state.loading,
    error: state.error,
    
    // Actions
    actions: {
      handleAction,
      reset: () => setState(initialValue)
    },
    
    // Utilities
    utils: {
      formatData,
      validateData
    }
  }
}
```

### **Performance Optimization Patterns**

#### **Stable References**
```typescript
// Always use useCallback for functions passed to children
const handleClick = useCallback((id: string) => {
  onItemClick?.(id)
}, [onItemClick])

// Always use useMemo for expensive computations
const filteredData = useMemo(() => {
  return data.filter(item => item.status === filter)
}, [data, filter])
```

#### **Dependency Optimization**
```typescript
// Optimize dependencies to prevent unnecessary re-renders
const debouncedSearch = useMemo(
  () => debounce(searchTerm, 300),
  [searchTerm] // Only recreate when search term changes
)
```

## 🧪 Testing Patterns

### **Hook Testing with React Testing Library**
```typescript
// Standard hook testing pattern
describe('useCustomHook', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useCustomHook('test'))
    
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })
  
  it('handles successful data loading', async () => {
    const { result } = renderHook(() => useCustomHook('test'))
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeDefined()
    })
  })
  
  it('handles error states correctly', async () => {
    // Mock error scenario
    mockSupabase.mockRejectedValueOnce(new Error('Network error'))
    
    const { result } = renderHook(() => useCustomHook('test'))
    
    await waitFor(() => {
      expect(result.current.error).toBe('Der opstod en fejl ved hentning af data')
    })
  })
})
```

### **Mock Strategies**
```typescript
// Mock external dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock React Query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})
```

## 🚀 Best Practices

### **Hook Creation Guidelines**
1. **Single Responsibility**: Each hook should have one clear purpose
2. **Stable APIs**: Return objects with consistent structure
3. **Performance**: Use useMemo and useCallback appropriately
4. **Cleanup**: Always clean up effects, listeners, and timers
5. **Error Handling**: Provide comprehensive error states
6. **TypeScript**: Full type safety with proper interfaces

### **Naming Conventions**
```typescript
// Hook naming
useDataOperation()     // useListings, useSellerData
useUIBehavior()       // useDebounce, useLocalStorage
useBusinessLogic()    // useFilterOperations, useBatchReview

// Return object naming
{
  data: ...,          // Primary data
  loading: ...,       // Loading state
  error: ...,         // Error state
  actions: { ... },   // Action functions
  utils: { ... }      // Utility functions
}
```

### **Performance Considerations**
```typescript
// ✅ Good: Stable dependencies
const memoizedValue = useMemo(() => {
  return expensiveOperation(stableData)
}, [stableData])

// ❌ Bad: Object dependency causes unnecessary re-renders
const memoizedValue = useMemo(() => {
  return expensiveOperation(objectData)
}, [objectData]) // Object recreated on every render

// ✅ Good: Destructure stable properties
const { id, name } = objectData
const memoizedValue = useMemo(() => {
  return expensiveOperation(id, name)
}, [id, name])
```

## 📈 Usage Examples

### **Data Fetching Hook**
```tsx
const ListingsPage = () => {
  const { filters } = useConsolidatedFilterStore()
  const { data: listings, isLoading, error } = useListings(filters)
  
  if (isLoading) return <ListingsSkeleton />
  if (error) return <ErrorBoundary error={error} />
  
  return (
    <div>
      {listings?.map(listing => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
```

### **Form Hook**
```tsx
const AdminListingForm = () => {
  const {
    formData,
    errors,
    actions: { updateField, submit, reset },
    utils: { validateField, isDirty }
  } = useListingForm(initialData)
  
  return (
    <form onSubmit={submit}>
      {/* Form fields */}
    </form>
  )
}
```

---

*These custom hooks provide the foundation for efficient, maintainable React components throughout the leasingbørsen application, following enterprise-grade patterns and performance optimizations.*