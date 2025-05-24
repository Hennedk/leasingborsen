<template>
  <BaseLayout>
    <div class="w-full py-8 flex flex-col-reverse lg:grid lg:grid-cols-[3fr_2fr] gap-8">
      <!-- Left Column -->
      <div class="space-y-6">
        <ListingGallery :image="listing.image" :make="listing.make" :model="listing.model" />
        <ListingDetails :details="listing.description" />
        <ListingSpecs :listing="listing" />
      </div>

      <!-- Right Column -->
      <div class="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <ListingHeader
          :make="listing.make"
          :model="listing.model"
          :variant="listing.variant"
          :transmission="listing.transmission"
          :bodyType="listing.body_type"
          :fuelType="listing.fuel_type"
        />
        <ListingPricing :leaseOptions="leasePrices" />
      </div>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

import BaseLayout from '../components/BaseLayout.vue'
import ListingGallery from '../components/ListingGallery.vue'
import ListingSpecs from '../components/ListingSpecs.vue'
import ListingHeader from '../components/ListingHeader.vue'
import ListingPricing from '../components/ListingPricing.vue'
import ListingDetails from '../components/ListingDetails.vue'

const route = useRoute()
const listing = ref({})
const leasePrices = ref([])  // 🔥 Store multiple lease options

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    console.error('Missing listing ID in route params')
    return
  }

  // Fetch listing data (from full_listing_view)
  const { data: listingData, error: listingError } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('listing_id', id)
    .single()

  if (listingError) {
    console.error('Error fetching listing:', listingError.message)
  } else if (!listingData) {
    console.warn('No listing data found for this ID.')
  } else {
    listing.value = listingData
  }

  // 🔥 Fetch multiple lease options
  const { data: leaseData, error: leaseError } = await supabase
    .from('lease_pricing')
    .select('*')
    .eq('listing_id', id)
    .order('monthly_price', { ascending: true })

  if (leaseError) {
    console.error('Error fetching lease options:', leaseError.message)
  } else if (!leaseData?.length) {
    console.warn('No lease options found for this listing.')
  } else {
    leasePrices.value = leaseData
  }
})
</script>
