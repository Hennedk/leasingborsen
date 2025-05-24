<template>
  <section class="flex-1">
    <!-- 🔥 Chips + Sorting in Same Row -->
    <div class="flex flex-wrap items-center justify-between mb-6 gap-2" v-if="activeFilters.length || true">
      <!-- 🔥 Chips Section -->
      <div class="flex flex-wrap gap-2 flex-grow">
        <template v-for="filter in activeFilters" :key="filter.key + filter.label + filter.value">
          <div class="badge badge-outline gap-1 items-center">
            {{ filter.label }}
            <button @click="removeFilter(filter.key, filter.value)" class="ml-1 text-lg leading-none focus:outline-none">×</button>
          </div>
        </template>
        <a v-if="activeFilters.length" class="text-blue-500 underline cursor-pointer text-sm" @click="resetAllFilters">
          Nulstil filtre
        </a>
      </div>

      <!-- 🔥 Sorting Dropdown Always Visible -->
      <div class="flex-shrink-0 flex items-center gap-2">
        <label class="text-sm font-medium">Sortér efter:</label>
        <select v-model="sortOrder" class="select select-sm select-bordered">
          <option value="">Standard</option>
          <option value="price_asc">Pris (lav til høj)</option>
          <option value="price_desc">Pris (høj til lav)</option>
        </select>
      </div>
    </div>



    <!-- Car Grid -->
    <div v-if="!loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ListingCard v-for="car in sortedCars" :key="car.id" :car="car" />
    </div>
    <div v-else class="flex justify-center py-8">
      <div class="loading loading-spinner loading-lg"></div>
    </div>
  </section>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { supabase } from '../lib/supabase'
import ListingCard from './ListingCard.vue'

const emit = defineEmits(['update:filters'])
const props = defineProps({ filters: Object })

const cars = ref([]), loading = ref(false), sortOrder = ref('')
let debounceTimer = null

async function fetchCars() {
  loading.value = true
  try {
    let query = supabase.from('full_listing_view').select('*')
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

    const { data, error } = await query
    if (!error) {
      await nextTick()
      cars.value = data
    } else {
      console.error('Error fetching cars:', error)
    }
  } finally {
    loading.value = false
  }
}

function debouncedFetchCars() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchCars, 150)
}

watch(() => props.filters, (newFilters, oldFilters) => {
  if (JSON.stringify(newFilters) !== JSON.stringify(oldFilters)) {
    debouncedFetchCars()
  }
}, { immediate: true, deep: true })

// 🔥 Sorted cars computed property
const sortedCars = computed(() => {
  if (!cars.value) return []
  if (sortOrder.value === 'price_asc') {
    return [...cars.value].sort((a, b) => a.monthly_price - b.monthly_price)
  } else if (sortOrder.value === 'price_desc') {
    return [...cars.value].sort((a, b) => b.monthly_price - a.monthly_price)
  }
  return cars.value
})

const activeFilters = computed(() => {
  const f = props.filters
  const list = []
  if (f.make) list.push({ key: 'make', label: f.make, value: f.make })
  if (f.model) list.push({ key: 'model', label: f.model, value: f.model })
  if (f.body_type) list.push({ key: 'body_type', label: f.body_type, value: f.body_type })
  if (f.fuel_type) list.push({ key: 'fuel_type', label: f.fuel_type, value: f.fuel_type })
  if (f.transmission) list.push({ key: 'transmission', label: `Gear: ${f.transmission}`, value: f.transmission })
  if (f.seats_min != null || f.seats_max != null) list.push({ key: 'seats', label: `Sæder: ${f.seats_min ?? ''}${f.seats_max != null ? (f.seats_min ? ' - ' : ' op til ') + f.seats_max : '+'}`, value: null })
  if (f.price_min != null || f.price_max != null) {
    const priceMin = f.price_min?.toLocaleString() ?? ''
    const priceMax = (f.price_max != null && f.price_max !== 9999999)
      ? f.price_max.toLocaleString()
      : '10.000+'
    const priceLabel = `Pris: ${priceMin}${f.price_max != null ? (f.price_min ? ' - ' : ' op til ') + priceMax : '+'} kr.`
    list.push({ key: 'price', label: priceLabel, value: null })
  }
  return list
})

function removeFilter(key, value = null) {
  const updated = { ...props.filters }
  if (key === 'transmission') updated.transmission = null
  else if (key === 'seats') updated.seats_min = updated.seats_max = null
  else if (key === 'price') updated.price_min = updated.price_max = null
  else updated[key] = ''
  emit('update:filters', updated)
}

function resetAllFilters() {
  emit('update:filters', {
    make: '', model: '', fuel_type: '', transmission: '', body_type: '',
    horsepower: null, seats_min: null, seats_max: null, price_min: null, price_max: null,
    condition: '', listingStatus: '', driveType: '', availableBefore: ''
  })
}
</script>
