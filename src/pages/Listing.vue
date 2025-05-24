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
        <ListingPricing
          :price="listing.monthly_price"
          :firstPayment="listing.first_payment"
          :periodMonths="listing.period_months"
          :mileage="listing.mileage_per_year"
          :allowedPeriods="[listing.period_months]"
          :allowedMileages="listing.mileage_per_year ? [listing.mileage_per_year] : []"
          :allowedFirstPayments="listing.first_payment ? [listing.first_payment] : []"
        />
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

const listing = ref({})
const leasePrices = ref([]) // 🔥 For multiple lease options
const route = useRoute()

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    console.error('Missing listing ID')
    return
  }

  const { data: listingData, error: listingError } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('listing_id', id)
    .maybeSingle()

  if (listingError) {
    console.error('Fejl ved hentning af annonce:', listingError.message)
  } else if (!listingData) {
    console.warn('Ingen data fundet for denne annonce.')
  } else {
    listing.value = listingData
  }

  const { data: leaseOptions, error: leaseError } = await supabase
    .from('lease_pricing')
    .select('*')
    .eq('listing_id', id)
    .order('monthly_price', { ascending: true })

  if (leaseError) {
    console.error('Fejl ved hentning af leasingmuligheder:', leaseError.message)
  } else {
    leasePrices.value = leaseOptions
    // 🔥 Optional: log to see available options
    console.log('Lease options:', leaseOptions)
  }
})
</script>
