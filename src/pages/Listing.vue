<template>
  <BaseLayout>
    <div class="w-full py-8 flex flex-col-reverse lg:grid lg:grid-cols-[3fr_2fr] gap-8">

      <!-- Left Column -->
      <div class="space-y-6 mt-6 lg:mt-0">
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
          :horsepower="listing.horsepower"
        />
        <ListingPricing
          :leaseOptions="leaseOptions"
        />
      </div>
    </div>

    <!-- Subtle ID Reference at bottom -->
    <div class="text-center py-4 mt-8">
      <p class="text-xs text-gray-400 text-center mt-6">
        Listing ID: {{ listing.listing_id || '12345' }}
      </p>
    </div>

    <!-- Sticky Bottom Bar (Mobile Only) -->
    <div class="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 shadow-lg sm:hidden z-50">
      <div class="flex justify-between items-center gap-4">
        <div class="flex-1">
          <span class="font-bold text-lg text-primary">
            {{ listing.monthly_price ? `${listing.monthly_price.toLocaleString('da-DK')} kr/md` : '–' }}
          </span>
          <p class="text-xs text-base-content opacity-70">
            {{ listing.mileage_per_year ? `${listing.mileage_per_year.toLocaleString()} km/år` : '' }}
          </p>
        </div>
        <button class="btn btn-primary btn-sm">
          Se tilbud
        </button>
      </div>
    </div>

    <!-- Mobile padding bottom to account for sticky bar -->
    <div class="h-20 sm:hidden"></div>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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

// Computed property to create leaseOptions array from listing data
const leaseOptions = computed(() => {
  if (!listing.value || !listing.value.monthly_price) {
    return []
  }
  
  // Create a single lease option from the listing data
  return [{
    monthly_price: listing.value.monthly_price,
    mileage_per_year: listing.value.mileage_per_year || 15000,
    period_months: listing.value.period_months || 36,
    first_payment: listing.value.first_payment || 0
  }]
})

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    console.error('Missing ID in route params')
    return
  }

  const { data, error } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('listing_id', id)
    .single()

  if (error) {
    console.error('Fejl ved hentning af annonce:', error.message)
  } else {
    listing.value = data
  }
})

</script>
