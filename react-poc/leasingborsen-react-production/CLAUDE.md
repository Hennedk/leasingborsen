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
- **Database Cleanup**: `docs/DATABASE_CLEANUP_COMPREHENSIVE_PLAN.md` (Phase 2 completed July 2025)

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

### 🚀 AI Prompt Management (Quick Reference)
**To update AI extraction prompt version:**
1. **Check current version**: 
   ```sql
   SELECT name, openai_prompt_version, model, active 
   FROM responses_api_configs 
   WHERE name = 'vehicle-extraction';
   ```
2. **Update to new version** (e.g., from v17 to v19):
   ```sql
   UPDATE responses_api_configs 
   SET 
     openai_prompt_version = '19',
     model = 'gpt-4.1',  -- Update model if changed
     updated_at = NOW()
   WHERE name = 'vehicle-extraction' AND active = true;
   ```
3. **Verify update**:
   ```sql
   SELECT name, openai_prompt_version, model FROM responses_api_configs WHERE name = 'vehicle-extraction';
   ```
4. **No redeployment needed** - changes take effect immediately via database config

**Note**: Prompts must be created in OpenAI Playground first, then version number updated in database.

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

# Complete Edge Functions Deployment
supabase functions deploy admin-listing-operations     # Deploy listing CRUD
supabase functions deploy admin-seller-operations      # Deploy seller management  
supabase functions deploy admin-image-operations       # Deploy image upload
supabase functions deploy admin-reference-operations   # Deploy reference data
supabase functions deploy ai-extract-vehicles          # Deploy AI PDF extraction
supabase functions deploy apply-extraction-changes     # Deploy extraction application
supabase functions deploy compare-extracted-listings   # Deploy listing comparison
supabase functions deploy calculate-lease-score        # Deploy individual lease scoring
supabase functions deploy batch-calculate-lease-scores # Deploy bulk lease scoring
supabase functions deploy pdf-proxy                    # Deploy secure PDF proxy
supabase functions deploy manage-prompts               # Deploy prompt management
supabase functions deploy remove-bg                    # Deploy background removal
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

**Admin Operations:**
- **admin-listing-operations** - Car listings CRUD with offers management
- **admin-seller-operations** - Seller management with comprehensive validation
- **admin-image-operations** - Image upload with background processing
- **admin-reference-operations** - Reference data CRUD for all automotive tables

**AI & Extraction:**
- **ai-extract-vehicles** - AI-powered PDF extraction with multi-provider support
- **apply-extraction-changes** - Secure application of extraction changes (bypasses RLS)
- **compare-extracted-listings** - Compare extracted listings with existing inventory
- **pdf-proxy** - Secure PDF download proxy with SSRF protection

**Scoring & Analysis:**
- **calculate-lease-score** - Individual lease score calculation
- **batch-calculate-lease-scores** - Bulk lease score processing with specific ID targeting

**Utilities:**
- **manage-prompts** - AI prompt management and versioning
- **remove-bg** - Background removal for images

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

// Extraction operations
import { useListingComparison } from '@/hooks/useListingComparison'
const { applySelectedChanges, isApplyingSelectedChanges } = useListingComparison()
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

## AI Extraction Edge Functions

### Extraction Workflow Architecture
The AI extraction system uses multiple Edge Functions for secure, scalable PDF processing:

```
PDF Upload → ai-extract-vehicles → compare-extracted-listings → apply-extraction-changes
    ↓              ↓                        ↓                           ↓
PDF Proxy    AI Processing           Comparison Review           Database Updates
```

### Key Extraction Edge Functions

#### **apply-extraction-changes**
- **Purpose**: Secure application of extraction changes with service role permissions
- **Solves**: RLS policy violations when creating/updating/deleting listings from frontend
- **Input**: `sessionId`, `selectedChangeIds[]`, `appliedBy`
- **Features**:
  - **Full CRUD Support**: CREATE, UPDATE, DELETE operations
  - **RLS Bypass**: Uses service_role to bypass Row Level Security
  - **Error Handling**: Per-change error tracking with detailed logging
  - **Input Validation**: UUID validation, session verification
  - **Comprehensive Response**: Applied counts, error details, session metadata

