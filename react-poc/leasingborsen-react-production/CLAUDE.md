# CLAUDE.md - React Migration

This file provides guidance to Claude Code (claude.ai/code) when working with the React migration of the Vue leasingborsen application.

## 🚡 Serena Integration for Enhanced Development

This project is configured with **Serena**, an advanced semantic code analysis toolkit that significantly enhances Claude's capabilities when working with this codebase.

### Starting Serena

Before beginning work on this project, start the Serena server:

```bash
# Ensure uv is installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Start Serena
cd /home/hennedk/projects/leasingborsen/react-poc/leasingborsen-react-production
uvx --from git+https://github.com/oraios/serena serena-mcp-server --project $(pwd)
```

### Enhanced Capabilities with Serena

With Serena running, Claude can perform advanced operations:

#### 1. **Semantic Code Navigation**
```
"Find all components that handle car filtering"
"Show me where useListings hook is used"
"Find all TypeScript interfaces for pricing data"
```

#### 2. **Intelligent Code Analysis**
```
"Analyze the component hierarchy for the admin section"
"Show me all Supabase queries in the codebase"
"Find components that might have performance issues"
```

#### 3. **Smart Refactoring**
```
"Rename the CarListing interface to VehicleListing everywhere"
"Update all Button components to use the new variant prop"
"Add React.memo to all expensive list components"
```

#### 4. **Architecture Understanding**
```
"Map out the data flow from Supabase to UI components"
"Show the relationship between filter store and listings"
"Analyze the routing structure and lazy loading"
```

### Efficiency Benefits

- **⚡ 10x faster code navigation** - Semantic search vs text search
- **🎯 Precise refactoring** - Updates all references automatically
- **🧠 Context awareness** - Understands TypeScript types and React patterns
- **🔍 Deep insights** - Analyzes component relationships and dependencies
- **✨ Proactive suggestions** - Identifies optimization opportunities

### Best Practices with Serena

1. **Always start Serena** before beginning development work
2. **Use semantic queries** instead of file path navigation when possible
3. **Leverage refactoring tools** for consistent codebase updates
4. **Request architecture analysis** before major changes
5. **Use symbol search** for finding type definitions and implementations

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

### Serena-Powered Development Workflow

When working with Serena active, follow this efficient workflow:

1. **Start with Analysis**
   ```
   "Analyze the current implementation of [feature]"
   "Show me all components related to [functionality]"
   ```

2. **Make Informed Changes**
   ```
   "Update all instances of [old pattern] to [new pattern]"
   "Refactor [component] to use [new approach]"
   ```

3. **Verify Impact**
   ```
   "Show me all components affected by this change"
   "Find any TypeScript errors after the refactoring"
   ```

### Real-World Serena Examples for Leasingbørsen

#### Finding Code Patterns
```
# Instead of: "Check files in src/components/filters/"
Use: "Find all components that modify the filter store"

# Instead of: "Look for Supabase queries"
Use: "Show me all database queries for car listings"

# Instead of: "Search for price formatting"
Use: "Find all places where prices are displayed to users"
```

#### Refactoring Examples
```
# Update all shadcn/ui imports
"Replace all imports from '@/components/ui/button' with '@/components/ui/Button'"

# Add error boundaries
"Find all page components and suggest where to add error boundaries"

# Optimize performance
"Identify all list components that could benefit from React.memo"
```

#### Architecture Analysis
```
# Component relationships
"Show the component tree for the admin interface"

# Data flow
"Trace the data flow from Supabase queries to UI rendering"

# Dependencies
"Analyze which components depend on the filterStore"
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

# Deployment Workflows  
npm run staging:deploy       # Deploy to staging environment with health checks
npm run phase2:test:staging  # Test Phase 2 features in staging environment

# Database Operations
supabase db start           # Start local Supabase instance
supabase db reset           # Reset local database with fresh migrations
supabase functions serve    # Serve Edge Functions locally
```

### Development Environment
- **Build System**: Vite 6.3.5 with React plugin and optimized HMR
- **TypeScript**: Strict mode with comprehensive type checking
- **Port Configuration**: Development server on default Vite port (usually 5173)
- **Hot Reload**: Sub-second updates with React Fast Refresh
- **Bundle Analysis**: Built-in Vite bundle analysis and tree-shaking
- **Path Aliases**: `@/` for clean imports throughout the codebase

## Architecture Overview

### Enterprise-Grade Technology Stack
- **Frontend**: React 19.1.0 with modern hooks and Suspense
- **Build System**: Vite 6.3.5 with optimized HMR and code splitting
- **Styling**: Tailwind CSS 4.1.8 + shadcn/ui (40+ components) with Radix UI primitives
- **Backend**: Supabase with PostgreSQL, Row Level Security, and Edge Functions
- **Routing**: React Router 7.6.2 with lazy loading and nested routes
- **State Management**: Zustand 5.0.5 + React Query 5.80.7 for optimal caching
- **AI Integration**: Anthropic Claude + OpenAI for PDF extraction and processing
- **Testing**: Vitest 3.2.4 + React Testing Library 16.3.0 + MSW 2.10.2
- **Type Safety**: TypeScript 5.8.3 with strict configuration
- **Icons**: Lucide React 0.513.0 (513+ icons)
- **Language**: Danish-first interface (da-DK localization)

