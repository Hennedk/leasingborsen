<template>
  <BaseLayout>
    <div class="lg:hidden mb-4 text-right">
      <button class="btn btn-outline btn-sm" @click="showMobileFilter = !showMobileFilter">
        {{ showMobileFilter ? 'Skjul filter' : 'Vis filter' }}
      </button>
    </div>
    <div class="flex flex-col lg:flex-row gap-6">
      <aside :class="['w-full lg:w-1/5', showMobileFilter ? 'block' : 'hidden', 'lg:block']">
        <FilterSidebar v-model:filters="filters" />
      </aside>
      <section class="flex-1">
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

const route = useRoute()
const router = useRouter()

function normalizeQuery(query) {
  return {
    make: query.make || '',
    model: query.model || '',
    fuel_type: query.fuel_type || '',
    transmission: query.transmission || '',  // Single string!
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

// 🔥 Watch for route query changes and sync filters
watch(
  () => route.query,
  (newQuery) => {
    filters.value = normalizeQuery(newQuery);
  },
  { immediate: true, deep: true }
)

// 🔥 Watch for filter changes and sync URL query
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