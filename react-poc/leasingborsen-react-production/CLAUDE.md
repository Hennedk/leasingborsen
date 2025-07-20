# CLAUDE.md - React Migration (Streamlined)

This file provides essential guidance to Claude Code (claude.ai/code) when working with the React migration of the Vue leasingborsen application.

## 🔄 Starting a New Session

**Claude should read these files when beginning work:**

### Essential Reading (Always)
1. **This file (CLAUDE.md)** - Core development patterns and architecture
2. **README.md** - Project overview and quick start guide

### Context-Specific Reading (Based on Task)
- **AI/PDF Work**: `docs/archive/AI_EXTRACTION_SYSTEM.md`
- **Admin Features**: `docs/archive/ADMIN_COMPONENTS_REVIEW.md` 
- **Testing Work**: `docs/archive/TESTING_INSTRUCTIONS.md`
- **Performance Issues**: `docs/archive/OPTIMIZATION-SESSION.md`
- **Deployment Tasks**: `docs/archive/PRODUCTION_MONITORING_DEPLOYMENT_SUMMARY.md`
- **Build Problems**: `docs/archive/BUILD_ISSUES.md`

### Key Source Files to Review
```
src/lib/supabase.ts              # Database client and query patterns
src/hooks/useListings.ts         # Core data fetching logic
src/components/ListingCard.tsx   # Main component patterns
src/stores/consolidatedFilterStore.ts # State management architecture
src/types/index.ts               # TypeScript definitions
```

## 📚 Quick Navigation to Specialized Documentation

For detailed information on specific areas, see:

### 🚡 Advanced Development
- **Serena Integration**: See `docs/archive/SERENA_SETUP.md` for semantic code analysis setup
- **Performance Optimization**: See `docs/archive/OPTIMIZATION-SESSION.md` for detailed optimization strategies
- **Development History**: See `docs/archive/DEVELOPMENT_HISTORY.md` for project evolution

### 🤖 AI Features  
- **AI PDF Extraction System**: See `docs/archive/AI_EXTRACTION_SYSTEM.md` for complete AI implementation
- **Batch Processing**: See `docs/archive/BATCH_PROCESSING_FEATURE_PLAN.md` for batch workflow details
- **Hybrid AI Extraction**: See `docs/archive/HYBRID_AI_EXTRACTION_COMPLETE.md` for multi-provider AI setup
- **Recent Extraction Fixes (July 2025)**: Major improvements to deletion logic and column fixes

### 📊 Admin Interface
- **Admin Components**: See `docs/archive/ADMIN_COMPONENTS_REVIEW.md` for admin UI patterns
- **Admin Workflows**: See `docs/archive/ADMIN_REVIEW.md` for administrative processes
- **Admin Listings**: See `docs/archive/ADMIN_LISTINGS_REVIEW.md` for listing management

### 🧪 Testing & Quality
- **Testing Guidelines**: See `docs/archive/TESTING_INSTRUCTIONS.md` for comprehensive testing setup
- **Build Issues**: See `docs/archive/BUILD_ISSUES.md` for troubleshooting build problems

### 🚀 Deployment
- **Production Deployment**: See `docs/archive/PRODUCTION_MONITORING_DEPLOYMENT_SUMMARY.md`
- **Staging Setup**: See `docs/archive/staging-deployment/STAGING_SETUP.md`

---

## Development Commands

### Core Development Workflow
```bash
npm install          # Install dependencies (Node.js 18+ required)
npm run dev          # Start development server with instant HMR (default port)
npm run build        # TypeScript check + Vite build for production
npm run preview      # Preview production build on port 4173
npm run lint         # ESLint code quality checking
```

### Testing Commands
```bash
npm run test                  # Interactive test mode with watch
npm run test:run             # Run all tests once (CI mode)
npm run test:coverage        # Generate coverage reports (90% functions, 80% branches)
npm run test:refactored      # Run tests for Phase 1 refactored components
npm run build:test           # Test + Build pipeline for CI/CD integration
```

### Specialized Operations
```bash
# AI PDF Processing
npm run pdf:test             # Test PDF processing with sample files
npm run pdf:deploy           # Deploy Edge Functions to Supabase

# Database Operations
supabase db start           # Start local Supabase instance
supabase db reset           # Reset local database with fresh migrations
supabase functions serve    # Serve Edge Functions locally

# Admin Edge Functions Deployment
supabase functions deploy admin-listing-operations    # Deploy listing CRUD
supabase functions deploy admin-seller-operations     # Deploy seller management
supabase functions deploy admin-image-operations      # Deploy image upload
supabase functions deploy admin-reference-operations  # Deploy reference data
```

