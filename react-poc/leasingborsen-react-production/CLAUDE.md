# CLAUDE.md - React Migration

This file provides guidance to Claude Code (claude.ai/code) when working with the React migration of the Vue leasingborsen application.

## 🧠 Context Awareness & Session Continuity

### Quick Context Pickup
When starting a new session, Claude should quickly establish context by reviewing:

1. **README.md** - Overall project structure, dependencies, and tech stack
2. **This file (CLAUDE.md)** - Architectural principles and migration strategy  
3. **Key source files:**
   - `src/lib/supabase.ts` - Database client and query patterns
   - `src/hooks/useListings.ts` - Core data fetching logic
   - `src/components/ListingCard.tsx` - Main component patterns
   - `src/stores/filterStore.ts` - State management architecture
   - `src/types/index.ts` - TypeScript definitions

### High-Level Goals Clarification
If needed, Claude should ask for clarification on:
- **Performance focus** - Component optimization, bundle size, lazy loading
- **Accessibility improvements** - ARIA labels, keyboard navigation, screen reader support
- **Refactoring priorities** - Component decomposition, code organization, pattern consistency
- **Feature development** - New functionality vs. improvement of existing features

## 📝 Documenting Changes for Session Continuity

### Change Documentation Standard
For each significant modification, Claude should include:

#### **Inline Documentation:**
```tsx
/* Claude Change Summary:
 * Refactored MobileFilterOverlay (769→200 lines) into focused components.
 * Added React.memo optimization and useCallback for performance.
 * Extracted shared filter logic to useFilterOperations hook.
 * Related to: CODEBASE_IMPROVEMENTS_ADMIN.md Critical Issue #1
 */
```

#### **Component Header Comments:**
```tsx
// Component: MobileFilterMainView
// Purpose: Mobile filter interface with category selection
// Dependencies: useFilterStore, useReferenceData
// Performance: Memoized with React.memo
// Last Modified: [Date] - Split from MobileFilterOverlay for maintainability
```

#### **File Organization Changes:**
When reorganizing files, document the move:
```tsx
// Moved from: src/components/MobileFilterOverlay.tsx
// New location: src/components/mobile-filters/MobileFilterMainView.tsx
// Reason: Component decomposition for maintainability (CODEBASE_IMPROVEMENTS_ADMIN.md)
```

### Commit Message Standards
When making commits, use this format:
```
type(scope): description

refactor(admin): split MobileFilterOverlay into focused components

- Extract MobileFilterHeader, MobileFilterSearch, MobileFilterCategories
- Add React.memo optimization for performance
- Reduce main component from 769 to 200 lines
- Related to CODEBASE_IMPROVEMENTS_ADMIN.md Critical Issue #1

Claude Change Summary: Component decomposition for maintainability
```

## 🔁 Maintaining Consistency Across Sessions

### Architecture Patterns to Preserve
When working across multiple sessions, Claude should:

#### **1. Reuse Established Utilities**
- **formatPrice()** - Danish currency formatting (`1.234,56 kr`)
- **useUrlSync()** - URL parameter synchronization
- **useImageLazyLoading()** - Optimized image loading with intersection observer
- **cn()** - Tailwind class merging utility

#### **2. Follow Component Patterns**
- **React.memo()** for expensive components
- **useCallback()** and **useMemo()** for performance optimization
- **Error boundaries** for graceful failure handling
- **shadcn/ui components** over custom styling

#### **3. Maintain File Naming Conventions**
- **Components**: PascalCase with .tsx extension (`ListingCard.tsx`)
- **Hooks**: camelCase with "use" prefix (`useUrlSync.ts`)
- **Types**: PascalCase in types file (`types/index.ts`)
- **Pages**: PascalCase with Page suffix (`AdminListings.tsx`)

#### **4. State Management Consistency**
- **Zustand** for global state (filters, theme)
- **React Query** for server state with consistent caching patterns
- **React Hook Form** + **Zod** for form validation
- **Local useState** for component-specific state

