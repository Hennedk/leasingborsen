<template>
  <BaseLayout>
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Desktop Sidebar -->
      <aside class="w-full lg:w-1/5 hidden lg:block">
        <FilterSidebar v-model:filters="filters" />
      </aside>

      <!-- Main Content -->
      <section class="flex-1">
        <!-- 🔥 Mobile Layout: Filter Icon Right, Result Count Left -->
        <div class="flex items-center justify-between mb-4 lg:hidden flex-row-reverse">
          <button class="btn btn-circle btn-outline" @click="showMobileFilter = true">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-5.414 5.414A1 1 0 0015 12v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          </button>
          <h1 class="text-xl font-black">
            <ListingResultsResultCount :count="resultCount" />
          </h1>
        </div>

        <!-- 🔥 Desktop Layout: Normal Layout -->
        <div class="hidden lg:flex items-start justify-between mb-4">
          <h1 class="text-2xl font-black">
            <ListingResultsResultCount :count="resultCount" />
          </h1>
        </div>

        <!-- 🔥 Listing Results Component -->
        <ListingResults 
          :filters="filters" 
          @update:filters="filters = $event"
          @update:count="resultCount = $event" 
          @resetFilters="resetAllFilters"
        />
      </section>
    </div>

    <!-- 🔥 Mobile Filter Overlay -->
    <MobileFilterOverlay 
      v-show="showMobileFilter" 
      v-model:filters="filters" 
      @close="showMobileFilter = false" 
    />
  </BaseLayout>
</template>


<script setup>
import { ref } from 'vue'
import BaseLayout from '../components/BaseLayout.vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import ListingResults from '../components/ListingResults.vue'
import ListingResultsResultCount from '../components/ListingResultsResultCount.vue'
import MobileFilterOverlay from '../components/MobileFilterOverlay.vue'

// 🔥 Default filter state
const defaultFilters = {
  make: '', model: '', fuel_type: '', transmission: '',
  body_type: '', horsepower: null, seats_min: null, seats_max: null,
  price_min: null, price_max: null, condition: '', listingStatus: '',
  driveType: '', availableBefore: ''
}

const filters = ref({ ...defaultFilters })
const showMobileFilter = ref(false)
const resultCount = ref(0)

// 🔥 Reset handler
function resetAllFilters() {
  filters.value = { ...defaultFilters }
}
</script>
