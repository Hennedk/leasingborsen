<template>
  <section>
    <!-- Loading overlay instead of replacing content -->
    <div v-if="loading" class="relative">
      <!-- Keep the old content visible but dimmed -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50 pointer-events-none">
        <ListingCard v-for="car in sortedCars" :key="car.id" :car="car" />
      </div>
      <!-- Loading spinner overlay -->
      <div class="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75">
        <div class="loading loading-spinner loading-lg"></div>
      </div>
    </div>
    
    <!-- New content when not loading -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ListingCard v-for="car in sortedCars" :key="car.id" :car="car" />
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { supabase } from '../lib/supabase'
import ListingCard from './ListingCard.vue'

const emit = defineEmits(['update:count'])
const props = defineProps({
  filters: Object,
  sortOrder: String
})

const cars = ref([])
const loading = ref(false)

// Fetch cars with filters
async function fetchCars() {
  loading.value = true
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

  const { data, count, error } = await query
  if (!error) {
    cars.value = data
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
</script>