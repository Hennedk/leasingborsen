<template>
  <BaseLayout>
    <div class="flex flex-col gap-2">
      <!-- 🔥 Top Section: Result Count + Filter Chips + Sorting + Filter Icon -->
      <div class="flex flex-col gap-2 lg:flex-row lg:gap-6 items-start mb-4">
        
        <!-- Result Count + Filter Icon (mobile) -->
        <div class="w-full lg:w-1/4 flex items-center gap-2">
          <ListingResultsResultCount :count="resultCount" class="text-2xl font-black" />
          <button
            @click="showMobileFilter = true"
            class="ml-auto relative flex items-center justify-center w-14 h-14 rounded-full bg-white border-2 border-gray-300 shadow-sm hover:bg-gray-100 transition flex-none lg:hidden"
          >
            <Filter class="w-6 h-6 text-black" stroke-width="2" />
            <span
              v-if="activeFilters.length"
              class="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full"
            >
              {{ activeFilters.length }}
            </span>
          </button>
        </div>

        <!-- Chips (unchanged) -->
        <div class="w-full lg:flex-1 max-w-4xl -mt-2 lg:mt-0">
          <FilterChips
            :activeFilters="activeFilters"
            @remove-filter="removeFilter"
            @reset-filters="resetAllFilters"
            class="flex flex-wrap gap-2"
          />
        </div>

        <!-- Sorting Dropdown (desktop only) -->
        <div class="hidden lg:flex items-center gap-2">
          <label class="text-sm font-bold text-primary whitespace-nowrap">Sortér efter</label>
          <select class="select select-bordered select-sm font-medium !text-xs leading-tight px-2 py-0.5 w-48 h-8">
            <option>Pris (lav til høj)</option>
            <option>Pris (høj til lav)</option>
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
import { ref, computed } from 'vue'
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

// Active filters for chips
const activeFilters = computed(() => {
  const f = filters.value, list = []
  const transmissionLabels = {
    'Automatic': 'Automatisk gear',
    'Manual': 'Manuelt gear'
  }
  if (f.make) list.push({ key: 'make', label: f.make })
  if (f.model) list.push({ key: 'model', label: f.model })
  if (f.fuel_type) list.push({ key: 'fuel_type', label: f.fuel_type })
  if (f.body_type) list.push({ key: 'body_type', label: f.body_type })
  if (f.transmission) list.push({ key: 'transmission', label: transmissionLabels[f.transmission] || f.transmission })
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
