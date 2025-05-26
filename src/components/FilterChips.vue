<template>
  <div class="flex flex-wrap gap-2">
    <template v-for="filter in activeFilters" :key="filter.key">
      <div class="badge badge-outline gap-1 items-center">
        {{ filter.label }}
        <button @click="removeFilter(filter.key)" class="ml-1">×</button>
      </div>
    </template>
    <a v-if="activeFilters.length" class="text-blue-500 underline cursor-pointer text-sm" @click="resetFilters">
      Nulstil filtre
    </a>
  </div>
</template>

<script setup>
// ✅ Import computed (missing in previous code)
import { computed } from 'vue'

const props = defineProps({ filters: Object })
const emit = defineEmits(['update:filters'])

const activeFilters = computed(() => {
  const f = props.filters, list = []
  if (f.make) list.push({ key: 'make', label: f.make })
  if (f.model) list.push({ key: 'model', label: f.model })
  if (f.fuel_type) list.push({ key: 'fuel_type', label: f.fuel_type })
  if (f.body_type) list.push({ key: 'body_type', label: f.body_type })
  if (f.transmission) list.push({ key: 'transmission', label: `Gear: ${f.transmission}` })
  if (f.seats_min != null || f.seats_max != null) list.push({ key: 'seats', label: `Sæder: ${f.seats_min ?? ''} - ${f.seats_max ?? ''}` })
  if (f.price_min != null || f.price_max != null) list.push({ key: 'price', label: `Pris: ${f.price_min ?? ''} - ${f.price_max ?? ''} kr.` })
  return list
})

function removeFilter(key) {
  const updated = { ...props.filters }
  if (key === 'seats') { updated.seats_min = null; updated.seats_max = null }
  else if (key === 'price') { updated.price_min = null; updated.price_max = null }
  else { updated[key] = '' }
  emit('update:filters', updated)
}

function resetFilters() {
  emit('update:filters', {
    make: '', model: '', fuel_type: '', transmission: '', body_type: '',
    horsepower: null, seats_min: null, seats_max: null, price_min: null, price_max: null,
    condition: '', listingStatus: '', driveType: '', availableBefore: ''
  })
}
</script>
