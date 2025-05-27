<template>
  <BaseLayout>
    <div class="w-full py-8 flex flex-col-reverse lg:grid lg:grid-cols-[3fr_2fr] gap-8">

      <!-- Left Column -->
      <div class="space-y-6">
        <ListingGallery :image="listing.image" :make="listing.make" :model="listing.model" />
        <ListingDetails :details="listing.details" />
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
import ListingDetails from '../components/ListingDetails.vue' // ✅ don't forget this

const route = useRoute()
const listing = ref({})

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    console.error('Missing ID in route params')
    return
  }

  const { data, error } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Fejl ved hentning af annonce:', error.message)
  } else {
    listing.value = data
  }
})

</script>