### Enterprise Project Structure
```
src/
├── components/           # Comprehensive React component system
│   ├── ui/              # shadcn/ui component library (40+ components)
│   │   ├── button.tsx   # Button variations and states
│   │   ├── card.tsx     # Card layouts and compositions
│   │   ├── dialog.tsx   # Modal and dialog systems
│   │   ├── table.tsx    # Advanced data table components
│   │   ├── form.tsx     # Form fields and validation
│   │   └── ... (35+ other shadcn components)
│   ├── admin/           # Comprehensive admin interface
│   │   ├── batch/       # Batch processing workflows
│   │   │   ├── BatchReviewPage.tsx
│   │   │   ├── BatchReviewHeader.tsx
│   │   │   └── ComparisonView.tsx
│   │   ├── sellers/     # Seller management system
│   │   │   ├── SellersTable.tsx
│   │   │   ├── SellerForm.tsx
│   │   │   └── SellerListings.tsx
│   │   ├── offers/      # Offer comparison system
│   │   │   ├── OffersTable.tsx
│   │   │   ├── OfferComparison.tsx
│   │   │   └── OfferHistory.tsx
│   │   ├── listings/    # Advanced listing management
│   │   │   ├── AdminListingForm.tsx
│   │   │   ├── ListingFormSections.tsx
│   │   │   └── ValidationPanel.tsx
│   │   └── __tests__/   # Comprehensive admin component tests
│   ├── mobile-filters/  # Mobile-optimized filter system
│   │   ├── MobileFilterOverlay.tsx
│   │   ├── MobileViewHeader.tsx
│   │   ├── MobileSearchInput.tsx
│   │   ├── MobileFilterMainView.tsx
│   │   └── MobilePriceBar.tsx
│   ├── shared/filters/  # Reusable filter components
│   │   ├── FilterSidebar.tsx
│   │   ├── FilterChips.tsx
│   │   ├── PriceRangeFilter.tsx
│   │   └── CategoryFilter.tsx
│   ├── layout/          # Application layout system
│   │   ├── BaseLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── AppSidebar.tsx
│   │   └── Container.tsx
│   ├── listings/        # Car listing display components
│   │   ├── ListingCard.tsx
│   │   ├── ListingDetails.tsx
│   │   ├── ListingGrid.tsx
│   │   └── ListingActions.tsx
│   └── error/           # Error handling components
│       ├── ErrorBoundary.tsx
│       ├── ErrorPage.tsx
│       └── ErrorFallback.tsx
├── pages/               # Route components with lazy loading
│   ├── HomePage.tsx     # Landing page with hero sections
│   ├── ListingsPage.tsx # Main listings page with filtering
│   ├── ListingPage.tsx  # Individual car detail page
│   ├── AboutPage.tsx    # About and information pages
│   ├── WhyPrivateLeasingPage.tsx # Educational content
│   ├── AdvertisingPage.tsx # Business information
│   └── admin/           # Comprehensive admin interface
│       ├── AdminDashboard.tsx
│       ├── AdminListings.tsx
│       ├── AdminSellerListings.tsx
│       ├── AdminPDFExtraction.tsx
│       ├── AdminExtractionSessions.tsx
│       ├── ToyotaPDFProcessingPage.tsx
│       └── BatchReviewPage.tsx
├── hooks/               # Advanced custom React hooks (35+ hooks)
│   ├── useUrlSync.ts    # Bidirectional URL-filter synchronization
│   ├── useImageLazyLoading.ts # Shared intersection observer
│   ├── useSupabaseQueries.ts # React Query + Supabase integration
│   ├── useAdminListings.ts # Admin CRUD operations
│   ├── useBatchReviewState.ts # Complex batch workflow state
│   ├── useListingComparison.ts # AI-powered comparison logic
│   ├── useFilterOperations.ts # Reusable filter operations
│   └── mutations/       # React Query mutation hooks
│       ├── useListingMutations.ts
│       ├── useSellerMutations.ts
│       └── useBatchMutations.ts
├── services/            # Business logic and external integrations
│   ├── ai-extraction/   # AI-powered PDF extraction system
│   │   ├── extraction/  # Core extraction logic
│   │   ├── providers/   # AI provider implementations (OpenAI, Anthropic)
│   │   ├── validation/  # Business rule validation
│   │   ├── utils/       # Cost calculation and logging
│   │   ├── types/       # TypeScript interfaces
│   │   ├── config/      # Configuration and prompts
│   │   └── __tests__/   # Comprehensive service testing
│   └── supabase/        # Database service layer
├── stores/              # Global state management
│   ├── consolidatedFilterStore.ts # Advanced filter state with persistence
│   ├── themeStore.ts    # Theme and UI state
│   └── uiStore.ts       # Global UI state
├── lib/                 # Core utilities and configurations
│   ├── supabase.ts      # Supabase client with type safety
│   ├── utils.ts         # Utility functions and helpers
│   ├── validations.ts   # Zod schemas and validation rules
│   ├── cacheUtils.ts    # React Query cache management
│   └── constants.ts     # Application constants
├── types/               # Comprehensive TypeScript definitions
│   ├── index.ts         # Core types and interfaces
│   ├── admin.ts         # Admin-specific types
│   ├── supabase.ts      # Database type definitions
│   └── api.ts           # API response types
├── test/                # Testing infrastructure
│   ├── setup.ts         # Global test configuration
│   ├── test-utils.tsx   # Testing utilities and providers
│   ├── mocks/           # Mock data and handlers
│   │   ├── handlers.ts  # MSW request handlers
│   │   ├── data.ts      # Mock data generators
│   │   └── supabase.ts  # Supabase mock client
│   └── __tests__/       # Global integration tests
└── styles/              # Global styles and themes
    ├── index.css        # Tailwind CSS + shadcn/ui variables
    └── globals.css      # Global style overrides

supabase/                # Database and serverless functions
├── functions/           # Edge Functions for server-side processing
│   ├── extract-cars-generic/     # AI-powered car extraction
│   ├── extract-pdf-text/         # PDF text processing
│   ├── compare-extracted-listings/ # Intelligent comparison
│   └── process-pdf/              # Complete processing pipeline
├── migrations/          # Database schema and updates
│   ├── 001_initial_schema.sql
│   ├── 002_add_extraction_tables.sql
│   └── ... (comprehensive migration history)
└── seed.sql            # Database seeding for development
```

