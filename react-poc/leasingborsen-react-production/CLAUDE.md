# CLAUDE.md - React Migration

This file provides guidance to Claude Code (claude.ai/code) when working with the React migration of the Vue leasingborsen application.

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

## Testing Approach
- **Current**: Manual testing in light and dark modes
- **Future**: Vitest + React Testing Library + MSW
- **Performance**: React DevTools Profiler + Lighthouse

## Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```