# Admin Components Directory

This directory contains the comprehensive administrative interface for the leasingbørsen application, providing complete CRUD operations and advanced workflow management for dealers, listings, and AI-powered processing.

## 🎯 Overview

The admin interface is a sophisticated enterprise-grade system that handles:
- **Car listing management** with advanced forms and validation
- **AI extraction workflows** for intelligent processing
- **AI extraction review** with comparison and approval interfaces
- **Seller management** with multi-tenant capabilities
- **Offer comparison** with intelligent matching algorithms

## 📁 Directory Structure

```
admin/
├── extraction/               # AI extraction components
│   ├── ExtractionReviewPage.tsx     # AI extraction review interface
│   ├── ComparisonDialog.tsx          # Side-by-side comparison interface
│   └── ExtractionSessionTable.tsx   # Session management
│
├── sellers/                  # Seller management system
│   ├── SellersTable.tsx             # Main sellers listing with actions
│   ├── SellerForm.tsx               # Create/edit seller forms
│   ├── SellerListings.tsx           # Seller-specific listing management
│   └── SellerMetrics.tsx            # Performance analytics
│
├── offers/                   # Offer comparison system
│   ├── OffersTable.tsx              # Offers listing with filtering
│   ├── OfferComparison.tsx          # Intelligent offer matching
│   ├── OfferHistory.tsx             # Historical offer tracking
│   └── PriceAnalysis.tsx            # Market price analysis
│
├── listings/                 # Advanced listing management
│   ├── AdminListingForm.tsx         # Comprehensive listing forms
│   ├── ListingFormSections.tsx      # Modular form sections
│   ├── ValidationPanel.tsx          # Real-time validation
│   └── BulkEditDialog.tsx           # Bulk editing capabilities
│
└── __tests__/                # Comprehensive test coverage
    ├── ExtractionReview.test.tsx
    ├── AdminListingFormNew.integration.test.tsx
    └── [component].test.tsx
```

## 🔧 Key Components

### **AI Extraction System**

#### `ExtractionReviewPage.tsx`
- **Purpose**: Modern interface for reviewing AI-extracted car data
- **Features**: Real-time comparison, intelligent approval workflow, bulk operations
- **Dependencies**: `useListingComparison`, React Query integration
- **Performance**: Optimized with server-side processing and Edge Functions

```tsx
// Usage example
<ExtractionReviewPage 
  sessionId={sessionId}
  onApprove={handleApproval}
  onReject={handleRejection}
/>
```

#### `ComparisonDialog.tsx`
- **Purpose**: Advanced comparison between extracted and existing data
- **Features**: Field-level diff highlighting, confidence scoring, smart recommendations
- **Validation**: Comprehensive Danish market validation with Edge Functions

### **Seller Management System**

#### `SellersTable.tsx`
- **Purpose**: Main seller management interface with advanced filtering
- **Features**: Multi-tenant access, performance metrics, bulk operations
- **Performance**: Server-side pagination and filtering

#### `SellerListings.tsx`
- **Purpose**: Seller-specific listing management
- **Features**: Seller context switching, custom pricing rules, branding

### **Advanced Listing Forms**

#### `AdminListingForm.tsx`
- **Purpose**: Comprehensive car listing creation and editing
- **Features**: Multi-step wizard, real-time validation, image management
- **Dependencies**: React Hook Form, Zod validation, Supabase uploads

```tsx
// Form sections include:
// - Basic Information (make, model, year)
// - Technical Specifications (engine, transmission, features)
// - Lease Pricing (monthly payment, down payment, terms)
// - Media Management (images, descriptions)
// - Seller Information (contact details, location)
```

## 🎨 Design Patterns

### **Component Architecture**
- **Container/Presentation Pattern**: Logic containers with pure UI components
- **Compound Components**: Complex forms broken into focused sections
- **Render Props**: Flexible data presentation with customizable rendering

### **State Management**
- **React Query**: Server state with optimistic updates and error recovery
- **React Hook Form**: Form state with validation and performance optimization
- **Local State**: Component-specific UI state with useState

### **Performance Optimizations**
- **React.memo**: All expensive components memoized
- **useCallback/useMemo**: Stable references for child components
- **Virtualization**: Large data tables with react-window
- **Lazy Loading**: Modal components loaded on demand

## 🔄 Data Flow