### Advanced Database Architecture
- **Primary Data Source**: `full_listing_view` (denormalized for performance)
- **Core Tables**: `listings`, `lease_pricing`, `sellers`, comprehensive reference data
- **AI Integration Tables**: 
  - `extraction_sessions` - AI processing job tracking
  - `extraction_cache` - AI response caching for cost optimization
  - `ai_usage_tracking` - Cost monitoring and budget management
  - `pattern_learning` - ML pattern discovery and optimization
  - `pdf_templates` - Template management for different dealers
  - `dealer_configs` - Multi-tenant configuration system
- **Workflow Tables**:
  - `processing_jobs` - Background job queue management
  - `listing_changes` - Audit trail and change tracking
  - `batch_imports` - Bulk operation management
- **Query Patterns**: 
  - Performance queries use `full_listing_view` with intelligent deduplication
  - Admin operations use direct table access with proper filtering
  - AI services use specialized views for extraction workflows
- **Security**: Advanced Row Level Security (RLS) with multi-role policies
  - `admin` role: Full access to all data and operations
  - `service_role` : Backend service access for Edge Functions
  - `authenticated`: Limited read access for public features
- **Edge Functions**: Serverless AI processing with comprehensive error handling

## AI-Powered PDF Extraction System

### Architecture Overview
This application features a sophisticated AI-powered PDF extraction system that automatically processes dealer PDF documents and extracts structured car listing data.

### Core Components

#### **1. AI Provider Integration**
```typescript
// Multi-provider support with fallback strategies
providers: {
  openai: OpenAIProvider,      // GPT-4 Turbo for primary extraction
  anthropic: AnthropicProvider // Claude 3 for complex documents and fallback
}
```

#### **2. Extraction Workflow**
```typescript
// Complete processing pipeline
1. PDF Text Extraction    → Extract raw text from PDF documents
2. AI-Powered Parsing     → Structured data extraction with validation
3. Business Rule Validation → Danish market compliance and quality checks
4. Cost Tracking          → Monitor API usage and budget limits
5. Cache Optimization     → Store results for performance and cost savings
6. Pattern Learning       → Improve extraction accuracy over time
```

#### **3. Edge Functions Architecture**
- **`extract-cars-generic`**: Primary AI extraction with OpenAI/Anthropic
- **`extract-pdf-text`**: PDF text processing with error handling
- **`compare-extracted-listings`**: Intelligent comparison and deduplication
- **`process-pdf`**: Complete processing pipeline with job management

#### **4. Cost Management System**
```typescript
// Comprehensive cost tracking and budget controls
CostCalculator: {
  dailyLimits: configurable,          // Prevent budget overruns
  perPdfLimits: enforced,            // Control individual processing costs
  providerCosts: tracked,            // Monitor OpenAI vs Anthropic usage
  tokenUsage: monitored,             // Optimize prompt efficiency
  cacheHitRate: optimized            // Reduce redundant API calls
}
```