#### **5. Import/Export Standards**
- **Always use path aliases**: `@/components` not `../components`
- **Barrel exports** in major directories (`index.ts` files)
- **Consistent import order**: React, third-party, local components, types

### Current Architecture Reference Files
Before making changes, review these key files for established patterns:

```typescript
// Key Reference Files for Patterns
src/components/ListingCard.tsx          // Component optimization patterns
src/hooks/useImageLazyLoading.ts       // Custom hook patterns  
src/components/admin/DataTable.tsx     // Table component patterns
src/stores/filterStore.ts              // State management patterns
src/lib/validations.ts                 // Form validation patterns
src/components/ui/                     // shadcn/ui usage patterns
```

### Session Handoff Guidelines
When ending a session, Claude should:

1. **Update relevant documentation** (this file, README.md, or improvement plans)
2. **Test critical functionality** to ensure no regressions
3. **Note any breaking changes** or incomplete refactors
4. **Highlight next priority items** from improvement plans

When starting a new session, Claude should:

1. **Review recent changes** in git history or session summaries
2. **Check current project state** with `npm run build` and `npm run lint`
3. **Identify continuation points** from improvement documentation
4. **Confirm development server** is working with `npm run dev`

## Development Commands

### Core Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # ESLint checking
```

### Development Environment
- **Vite**: React + TypeScript template with instant HMR
- **Port**: Development server runs on default Vite port
- **Hot Reload**: All changes reflect immediately during development

## Architecture Overview

### Technology Stack Migration
- ~~**Frontend**: Vue.js 3 with Composition API~~ → **React 18 with hooks**
- **Build Tool**: Vite (unchanged)
- ~~**Styling**: Tailwind CSS 4 + DaisyUI 5~~ → **Tailwind CSS + shadcn/ui**
- **Backend**: Supabase (unchanged - PostgreSQL with Row Level Security)
- ~~**Routing**: Vue Router 4~~ → **React Router 6**
- ~~**Icons**: Lucide Vue Next~~ → **Lucide React**
- **Language**: Danish-first interface (da-DK localization) - unchanged

### Project Structure
```
src/
├── components/           # Reusable React components
│   ├── layout/          # Layout components
│   │   ├── BaseLayout.tsx   # Main app layout
│   │   └── Header.tsx       # Navigation header
│   ├── listings/        # Car listing related components
│   │   ├── ListingCard.tsx
│   │   ├── ListingDetails.tsx
│   │   └── ListingForm.tsx
│   ├── filters/         # Search and filter components
│   │   ├── FilterSidebar.tsx
│   │   └── PriceRangeFilter.tsx
│   ├── mobile-filters/  # Mobile-specific filter components
│   │   ├── MobileViewHeader.tsx
│   │   ├── MobileSearchInput.tsx
│   │   └── MobileFilterMainView.tsx
│   └── ui/              # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (other shadcn components)
├── pages/               # Route-level components
│   ├── HomePage.tsx     # Landing page with hero banner
│   ├── ListingsPage.tsx # Car listings with filters
│   ├── ListingPage.tsx  # Individual car detail page
│   ├── CreateListingPage.tsx # Create new listing
│   ├── AboutPage.tsx    # About page
│   └── admin/           # Administrative CRUD interfaces
│       ├── AdminListingsPage.tsx
│       ├── AdminMakesPage.tsx
│       └── AdminModelsPage.tsx
├── hooks/               # Custom React hooks
│   ├── useUrlSync.ts    # URL synchronization with filters
│   ├── useImageLazyLoading.ts # Optimized image loading
│   ├── useCarData.ts    # Car data fetching logic
│   └── useSupabase.ts   # Supabase operations
├── lib/                 # Utilities and configurations
│   ├── supabase.ts      # Supabase client setup
│   └── utils.ts         # Utility functions (cn, etc.)
└── styles/              # Global styles
    └── index.css        # Tailwind + shadcn/ui configuration