## Technology Stack Overview

### Enterprise-Grade Stack
- **Frontend**: React 19.1.0 with modern hooks and Suspense
- **Build System**: Vite 6.3.5 with optimized HMR and code splitting
- **Styling**: Tailwind CSS 4.1.8 + shadcn/ui (40+ components) with Radix UI primitives
- **Backend**: Supabase with PostgreSQL, Row Level Security, and Edge Functions
- **Routing**: React Router 7.6.2 with lazy loading and nested routes
- **State Management**: Zustand 5.0.5 + React Query 5.80.7 for optimal caching
- **AI Integration**: Multi-provider system (OpenAI GPT-3.5/4, Anthropic Claude) via secure Edge Functions
- **Testing**: Vitest 3.2.4 + React Testing Library 16.3.0 + MSW 2.10.2
- **Type Safety**: TypeScript 5.8.3 with strict configuration
- **Icons**: Lucide React 0.513.0 (513+ icons)
- **Language**: Danish-first interface (da-DK localization)

### Project Structure
```
src/
├── components/           # Comprehensive React component system
│   ├── ui/              # shadcn/ui component library (40+ components)
│   ├── admin/           # Comprehensive admin interface
│   ├── mobile-filters/  # Mobile-optimized filter system
│   ├── shared/filters/  # Reusable filter components
│   ├── layout/          # Application layout system
│   ├── listings/        # Car listing display components
│   └── error/           # Error handling components
├── pages/               # Route components with lazy loading
├── hooks/               # Advanced custom React hooks (35+ hooks)
├── services/            # Business logic and external integrations
│   └── ai-extraction/   # AI-powered PDF extraction system
├── stores/              # Global state management
├── lib/                 # Core utilities and configurations
├── types/               # Comprehensive TypeScript definitions
├── test/                # Testing infrastructure
└── styles/              # Global styles and themes
```

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

## Admin Edge Functions Architecture

### Secure Admin Operations
All admin operations use secure Edge Functions with service role authentication to bypass RLS restrictions while maintaining security and validation.

**Available Edge Functions:**
- **admin-listing-operations** - Car listings CRUD with offers management
- **admin-seller-operations** - Seller management with comprehensive validation
- **admin-image-operations** - Image upload with background processing
- **admin-reference-operations** - Reference data CRUD for all automotive tables

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

### Admin Hook Usage Examples
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
```

### Error Handling and Validation
All admin Edge Functions include:
- **Danish localization** for all error messages
- **Comprehensive validation** with detailed error feedback
- **React Query integration** with automatic cache invalidation
- **Loading states** and error boundaries
- **Graceful fallback** for background processing failures

### Security Features
- **Service role authentication** bypasses RLS restrictions
- **Server-side validation** prevents malicious input
- **Audit logging** for all admin operations
- **Zero breaking changes** to existing admin workflows

## Performance Guidelines

### Bundle Size Targets
- **CSS**: ~109KB (achieved with shadcn/ui tree-shaking)
- **JavaScript**: ~292KB (achieved with strategic code splitting)
- **Images**: Lazy loading with intersection observer optimization
- **Critical Path**: Minimized with route-based code splitting

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

## Danish Localization Requirements

### Utilities
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

### Localization Standards
- All UI text must be in Danish
- Use `toLocaleString('da-DK')` for number formatting
- Error messages in Danish: "Der opstod en fejl ved..."

## Code Quality Requirements

### Mandatory Standards
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

### File Naming Conventions
- **Components**: PascalCase with .tsx extension (`ListingCard.tsx`)
- **Pages**: PascalCase with Page suffix (`ListingsPage.tsx`)
- **Hooks**: camelCase with "use" prefix (`useUrlSync.ts`, `useImageLazyLoading.ts`)
- **Types**: PascalCase in types file (`types/index.ts`)
- **Utilities**: camelCase (`utils.ts`)
- **Mobile Components**: Group in subdirectories (`mobile-filters/MobileViewHeader.tsx`)
- **Shared Components**: Organize by feature or functionality

## Environment Configuration

### Core Environment Variables
```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Integration (Feature Flag Only - API keys stored securely in Edge Functions)
# Note: Actual API keys are stored server-side in Supabase Edge Functions for security