```typescript
// Usage in frontend
import { useListingComparison } from '@/hooks/useListingComparison'

const { applySelectedChanges } = useListingComparison()

await applySelectedChanges({
  sessionId: 'uuid-session-id',
  selectedChangeIds: ['uuid1', 'uuid2', 'uuid3'],
  appliedBy: 'admin'
})
```

#### **pdf-proxy**
- **Purpose**: Secure PDF download with SSRF protection and dynamic dealer whitelisting
- **Features**:
  - **Database-driven whitelisting**: Validates URLs against dealer PDF URLs in database
  - **Static fallback**: Maintains backward compatibility with hardcoded trusted domains
  - **SSRF Protection**: Comprehensive IP blocking and DNS validation
  - **Performance caching**: 5-minute TTL for domain validation
  - **HTTPS enforcement**: Only allows secure connections

#### **ai-extract-vehicles**
- **Purpose**: AI-powered vehicle extraction from PDF price lists
- **Features**:
  - **Multi-provider support**: OpenAI GPT-3.5/4, Anthropic Claude
  - **Cost tracking**: Comprehensive usage logging and budget management
  - **Rate limiting**: Prevents API abuse and cost overruns
  - **Error recovery**: Intelligent retry with exponential backoff

### Extraction Change Types

The system supports all extraction change types through `apply-extraction-changes`:

**CREATE Operations:**
- Insert new listings with complete reference lookups (make_id, model_id, etc.)
- Create lease pricing records from extracted offers
- Validate required references before insertion

**UPDATE Operations:**
- Differential updates (only modify changed fields)
- Reference resolution while preserving existing data
- Replace lease pricing with new offers

**DELETE Operations:**  
- Cascaded deletion with proper cleanup order:
  1. Remove extraction_listing_changes references
  2. Delete price_change_log entries
  3. Delete lease_pricing records
  4. Delete listings record

**Error Handling:**
- Individual change error tracking
- Session status management (completed vs partially_applied)
- Comprehensive error logging with change-specific context

## Lease Score System

### Overview
The lease score system provides intelligent scoring of car listings based on value analysis across multiple pricing offers. Each listing can have multiple lease pricing options, and the system calculates the best possible score.

### Scoring Algorithm
The lease score uses a weighted scoring system (0-100 scale):

```typescript
// Scoring weights and calculation
const totalScore = Math.round(
  (monthlyRateScore * 0.45) +     // 45% - Monthly rate vs retail price
  (mileageScore * 0.35) +         // 35% - Mileage allowance value  
  (flexibilityScore * 0.20)       // 20% - Contract term flexibility
)
```

### Score Components

**1. Monthly Rate Score (45% weight)**
- Calculated as `(monthlyPrice / retailPrice) * 100`
- Score bands:
  - < 0.9%: 100 points (excellent)
  - < 1.1%: 90 points (very good)
  - < 1.3%: 80 points (good)
  - < 1.5%: 70 points (fair)
  - < 1.7%: 60 points (below average)
  - < 1.9%: 50 points (poor)
  - < 2.1%: 40 points (very poor)
  - ≥ 2.1%: 25 points (extremely poor)

**2. Mileage Score (35% weight)**
- Normalized to 15,000 km baseline: `mileagePerYear / 15000`
- Higher mileage allowance = better value = higher score
- Linear scaling from 50-100 points

**3. Flexibility Score (20% weight)**
- Based on contract period length
- 36 months: 75 points (standard)
- 24 months: 50 points (less flexible)
- 48+ months: 100 points (most flexible)

### Multi-Offer Processing
When a listing has multiple lease offers:

1. **Calculate Individual Scores**: Each pricing option gets its own score
2. **Select Best Score**: The highest total score becomes the listing's official score
3. **Store Winner Details**: The winning offer's pricing_id and breakdown are stored

