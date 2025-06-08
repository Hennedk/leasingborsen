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
- **Frontend**: Vue.js 3 with Composition API (`<script setup>` syntax)
- **Build Tool**: Vite 6.3.5 with Vue plugin
- **Styling**: Tailwind CSS 4 + DaisyUI 5 (8 dynamic themes)
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **Routing**: Vue Router 4 with lazy loading
- **Icons**: Lucide Vue Next
- **Language**: Danish-first interface (da-DK localization)

### Project Structure
```
src/
├── components/           # Reusable Vue components (17 components)
│   ├── BaseLayout.vue   # Main app layout with Header
│   ├── Header.vue       # Navigation with theme switcher
│   ├── Listing*.vue     # Car listing related components
│   ├── Filter*.vue      # Search and filter components
│   └── Modal.vue        # Reusable modal component
├── pages/               # Route-level components (5 pages + 8 admin pages)
│   ├── Home.vue         # Landing page with hero banner
│   ├── Listings.vue     # Car listings with filters
│   ├── Listing.vue      # Individual car detail page
│   ├── ListingCreation.vue # Create new listing
│   ├── About.vue        # About page
│   └── Admin*.vue       # Administrative CRUD interfaces
├── router/              # Vue Router configuration
├── lib/                 # Utilities and configurations
│   └── supabase.js      # Supabase client setup
└── assets/              # Global CSS and static assets
    └── main.css         # Tailwind + DaisyUI configuration
```

### Database Architecture
- **Primary Data Source**: `full_listing_view` (denormalized view for performance)
- **Core Tables**: `listings`, `lease_pricing`, plus reference tables for makes, models, etc.
- **Query Pattern**: Always use `full_listing_view` for car data retrieval
- **Security**: Row Level Security (RLS) enabled on all tables

## Key Technical Constraints

### DaisyUI 5 + Tailwind CSS 4 Limitation
**CRITICAL**: DaisyUI classes MUST be used directly in templates, NEVER in `@apply` rules

```vue
<!-- ✅ Correct approach -->
<div class="card bg-base-100 shadow-md border border-base-300">
  <div class="card-body">
    <h2 class="card-title text-primary">{{ car.make }} {{ car.model }}</h2>
  </div>
</div>

<!-- ❌ Will cause build errors -->
<div class="custom-card">  <!-- Don't use @apply with DaisyUI classes -->
```

### State Management Pattern
Currently uses Vue's provide/inject for theme state. Future migration to Pinia planned.

```javascript
// Theme access pattern
const themeState = inject('theme')
const currentTheme = themeState?.currentTheme
const setTheme = themeState?.setTheme
```

### Danish Localization Requirements
- All UI text must be in Danish
- Use `toLocaleString('da-DK')` for number formatting
- Error messages in Danish: "Der opstod en fejl ved..."

## Component Development Patterns

### Standard Vue 3 Component Structure
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
  <!-- Always include loading state -->
  <div v-if="loading" class="animate-pulse">
    <div class="bg-base-300 rounded-lg h-48"></div>
  </div>
  
  <!-- Error state with Danish message -->
  <div v-else-if="error" class="alert alert-error">
    <span>{{ error }}</span>
  </div>
  
  <!-- Content -->
  <div v-else-if="car" class="card bg-base-100 shadow-md">
    <div class="card-body">
      <h2 class="card-title text-primary">{{ car.make }} {{ car.model }}</h2>
      <p class="text-2xl font-bold">{{ displayPrice }} kr/md</p>
    </div>
  </div>
</template>
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
- **CSS**: ~109KB (includes 8 themes + all DaisyUI components)
- **JavaScript**: ~292KB (optimized with code splitting)
- **Loading**: Always implement skeleton loading states
- **Images**: Use lazy loading for car gallery images

### Theme System (8 Themes)
Test all functionality across: light, dark, corporate, business, synthwave, cyberpunk, fantasy, luxury

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