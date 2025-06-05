// CarListingGrid.vue
<template>
  <section class="py-4 sm:py-6 relative bg-transparent">
    <div v-if="useContainer" class="max-w-screen-xl mx-auto px-4">
      <!-- Dynamic Section Header -->
      <div class="mb-6 lg:mb-8" v-if="displayTitle">
        <h2 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
          {{ displayTitle }}
        </h2>
      </div>

      <!-- Loading State: Skeleton Cards -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6">
        <ListingCard 
          v-for="i in skeletonCount" 
          :key="`skeleton-${i}`" 
          :loading="true"
        />
      </div>

      <!-- Cars Grid -->
      <div v-else-if="cars && cars.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6">
        <ListingCard
          v-for="car in cars"
          :key="car.id || car.listing_id"
          :car="car"
        />
      </div>

      <!-- Enhanced Empty State -->
      <div v-else class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Car class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ emptyStateTitle }}</h3>
        <p class="text-gray-600">{{ emptyStateMessage }}</p>
      </div>

      <!-- Dynamic CTA Section -->
      <div v-if="showCta && cars && cars.length > 0" class="text-center mt-8">
        <router-link 
          :to="displayCtaLink" 
          class="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          {{ displayCtaText }}
          <span>→</span>
        </router-link>
      </div>
    </div>

    <!-- Content without container (when used within BaseLayout) -->
    <template v-else>
      <!-- Dynamic Section Header -->
      <div class="mb-6 lg:mb-8" v-if="displayTitle">
        <h2 class="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
          {{ displayTitle }}
        </h2>
      </div>

      <!-- Loading State: Skeleton Cards -->
      <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6">
        <ListingCard 
          v-for="i in skeletonCount" 
          :key="`skeleton-${i}`" 
          :loading="true"
        />
      </div>

      <!-- Cars Grid -->
      <div v-else-if="cars && cars.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-6">
        <ListingCard
          v-for="car in cars"
          :key="car.id || car.listing_id"
          :car="car"
        />
      </div>

      <!-- Enhanced Empty State -->
      <div v-else class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <Car class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ emptyStateTitle }}</h3>
        <p class="text-gray-600">{{ emptyStateMessage }}</p>
      </div>

      <!-- Dynamic CTA Section -->
      <div v-if="showCta && cars && cars.length > 0" class="text-center mt-8">
        <router-link 
          :to="displayCtaLink" 
          class="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          {{ displayCtaText }}
          <span>→</span>
        </router-link>
      </div>
    </template>
  </section>
</template>

<script setup>
import ListingCard from './ListingCard.vue'
import { Car } from 'lucide-vue-next'
import { watch, computed } from 'vue'

const props = defineProps({
  cars: {
    type: Array,
    default: () => []
  },
  // Legacy props for backward compatibility
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  ctaText: {
    type: String,
    default: 'Se alle biler'
  },
  ctaLink: {
    type: String,
    default: '/listings'
  },
  // New dynamic props
  context: {
    type: String,
    default: 'default', // 'newest', 'similar', 'featured', 'search', 'category', 'default'
    validator: (value) => ['newest', 'similar', 'featured', 'search', 'category', 'default'].includes(value)
  },
  contextData: {
    type: Object,
    default: () => ({}) // Additional context-specific data
  },
  loading: {
    type: Boolean,
    default: false
  },
  showCta: {
    type: Boolean,
    default: true
  },
  skeletonCount: {
    type: Number,
    default: 4
  },
  useContainer: {
    type: Boolean,
    default: true
  }
})

