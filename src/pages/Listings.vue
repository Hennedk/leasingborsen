<template>
  <BaseLayout>
    <div class="flex flex-col gap-2">
      <!-- 🔥 Top Section: Result Count + Filter Chips + Filter Icon Button (Mobile) -->
      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <ListingResultsResultCount :count="resultCount" class="text-2xl font-black" />

          <!-- 🔥 Filter Icon Button: Visible on mobile, hidden on desktop -->
          <button
            @click="showMobileFilter = true"
            class="relative flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-300 shadow-sm hover:bg-gray-100 transition flex-none block lg:hidden"
          >
            <!-- SVG Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <!-- Red Badge -->
            <span
              v-if="activeFilters.length"
              class="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full"
            >
              {{ activeFilters.length }}
            </span>
          </button>
        </div>

        <!-- 🔥 Filter Chips below Result Count -->
        <FilterChips 
          :activeFilters="activeFilters"
          @remove-filter="removeFilter"
          @reset-filters="resetAllFilters"
          class="flex flex-wrap gap-2 my-2"
        />
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Sidebar with Filters & Sorting: Only visible on desktop -->
        <aside class="w-full lg:w-1/4 hidden lg:block">
          <FilterSidebar v-model:filters="filters" @update:sortOrder="sortOrder = $event" />
        </aside>

        <!-- Main Listings -->
        <section class="flex-1">
          <ListingResults
            :filters="filters"
            :sortOrder="sortOrder"
            @update:filters="filters = $event"
            @update:count="resultCount = $event"
          />
        </section>
      </div>

      <!-- Mobile Filter Overlay -->
      <MobileFilterOverlay v-show="showMobileFilter" v-model:filters="filters" @close="showMobileFilter = false" />
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseLayout from '../components/BaseLayout.vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import ListingResults from '../components/ListingResults.vue'
import ListingResultsResultCount from '../components/ListingResultsResultCount.vue'
import FilterChips from '../components/FilterChips.vue'
import MobileFilterOverlay from '../components/MobileFilterOverlay.vue'

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

// Active filters for chips
const activeFilters = computed(() => {
  const f = filters.value, list = []
  if (f.make) list.push({ key: 'make', label: f.make })
  if (f.model) list.push({ key: 'model', label: f.model })
  if (f.fuel_type) list.push({ key: 'fuel_type', label: f.fuel_type })
  if (f.body_type) list.push({ key: 'body_type', label: f.body_type })
  if (f.transmission) list.push({ key: 'transmission', label: `Gear: ${f.transmission}` })
  if (f.seats_min != null || f.seats_max != null) list.push({ key: 'seats', label: `Sæder: ${f.seats_min ?? ''} - ${f.seats_max ?? ''}` })
  if (f.price_min != null || f.price_max != null) list.push({ key: 'price', label: `Pris: ${f.price_min ?? ''} - ${f.price_max ?? ''} kr.` })
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
