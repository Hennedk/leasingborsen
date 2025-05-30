<!-- Enhanced Listings.vue with seamless header-to-filter transition -->
<template>
  <BaseLayout>
    <!-- 📱 Sticky Filter + Sort Bar - Seamless transition that replaces header -->
    <div
      class="lg:hidden fixed left-0 right-0 z-50 bg-base-100 shadow-sm border-b border-gray-200"
      :style="filterBarStyle"
    >
      <div class="flex gap-2 w-full max-w-[1440px] mx-auto" :style="filterInnerStyle">
        <button
          @click="showMobileFilter = true"
          class="flex items-center gap-1 border border-gray-300 rounded-lg flex-1 transition-all duration-300"
          :style="buttonStyle"
        >
          <Filter class="w-5 h-5" /> Filter
          <span v-if="activeFilters.length" class="bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {{ activeFilters.length }}
          </span>
        </button>
        <select v-model="sortOrder" class="select select-bordered select-sm font-medium flex-1 transition-all duration-300">
          <option value="">Pris (lav til høj)</option>
          <option value="desc">Pris (høj til lav)</option>
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-2 pt-6 lg:pt-6">
      <!-- Dynamic spacer - starts at header + filter height, then shrinks to just filter height -->
      <div class="lg:hidden" :style="{ height: `${spacerHeight}px` }"></div>

      <!-- 🔥 Top Section (Desktop) -->
      <div class="flex flex-col gap-2 lg:flex-row lg:gap-6 items-start mb-4">
        <div class="w-full lg:w-1/4 flex items-center gap-2">
          <ListingResultsResultCount :count="resultCount" class="text-2xl font-black" />
        </div>
        <div class="w-full lg:flex-1 max-w-4xl -mt-2 lg:mt-0">
          <FilterChips
            :activeFilters="activeFilters"
            @remove-filter="removeFilter"
            @reset-filters="resetAllFilters"
            class="flex flex-wrap gap-2"
          />
        </div>
        <div class="hidden lg:flex items-center gap-2">
          <label class="text-sm font-bold text-primary">Sortér efter</label>
          <select v-model="sortOrder" class="select select-bordered select-sm font-medium !text-xs leading-tight px-2 py-0.5 w-48 h-8">
            <option value="">Pris (lav til høj)</option>
            <option value="desc">Pris (høj til lav)</option>
          </select>
        </div>
      </div>

      <!-- 🔥 Main Content -->
      <div class="flex flex-col lg:flex-row gap-6">
        <aside class="w-full lg:w-1/4 hidden lg:block">
          <FilterSidebar v-model:filters="filters" @update:sortOrder="sortOrder = $event" />
        </aside>
        <section class="flex-1">
          <ListingResults
            :filters="filters"
            :sortOrder="sortOrder"
            @update:filters="filters = $event"
            @update:count="resultCount = $event"
          />
        </section>
      </div>

      <MobileFilterOverlay v-show="showMobileFilter" v-model:filters="filters" @close="showMobileFilter = false" />
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseLayout from '../components/BaseLayout.vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import ListingResults from '../components/ListingResults.vue'
import ListingResultsResultCount from '../components/ListingResultsResultCount.vue'
import FilterChips from '../components/FilterChips.vue'
import MobileFilterOverlay from '../components/MobileFilterOverlay.vue'
import { Filter } from 'lucide-vue-next'

const defaultFilters = {
  make: '', model: '', fuel_type: '', transmission: '', body_type: '',
  horsepower: null, seats_min: null, seats_max: null,
  price_min: null, price_max: null, condition: '',
  listingStatus: '', driveType: '', availableBefore: ''
}

const filters = ref({ ...defaultFilters })
const resultCount = ref(0)
const sortOrder = ref('')
const showMobileFilter = ref(false)
const scrollY = ref(0)

// Constants for better maintainability
const HEADER_HEIGHT = 64
const FILTER_HEIGHT = 64 // Keep consistent height throughout
const PADDING_INITIAL = 16
const PADDING_STICKY = 12
const TRANSITION_DISTANCE = 80 // Slightly longer transition for smoother effect

