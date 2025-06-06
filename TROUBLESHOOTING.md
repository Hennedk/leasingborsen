# Troubleshooting Guide

## Common Issues & Solutions

### Build & Configuration Issues

#### CSS-001: DaisyUI Classes Not Working
**Symptoms**: DaisyUI classes not applying styles, `text-base-content` unknown utility errors
**Root Cause**: Incorrect DaisyUI 5 configuration with Tailwind CSS 4
**Solution**: Use CSS-based plugin syntax in main.css

```css
/* ✅ Correct: main.css */
@import "tailwindcss";
@plugin "daisyui" {
  themes: light --default, dark --prefersdark, synthwave, cyberpunk, corporate, business, fantasy, luxury;
}

/* ❌ Incorrect: tailwind.config.js */
import daisyui from 'daisyui'  // Don't do this with CSS 4
```

**Related**: See SOLUTIONS.md#CONFIG-001

---

#### CSS-002: Cannot Apply Unknown Utility Class Errors
**Symptoms**: Build errors when using `@apply` with DaisyUI classes
**Root Cause**: Tailwind CSS 4 cannot use DaisyUI classes in `@apply` rules
**Solution**: Use DaisyUI classes directly in templates

```vue
<!-- ✅ Correct: Direct usage -->
<div class="card bg-base-100 shadow-md">
  <div class="card-body">
    <h2 class="card-title">Title</h2>
  </div>
</div>

<!-- ❌ Incorrect: @apply usage -->
<style>
.my-card {
  @apply card bg-base-100 shadow-md; /* This breaks */
}
</style>
```

---

#### CSS-003: Theme Switching Not Working
**Symptoms**: Theme dropdown changes but visual theme doesn't update
**Root Cause**: Missing `data-theme` attribute binding or incorrect theme persistence
**Solution**: Ensure proper reactive binding in App.vue

```vue
<!-- App.vue -->
<template>
  <div :data-theme="currentTheme" class="min-h-screen">
    <router-view />
  </div>
</template>

<script setup>
const currentTheme = ref('light')

// Initialize from localStorage
onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  currentTheme.value = savedTheme
})
</script>
```

**Related**: See SOLUTIONS.md#THEME-001

---

#### BUILD-001: Dual Plugin Processing Errors
**Symptoms**: "Cannot convert undefined or null to object" or conflicts during build
**Root Cause**: Using both Vite plugin AND PostCSS plugin simultaneously
**Solution**: Use only one - prefer @tailwindcss/vite plugin

```javascript
// ✅ Correct: vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()]
})

// ✅ Correct: postcss.config.js (minimal)
export default {
  plugins: {
    autoprefixer: {}
  }
}

// ❌ Incorrect: Both plugins
// Don't use @tailwindcss/postcss AND @tailwindcss/vite together
```

---

### Development & Runtime Issues

#### DEV-001: Console Debug Noise
**Symptoms**: Excessive console.log output in development/production
**Root Cause**: Development debugging statements not cleaned up
**Solution**: Remove console.log, keep console.error for legitimate errors

```javascript
// ✅ Keep error logging
console.error('Error fetching data:', error)

// ❌ Remove debug logging
console.log('Debug info:', data)  // Remove these
```

**Related**: See SOLUTIONS.md#CLEANUP-001

---

#### DEV-002: Hot Reload Not Working
**Symptoms**: Changes not reflecting immediately in browser
**Root Cause**: Vite HMR issues or cached builds
**Solution**: Clear cache and restart dev server

```bash
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

**Browser Cache**: Hard refresh with Ctrl+F5 or disable cache in DevTools

---

#### DEV-003: Component Not Found Errors
**Symptoms**: "Failed to resolve component" errors
**Root Cause**: Incorrect import paths or component name mismatches
**Solution**: Verify component names and import paths

```javascript
// ✅ Correct import
import ListingCard from '../components/ListingCard.vue'

// ❌ Incorrect casing
import listingCard from '../components/ListingCard.vue'  // Wrong case
import ListingCard from '../components/listingcard.vue'  // Wrong filename
```

---

### Supabase & Database Issues

#### DB-001: RLS Policy Errors
**Symptoms**: "Row level security violation" or permission denied errors
**Root Cause**: Missing or incorrect Row Level Security policies
**Solution**: Verify RLS policies are enabled and correctly configured

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'full_listing_view';

-- Enable RLS if needed
ALTER TABLE full_listing_view ENABLE ROW LEVEL SECURITY;
```

---

#### DB-002: Query Performance Issues
**Symptoms**: Slow loading, timeout errors on car listings
**Root Cause**: Missing database indexes on frequently queried columns
**Solution**: Add indexes for common filter combinations

```sql
-- Common indexes for car listings
CREATE INDEX IF NOT EXISTS idx_full_listing_view_make ON full_listing_view(make);
CREATE INDEX IF NOT EXISTS idx_full_listing_view_body_type ON full_listing_view(body_type);
CREATE INDEX IF NOT EXISTS idx_full_listing_view_price ON full_listing_view(monthly_price);
CREATE INDEX IF NOT EXISTS idx_full_listing_view_created_at ON full_listing_view(created_at);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_full_listing_view_make_body_price 
ON full_listing_view(make, body_type, monthly_price);
```

---

