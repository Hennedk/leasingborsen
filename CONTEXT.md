# Project Context & Architectural Decisions

## Technical Context for AI Agents

### Project Overview
Leasingbørsen is a Danish car leasing marketplace built with Vue.js 3, focusing on clean UX and modern styling. The project emphasizes performance, accessibility, and a polished user experience across 8 dynamic themes.

### Architecture Decisions

#### **State Management**: Vue Provide/Inject → Future Pinia Migration
**Current**: Using Vue's provide/inject pattern for theme state
**Reason**: Simple, lightweight solution for current needs without additional dependencies
**Future**: Migrate to Pinia for complex state management as app grows
**Impact**: Minimal bundle size, easy to refactor later

```javascript
// Current pattern (App.vue)
provide('theme', {
  currentTheme,
  setTheme: (theme) => {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
  }
})
```

#### **Styling**: Tailwind CSS 4 + DaisyUI 5 Direct Usage
**Decision**: Use DaisyUI classes directly in templates, never in @apply rules
**Reason**: Tailwind CSS 4 compatibility requires this approach, prevents build errors
**Constraint**: Cannot extract DaisyUI classes to custom CSS rules
**Benefit**: Forces consistent component-level styling, better maintainability

```vue
<!-- ✅ Correct approach -->
<div class="card bg-base-100 shadow-md border border-base-300">
  <div class="card-body">
    <h2 class="card-title text-primary">Title</h2>
  </div>
</div>

<!-- ❌ Avoid this -->
<div class="custom-card">  <!-- where custom-card uses @apply -->
```

#### **Database**: Supabase with Single View Strategy
**Decision**: Use `full_listing_view` as primary data source
**Reason**: Denormalized view provides all car listing data in single query
**Benefit**: Reduced complexity, consistent data structure, better performance
**RLS**: Row Level Security enabled for data protection

#### **Component Architecture**: Feature-Based Organization
**Decision**: Group components by feature (Listing*, Filter*, etc.) rather than type
**Reason**: Easier to locate related functionality, better code organization
**Pattern**: PascalCase naming with feature prefix (ListingCard, FilterSidebar)

#### **Language & Localization**: Danish-First with da-DK Patterns
**Decision**: All UI text in Danish with proper number/date formatting
**Reason**: Target market is Denmark, authentic user experience
**Implementation**: Use `toLocaleString('da-DK')` for prices, Danish error messages

### Code Patterns to Follow

#### **Vue.js Component Structure**
```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Props with validation
const props = defineProps({
  carId: { type: String, required: true },
  showActions: { type: Boolean, default: true }
})

// Events
const emit = defineEmits(['carUpdated', 'error'])

// Reactive state
const car = ref(null)
const loading = ref(true)
const error = ref(null)

// Computed properties
const displayPrice = computed(() => 
  car.value?.monthly_price?.toLocaleString('da-DK') || '–'
)

// Lifecycle
onMounted(async () => {
  await fetchCar()
})

// Methods with error handling
const fetchCar = async () => {
  try {
    loading.value = true
    error.value = null
    
    const { data, error: fetchError } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('listing_id', props.carId)
      .single()
    
    if (fetchError) throw fetchError
    car.value = data
    emit('carUpdated', data)
  } catch (err) {
    console.error('Error fetching car:', err)
    error.value = 'Der opstod en fejl ved indlæsning'
    emit('error', err.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="animate-pulse">
    <!-- Skeleton content -->
  </div>
  
  <!-- Error State -->
  <div v-else-if="error" class="alert alert-error">
    <span>{{ error }}</span>
  </div>
  
  <!-- Content -->
  <div v-else-if="car" class="card bg-base-100 shadow-md">
    <!-- Car content -->
  </div>
</template>
```

#### **Supabase Query Patterns**
```javascript
// Standard query with error handling
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

#### **Danish UI Patterns**
```javascript
// Price formatting
const formatPrice = (price) => `${price?.toLocaleString('da-DK')} kr/md`

// Date formatting
const formatDate = (date) => new Date(date).toLocaleDateString('da-DK')

