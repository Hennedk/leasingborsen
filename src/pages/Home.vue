<script setup>
import BaseLayout from '../components/BaseLayout.vue'
import HeroBanner from '../components/HeroBanner.vue'
import CarListingGrid from '../components/CarListingGrid.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const latestListings = ref([])

onMounted(async () => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(4)

  if (!error) latestListings.value = data
})
</script>

<template>
  <BaseLayout>
    <!-- Hero section with search -->
    <HeroBanner />

    <!-- Dynamic car grid -->
    <CarListingGrid
      title="Nyeste leasingbiler"
      :cars="latestListings"
    />
  </BaseLayout>
</template>