#### **5. Quality Assurance Features**
- **Danish Market Validation**: Pricing rules, lease term validation
- **Brand Recognition**: Automatic make/model identification
- **Powertrain Detection**: Electric, hybrid, gasoline classification
- **Business Rule Engine**: Complex validation with confidence scoring
- **Error Recovery**: Retry mechanisms with intelligent fallback

### Usage Patterns

#### **Batch Processing Workflow**
```typescript
// Admin interface for bulk PDF processing
1. Upload Multiple PDFs    → Drag-and-drop interface with progress tracking
2. Dealer Configuration   → Custom extraction rules per dealer
3. Background Processing  → Queue management with real-time status
4. Review Interface       → Compare extracted data with originals
5. Bulk Import           → Validated data import to production database
```

#### **Real-Time Processing**
```typescript
// Individual PDF processing with immediate results
const extractionResult = await extractionService.processPDF({
  file: pdfFile,
  dealer: selectedDealer,
  strategy: 'primary_with_fallback',
  enableValidation: true,
  enableCostChecking: true
})
```

### Performance Optimizations
- **Intelligent Caching**: Store AI responses to reduce API costs
- **Pattern Learning**: Improve accuracy based on successful extractions
- **Template Recognition**: Pre-configured extraction rules per dealer
- **Parallel Processing**: Concurrent PDF processing for batch operations
- **Error Boundaries**: Graceful handling of processing failures

### Security & Compliance
- **PII Handling**: Secure processing of sensitive dealer information
- **Audit Trails**: Complete extraction history and change tracking
- **Access Controls**: Role-based access to extraction features
- **Data Retention**: Configurable storage policies for processed documents

### Testing Infrastructure
```typescript
// Comprehensive testing for AI extraction services
TestCoverage: {
  MockProviders: '100%',           // Simulated AI responses for testing
  EdgeFunctions: '90%',            // Serverless function testing
  ValidationRules: '100%',         // Business rule validation
  CostCalculation: '100%',         // Budget and usage tracking
  ErrorHandling: '95%',            // Failure scenario coverage
}
```

## 🎯 Recent Admin Interface Improvements (January 2025)

### **Comprehensive Admin Layout Consistency**

Recent improvements have enhanced the admin interface to provide a consistent, professional experience throughout all administrative workflows.

#### **Fixed Admin Container Issues**
- **PDF Extraction Pages**: All extraction-related pages now properly display within the admin container with sidebar navigation
- **Extraction Session Review**: Fixed modal navigation to ensure review interfaces maintain admin layout
- **Consistent Navigation**: Users can seamlessly move between all admin sections without losing the sidebar

#### **Enhanced Modal Statistics Display**
```typescript
// Before: Modal showed 0s for all statistics
stats: { new: 0, updated: 0, removed: 0 }

// After: Real-time database queries provide accurate breakdowns
const { data: changesData } = await supabase
  .from('extraction_listing_changes')
  .select('change_type, change_status')
  .eq('session_id', extractionSessionId)

// Accurate statistics calculation
stats: {
  new: pendingCreates,           // Actual CREATE changes
  updated: pendingUpdates,       // Actual UPDATE changes  
  removed: unchangedChanges,     // Actual UNCHANGED changes
  total_processed: changesData.length
}
```

#### **Admin Component Architecture Enhancements**

**AdminLayout Integration Pattern**:
```tsx
// Standard pattern for all admin pages
import AdminLayout from '@/components/admin/AdminLayout'

export const AdminPage: React.FC = () => {
  return (
    <AdminLayout title="Page Title">
      <div className="max-w-7xl mx-auto">
        {/* Page content */}
      </div>
    </AdminLayout>
  )
}
```

**Pages Updated with AdminLayout**:
- ✅ `AdminPDFExtraction.tsx` - PDF upload and processing interface
- ✅ `AdminExtractionSessions.tsx` - Session management and review
- ✅ `ExtractionSessionReview` - Individual session detail view
- ✅ All admin navigation workflows maintain consistency

#### **Seller PDF Upload Modal Enhancements**

**Enhanced Statistics Calculation**:
```typescript
// Real-time extraction results from database
if (aiResult.extractionSessionId) {
  const { data: changesData } = await supabase
    .from('extraction_listing_changes')
    .select('change_type, change_status')
    .eq('session_id', aiResult.extractionSessionId)
    
  // Calculate accurate stats from actual changes
  const actualStats = {
    new: changesData.filter(c => c.change_type === 'create').length,
    updated: changesData.filter(c => c.change_type === 'update').length,
    removed: changesData.filter(c => c.change_type === 'unchanged').length,
    total_processed: changesData.length
  }
}
```

**Modal Navigation Improvements**:
- **"Review & Approve Extraction"** button now navigates to properly formatted admin pages
- **Consistent sidebar navigation** maintained throughout extraction workflows
- **Professional admin experience** from upload through review and approval

