<!-- Enhanced Listings.vue with seamless header-to-filter transition -->
<template>
  <BaseLayout>
    <!-- 📱 Sticky Filter + Sort Bar - Full width outside container -->
    <div
      class="lg:hidden sticky left-0 right-0 bg-base-100 shadow-sm border-b border-gray-200 z-40"
      :class="stickyFilterClasses"
      :style="stickyFilterStyle"
    >
      <div class="flex gap-2 w-full max-w-[1440px] mx-auto px-6 py-3">
        <button
          @click="openMobileFilter"
          class="flex items-center gap-1 border border-gray-300 rounded-lg flex-1 transition-all duration-300 h-10 px-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <Filter class="w-5 h-5" /> Filter
          <span v-if="activeFilters.length" class="bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {{ activeFilters.length }}
          </span>
        </button>
        <button
          @click="sortOrder = sortOrder === 'desc' ? '' : 'desc'"
          class="flex items-center justify-between gap-2 border border-gray-300 rounded-lg flex-1 transition-all duration-300 h-10 px-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <span class="font-medium">{{ sortOrder === 'desc' ? 'Pris (høj til lav)' : 'Pris (lav til høj)' }}</span>
          <ChevronDown class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-180': sortOrder === 'desc' }" />
        </button>
      </div>
    </div>


    <div class="flex flex-col gap-2 pt-6 lg:pt-6">
      <!-- 🔥 Top Section (Desktop) -->
      <div class="flex flex-col gap-2 lg:flex-row lg:gap-6 items-start mb-4">
        <!-- Result count with increased spacing -->
        <div class="w-full lg:w-1/4 flex flex-col gap-3 mt-4 lg:mt-0">
          <ListingResultsResultCount :count="resultCount" class="text-2xl font-black" />
          <!-- Filter chips with subtle connection to result count -->
          <div class="flex flex-col gap-2">
            <FilterChips
              :activeFilters="activeFilters"
              @remove-filter="removeFilter"
              @reset-filters="resetAllFilters"
              class="flex flex-wrap gap-2"
            />
          </div>
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

      <MobileFilterOverlay 
        v-show="showMobileFilter" 
        v-model:filters="filters" 
        @close="closeMobileFilter"
        @apply-filters="handleApplyFilters"
      />
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import BaseLayout from '../components/BaseLayout.vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import ListingResults from '../components/ListingResults.vue'
import ListingResultsResultCount from '../components/ListingResultsResultCount.vue'
import FilterChips from '../components/FilterChips.vue'
import MobileFilterOverlay from '../components/MobileFilterOverlay.vue'
import { Filter, ChevronDown } from 'lucide-vue-next'

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
const isApplyingFilters = ref(false)

// Constants for better maintainability
const HEADER_HEIGHT = 64

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

// Sticky positioning based on header scroll
const stickyFilterStyle = computed(() => {
  const topPosition = Math.max(HEADER_HEIGHT - scrollY.value, 0)
  
  return {
    top: `${topPosition}px`,
    width: '100vw',
    marginLeft: 'calc(-50vw + 50%)'
  }
})

// Enhanced sticky classes
const stickyFilterClasses = computed(() => {
  const isSticky = scrollY.value >= HEADER_HEIGHT
  return {
    'shadow-lg': isSticky,
    'backdrop-blur-sm': isSticky,
    'bg-white/95': isSticky,
  }
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

function openMobileFilter() {
  showMobileFilter.value = true
}

function closeMobileFilter() {
  showMobileFilter.value = false
}

function handleApplyFilters(newFilters) {
  const exactScrollPosition = scrollY.value
  
  // Close overlay first
  closeMobileFilter()
  
  // Use nextTick to wait for overlay to close, then update filters
  nextTick(() => {
    // Update filters after overlay is closed
    filters.value = { ...newFilters }
    
    // Immediately restore scroll position
    window.scrollTo({
      top: exactScrollPosition,
      behavior: 'instant'
    })
  })
}

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