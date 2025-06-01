<!-- Enhanced Listings.vue with seamless header-to-filter transition -->
<template>
  <BaseLayout>
    <!-- 📱 Sticky Filter + Sort Bar - Full width outside container (MOBILE ONLY) -->
    <div
      class="lg:hidden sticky left-0 right-0 bg-card-bg shadow-sm border-b border-gray-200 z-40"
      :class="stickyFilterClasses"
      :style="stickyFilterStyle"
    >
      <div class="flex items-center gap-2 w-full max-w-[1440px] mx-auto px-6 py-3">
        <button
          @click="openMobileFilter"
          class="flex items-center gap-1 border border-gray-300 rounded-lg transition-all duration-300 h-10 px-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 flex-shrink-0"
        >
          <Filter class="w-5 h-5" /> Filter
          <span v-if="activeFilters.length" class="bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {{ activeFilters.length }}
          </span>
        </button>
        <!-- Filter chips in the same bar -->
        <div class="flex-1 overflow-x-auto">
          <FilterChips
            :activeFilters="activeFilters"
            @remove-filter="removeFilter"
            @reset-filters="resetAllFilters"
            class="flex gap-2 flex-nowrap"
          />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 lg:pt-6">
      <!-- 📱 MOBILE: Result count and sorting section -->
      <div class="lg:hidden">
        <div class="mt-6 mb-4 space-y-4">
          <!-- Result count - full width -->
          <div>
            <ListingResultsResultCount :count="resultCount" class="text-xl font-bold text-gray-900" />
          </div>
          
          <!-- Sorting row -->
          <div class="flex items-center">
            <div class="relative">
              <button
                @click="showMobileSortDropdown = !showMobileSortDropdown"
                class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 py-1"
              >
                <ArrowUpDown class="w-4 h-4 text-gray-500" />
                <span>{{ currentSortLabel }}</span>
                <ChevronDown class="w-3 h-3 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': showMobileSortDropdown }" />
              </button>
              
              <!-- Sort dropdown -->
              <div v-if="showMobileSortDropdown" class="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[160px]">
                <button
                  @click="selectSortOption('')"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  :class="{ 'text-primary font-medium': sortOrder === '' }"
                >
                  Lowest price
                </button>
                <button
                  @click="selectSortOption('desc')"
                  class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                  :class="{ 'text-primary font-medium': sortOrder === 'desc' }"
                >
                  Highest price
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🖥️ DESKTOP: Two Column Layout -->
      <div class="hidden lg:flex lg:gap-6">
        <!-- LEFT COLUMN: Filters -->
        <aside class="w-1/4">
          <FilterSidebar v-model:filters="filters" @update:sortOrder="sortOrder = $event" />
        </aside>
        
        <!-- RIGHT COLUMN: All Content -->
        <section class="flex-1">
          <!-- Top section with result count, chips, and sorting -->
          <div class="flex flex-col gap-4 mb-6">
            <!-- Result count and sorting row -->
            <div class="flex items-center justify-between">
              <ListingResultsResultCount :count="resultCount" class="text-2xl font-black" />
              <div class="relative">
                <button
                  @click="showDesktopSortDropdown = !showDesktopSortDropdown"
                  class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 py-1"
                >
                  <ArrowUpDown class="w-4 h-4 text-gray-500" />
                  <span>{{ currentSortLabel }}</span>
                  <ChevronDown class="w-3 h-3 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': showDesktopSortDropdown }" />
                </button>
                
                <!-- Desktop Sort dropdown -->
                <div v-if="showDesktopSortDropdown" class="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[160px]">
                  <button
                    @click="selectDesktopSortOption('')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    :class="{ 'text-primary font-medium': sortOrder === '' }"
                  >
                    Lowest price
                  </button>
                  <button
                    @click="selectDesktopSortOption('desc')"
                    class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    :class="{ 'text-primary font-medium': sortOrder === 'desc' }"
                  >
                    Highest price
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Filter chips -->
            <div>
              <FilterChips
                :activeFilters="activeFilters"
                @remove-filter="removeFilter"
                @reset-filters="resetAllFilters"
                class="flex flex-wrap gap-2"
              />
            </div>
          </div>

          <!-- Listing Results -->
          <ListingResults
            :filters="filters"
            :sortOrder="sortOrder"
            @update:filters="filters = $event"
            @update:count="resultCount = $event"
          />
        </section>
      </div>

      <!-- 📱 MOBILE: Results Section -->
      <section class="lg:hidden">
        <ListingResults
          :filters="filters"
          :sortOrder="sortOrder"
          @update:filters="filters = $event"
          @update:count="resultCount = $event"
        />
      </section>

      <!-- Mobile Filter Overlay -->
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
import { Filter, ChevronDown, ArrowUpDown } from 'lucide-vue-next'

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
const showMobileSortDropdown = ref(false)
const showDesktopSortDropdown = ref(false)

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
    'border-t': !isSticky, // Only show top border when not sticky
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

// Computed property for current sort label
const currentSortLabel = computed(() => {
  switch (sortOrder.value) {
    case 'desc': return 'Highest price'
    default: return 'Lowest price'
  }
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

function selectSortOption(option) {
  sortOrder.value = option
  showMobileSortDropdown.value = false
}

function selectDesktopSortOption(option) {
  sortOrder.value = option
  showDesktopSortDropdown.value = false
}
</script>