<template>
  <BaseLayout>
      <!-- Mobile filter toggle -->
      <div class="lg:hidden mb-4 text-right">
        <button class="btn btn-outline btn-sm" @click="showMobileFilter = !showMobileFilter">
          {{ showMobileFilter ? 'Skjul filter' : 'Vis filter' }}
        </button>
      </div>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Sidebar -->
        <aside :class="['w-full lg:w-1/5', showMobileFilter ? 'block' : 'hidden', 'lg:block']">
          <FilterSidebar @filter="filters = $event" />
        </aside>

        <!-- Listings -->
        <section class="flex-1">
          <ListingResults :filters="filters" />
        </section>
      </div>
   
  </BaseLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import BaseLayout from '../components/BaseLayout.vue'
import FilterSidebar from '../components/FilterSidebar.vue'
import ListingResults from '../components/ListingResults.vue'

const route = useRoute()

// ✅ Keep this
const filters = ref({ ...route.query })

const showMobileFilter = ref(false)
</script>