#### **TypeScript Interface Improvements**

**Resolved Seller Interface Conflicts**:
```typescript
// Separated conflicting interfaces
// Database entity (hooks/useSellers.ts)
export interface Seller {
  id: string
  name: string
  make_id?: string | null    // Optional seller make association
  make_name?: string | null  // Populated from database join
  // ... other database fields
}

// Contact info interface (types/index.ts)  
export interface SellerContact {
  name: string
  website: string
  phone: string
  email: string
  description: string
}
```

### **User Experience Improvements**

#### **Before the Updates**:
- ❌ PDF extraction pages opened outside admin container
- ❌ Success modals showed 0s for all extraction statistics
- ❌ Navigation inconsistency between admin sections
- ❌ TypeScript compilation errors blocking deployments

#### **After the Updates**:
- ✅ All admin pages maintain consistent sidebar navigation
- ✅ Accurate extraction statistics from real database queries
- ✅ Seamless workflow from upload → processing → review → approval
- ✅ Professional admin interface throughout all workflows

### **Technical Achievements**

- **AdminLayout Standardization**: Consistent component wrapper pattern across all admin pages
- **Database-Driven Statistics**: Replaced placeholder values with real-time database queries
- **Type Safety Improvements**: Resolved interface naming conflicts and optional property handling
- **Navigation Flow Enhancement**: Maintained admin context throughout complex workflows

This comprehensive update ensures that the admin interface provides a professional, consistent experience for managing AI-powered PDF extractions and seller data throughout the entire application workflow.

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

## Enterprise Performance & Optimization

### Current Performance Metrics
- **Bundle Size**: Main bundle 411KB (gzip: 127KB) - optimized with tree-shaking
- **Core Web Vitals**: Lighthouse-optimized with strategic code splitting
- **Memory Management**: Comprehensive cleanup patterns prevent leaks
- **Cache Strategy**: Multi-layered caching with React Query and browser storage

### Runtime Performance Optimizations

#### **1. React Optimization Patterns**
```typescript
// Extensive React.memo usage for expensive components (30+ components)
const ListingCard = React.memo(({ car, loading }) => {
  // Memoized price formatting to prevent recalculation
  const displayPrice = useMemo(() => 
    formatPrice(car?.monthly_price), [car?.monthly_price])
  
  // Stable callback references with useCallback
  const handleClick = useCallback(() => {
    onCarClick?.(car.id)
  }, [car.id, onCarClick])
  
  return <Card>{/* Optimized JSX */}</Card>
})
```

#### **2. Advanced Hook Architecture (35+ custom hooks)**
```typescript
// Shared intersection observer for all image loading
export const useImageLazyLoading = (imageUrl) => {
  // Global observer instance reused across components
  // Automatic cleanup and retry mechanisms
  // 200px root margin for early loading
}

// Bidirectional URL synchronization with intelligent updates
export const useUrlSync = () => {
  // Prevents circular updates with ref flags
  // Optimized array comparisons
  // Type-safe parameter parsing
}
```

#### **3. Intelligent Caching Architecture**
```typescript
// React Query configuration with sophisticated cache strategies
const queryConfig = {
  // Reference data: 30-60 minutes (static data)
  referenceData: { staleTime: 30 * 60 * 1000 },
  
  // Listings: 3-5 minutes (moderate updates)
  listings: { staleTime: 5 * 60 * 1000 },
  
  // Admin data: 1-2 minutes (frequent updates)
  adminData: { staleTime: 2 * 60 * 1000 },
  
  // Offers: 30 seconds (real-time sensitivity)
  offers: { staleTime: 30 * 1000 }
}
```

### Build-Time Optimizations

#### **1. Vite 6.3.5 Configuration**
```typescript
// Optimized build configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Strategic vendor chunking for optimal caching
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/*', 'lucide-react'],
          utils: ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'] // Performance optimization
  }
})
```

#### **2. Code Splitting Strategy**
```typescript
// Comprehensive lazy loading for all major routes
const AdminListings = lazy(() => import('@/pages/admin/AdminListings'))
const BatchReviewPage = lazy(() => import('@/pages/admin/BatchReviewPage'))
const ToyotaPDFProcessing = lazy(() => import('@/pages/admin/ToyotaPDFProcessing'))

// Suspense boundaries with loading states
<Suspense fallback={<Skeleton className="w-full h-screen" />}>
  <AdminListings />
</Suspense>
```

### Memory Management & Cleanup

#### **1. Comprehensive Cleanup Patterns**
```typescript
// Standard cleanup pattern throughout codebase
useEffect(() => {
  const timer = setTimeout(callback, delay)
  const controller = new AbortController()
  
  // Event listeners with proper cleanup
  document.addEventListener('click', handleClick)
  
  return () => {
    clearTimeout(timer)
    controller.abort()
    document.removeEventListener('click', handleClick)
  }
}, [])
```