// Standard error messages
const errorMessages = {
  fetchError: 'Der opstod en fejl ved hentning af data',
  saveError: 'Kunne ikke gemme ændringerne',
  notFound: 'Ressourcen blev ikke fundet',
  networkError: 'Netværksfejl - prøv igen senere'
}
```

### Known Constraints

#### **Technical Limitations**
- **DaisyUI 5**: Cannot use classes in @apply rules with Tailwind CSS 4
- **Build Tools**: Use either Vite plugin OR PostCSS plugin, not both
- **Bundle Size**: Target ~109KB CSS, ~292KB JS for optimal performance
- **Browser Support**: Modern browsers only (ES2020+)

#### **Business Requirements**
- **Language**: All UI must be in Danish (da-DK)
- **Accessibility**: WCAG 2.1 AA compliance required
- **Themes**: Support 8 DaisyUI themes with persistence
- **Performance**: Page load time < 2s, component render < 100ms

#### **Database Constraints**
- **RLS**: All queries must respect Row Level Security policies
- **View Usage**: Always use `full_listing_view` for car data
- **Indexes**: All filter queries must use proper database indexes
- **Real-time**: Use Supabase subscriptions for live data when needed

### Dependencies & Their Purposes

#### **Core Dependencies**
- **Vue 3**: Composition API, reactive system, component framework
- **Vite 6.3.5**: Build tool, dev server, HMR, optimization
- **Vue Router 4**: Client-side routing, lazy loading, navigation guards
- **Supabase**: Backend-as-a-Service, database, auth, real-time

#### **Styling Dependencies**
- **Tailwind CSS 4**: Utility-first CSS framework
- **DaisyUI 5**: Pre-built components and themes for Tailwind
- **Lucide Vue Next**: Icon library with Vue 3 components

#### **Development Dependencies**
- **@tailwindcss/vite**: Vite integration for Tailwind CSS 4
- **autoprefixer**: CSS vendor prefixing for browser compatibility

### Performance Requirements

#### **Loading Performance**
- **Initial page load**: < 2 seconds
- **Component mounting**: < 100ms
- **Theme switching**: < 50ms
- **Route transitions**: < 200ms

#### **Bundle Optimization**
- **CSS bundle**: ~109KB (acceptable for 8 themes + components)
- **JS bundle**: ~292KB (optimized with code splitting)
- **Image loading**: Lazy loading for car images
- **Code splitting**: Automatic via Vue Router lazy imports

#### **User Experience**
- **Skeleton states**: Always show loading placeholders
- **Error boundaries**: Graceful error handling with Danish messages
- **Responsive design**: Mobile-first approach, all breakpoints
- **Keyboard navigation**: Full accessibility compliance

### Testing Strategy

#### **Current State** (No tests implemented yet)
- Manual testing across all 8 themes
- Browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS Safari, Chrome Mobile)
- Performance testing with Lighthouse

#### **Future Testing Setup**
```javascript
// Planned: Vitest + Vue Testing Library
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ListingCard from '@/components/ListingCard.vue'

describe('ListingCard', () => {
  it('displays car information correctly', () => {
    const wrapper = mount(ListingCard, {
      props: {
        car: {
          make: 'BMW',
          model: '3 Series',
          monthly_price: 4500
        }
      }
    })
    
    expect(wrapper.text()).toContain('BMW 3 Series')
    expect(wrapper.text()).toContain('4.500 kr/md')
  })
})
```

### Security Considerations

#### **Data Protection**
- **RLS Policies**: All database access filtered by user permissions
- **Input Validation**: All user inputs validated before database queries
- **XSS Prevention**: Vue's automatic escaping prevents script injection
- **CSRF**: Supabase handles CSRF protection automatically

#### **Authentication** (Future Implementation)
- **Supabase Auth**: Email/password, OAuth providers
- **Session Management**: Automatic token refresh, secure storage
- **Route Guards**: Protected routes for authenticated users only
- **Role-Based Access**: Different permissions for users/admins

### Development Workflow

#### **Hot Reload & Development**
- **Vite HMR**: Instant updates during development
- **Theme Testing**: Switch themes in real-time
- **Console Monitoring**: Only error logs in production
- **Build Verification**: `npm run build` before deployment

#### **Code Quality**
- **Vue DevTools**: Essential for debugging reactive state
- **Component Structure**: Consistent patterns across all components
- **Error Handling**: Comprehensive try-catch with user-friendly messages
- **Documentation**: Inline comments for complex logic

### Migration Roadmap

#### **Phase 1: TypeScript Integration** (Next Priority)
- Add TypeScript gradually, starting with new components
- Maintain JavaScript compatibility during transition
- Type Supabase responses for better developer experience
- Add component prop types for better IDE support

#### **Phase 2: State Management Evolution**
- Migrate from provide/inject to Pinia stores
- Implement proper state persistence
- Add optimistic updates for better UX
- Centralize business logic in stores

#### **Phase 3: Testing & Quality**
- Set up Vitest + Vue Testing Library
- Add component unit tests
- Implement E2E testing with Playwright
- Add performance monitoring and Core Web Vitals

#### **Phase 4: Advanced Features**
- PWA capabilities for offline car browsing
- Advanced search with Elasticsearch
- Real-time notifications via Supabase
- Advanced analytics and user tracking 