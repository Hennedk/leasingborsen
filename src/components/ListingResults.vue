<template>
  <section class="flex-1">
    <h1 class="text-2xl font-bold mb-6">Tilgængelige leasingbiler</h1>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ListingCard
        v-for="car in cars"
        :key="car.id"
        :car="car"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../lib/supabase'
import ListingCard from './ListingCard.vue'

const cars = ref([])

const props = defineProps({
  filters: Object
})

async function fetchCars() {
  let query = supabase.from('full_listing_view').select('*')


  if (props.filters?.make) {
    query = query.ilike('make', `%${props.filters.make}%`)
  }

  if (props.filters?.model) {
    query = query.ilike('model', `%${props.filters.model}%`)
  }

  if (props.filters?.fuel_type) {
    query = query.eq('fuel_type', props.filters.fuel_type)
  }

  if (props.filters?.transmission) {
    query = query.eq('transmission', props.filters.transmission)
  }

  if (props.filters?.body_type) {
    query = query.eq('body_type', props.filters.body_type)
  }

  if (props.filters?.horsepower) {
    query = query.gte('horsepower', props.filters.horsepower)
  }

  if (props.filters?.seats) {
    query = query.gte('seats', props.filters.seats)
  }

  if (props.filters?.maxPrice) {
    query = query.lte('monthly_price', props.filters.maxPrice)
  }

  if (props.filters?.condition) {
  query = query.eq('condition', props.filters.condition)
}

if (props.filters?.listingStatus) {
  query = query.eq('listing_status', props.filters.listingStatus)
}

if (props.filters?.driveType) {
  query = query.eq('drive_type', props.filters.driveType)
}

if (props.filters?.availableBefore) {
  query = query.lte('availability_date', props.filters.availableBefore)
}


  const { data, error } = await query

  if (error) {
    console.error('Fejl ved hentning af biler:', error.message)
  } else {
    cars.value = data
  }
}


watch(() => props.filters, fetchCars, { immediate: true, deep: true })
</script>