#### **2. Intersection Observer Optimization**
```typescript
// Shared global observer for all image loading
const globalObserver = new IntersectionObserver(callback, {
  rootMargin: '200px' // Early loading for smooth UX
})
const observedElements = new Map() // Central management
```

### Mobile Performance Optimizations

#### **1. Mobile-First Architecture**
- **Dedicated mobile components** reduce bundle size for mobile users
- **Touch-optimized interfaces** with proper hit targets
- **Responsive breakpoints** throughout (sm:, md:, lg:, xl:)
- **Reduced content strategy** for mobile viewports

#### **2. Progressive Enhancement**
```typescript
// Mobile-specific optimizations
const MobileFilterOverlay = lazy(() => import('@/components/mobile-filters/MobileFilterOverlay'))
const MobilePriceBar = lazy(() => import('@/components/mobile-filters/MobilePriceBar'))
```

### Performance Monitoring

#### **1. Bundle Analysis Available**
```bash
# Built-in Vite bundle analysis
npm run build -- --report

# Comprehensive bundle size tracking
npm run analyze:bundle
```

#### **2. Performance Metrics Tracking**
```typescript
// React Query DevTools integration
QueryClient: {
  defaultOptions: {
    queries: {
      // Intelligent retry only for network errors
      retry: (failureCount, error) => {
        return failureCount < 2 && error?.message?.includes('network')
      }
    }
  }
}
```

### Performance Guidelines & Targets

#### **Bundle Size Targets**
- **CSS**: ~109KB (achieved with shadcn/ui tree-shaking)
- **JavaScript**: ~292KB (achieved with strategic code splitting)
- **Images**: Lazy loading with intersection observer optimization
- **Critical Path**: Minimized with route-based code splitting

#### **Performance Standards**
- **Loading States**: Skeleton components from shadcn/ui for all async operations
- **Error Boundaries**: Graceful degradation with retry mechanisms
- **Cache Management**: Intelligent invalidation preventing stale data
- **Memory Cleanup**: Comprehensive patterns preventing leaks

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

## Enterprise Testing Infrastructure

### Professional Testing Stack
- **Testing Framework**: Vitest 3.2.4 with React Testing Library 16.3.0
- **API Mocking**: MSW 2.10.2 (Mock Service Worker) for comprehensive API simulation
- **Environment**: jsdom with browser API mocking (IntersectionObserver, ResizeObserver)
- **TypeScript Integration**: Full type safety with test utilities and mock typing
- **CI Integration**: Built-in coverage reporting and build pipeline integration

### Advanced Testing Configuration
```typescript
// vitest.config.ts - Enterprise-grade setup
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,    // 80% branch coverage required
          functions: 90,   // 90% function coverage required
          lines: 90,       // 90% line coverage required
          statements: 90   // 90% statement coverage required
        }
      }
    }
  }
})
```

### Comprehensive Mock Infrastructure
```typescript
// src/test/test-utils.tsx - Professional test setup
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}

// Custom render with providers
export const renderWithProviders = (ui: ReactElement, options?: any) => {
  return render(ui, { wrapper: AllTheProviders, ...options })
}
```

### Current Test Coverage Status

#### **Comprehensive AI Services Testing (100% Coverage)**
```typescript
// AI Extraction Service - Exemplary testing patterns
TestSuite: {
  MockProviders: '100%',          // Simulated OpenAI/Anthropic responses
  CostCalculation: '100%',        // Budget tracking and limits
  ValidationRules: '100%',        // Danish market business rules
  EdgeFunctions: '90%',           // Serverless function testing
  ErrorHandling: '95%',           // Comprehensive failure scenarios
}
```

#### **Admin Components (Good Coverage)**
- ✅ **BatchReviewHeader**: Integration tests with Router context
- ✅ **AdminListingFormNew**: Complete CRUD workflow testing
- ✅ **useBatchReviewState**: 7 comprehensive hook tests with utilities
- ✅ **ErrorBoundary**: Complete error handling with retry mechanisms

#### **Coverage Gaps (Requires Attention)**
```typescript
MissingTests: {
  CoreFeatures: [
    'ListingsPage',          // Main user-facing listing display
    'FilterSidebar',         // Critical filtering functionality
    'ListingCard',           // Primary product component
    'MobileFilterOverlay'    // Mobile experience
  ],
  UserFlows: [
    'Search and filtering',  // End-to-end user workflows
    'Listing detail view',   // Individual car pages
    'Mobile navigation'      // Mobile-specific interactions
  ]
}
```

### Testing Patterns & Standards

