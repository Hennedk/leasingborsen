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

        <!-- 🔥 Only render when leasePrices is available -->
        <ListingPricing v-if="leasePrices.length" :leaseOptions="leasePrices" />
        <div v-else>
          <p>Henter leasingmuligheder...</p> <!-- Optional: Replace with spinner -->
        </div>
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

// Reactive variables
const route = useRoute()
const listing = ref({})
const leasePrices = ref([])

// 🔥 Load data when component is mounted
onMounted(async () => {
  const id = route.params.id
  if (!id) {
    console.error('Missing listing ID in route params')
    return
  }

  try {
    // Fetch listing data
    const { data: listingData, error: listingError } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('listing_id', id)
      .single()

    if (listingError) throw listingError
    listing.value = listingData || {}

    // Fetch lease options
    const { data: leaseData, error: leaseError } = await supabase
      .from('lease_pricing')
      .select('*')
      .eq('listing_id', id)
      .order('monthly_price', { ascending: true })

    if (leaseError) throw leaseError
    leasePrices.value = leaseData || []

  } catch (error) {
    console.error('Fejl ved hentning:', error.message)
  }
})
</script>