#### DB-003: Supabase Connection Errors
**Symptoms**: "Failed to fetch" or connection timeout errors
**Root Cause**: Incorrect Supabase configuration or network issues
**Solution**: Verify Supabase client configuration

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('full_listing_view').select('count').limit(1)
    if (error) throw error
    console.log('Supabase connected successfully')
  } catch (err) {
    console.error('Supabase connection failed:', err)
  }
}
```

---

### Performance Issues

#### PERF-001: Large Bundle Size
**Symptoms**: Bundle size exceeding targets (>109KB CSS, >292KB JS)
**Root Cause**: Unused dependencies or inefficient imports
**Solution**: Analyze bundle and optimize imports

```bash
# Analyze bundle
npm run build
npx vite-bundle-analyzer dist

# Check for unused dependencies
npx depcheck
```

**Optimization strategies**:
- Use dynamic imports for large components
- Lazy load routes with Vue Router
- Remove unused CSS/JS

---

#### PERF-002: Slow Component Rendering
**Symptoms**: Components taking >100ms to render, laggy interactions
**Root Cause**: Inefficient reactivity or too many reactive properties
**Solution**: Use `shallowRef` for large datasets, optimize computed properties

```javascript
// ✅ Use shallowRef for large arrays
const cars = shallowRef([])

// ✅ Optimize computed properties
const filteredCars = computed(() => {
  if (!searchTerm.value) return cars.value
  return cars.value.filter(car => 
    car.make.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

// ❌ Avoid deep reactivity for large objects
const cars = reactive([])  // Can be slow with many items
```

---

### Accessibility Issues

#### A11Y-001: Keyboard Navigation Problems
**Symptoms**: Cannot navigate components with keyboard, missing focus states
**Root Cause**: Missing tabindex, focus management, or ARIA labels
**Solution**: Add proper keyboard navigation support

```vue
<template>
  <!-- ✅ Proper keyboard navigation -->
  <button 
    class="btn btn-primary"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
    :aria-label="buttonLabel"
  >
    {{ buttonText }}
  </button>
  
  <!-- ✅ Focus management -->
  <div 
    tabindex="0"
    role="button"
    @keydown.enter="activate"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    Custom interactive element
  </div>
</template>
```

---

#### A11Y-002: Screen Reader Issues
**Symptoms**: Screen readers not announcing content properly
**Root Cause**: Missing ARIA labels, improper heading hierarchy, or semantic HTML
**Solution**: Add proper ARIA attributes and semantic structure

```vue
<template>
  <!-- ✅ Proper semantic structure -->
  <main role="main" aria-label="Car listings">
    <h1>Leasingbiler</h1>
    
    <section aria-labelledby="filters-heading">
      <h2 id="filters-heading">Filtre</h2>
      <!-- Filter controls -->
    </section>
    
    <section aria-labelledby="results-heading" aria-live="polite">
      <h2 id="results-heading">Søgeresultater</h2>
      <p aria-live="polite">{{ resultCount }} biler fundet</p>
      <!-- Car listing results -->
    </section>
  </main>
</template>
```

---

### Browser Compatibility Issues

#### COMPAT-001: Safari CSS Issues
**Symptoms**: Styling broken in Safari, gap properties not working
**Root Cause**: Safari lagging in CSS support for newer features
**Solution**: Use fallbacks or alternative CSS approaches

```css
/* ✅ Safari-compatible approach */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem; /* Modern browsers */
  grid-gap: 1.5rem; /* Safari fallback */
}

/* ✅ Flexbox fallback */
.flex-container {
  display: flex;
  flex-wrap: wrap;
  margin: -0.75rem; /* Negative margin for gap simulation */
}

.flex-item {
  margin: 0.75rem; /* Positive margin for gap simulation */
}
```

---

#### COMPAT-002: Internet Explorer Issues
**Symptoms**: Complete layout breakdown in IE
**Root Cause**: IE doesn't support modern CSS Grid, ES6+ features
**Solution**: Project targets modern browsers only - add browser detection

```javascript
// Detect unsupported browsers
const isUnsupportedBrowser = () => {
  const userAgent = navigator.userAgent
  return userAgent.indexOf('MSIE') !== -1 || 
         userAgent.indexOf('Trident/') !== -1
}

if (isUnsupportedBrowser()) {
  alert('Denne hjemmeside kræver en moderne browser. Opdater venligst din browser.')
}
```

---

## Emergency Fixes

### Quick Recovery Commands

```bash
# Reset to clean state
git stash
npm ci
rm -rf node_modules/.vite
npm run dev

# Force rebuild
npm run build --force

# Clear all caches
rm -rf node_modules
rm package-lock.json
npm install
```

### Development Reset Checklist

- [ ] Clear browser cache (Ctrl+F5)
- [ ] Restart dev server (`npm run dev`)
- [ ] Clear Vite cache (`rm -rf node_modules/.vite`)
- [ ] Check console for errors
- [ ] Verify configuration files
- [ ] Test in incognito/private browsing mode

### Production Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Test all 8 themes work correctly
- [ ] Verify no console.log statements in production
- [ ] Check bundle sizes within targets
- [ ] Test on multiple browsers/devices
- [ ] Verify all routes work correctly
- [ ] Test Supabase connection in production environment 