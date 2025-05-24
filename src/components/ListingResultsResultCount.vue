<template>
  <template v-if="loading">
    Indlæser...
  </template>
  <template v-else-if="cars.length === 0">
    Ingen resultater
  </template>
  <template v-else>
    {{ cars.length }} {{ cars.length === 1 ? 'resultat' : 'resultater' }}
  </template>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({ filters: Object })
const cars = ref([])
const loading = ref(false)

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

watch(() => props.filters, fetchCars, { immediate: true, deep: true })
</script>