onMounted(() => {
  const handleScroll = () => {
    scrollY.value = window.scrollY
  }
  
  // Use passive listener for better performance
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})

// Enhanced scroll progress - extends transition beyond header height for smoother effect
const scrollProgress = computed(() => {
  return Math.min(Math.max(scrollY.value / TRANSITION_DISTANCE, 0), 1)
})

// Check if filter should be fully sticky
const isFullySticky = computed(() => scrollY.value >= TRANSITION_DISTANCE)

// Smooth filter bar positioning that replaces header seamlessly
const filterBarStyle = computed(() => {
  const progress = scrollProgress.value
  
  // Start position: below header (64px from top)
  // End position: at top (0px from top)
  const topPosition = HEADER_HEIGHT * (1 - progress)
  
  // Keep consistent height - no resizing during transition
  const height = FILTER_HEIGHT
  
  // Enhanced shadow based on progress
  const shadowIntensity = progress
  const shadowBlur = 4 + (shadowIntensity * 8)
  const shadowOpacity = 0.1 + (shadowIntensity * 0.15)
  
  return {
    top: `${topPosition}px`,
    height: `${height}px`,
    boxShadow: `0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0, 0, 0, ${shadowOpacity})`,
    transition: scrollY.value < 10 ? 'none' : 'box-shadow 0.3s ease-out', // Only animate shadow, not position
    width: '100%',
    backdropFilter: progress > 0.3 ? `blur(${progress * 8}px)` : 'none',
    backgroundColor: progress > 0.1 ? `rgba(255, 255, 255, ${0.95 + progress * 0.05})` : 'rgb(255, 255, 255)',
  }
})

// Enhanced inner styling with smoother transitions
const filterInnerStyle = computed(() => {
  const progress = scrollProgress.value
  const padding = PADDING_INITIAL - (progress * (PADDING_INITIAL - PADDING_STICKY))
  
  return {
    padding: `${padding}px 24px`,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    transition: scrollY.value < 10 ? 'none' : 'padding 0.3s ease-out'
  }
})

// Button styling
const buttonStyle = computed(() => ({
  height: 'auto',
  minHeight: '40px',
  padding: '8px 12px'
}))

// Enhanced spacer that accounts for the smooth transition
const spacerHeight = computed(() => {
  const progress = scrollProgress.value
  
  // Keep filter height consistent - no resizing
  const filterHeight = FILTER_HEIGHT
  
  // Initially: header height + filter height
  // Finally: just filter height
  const headerContribution = HEADER_HEIGHT * (1 - progress)
  
  return headerContribution + filterHeight
})

// Active filters computation
const activeFilters = computed(() => {
  const f = filters.value
  const list = []
  const transmissionLabels = {
    'Automatic': 'Automatisk gear',
    'Manual': 'Manuelt gear'
  }
  
  if (f.make) list.push({ key: 'make', label: f.make })
  if (f.model) list.push({ key: 'model', label: f.model })
  if (f.fuel_type) list.push({ key: 'fuel_type', label: f.fuel_type })
  if (f.body_type) list.push({ key: 'body_type', label: f.body_type })
  if (f.transmission) list.push({ 
    key: 'transmission', 
    label: transmissionLabels[f.transmission] || f.transmission 
  })
  if (f.seats_min != null || f.seats_max != null) {
    const min = f.seats_min ?? ''
    const max = f.seats_max ?? ''
    list.push({ key: 'seats', label: `Sæder: ${min} - ${max}` })
  }
  if (f.price_min != null || f.price_max != null) {
    const min = f.price_min ?? ''
    const max = f.price_max ?? ''
    list.push({ key: 'price', label: `Pris: ${min} - ${max} kr.` })
  }
  
  return list
})

function removeFilter(key) {
  const updated = { ...filters.value }
  
  if (key === 'seats') {
    updated.seats_min = null
    updated.seats_max = null
  } else if (key === 'price') {
    updated.price_min = null
    updated.price_max = null
  } else {
    updated[key] = ''
  }
  
  filters.value = updated
}

function resetAllFilters() {
  filters.value = { ...defaultFilters }
}
</script>