# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server with HMR
npm run build        # Build for production (target: ~109KB CSS, ~292KB JS)
npm run preview      # Preview production build on port 4173
```

### Development Environment
- **Vite 6.3.5**: Provides instant HMR and build optimization
- **Port**: Development server runs on default Vite port
- **Hot Reload**: All changes reflect immediately during development

## Architecture Overview

### Technology Stack
- **Frontend**: React 18+ with TypeScript and modern hooks
- **Build Tool**: Vite 6.3.5 with React plugin and HMR
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **UI Framework**: shadcn/ui with Radix UI primitives
- **State Management**: Zustand for global state, React hooks for local state
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **Routing**: React Router 6 with lazy loading
- **Icons**: Lucide React (consistent with shadcn/ui)
- **Language**: Danish-first interface (da-DK localization)
- **Fonts**: Outfit (sans-serif), Fira Code (monospace)

### Project Structure
```
src/
├── components/           # Reusable React components
│   ├── ui/              # shadcn/ui components (button, card, input, etc.)
│   ├── BaseLayout.tsx   # Main app layout with Header
│   ├── Header.tsx       # Navigation with theme switcher
│   ├── HeroBanner.tsx   # Landing page hero section
│   ├── Listing*.tsx     # Car listing related components
│   ├── Filter*.tsx      # Search and filter components
│   └── Container.tsx    # Centralized responsive container
├── pages/               # Route-level components
│   ├── Home.tsx         # Landing page with hero banner
│   ├── Listings.tsx     # Car listings with filters
│   ├── Listing.tsx      # Individual car detail page
│   └── About.tsx        # About page
├── hooks/               # Custom React hooks
│   ├── useListings.ts   # Listings data fetching
│   └── useReferenceData.ts # Reference data fetching
├── stores/              # Zustand state management
│   ├── filterStore.ts   # Filter state management
│   └── themeStore.ts    # Theme switching state
├── lib/                 # Utilities and configurations
│   ├── supabase.ts      # Supabase client setup
│   ├── utils.ts         # shadcn/ui utilities (cn function)
│   └── themes.ts        # Theme configuration
└── index.css            # Global styles + shadcn/ui theme variables
```

### Database Architecture
- **Primary Data Source**: `full_listing_view` (denormalized view for performance)
- **Core Tables**: `listings`, `lease_pricing`, plus reference tables for makes, models, etc.
- **Query Pattern**: Always use `full_listing_view` for car data retrieval
- **Security**: Row Level Security (RLS) enabled on all tables

## Key Technical Constraints

### shadcn/ui + Tailwind CSS 4 Best Practices
**CRITICAL**: Follow shadcn/ui patterns for consistent component styling

```tsx
// ✅ Correct approach - Use shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

<Card className="shadow-md border border-border">
  <CardHeader>
    <CardTitle className="text-primary">{car.make} {car.model}</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default" size="lg">View Details</Button>
  </CardContent>
</Card>

// ❌ Avoid custom CSS classes - use shadcn/ui components instead
<div className="custom-card">  <!-- Use shadcn/ui Card component -->
```

### State Management Pattern
Uses Zustand for global state management with React hooks for local component state.

```typescript
// Global state with Zustand
import { useFilterStore } from '@/stores/filterStore'
import { useThemeStore } from '@/stores/themeStore'

const { filters, setFilter, clearFilters } = useFilterStore()
const { theme, setTheme } = useThemeStore()

// Local component state with React hooks
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Danish Localization Requirements
- All UI text must be in Danish
- Use `toLocaleString('da-DK')` for number formatting
- Error messages in Danish: "Der opstod en fejl ved..."

## Component Development Patterns

### Standard React Component Structure
```tsx
import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// Props interface with TypeScript
interface CarDetailsProps {
  carId: string
  showActions?: boolean
  className?: string
  onCarUpdated?: (car: any) => void
  onError?: (error: string) => void
}

const CarDetails: React.FC<CarDetailsProps> = ({ 
  carId, 
  showActions = true, 
  className,
  onCarUpdated,
  onError 
}) => {
  // React state hooks
  const [car, setCar] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Computed values with useMemo
  const displayPrice = useMemo(() => 
    car?.monthly_price?.toLocaleString('da-DK') || '–',
    [car?.monthly_price]
  )

  // Data fetching with error handling
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

  // Lifecycle with useEffect
  useEffect(() => {
    fetchCar()
  }, [carId])

  // Loading state
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="h-48 bg-muted rounded-lg" />
      </Card>
    )
  }

  // Error state with Danish message
  if (error) {
    return (
      <div className={cn("bg-destructive text-destructive-foreground p-4 rounded-lg", className)}>
        <span>{error}</span>
      </div>
    )
  }

  // Content
  return (
    <Card className={cn("shadow-md", className)}>
      <CardHeader>
        <CardTitle className="text-primary">
          {car?.make} {car?.model}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{displayPrice} kr/md</p>
        {showActions && (
          <Button className="mt-4" onClick={() => console.log('Action clicked')}>
            Se detaljer
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default CarDetails
```

### Supabase Query Patterns
```javascript
// Standard query with filtering
const fetchCars = async (filters = {}) => {
  try {
    let query = supabase.from('full_listing_view').select('*')
    
    // Apply filters conditionally
    if (filters.make) query = query.eq('make', filters.make)
    if (filters.bodyType) query = query.eq('body_type', filters.bodyType)
    if (filters.priceRange) {
      query = query
        .gte('monthly_price', filters.priceRange.min)
        .lte('monthly_price', filters.priceRange.max)
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    return data || []
    
  } catch (err) {
    console.error('Error fetching cars:', err)
    throw new Error('Der opstod en fejl ved hentning af biler')
  }
}
```

## Performance Guidelines

### Bundle Size Targets
- **CSS**: ~109KB (includes shadcn/ui components + global styles)
- **JavaScript**: ~292KB (optimized with code splitting)
- **Loading**: Always implement skeleton loading states
- **Images**: Use lazy loading for car gallery images


## File Naming Conventions
- **Components**: PascalCase (`ListingCard.vue`, `FilterSidebar.vue`)
- **Pages**: PascalCase (`Home.vue`, `Listings.vue`)
- **Composables**: camelCase with "use" prefix (`useCarData.js`)
- **Utilities**: camelCase (`supabase.js`)

## Admin Interface
Complete CRUD operations available for:
- Car listings (`/admin/listings`)
- Makes and models (`/admin/makes`, `/admin/models`)
- Reference data (`/admin/body-types`, `/admin/fuel-types`, etc.)

## Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing Approach
- **Current**: Manual testing across all 8 themes and browsers
- **Future**: Vitest + Vue Testing Library (planned)
- **Performance**: Lighthouse testing for Core Web Vitals

## Common Danish UI Text Patterns
```javascript
const errorMessages = {
  fetchError: 'Der opstod en fejl ved hentning af data',
  saveError: 'Kunne ikke gemme ændringerne',
  notFound: 'Ressourcen blev ikke fundet',
  networkError: 'Netværksfejl - prøv igen senere'
}

const formatPrice = (price) => `${price?.toLocaleString('da-DK')} kr/md`
const formatDate = (date) => new Date(date).toLocaleDateString('da-DK')
```

## Code Quality Requirements
- **Always** use `<script setup>` syntax
- **Always** include loading and error states
- **Always** use Danish error messages
- **Always** format prices with da-DK locale
- **Never** use DaisyUI classes in `@apply` rules
- **Never** use console.log (use console.error for actual errors only)