// Predefined context configurations
const contextConfigs = {
  newest: {
    title: 'Nyeste biler',
    subtitle: 'Seneste tilføjelser til vores udvalg af leasingbiler',
    ctaText: 'Se alle nye biler',
    ctaLink: '/listings?sort=newest',
    emptyStateTitle: 'Ingen nye biler',
    emptyStateMessage: 'Der er ingen nye biler tilgængelige lige nu.'
  },
  similar: {
    title: 'Lignende biler',
    subtitle: 'Andre biler, der kan interessere dig',
    ctaText: 'Se flere lignende',
    ctaLink: '/listings',
    emptyStateTitle: 'Ingen lignende biler',
    emptyStateMessage: 'Vi kunne ikke finde lignende biler.'
  },
  featured: {
    title: 'Udvalgte biler',
    subtitle: 'Håndplukkede tilbud fra vores eksperter',
    ctaText: 'Se alle udvalgte',
    ctaLink: '/listings?featured=true',
    emptyStateTitle: 'Ingen udvalgte biler',
    emptyStateMessage: 'Der er ingen udvalgte biler lige nu.'
  },
  search: {
    title: 'Søgeresultater',
    subtitle: 'Biler der matcher dine søgekriterier',
    ctaText: 'Juster søgning',
    ctaLink: '/listings',
    emptyStateTitle: 'Ingen resultater',
    emptyStateMessage: 'Prøv at justere dine søgekriterier.'
  },
  category: {
    title: 'Kategoribiler',
    subtitle: 'Biler i denne kategori',
    ctaText: 'Se alle kategorier',
    ctaLink: '/listings',
    emptyStateTitle: 'Ingen biler i kategorien',
    emptyStateMessage: 'Der er ingen biler i denne kategori.'
  },
  default: {
    title: 'Biler',
    subtitle: 'Udforsk vores udvalg af leasingbiler',
    ctaText: 'Se alle biler',
    ctaLink: '/listings',
    emptyStateTitle: 'Ingen biler tilgængelige',
    emptyStateMessage: 'Der er ingen biler at vise lige nu.'
  }
}

// Computed properties for dynamic content
const currentConfig = computed(() => {
  return contextConfigs[props.context] || contextConfigs.default
})

const displayTitle = computed(() => {
  // Use manual title prop if provided (legacy support)
  if (props.title) return props.title
  
  // Use context-specific title with dynamic data
  if (props.context === 'category' && props.contextData.categoryName) {
    return `${props.contextData.categoryName} biler`
  }
  if (props.context === 'search' && props.contextData.searchTerm) {
    return `Søgeresultater for "${props.contextData.searchTerm}"`
  }
  
  return currentConfig.value.title
})

const displaySubtitle = computed(() => {
  // Use manual subtitle prop if provided (legacy support)
  if (props.subtitle) return props.subtitle
  
  // Use context-specific subtitle with dynamic data
  if (props.context === 'similar' && props.contextData.baseCar) {
    return `Andre biler lignende ${props.contextData.baseCar.make} ${props.contextData.baseCar.model}`
  }
  if (props.context === 'search' && props.contextData.filters) {
    const filterCount = Object.keys(props.contextData.filters).length
    return `${filterCount} aktive filtre anvendt`
  }
  
  return currentConfig.value.subtitle
})

const displayCtaText = computed(() => {
  return props.ctaText !== 'Se alle biler' ? props.ctaText : currentConfig.value.ctaText
})

const displayCtaLink = computed(() => {
  return props.ctaLink !== '/listings' ? props.ctaLink : currentConfig.value.ctaLink
})

const emptyStateTitle = computed(() => {
  return currentConfig.value.emptyStateTitle
})

const emptyStateMessage = computed(() => {
  return currentConfig.value.emptyStateMessage
})

// Enhanced debug logging
watch(() => props.cars, (newCars) => {
  console.log(`🚗 CarListingGrid [${props.context}]:`, {
    cars: newCars,
    count: newCars?.length,
    loading: props.loading,
    context: props.context,
    contextData: props.contextData
  })
}, { immediate: true })

watch(() => props.loading, (newLoading) => {
  console.log(`⏳ CarListingGrid [${props.context}] loading:`, newLoading)
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