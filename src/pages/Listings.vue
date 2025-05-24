<template>
  <BaseLayout>
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Sidebar (always on left) -->
      <aside :class="['w-full lg:w-1/5', showMobileFilter ? 'block' : 'hidden', 'lg:block']">
        <FilterSidebar v-model:filters="filters" />
      </aside>

       <!-- 🔥 Filter Toggle Button (Mobile Only) -->
<button class="btn btn-circle btn-outline lg:hidden" @click="showMobileFilter = !showMobileFilter">
  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-5.414 5.414A1 1 0 0015 12v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" />
  </svg>
</button>

      <!-- Main Content (Listings + Headline + Sorting) -->
      <section class="flex-1">
        <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4 gap-2">
          <!-- 🔥 Headline with Result Count (left/top) -->
          <h1 class="text-2xl font-bold">
            <ListingResultsResultCount :filters="filters" />
          </h1>

          
   

        </div>

        <!-- 🔥 Listings Grid -->
        <ListingResults v-model:filters="filters" />
      </section>
    </div>
  </BaseLayout>
</template>


<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BaseLayout from '../components/BaseLayout.vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import ListingResults from '../components/ListingResults.vue'
import ListingResultsResultCount from '../components/ListingResultsResultCount.vue'  // 👈 Import it!

const route = useRoute()
const router = useRouter()

function normalizeQuery(query) {
  return {
    make: query.make || '',
    model: query.model || '',
    fuel_type: query.fuel_type || '',
    transmission: query.transmission || '',
    body_type: query.body_type || '',
    horsepower: query.horsepower ? Number(query.horsepower) : null,
    seats_min: query.seats_min ? Number(query.seats_min) : null,
    seats_max: query.seats_max ? Number(query.seats_max) : null,
    price_min: query.price_min ? Number(query.price_min) : null,
    price_max: query.price_max ? Number(query.price_max) : null,
    condition: query.condition || '',
    listingStatus: query.listingStatus || '',
    driveType: query.driveType || '',
    availableBefore: query.availableBefore || ''
  }
}

const filters = ref(normalizeQuery(route.query))
const showMobileFilter = ref(false)

watch(() => route.query, (newQuery) => {
  filters.value = normalizeQuery(newQuery)
}, { immediate: true, deep: true })

watch(filters, (newFilters) => {
  const currentQuery = route.query
  const newQuery = { ...newFilters }
  const hasChanged = Object.keys(newQuery).some(
    key => String(currentQuery[key] ?? '') !== String(newQuery[key] ?? '')
  )
  if (hasChanged) {
    router.replace({ query: newQuery })
  }
}, { deep: true })
</script>
