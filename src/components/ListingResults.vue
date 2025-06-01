<template>
  <section>
    <!-- Loading State: Skeleton Cards -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0">
      <ListingCard 
        v-for="i in skeletonCount" 
        :key="`skeleton-${i}`" 
        :loading="true"
      />
    </div>
    
    <!-- Empty State: No cars found -->
    <div v-else-if="sortedCars.length === 0" class="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div class="mb-8">
        <!-- Subtle friendly icon -->
        <div class="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <SearchX class="w-8 h-8 text-gray-400" />
        </div>
        
        <!-- Clear and friendly message -->
        <h3 class="text-xl font-bold text-gray-900 mb-3">Ingen biler fundet</h3>
        <p class="text-gray-600 max-w-sm mx-auto leading-relaxed">
          Vi kunne ikke finde nogen biler, der matcher dine søgekriterier. 
          Prøv at nulstille filtrene for at se alle tilgængelige biler.
        </p>
      </div>
      
      <!-- Single primary CTA button -->
      <div>
        <button
          @click="resetAllFilters"
          class="inline-flex items-center gap-2 bg-primary text-primary-content px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
        >
          <RotateCcw class="w-4 h-4" />
          Nulstil alle filtre
        </button>
      </div>
    </div>
    
    <!-- Loaded State: Real Content -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0">
      <ListingCard 
        v-for="car in sortedCars" 
        :key="car.id" 
        :car="car"
        :loading="false"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import ListingCard from './ListingCard.vue'
import { SearchX, RotateCcw } from 'lucide-vue-next'

const emit = defineEmits(['update:count', 'reset-filters'])
const props = defineProps({
  filters: Object,
  sortOrder: String
})

const cars = ref([])
const loading = ref(false)
const previousCount = ref(0)
const viewportWidth = ref(0)

// Responsive skeleton count based on viewport width
const responsiveSkeletonCount = computed(() => {
  if (viewportWidth.value === 0) return 6 // Default before measurement
  
  if (viewportWidth.value < 640) return 3      // Mobile: 3 cards
  if (viewportWidth.value < 1024) return 6     // Tablet: 6 cards  
  return 9                                      // Desktop: 9 cards
})

// Computed property for skeleton count
const skeletonCount = computed(() => {
  // Use consistent responsive count to prevent layout shifts
  return responsiveSkeletonCount.value
})

// Update viewport width on mount and resize
onMounted(() => {
  const updateViewportWidth = () => {
    viewportWidth.value = window.innerWidth
  }
  
  updateViewportWidth()
  window.addEventListener('resize', updateViewportWidth)
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateViewportWidth)
  })
})

// Fetch cars with filters
async function fetchCars() {
  loading.value = true
  
  // Start the API call and a minimum delay simultaneously
  const [apiResult] = await Promise.all([
    (async () => {
      let query = supabase.from('full_listing_view').select('*', { count: 'exact' })
      const f = props.filters
      if (f.make) query = query.ilike('make', `%${f.make}%`)
      if (f.model) query = query.ilike('model', `%${f.model}%`)
      if (f.fuel_type) query = query.eq('fuel_type', f.fuel_type)
      if (f.body_type) query = query.eq('body_type', f.body_type)
      if (f.transmission) query = query.eq('transmission', f.transmission)
      if (f.horsepower) query = query.gte('horsepower', f.horsepower)
      if (f.seats_min != null) query = query.gte('seats', f.seats_min)
      if (f.seats_max != null) query = query.lte('seats', f.seats_max)
      if (f.price_min != null) query = query.gte('monthly_price', f.price_min)
      if (f.price_max != null) query = query.lte('monthly_price', f.price_max)
      if (f.condition) query = query.eq('condition', f.condition)
      if (f.listingStatus) query = query.eq('listing_status', f.listingStatus)
      if (f.driveType) query = query.eq('drive_type', f.driveType)
      if (f.availableBefore) query = query.lte('availability_date', f.availableBefore)

      return await query
    })(),
    // Minimum loading delay for smooth skeleton transition
    new Promise(resolve => setTimeout(resolve, 400))
  ])

  const { data, count, error } = apiResult
  if (!error) {
    cars.value = data
    previousCount.value = count ?? 0
    emit('update:count', count ?? 0)
  } else {
    console.error('Error fetching cars:', error)
  }
  loading.value = false
}

watch(() => props.filters, fetchCars, { immediate: true, deep: true })

// Sorting logic (controlled externally)
const sortedCars = computed(() => {
  if (props.sortOrder === 'price_asc') return [...cars.value].sort((a, b) => a.monthly_price - b.monthly_price)
  if (props.sortOrder === 'price_desc') return [...cars.value].sort((a, b) => b.monthly_price - a.monthly_price)
  if (props.sortOrder === 'best_deal') return [...cars.value].sort((a, b) => (b.deal_score ?? 0) - (a.deal_score ?? 0))
  return cars.value
})

// Empty state button actions
function resetAllFilters() {
  emit('reset-filters')
}
</script>

<style scoped>
/* Prevent layout shifts from scrollbar changes */
section {
  overflow-anchor: none;
}

/* Ensure stable grid container */
.grid {
  width: 100%;
  contain: layout style;
}

/* Simple fade-in animation for cards */
.fade-in-item {
  animation: fadeIn 0.4s ease-out forwards;
  opacity: 0;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* Vue transition classes with enhanced smoothness */
.fade-in-enter-active {
  transition: opacity 0.5s ease-out;
}

.fade-in-enter-from {
  opacity: 0;
}

.fade-in-enter-to {
  opacity: 1;
}

/* Ensure smooth skeleton-to-content transition */
.fade-in-leave-active {
  transition: opacity 0.2s ease-in;
}

.fade-in-leave-to {
  opacity: 0;
}
</style>