#### **Component Testing Excellence**
```typescript
// Standard testing pattern for all components
describe('AdminListingFormNew Integration', () => {
  beforeEach(() => {
    // Setup with proper mocks and providers
    setupMockData()
  })

  // 1. Rendering and Loading States
  it('renders loading state while fetching data', async () => {
    renderWithProviders(<AdminListingFormNew />)
    expect(screen.getByText('Indlæser...')).toBeInTheDocument()
  })

  // 2. User Interactions with Danish Localization
  it('handles form submission with validation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminListingFormNew />)
    
    await user.type(screen.getByLabelText('Mærke'), 'Toyota')
    await user.click(screen.getByRole('button', { name: 'Gem' }))
    
    expect(mockMutation).toHaveBeenCalledWith(expectedData)
  })

  // 3. Error Handling with Danish Messages
  it('displays Danish error messages on failure', async () => {
    mockMutation.mockRejectedValueOnce(new Error('Network error'))
    
    renderWithProviders(<AdminListingFormNew />)
    await userEvent.click(screen.getByRole('button', { name: 'Gem' }))
    
    expect(screen.getByText('Der opstod en fejl ved gemning')).toBeInTheDocument()
  })

  // 4. Accessibility Compliance
  it('maintains proper accessibility structure', () => {
    renderWithProviders(<AdminListingFormNew />)
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByTestId('form-sections').closest('form'))
      .toHaveAttribute('novalidate')
  })
})
```

#### **Custom Hook Testing Patterns**
```typescript
// useBatchReviewState.simple.test.ts - Comprehensive hook testing
describe('useBatchReviewState utilities', () => {
  describe('formatPrice', () => {
    it('formats Danish currency correctly', () => {
      expect(formatPrice(2500)).toBe('2.500 kr')
      expect(formatPrice(0)).toBe('0 kr')
      expect(formatPrice(undefined)).toBe('–')
    })
  })

  describe('getConfidenceColor', () => {
    it('returns correct confidence colors', () => {
      expect(getConfidenceColor(0.9)).toBe('text-green-600')
      expect(getConfidenceColor(0.7)).toBe('text-yellow-600')
      expect(getConfidenceColor(0.5)).toBe('text-red-600')
    })
  })
})
```

### Mock Strategies & Data Management

#### **MSW Integration for API Mocking**
```typescript
// src/test/mocks/handlers.ts
export const handlers = [
  rest.get('/api/listings', (req, res, ctx) => {
    return res(ctx.json(mockListingsData))
  }),
  
  rest.post('/api/admin/listings', (req, res, ctx) => {
    return res(ctx.json({ success: true, id: 'new-listing-id' }))
  })
]
```

#### **Supabase Mock Client**
```typescript
// Complete Supabase mocking for isolated testing
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockListing })
  }))
}
```

### Testing Commands & Workflows

#### **Development Testing**
```bash
npm run test                  # Interactive watch mode for development
npm run test:run             # Single run for CI/CD pipelines
npm run test:coverage        # Coverage reports (HTML + JSON + text)
npm run test:refactored      # Run tests for Phase 1 components only
npm run build:test           # Test + Build validation pipeline
```

#### **CI/CD Integration Points**
```bash
# Build pipeline integration
npm run build:test           # Tests must pass before build
npm run test:coverage        # Enforce coverage thresholds
npm run lint                 # Code quality validation
```

### Testing Quality Assessment

#### **Strengths (Excellent Implementation)**
- ✅ **Professional tooling** with Vitest + RTL + MSW
- ✅ **High coverage requirements** (90% functions, 80% branches)
- ✅ **Comprehensive AI service testing** (100% coverage)
- ✅ **Danish localization validation** throughout tests
- ✅ **Accessibility testing** with proper ARIA validation
- ✅ **Error boundary testing** with retry logic
- ✅ **Mock infrastructure** with realistic data patterns

#### **Areas for Improvement**
- ⚠️ **Missing core feature tests** (listings, filtering, search)
- ⚠️ **No E2E testing framework** (Playwright recommended)
- ⚠️ **Limited CI/CD automation** (no GitHub Actions)
- ⚠️ **No visual regression testing** (Chromatic/Percy integration needed)
- ⚠️ **Mobile testing gaps** (device-specific interaction testing)

### Recommended Testing Expansion
```typescript
// Priority areas for test coverage expansion
NextPhaseTests: {
  HighPriority: [
    'Core listing display and filtering',
    'Search functionality end-to-end',
    'Mobile user experience flows',
    'Cross-browser compatibility'
  ],
  
  Infrastructure: [
    'E2E testing with Playwright',
    'Visual regression testing',
    'Performance regression monitoring',
    'Automated accessibility testing'
  ]
}
```

## Environment Configuration

