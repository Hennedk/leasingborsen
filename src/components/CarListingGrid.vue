// CarListingGrid.vue
<template>
  <section class="py-12 lg:py-16 bg-white">
    <div class="max-w-screen-xl mx-auto px-4">
      
      <!-- Section Header -->
      <div class="text-center mb-10 lg:mb-14" v-if="title">
        <h2 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-base text-base-content/70 max-w-md mx-auto text-center leading-relaxed">
          {{ subtitle }}
        </p>
      </div>

      <!-- Loading State: Skeleton Cards -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        <ListingCard 
          v-for="i in skeletonCount" 
          :key="`skeleton-${i}`" 
          :loading="true"
        />
      </div>

      <!-- Cars Grid -->
      <div v-else-if="cars && cars.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        <ListingCard
          v-for="car in cars"
          :key="car.id || car.listing_id"
          :car="car"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Car class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Ingen biler tilgængelige</h3>
        <p class="text-gray-600">Der er ingen biler at vise lige nu.</p>
      </div>

      <!-- CTA Section -->
      <div v-if="showCta && cars && cars.length > 0" class="text-center mt-8">
        <router-link 
          :to="ctaLink" 
          class="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          {{ ctaText }}
          <span>→</span>
        </router-link>
      </div>

    </div>
  </section>
</template>

<script setup>
import ListingCard from './ListingCard.vue'
import { Car } from 'lucide-vue-next'
import { watch } from 'vue'

const props = defineProps({
  cars: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  showCta: {
    type: Boolean,
    default: true
  },
  ctaText: {
    type: String,
    default: 'Se alle biler'
  },
  ctaLink: {
    type: String,
    default: '/listings'
  },
  skeletonCount: {
    type: Number,
    default: 4
  }
})

// Debug what props are being received
watch(() => props.cars, (newCars) => {
  console.log('🚗 CarListingGrid received cars:', newCars)
  console.log('🚗 Cars array length:', newCars?.length)
  console.log('🚗 Loading state:', props.loading)
}, { immediate: true })

watch(() => props.loading, (newLoading) => {
  console.log('⏳ CarListingGrid loading state changed:', newLoading)
}, { immediate: true })
</script>

<style scoped>
/* Ensure consistent card heights and image aspect ratios */
.grid > :deep(.card) {
  height: 100%;
}

/* Smooth hover transitions */
a {
  transition: all 0.2s ease-in-out;
}
</style>