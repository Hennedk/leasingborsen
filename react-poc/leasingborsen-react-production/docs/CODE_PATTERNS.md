# Code Patterns - Leasingborsen React Platform

Comprehensive code patterns and best practices for the Danish car leasing platform.

## Core Development Patterns

### shadcn/ui + Tailwind CSS Best Practices
**CRITICAL**: Always use shadcn/ui components for consistent styling

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
```typescript
// Global state with Zustand
import { useFilterStore } from '@/stores/consolidatedFilterStore'

const { filters, setFilter, clearFilters } = useFilterStore()

// Local component state with React hooks
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
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

### Supabase Query Patterns
```typescript
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

## Admin Edge Function Patterns

### Admin Hook Usage
```typescript
// Seller operations
import { useAdminSellerOperations } from '@/hooks/useAdminSellerOperations'
const { createSeller, updateSeller, deleteSeller } = useAdminSellerOperations()

// Reference data operations  
import { useAdminReferenceOperations } from '@/hooks/useAdminReferenceOperations'
const { createReference, updateReference } = useAdminReferenceOperations()

// Image operations
import { useAdminImageUpload } from '@/hooks/useAdminImageUpload'
const { uploadImage, isUploading } = useAdminImageUpload()

// Extraction operations
import { useListingComparison } from '@/hooks/useListingComparison'
const { applySelectedChanges, isApplyingSelectedChanges } = useListingComparison()
```

### Admin Edge Function Pattern
```typescript
// Always use admin Edge Functions for admin operations
import { useAdminListingOperations } from '@/hooks/useAdminListingOperations'

const AdminListingForm = () => {
  const { createListing, updateListing, isLoading } = useAdminListingOperations()
  
  const handleSubmit = async (listingData) => {
    try {
      const result = await createListing({
        listingData,
        offers: undefined // Optional offers array
      })
      
      // Success handling is automatic via React Query
      navigate('/admin/listings')
    } catch (error) {
      // Error handling is automatic via toast notifications
      console.error('Creation failed:', error)
    }
  }
}
```

## Performance Patterns

### React Component Optimization
```typescript
// Memoize expensive components
const ListingCard = React.memo(({ car, loading }) => {
  // Implementation with memoized callbacks
  const handleClick = useCallback(() => {
    navigate(`/listing/${car.id}`)
  }, [car.id])
  
  return <Card onClick={handleClick}>...</Card>
})

// Custom hooks for performance
import { useUrlSync } from '@/hooks/useUrlSync'
const { currentFilters, sortOrder } = useUrlSync()

import { useImageLazyLoading } from '@/hooks/useImageLazyLoading'
const { imageRef, imageLoaded, imageError, retryImage, canRetry } = useImageLazyLoading(imageUrl)
```

### Price Impact Visualization Pattern
```typescript
// Price Matrix for efficient calculations
import { PriceMatrix } from '@/lib/priceMatrix'

// Create price matrix for lease options
const priceMatrix = useMemo(() => {
  if (leaseOptions.length === 0) return null
  return new PriceMatrix(leaseOptions)
}, [leaseOptions])

// Calculate price impacts for dropdowns
const mileagePriceImpacts = useMemo(() => {
  if (!priceMatrix || !selectedLease) return new Map()
  
  return new Map(
    availableMileages.map(mileage => [
      mileage,
      priceMatrix.getPriceImpact(
        selectedLease.monthly_price,
        mileage,
        selectedPeriod,
        selectedUpfront
      )
    ])
  )
}, [priceMatrix, selectedLease, selectedPeriod, selectedUpfront])

// Custom select item with price impact
<PriceImpactSelectItem
  value={mileage.toString()}
  label={`${mileage.toLocaleString('da-DK')} km/år`}
  impact={mileagePriceImpacts?.get(mileage)}
  isSelected={mileage === selectedMileage}
/>

// Handle sparse pricing matrices gracefully
if (!impact || !impact.available) {
  // Show regular item without price impact
  return <SelectItem>{label}</SelectItem>
}
```

## Error Handling Patterns

### Danish Localization
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

### Error Boundaries
```typescript
// Always include error handling in async operations
try {
  const result = await operation()
  // Success path
} catch (error) {
  setError('Der opstod en fejl') // Danish user message
  console.error('Operation failed:', error) // English log
}
```

## TypeScript Patterns

### Type Definitions
```typescript
// types/index.ts
export interface Car {
  listing_id: string
  make: string
  model: string
  variant?: string
  monthly_price?: number
  retail_price?: number
  lease_score?: number
  // ... other fields
}

export interface FilterState {
  make?: string
  model?: string
  priceRange?: { min: number; max: number }
  bodyType?: string
  // ... other filters
}
```

### Type Guards
```typescript
// Type guard for API responses
const isValidCar = (data: unknown): data is Car => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'listing_id' in data &&
    'make' in data &&
    'model' in data
  )
}
```

## Testing Patterns

### Component Testing
```typescript
// Basic component test structure
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('ListingCard', () => {
  it('displays car information correctly', async () => {
    render(<ListingCard carId="123" />)
    
    await waitFor(() => {
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument()
      expect(screen.getByText('15.000 kr/md')).toBeInTheDocument()
    })
  })
})
```

## File Naming Conventions
- **Components**: PascalCase with .tsx extension (`ListingCard.tsx`)
- **Pages**: PascalCase with Page suffix (`ListingsPage.tsx`)
- **Hooks**: camelCase with "use" prefix (`useUrlSync.ts`)
- **Types**: PascalCase in types file (`types/index.ts`)
- **Utilities**: camelCase (`utils.ts`)
- **Mobile Components**: Group in subdirectories (`mobile-filters/MobileViewHeader.tsx`)