### Core Environment Variables
```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Integration (Required for PDF extraction)
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key

# AI Provider Configuration
VITE_AI_PROVIDER_PRIMARY=openai              # Primary AI provider (openai|anthropic)
VITE_AI_PROVIDER_FALLBACK=anthropic          # Fallback provider
VITE_OPENAI_MODEL=gpt-4-turbo-preview        # OpenAI model selection
VITE_ANTHROPIC_MODEL=claude-3-sonnet-20240229 # Anthropic model selection

# Feature Flags
VITE_AI_EXTRACTION_ENABLED=false             # Enable AI PDF extraction features
VITE_BATCH_PROCESSING_ENABLED=true           # Enable batch processing workflows
VITE_MOBILE_FILTERS_ENABLED=true             # Enable mobile filter enhancements

# Cost Management & Monitoring
VITE_AI_DAILY_BUDGET_USD=50                  # Daily AI usage budget
VITE_AI_MAX_COST_PER_PDF_CENTS=500          # Maximum cost per PDF (in cents)
VITE_AI_CACHE_ENABLED=true                   # Enable AI response caching

# Development & Debugging
VITE_DEBUG_MODE=false                        # Enable debug logging
VITE_PERFORMANCE_MONITORING=true             # Enable performance tracking
```

### Environment File Structure
```bash
# Local development (gitignored)
.env.local                    # Personal development overrides

# Environment-specific configurations
.env.development             # Development defaults
.env.staging                 # Staging environment
.env.production              # Production environment (Vercel)

# Template for new developers
.env.example                 # Example configuration file
```

### Security Best Practices
- **All API keys** stored in environment variables (never in code)
- **Local development** uses `.env.local` (gitignored)
- **Production secrets** managed through Vercel environment variables
- **Staging environment** uses separate API keys and databases
- **Feature flags** enable safe deployment of new features

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

---

## 🎯 Enterprise Application Summary

### Transformation Overview
This React application has evolved from a basic Vue migration into a **sophisticated, enterprise-grade car leasing platform** with advanced AI capabilities, comprehensive admin interfaces, and professional-grade infrastructure.

### Key Architectural Achievements

#### **🚀 Technology Excellence**
- **React 19.1.0** with modern hooks and Suspense
- **Vite 6.3.5** build system with optimized performance
- **TypeScript 5.8.3** with strict configuration and comprehensive type safety
- **40+ shadcn/ui components** with Radix UI accessibility
- **35+ custom hooks** for advanced functionality

#### **🤖 AI-Powered Innovation**
- **Multi-provider AI integration** (OpenAI GPT-4 + Anthropic Claude)
- **Automated PDF extraction** with business rule validation
- **Cost management system** with budget controls and monitoring
- **Pattern learning** for improved extraction accuracy
- **Danish market compliance** with comprehensive validation

#### **📊 Admin Interface Sophistication**
- **Complete CRUD operations** for all business entities
- **Batch processing workflows** with progress tracking
- **AI extraction management** with review interfaces
- **Seller management system** with multi-tenant support
- **Real-time status monitoring** and health checks

#### **⚡ Performance & Quality**
- **Bundle optimization** meeting production targets (127KB gzipped)
- **React.memo optimization** on 30+ components for performance
- **Shared intersection observers** for efficient image loading
- **Multi-layered caching** with React Query and intelligent invalidation
- **Comprehensive error boundaries** with graceful degradation

#### **🧪 Professional Testing Infrastructure**
- **Vitest + React Testing Library + MSW** for comprehensive testing
- **90% function coverage requirement** with strict enforcement
- **100% AI service testing** with mock providers
- **Danish localization validation** throughout test suite
- **Professional mock infrastructure** with realistic data

#### **📱 Mobile-First Design**
- **Dedicated mobile components** for optimal mobile experience
- **Touch-optimized interfaces** with proper accessibility
- **Progressive enhancement** with responsive breakpoints
- **Mobile-specific performance optimizations**

#### **🔒 Enterprise Security & Compliance**
- **Multi-role Row Level Security** with Supabase
- **Comprehensive audit trails** for all operations
- **Secure API key management** with environment separation
- **PII handling compliance** for sensitive dealer data

### Current Application Scale
- **📁 Enterprise Project Structure**: 8 main directories with specialized organization
- **🔧 Advanced Build System**: Optimized Vite configuration with tree-shaking
- **🎯 Performance Targets**: All production metrics achieved
- **📊 Database Complexity**: 15+ tables with AI integration and workflow management
- **🧩 Component Library**: Comprehensive UI system with shadcn/ui integration
- **🔄 State Management**: Sophisticated Zustand + React Query architecture
- **⚙️ Edge Functions**: Serverless AI processing with comprehensive error handling

### Development Experience
- **Professional tooling** with instant HMR and TypeScript integration
- **Comprehensive testing** with high coverage requirements
- **Danish localization** throughout the entire application
- **Error recovery** with intelligent retry mechanisms
- **Performance monitoring** with bundle analysis and optimization
- **AI cost tracking** with budget management and usage analytics

This application represents a **successful Vue to React migration** that has resulted in a feature-rich, performant, and maintainable enterprise platform ready for commercial deployment in the Danish car leasing market.