### **Listing Management Flow**
```
1. User opens AdminListingForm
2. Form loads reference data (makes, models, etc.)
3. User fills form with validation feedback
4. Form submits with optimistic UI updates
5. Success: Redirect to listings table
6. Error: Show validation errors with Danish messages
```

### **AI Extraction Workflow**
```
1. Admin initiates PDF extraction via AI extraction interface
2. Files processed by secure Edge Functions with multi-provider AI
3. Results appear in ExtractionReviewPage with intelligent comparison
4. Admin reviews side-by-side diff with confidence scoring
5. Apply selected changes using secure server-side operations
6. Approved changes automatically update active listings
```

## 🧪 Testing Strategy

### **Test Coverage**
- **Unit Tests**: Individual component logic and rendering
- **Integration Tests**: Component interaction with React Query
- **User Flow Tests**: Complete admin workflows end-to-end

### **Mock Strategies**
- **MSW**: API endpoint mocking for realistic testing
- **React Query**: Custom test client with controlled cache
- **Router**: Memory router for navigation testing

### **Example Test Structure**
```tsx
describe('AdminListingFormNew Integration', () => {
  // Setup with providers and mocks
  beforeEach(() => setupMockData())
  
  // Test cases
  it('renders loading state while fetching data')
  it('handles form submission with validation')
  it('displays Danish error messages on failure')
  it('maintains accessibility structure')
})
```

## 🔒 Security & Permissions

### **Access Control**
- **Role-based Access**: Admin users only
- **Feature Flags**: Some features behind environment variables
- **Audit Logging**: All admin actions logged for compliance

### **Data Protection**
- **Input Validation**: Comprehensive client and server-side validation
- **SQL Injection Prevention**: Supabase RLS policies
- **XSS Prevention**: Proper sanitization of user inputs

## 🌐 Danish Localization

### **Text Standards**
- **Form Labels**: All in Danish with proper business terminology
- **Error Messages**: User-friendly Danish error descriptions
- **Status Messages**: Clear feedback in Danish
- **Business Terms**: Proper leasing industry terminology

### **Example Translations**
```typescript
const adminTexts = {
  listing: {
    create: 'Opret ny annonce',
    edit: 'Rediger annonce', 
    delete: 'Slet annonce',
    validation: {
      required: 'Dette felt er påkrævet',
      invalidPrice: 'Ugyldig pris - skal være mellem 1.000 og 50.000 kr'
    }
  }
}
```

## 📈 Performance Guidelines

### **Component Optimization**
- **Always** wrap expensive admin components with `React.memo`
- **Use** `useCallback` for all event handlers passed to child components
- **Implement** proper loading states with skeleton components
- **Virtualize** large data tables and lists

### **Data Fetching**
- **Cache** reference data (makes, models) for extended periods
- **Use** optimistic updates for better user experience
- **Implement** proper error boundaries with retry mechanisms
- **Prefetch** likely user actions (next page, related data)

## 🚀 Getting Started

### **Development Setup**
1. Ensure admin access in Supabase (admin role required)
2. Set up proper environment variables for admin features
3. Run tests: `npm run test src/components/admin/`
4. Navigate to `/admin` in development

### **Adding New Admin Features**
1. Create component in appropriate subdirectory
2. Add React Query hooks for data fetching
3. Implement proper TypeScript interfaces
4. Add comprehensive tests with Danish localization
5. Update this README with new component documentation

### **Common Patterns**
```tsx
// Standard admin component structure
const AdminComponent: React.FC<Props> = ({ ...props }) => {
  // React Query hooks for data
  const { data, isLoading, error } = useAdminData()
  
  // Form handling with validation
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
  })
  
  // Mutation with optimistic updates
  const mutation = useAdminMutation({
    onSuccess: () => {
      toast.success('Gemt succesfuldt')
      queryClient.invalidateQueries(['admin-data'])
    }
  })
  
  // Loading and error states
  if (isLoading) return <AdminSkeleton />
  if (error) return <AdminError error={error} />
  
  return (
    <AdminLayout>
      {/* Component content */}
    </AdminLayout>
  )
}
```

## 📝 Contributing

When working in this directory:
1. **Follow Danish localization** for all user-facing text
2. **Add comprehensive tests** for new components
3. **Use established patterns** from existing components
4. **Document complex business logic** with inline comments
5. **Update this README** when adding new components or patterns

---

*This admin interface serves as the backbone of the leasingbørsen platform, providing dealers and administrators with powerful tools for managing the entire car leasing ecosystem.*