```

### Database Architecture
- **Primary Data Source**: `full_listing_view` (unchanged)
- **Core Tables**: `listings`, `lease_pricing` (unchanged)
- **Query Pattern**: Always use `full_listing_view` for car data retrieval
- **Security**: Row Level Security (RLS) enabled on all tables

## Key Technical Changes from Vue

### Component Patterns: Vue → React

#### State Management
```typescript
// Vue (before)
const car = ref(null)
const loading = ref(true)
const error = ref(null)

// React (after)
const [car, setCar] = useState<Car | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

#### Props and Events
```typescript
// Vue (before)
const props = defineProps({
  carId: { type: String, required: true }
})
const emit = defineEmits(['carUpdated'])

// React (after)
interface ListingCardProps {
  carId: string
  onCarUpdated?: (car: Car) => void
}

const ListingCard: React.FC<ListingCardProps> = ({ carId, onCarUpdated }) => {
  // Component logic
}
```

#### Lifecycle Management
```typescript
// Vue (before)
onMounted(async () => {
  await fetchCar()
})

// React (after)
useEffect(() => {
  fetchCar()
}, [carId])
```

### UI Component Migration: DaisyUI → shadcn/ui

#### Card Components
```tsx
// DaisyUI (before)
<div class="card bg-base-100 shadow-md border border-base-300">
  <div class="card-body">
    <h2 class="card-title text-primary">{{ car.make }} {{ car.model }}</h2>
  </div>
</div>

// shadcn/ui (after)
<Card>
  <CardHeader>
    <CardTitle className="text-primary">{car.make} {car.model}</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Button Components
```tsx
// DaisyUI (before)
<button class="btn btn-primary">Submit</button>

// shadcn/ui (after)
<Button variant="default">Submit</Button>
```

### Standard React Component Structure
```tsx
import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Car } from '@/types'

interface ListingCardProps {
  carId: string
  showActions?: boolean
  onCarUpdated?: (car: Car) => void
  onError?: (error: string) => void
}

