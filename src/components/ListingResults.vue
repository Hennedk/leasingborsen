<template>
  <section class="flex-1">
    <h1 class="text-2xl font-bold mb-4">Tilgængelige leasingbiler</h1>

    <!-- Applied Filters Chips -->
    <div v-if="activeFilters.length" class="flex flex-wrap gap-2 mb-6">
      <div
        v-for="filter in activeFilters"
        :key="filter.key + filter.label + filter.value"
        class="badge badge-outline gap-1 items-center"
      >
        {{ filter.label }}
        <button
          @click="removeFilter(filter.key, filter.value)"
          class="ml-1 text-lg leading-none focus:outline-none"
        >
          ×
        </button>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="loading loading-spinner loading-lg"></div>
    </div>

    <!-- Listings Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ListingCard
        v-for="car in cars"
        :key="car.id"
        :car="car"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { supabase } from '../lib/supabase'
import ListingCard from './ListingCard.vue'

const props = defineProps({
  filters: Object
})
const emit = defineEmits(['update:filters'])

const filters = ref({ ...props.filters })
const cars = ref([])
const loading = ref(false)
let debounceTimer = null

watch(() => props.filters, (newVal) => {
  filters.value = { ...newVal }
}, { immediate: true, deep: true })

async function fetchCars() {
  loading.value = true
  
  try {
    let query = supabase.from('full_listing_view').select('*')
    const f = filters.value

    if (f.make) query = query.ilike('make', `%${f.make}%`)
    if (f.model) query = query.ilike('model', `%${f.model}%`)
    if (f.fuel_type) query = query.eq('fuel_type', f.fuel_type)
    if (f.body_type) query = query.eq('body_type', f.body_type)
    if (Array.isArray(f.transmission) && f.transmission.length) {
      query = query.in('transmission', f.transmission)
    }
    if (f.horsepower) query = query.gte('horsepower', f.horsepower)
    if (f.seats_min != null) query = query.gte('seats', f.seats_min)
    if (f.seats_max != null) query = query.lte('seats', f.seats_max)
    if (f.price_min != null) query = query.gte('monthly_price', f.price_min)
    if (f.price_max != null) query = query.lte('monthly_price', f.price_max)
    if (f.condition) query = query.eq('condition', f.condition)
    if (f.listingStatus) query = query.eq('listing_status', f.listingStatus)
    if (f.driveType) query = query.eq('drive_type', f.driveType)
    if (f.availableBefore) query = query.lte('availability_date', f.availableBefore)

    const { data, error } = await query
    
    if (!error) {
      // Add a small delay to prevent jarring transitions
      await nextTick()
      cars.value = data
    }
  } finally {
    loading.value = false
  }
}

// Debounce the fetch function to prevent rapid successive calls
function debouncedFetchCars() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchCars, 150)
}

watch(filters, debouncedFetchCars, { immediate: true, deep: true })

const activeFilters = computed(() => {
  const f = filters.value
  const list = []

  if (f.make) list.push({ key: 'make', label: f.make, value: f.make })
  if (f.model) list.push({ key: 'model', label: f.model, value: f.model })
  if (f.body_type) list.push({ key: 'body_type', label: f.body_type, value: f.body_type })
  if (f.fuel_type) list.push({ key: 'fuel_type', label: f.fuel_type, value: f.fuel_type })
  if (Array.isArray(f.transmission)) {
    f.transmission.forEach(t => list.push({ 
      key: 'transmission', 
      label: `Gear: ${t}`, 
      value: t 
    }))
  }
  if (f.seats_min != null || f.seats_max != null) {
    const min = f.seats_min
    const max = f.seats_max
    let label = 'Sæder: '
    if (min != null && max != null) label += min === max ? `${min}` : `${min} - ${max}`
    else if (min != null) label += `${min}+`
    else if (max != null) label += `op til ${max}`
    list.push({ key: 'seats', label, value: null })
  }
  if (f.price_min != null || f.price_max != null) {
    const min = f.price_min
    const max = f.price_max
    let label = 'Pris: '
    if (min != null && max != null) {
      const maxLabel = max === 9999999 ? '10.000+' : max.toLocaleString()
      label += min === max ? `${min.toLocaleString()} kr.` : `${min.toLocaleString()} - ${maxLabel} kr.`
    } else if (min != null) label += `fra ${min.toLocaleString()} kr.`
    else if (max != null) label += `op til ${max.toLocaleString()} kr.`
    list.push({ key: 'price', label, value: null })
  }

  return list
})

function removeFilter(key, value = null) {
  const updated = { ...filters.value }
  
  if (key === 'transmission' && value) {
    updated.transmission = updated.transmission.filter(t => t !== value)
  } else if (key === 'transmission') {
    updated.transmission = []
  } else if (key === 'seats') {
    updated.seats_min = null
    updated.seats_max = null
  } else if (key === 'price') {
    updated.price_min = null
    updated.price_max = null
  } else {
    updated[key] = ''
  }
  
  filters.value = updated
  emit('update:filters', updated)
}
</script>