```typescript
// Multiple offers example
const scores = listing.lease_pricing.map(pricing => ({
  pricingId: pricing.id,
  score: calculateLeaseScore({
    retailPrice: listing.retail_price,
    monthlyPrice: pricing.monthly_price,
    contractMonths: pricing.period_months,
    mileagePerYear: pricing.mileage_per_year
  })
}))

// Use the best score (highest total)
const bestScore = scores.reduce((best, current) => 
  current.score.totalScore > best.score.totalScore ? current : best
)
```

### Database Schema
```sql
-- New fields added to listings table
ALTER TABLE listings ADD COLUMN lease_score INTEGER;
ALTER TABLE listings ADD COLUMN lease_score_calculated_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN lease_score_breakdown JSONB;

-- Updated full_listing_view includes lease score fields
-- See migration: supabase/migrations/20250721_update_full_listing_view_with_lease_score.sql
```

### Admin Interface Integration

**Bulk Calculation Hook**
```typescript
import { useBulkLeaseScoreCalculation } from '@/hooks/useBulkLeaseScoreCalculation'

const { mutate: calculateScores, isLoading } = useBulkLeaseScoreCalculation()

// Calculate scores for selected listings
calculateScores(selectedListings) // Passes specific listing IDs
```

**Score Display Component**
```typescript
import { LeaseScoreBadge } from '@/components/ui/LeaseScoreBadge'

<LeaseScoreBadge
  score={listing.lease_score}
  breakdown={listing.lease_score_breakdown}
  calculatedAt={listing.lease_score_calculated_at}
  retailPrice={listing.retail_price}
  showTooltip={true}
/>
```

**Visual Score Indicators**
- **Green (≥80)**: Excellent value deals
- **Yellow (60-79)**: Good value deals  
- **Red (<60)**: Below-average value deals
- **Gray**: No score calculated or missing retail price

### Edge Functions

**Individual Calculation**
- Endpoint: `calculate-lease-score`
- Input: Raw pricing data (retailPrice, monthlyPrice, etc.)
- Returns: Complete score breakdown

**Bulk Processing**
- Endpoint: `batch-calculate-lease-scores?ids=id1,id2&force=true`
- Features specific listing targeting
- Processes multiple offers per listing
- Automatic cache invalidation

### Utilities

**Verification Script**
```bash
node scripts/check-lease-score-migration.js  # Verify migration applied
```

**Database Migration**
```bash
# Applied via Supabase Dashboard
# File: apply-migration-correct.sql (contains the manual migration)
```

### Troubleshooting

**Score Not Showing**
1. Check `retail_price` exists on listing
2. Verify lease pricing options exist
3. Confirm score calculation succeeded
4. Hard refresh browser to clear React Query cache

**Calculation Fails**
1. Check listing has `lease_pricing` records
2. Verify `retail_price` is not null
3. Review Edge Function logs for errors

**Cache Issues**
- Fixed: React Query cache invalidation uses proper query keys
- Frontend now targets specific listing IDs instead of limit-based processing
- Immediate UI updates after successful calculation

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
- **AI Configuration Tables**: `responses_api_configs`, `config_versions`, `api_call_logs`, `input_schemas`, `text_format_configs`
- **Workflow Tables**: `processing_jobs`, `extraction_listing_changes`, `batch_imports`

### Database Cleanup (July 2025)
- **Phase 1 COMPLETED**: Removed 3 unused integration tables (`integration_run_logs`, `integration_runs`, `integrations`)
- **Phase 2 COMPLETED**: Removed 4 legacy tables (`listing_offers`, `price_change_log`, `listing_changes`, `import_logs`)
- **Total Result**: ~25-30% database complexity reduction with zero functional impact
- **Documentation**: See `docs/DATABASE_CLEANUP_COMPREHENSIVE_PLAN.md` for complete analysis
- **Migrations**: `20250725_cleanup_phase1_remove_integration_tables.sql`, `20250727_cleanup_phase2_remove_legacy_tables.sql`

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