export const ListingCard: React.FC<ListingCardProps> = ({
  carId,
  showActions = true,
  onCarUpdated,
  onError
}) => {
  // State
  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const displayPrice = car?.monthly_price?.toLocaleString('da-DK') || '–'

  // Effects
  useEffect(() => {
    fetchCar()
  }, [carId])

  // Methods
  const fetchCar = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('full_listing_view')
        .select('*')
        .eq('listing_id', carId)
        .single()
      
      if (fetchError) throw fetchError
      
      setCar(data)
      onCarUpdated?.(data)
    } catch (err) {
      console.error('Error fetching car:', err)
      const errorMessage = 'Der opstod en fejl ved indlæsning'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="bg-muted rounded-lg h-48" />
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Content
  if (!car) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">{car.make} {car.model}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{displayPrice} kr/md</p>
        {showActions && (
          <div className="mt-4 flex gap-2">
            <Button variant="default">Se detaljer</Button>
            <Button variant="outline">Kontakt</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Custom Hooks Pattern
```typescript
// useCarData.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Car, CarFilters } from '@/types'

export const useCarData = (filters: CarFilters = {}) => {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCars = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let query = supabase.from('full_listing_view').select('*')
      
      // Apply filters
      if (filters.make) query = query.eq('make', filters.make)
      if (filters.bodyType) query = query.eq('body_type', filters.bodyType)
      if (filters.priceRange) {
        query = query
          .gte('monthly_price', filters.priceRange.min)
          .lte('monthly_price', filters.priceRange.max)
      }
      
      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (fetchError) throw fetchError
      setCars(data || [])
      
    } catch (err) {
      console.error('Error fetching cars:', err)
      setError('Der opstod en fejl ved hentning af biler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCars()
  }, [JSON.stringify(filters)])

  return { cars, loading, error, refetch: fetchCars }
}
```

### Theming with shadcn/ui
```tsx
// Standard shadcn/ui theming approach using CSS variables
// Light theme variables are defined in :root
// Dark theme variables are defined in .dark class
// No theme provider needed - uses standard CSS approach

// To switch to dark mode, add 'dark' class to html element:
// document.documentElement.classList.add('dark')

// CSS variables are automatically mapped through Tailwind config
// in tailwind.config.js theme.extend.colors
```

## Performance Guidelines

### Bundle Size Targets
- **CSS**: Optimize with shadcn/ui tree-shaking
- **JavaScript**: Code splitting with React.lazy and Suspense
- **Loading**: Implement Skeleton components from shadcn/ui
- **Images**: Use lazy loading for car gallery images

### React Performance Patterns
- **Always** memoize expensive listing components with React.memo
- **Use** custom hooks for complex state logic (useUrlSync, useImageLazyLoading)
- **Implement** shared intersection observers for image loading
- **Break down** components over 300 lines into focused pieces
- **Optimize** with useCallback and useMemo for stable references

### Custom Hooks for Optimization
```typescript
// URL synchronization
import { useUrlSync } from '@/hooks/useUrlSync'
const { currentFilters, sortOrder } = useUrlSync()

// Optimized image loading
import { useImageLazyLoading } from '@/hooks/useImageLazyLoading'
const { imageRef, imageLoaded, imageError, retryImage, canRetry } = useImageLazyLoading(imageUrl)

// Component memoization
const ListingCard = React.memo(({ car, loading }) => {
  // Implementation with memoized callbacks
})
```

### Code Splitting Pattern
```tsx
import React, { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const AdminListingsPage = React.lazy(() => import('@/pages/admin/AdminListingsPage'))

export const App = () => {
  return (
    <Suspense fallback={<Skeleton className="w-full h-screen" />}>
      <AdminListingsPage />
    </Suspense>
  )
}
```

## Danish Localization Utilities
```typescript
// lib/utils.ts
export const formatPrice = (price?: number): string => 
  price ? `${price.toLocaleString('da-DK')} kr/md` : '–'

export const formatDate = (date: string | Date): string => 
  new Date(date).toLocaleDateString('da-DK')

export const errorMessages = {
  fetchError: 'Der opstod en fejl ved hentning af data',
  saveError: 'Kunne ikke gemme ændringerne',
  notFound: 'Ressourcen blev ikke fundet',
  networkError: 'Netværksfejl - prøv igen senere'
} as const
```

## Code Quality Requirements
- **Always** use TypeScript with proper typing
- **Always** include loading and error states
- **Always** use Danish error messages
- **Always** format prices with da-DK locale  
- **Always** use shadcn/ui components instead of custom styling
- **Never** use console.log (use console.error for actual errors only)
- **Always** implement proper accessibility with shadcn/ui
- **Always** use React.memo for expensive components when appropriate
- **Extract** complex logic to custom hooks for reusability
- **Break down** large components (>300 lines) into focused pieces
- **Use** shared components for common patterns (headers, search inputs)
- **Optimize** with useCallback and useMemo for performance-critical paths

## File Naming Conventions
- **Components**: PascalCase with .tsx extension (`ListingCard.tsx`)
- **Pages**: PascalCase with Page suffix (`ListingsPage.tsx`)
- **Hooks**: camelCase with "use" prefix (`useUrlSync.ts`, `useImageLazyLoading.ts`)
- **Types**: PascalCase in types file (`types/index.ts`)
- **Utilities**: camelCase (`utils.ts`)
- **Mobile Components**: Group in subdirectories (`mobile-filters/MobileViewHeader.tsx`)
- **Shared Components**: Organize by feature or functionality

## Testing Framework & Requirements

### Mandatory Testing Standards
- **CRITICAL**: All refactored components MUST have comprehensive test coverage before Phase completion
- **REQUIRED**: Every custom hook must include unit tests with edge cases
- **REQUIRED**: Error boundaries must have tests for both success and failure scenarios
- **REQUIRED**: All async operations require integration tests with proper loading states

### Testing Stack
- **Unit Testing**: Vitest + React Testing Library
- **API Mocking**: MSW (Mock Service Worker) for Supabase operations
- **Component Testing**: Isolated component testing with proper props and state
- **Integration Testing**: Component interaction and data flow validation
- **E2E Testing**: Playwright (future requirement for critical user flows)

### Test Coverage Requirements
- **Components**: 90%+ coverage including error states and loading states
- **Hooks**: 100% coverage including edge cases and error handling
- **Utils**: 100% coverage for all utility functions
- **Integration**: All critical user workflows must have integration tests

### Testing Patterns & Standards
```typescript
// Test file naming: ComponentName.test.tsx
// Hook tests: useHookName.test.ts
// Integration tests: FeatureName.integration.test.tsx

// Required test scenarios for each component:
describe('ComponentName', () => {
  // 1. Rendering tests
  it('renders correctly with required props', () => {})
  it('renders loading state', () => {})
  it('renders error state', () => {})
  
  // 2. Interaction tests  
  it('handles user interactions correctly', () => {})
  it('calls callbacks with correct parameters', () => {})
  
  // 3. Edge cases
  it('handles empty data gracefully', () => {})
  it('handles network errors appropriately', () => {})
  
  // 4. Accessibility
  it('meets accessibility requirements', () => {})
})
```

### Performance Testing
- **Bundle Analysis**: Regular bundle size monitoring with CI/CD integration
- **Component Performance**: React DevTools Profiler for render optimization
- **Core Web Vitals**: Lighthouse CI for performance regression detection
- **Memory Leaks**: Testing for proper cleanup of subscriptions and timers

### Phase 1 Testing Implementation Status
✅ **COMPLETED**: Testing framework setup with Vitest + React Testing Library + MSW
✅ **COMPLETED**: Core component tests for refactored batch components
✅ **COMPLETED**: Custom hook testing with proper mocking strategies  
✅ **COMPLETED**: Production build integration with `npm run build:test`

**Tested Components:**
- ✅ `useBatchReviewState` hook: 7 comprehensive tests covering utility functions, state management, and error handling
- ✅ `BatchReviewHeader` component: Integration tests with Router context
- ✅ Test infrastructure: Mock setup, async testing, component isolation

**Test Commands:**
```bash
npm run test                  # Interactive test mode
npm run test:run             # Run all tests once  
npm run test:refactored      # Run tests for Phase 1 refactored components
npm run build:test           # Test + Build pipeline for CI/CD
npm run test:coverage        # Coverage reporting
```

**Coverage Achievement:**
- ✅ **Custom Hooks**: 100% function coverage for useBatchReviewState utilities
- ✅ **Component Architecture**: Proper test isolation and mocking strategies
- ✅ **Error Boundaries**: Test infrastructure for error state validation
- ✅ **Build Integration**: Tests pass before production build

## Environment Variables
```bash
# Use .env.local for local development (already in .gitignore)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup Improvements

### Enhanced Architecture
- **Type Safety**: Split `CarListing` interface into focused, composable types:
  - `CarListingCore` - Essential car data
  - `CarSpecifications` - Technical specifications
  - `LeasePricing` - Pricing information
  - `CarMedia` - Images and descriptions
  - `SellerInfo` - Contact information
- **Code Reuse**: Shared `applyFilters()` function eliminates duplication
- **Performance**: React Query integration with intelligent caching
- **Error Handling**: Comprehensive error boundary for connection failures

### React Query Integration
```typescript
// New hooks for optimized data fetching
import { useListings, useListingById, useMakes, useModels } from '@/hooks/useSupabaseQueries'

// Example usage with automatic caching
const { data: listings, isLoading, error } = useListings(filters, 20, 'desc', 0)
const { data: makes } = useMakes() // Cached for 30 minutes
```

### Performance Optimizations
- **Caching Strategy**: 
  - Listings: 5 minutes cache
  - Reference data: 30 minutes cache
  - Individual listings: 10 minutes cache
- **Error Recovery**: Automatic retry for network errors
- **Prefetching**: Available for pagination and detail views
- **Query Invalidation**: Smart cache updates after mutations

### Error Boundary Usage
```typescript
import { SupabaseErrorBoundary } from '@/components/SupabaseErrorBoundary'

// Wrap components that use Supabase
<SupabaseErrorBoundary>
  <ListingsPage />
</SupabaseErrorBoundary>
```

### Security Enhancements
- Environment variables secured in `.gitignore`
- Local development uses `.env.local`
- Production environment separation maintained