# Feature Flags
VITE_AI_EXTRACTION_ENABLED=false             # Enable AI PDF extraction features
VITE_BATCH_PROCESSING_ENABLED=true           # Enable batch processing workflows
VITE_MOBILE_FILTERS_ENABLED=true             # Enable mobile filter enhancements

# Development & Debugging
VITE_DEBUG_MODE=false                        # Enable debug logging
VITE_PERFORMANCE_MONITORING=true             # Enable performance tracking
```

### Security Best Practices
- **All API keys** stored in environment variables (never in code)
- **Local development** uses `.env.local` (gitignored)
- **Production secrets** managed through Vercel environment variables
- **Staging environment** uses separate API keys and databases
- **Feature flags** enable safe deployment of new features

## Database Architecture

### Primary Data Sources
- **Primary Data Source**: `full_listing_view` (denormalized for performance)
- **Core Tables**: `listings`, `lease_pricing`, `sellers`, comprehensive reference data
- **AI Integration Tables**: `ai_usage_log` (comprehensive tracking), `monthly_ai_usage` (cost view)
- **Workflow Tables**: `processing_jobs`, `listing_changes`, `batch_imports`

### Query Patterns
- **Performance queries** use `full_listing_view` with intelligent deduplication
- **Admin operations** use direct table access with proper filtering
- **AI services** use specialized views for extraction workflows

### Security
- **Advanced Row Level Security (RLS)** with multi-role policies
- **admin** role: Full access to all data and operations
- **service_role**: Backend service access for Edge Functions
- **authenticated**: Limited read access for public features

---

## 🎯 Enterprise Application Summary

This React application has evolved from a Vue migration into a **sophisticated, enterprise-grade car leasing platform** with:

### Key Achievements
- **🚀 Technology Excellence**: React 19.1.0 + TypeScript 5.8.3 + Vite 6.3.5
- **🤖 AI-Powered Innovation**: Secure Edge Function-based AI system with comprehensive cost controls
- **📊 Admin Interface Sophistication**: Complete CRUD operations and batch workflows
- **⚡ Performance & Quality**: Bundle optimization meeting production targets
- **🧪 Professional Testing**: 90% function coverage with comprehensive testing
- **📱 Mobile-First Design**: Dedicated mobile components and touch optimization
- **🔒 Enterprise Security**: Multi-role RLS and comprehensive audit trails

### Development Experience
- **Professional tooling** with instant HMR and TypeScript integration
- **Comprehensive testing** with high coverage requirements
- **Danish localization** throughout the entire application
- **Error recovery** with intelligent retry mechanisms
- **Performance monitoring** with bundle analysis and optimization
- **AI cost tracking** with budget management and usage analytics

### Recent Critical Improvements (July 2025)
- **Extraction System Fixes**: Resolved column reference issues (removed `engine_info`, `colour`, fixed `duration_months` → `period_months`)
- **Deletion Logic Overhaul**: Removed model-specific deletion restrictions - now ALL unmatched listings are marked for deletion
- **Data Type Corrections**: Fixed DECIMAL vs INTEGER mismatches in lease_pricing table
- **Duplicate Handling**: Added ON CONFLICT handling for duplicate offers from AI extraction
- **Foreign Key Management**: Enhanced deletion process to remove ALL references before deleting listings

### Admin Edge Functions Implementation (January 2025)
- **Complete CRUD Operations**: Implemented secure Edge Functions for all admin functionality
- **RLS Authentication Resolution**: Service role authentication bypasses RLS restrictions
- **Image Upload Stability**: Background processing error handling prevents upload failures
- **Backward Compatibility**: Zero breaking changes to existing admin workflows
- **Enterprise Security**: Server-side validation with comprehensive error handling
- **React Query Integration**: Proper caching, loading states, and error boundaries

⚠️ **IMPORTANT**: With the removal of model-specific deletion restrictions, uploading partial inventories (e.g., single model PDFs) will mark ALL unmatched listings for deletion. Always review extraction results carefully before applying changes.

This application represents a **successful Vue to React migration** that has resulted in a feature-rich, performant, and maintainable enterprise platform ready for commercial deployment in the Danish car leasing market.