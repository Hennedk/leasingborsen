<template>
  <div class="bg-base-100 shadow rounded p-4 space-y-4">
    <h2 class="text-lg font-semibold">Filtre</h2>

    <!-- Make -->
    <div>
      <label class="block text-sm font-medium mb-1">Mærke</label>
      <select v-model="localFilters.make" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="make in makes" :key="make.id" :value="make.name">{{ make.name }}</option>
      </select>
    </div>

    <!-- Model -->
    <div>
      <label class="block text-sm font-medium mb-1">Model</label>
      <select v-model="localFilters.model" class="select select-bordered w-full" :disabled="!localFilters.make">
        <option value="">Alle</option>
        <option v-for="model in filteredModels" :key="model.id" :value="model.name">{{ model.name }}</option>
      </select>
    </div>

    <!-- Body Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Karosseri</label>
      <select v-model="localFilters.body_type" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="b in bodyTypes" :key="b.name" :value="b.name">{{ b.name }}</option>
      </select>
    </div>

    <!-- Fuel Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Drivmiddel</label>
      <select v-model="localFilters.fuel_type" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
      </select>
    </div>


<!-- Transmission -->
<div class="mb-4">
  <label class="block text-sm font-medium mb-1">Gearkasse</label>
  <div class="flex gap-2">
    <button
      class="btn btn-sm flex-1"
      :class="localFilters.transmission === 'Automatic' ? 'btn-primary' : 'btn-outline'"
      @click="toggleTransmission('Automatic')"
    >
      Automatisk
    </button>
    <button
      class="btn btn-sm flex-1"
      :class="localFilters.transmission === 'Manual' ? 'btn-primary' : 'btn-outline'"
      @click="toggleTransmission('Manual')"
    >
      Manual
    </button>
  </div>
</div>


    <!-- Seats -->
    <div class="mb-4">
  <label class="block text-sm font-medium mb-1">Antal sæder</label>
  <div class="grid grid-cols-2 gap-2">
    <select class="select select-sm select-bordered w-full" v-model.number="localFilters.seats_min">
      <option :value="null">Min</option>
      <option v-for="n in Array.from({length: 9}, (_, i) => i + 1).filter(n => localFilters.seats_max == null || n <= localFilters.seats_max)" :key="'min-' + n" :value="n">
        {{ n }}
      </option>
    </select>
    <select class="select select-sm select-bordered w-full" v-model.number="localFilters.seats_max">
      <option :value="null">Max</option>
      <option v-for="n in Array.from({length: 9}, (_, i) => i + 1).filter(n => localFilters.seats_min == null || n >= localFilters.seats_min)" :key="'max-' + n" :value="n">
        {{ n }}
      </option>
    </select>
  </div>
</div>


    <!-- Price -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-1">Pris</label>
      <div class="grid grid-cols-2 gap-2">
        <select class="select select-sm select-bordered w-full" v-model.number="localFilters.price_min">
          <option :value="null">Min</option>
          <option
            v-for="price in priceSteps.filter(p => localFilters.price_max == null || p <= localFilters.price_max)"
            :key="'min-' + price"
            :value="price"
          >
            {{ price.toLocaleString() }} kr.
          </option>
        </select>
        <select class="select select-sm select-bordered w-full" v-model.number="localFilters.price_max">
          <option :value="null">Max</option>
          <option
            v-for="price in priceSteps.filter(p => localFilters.price_min == null || p >= localFilters.price_min)"
            :key="'max-' + price"
            :value="price"
          >
            {{ price.toLocaleString() }} kr.
          </option>
          <option v-if="localFilters.price_min == null || 9999999 >= localFilters.price_min" :value="9999999">
            10.000+ kr.
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({ filters: Object })
const emit = defineEmits(['update:filters'])

const stringFields = ['make', 'model', 'fuel_type', 'body_type']
const localFilters = ref({
 ...props.filters,
  transmission: typeof props.filters.transmission === 'string'
    ? props.filters.transmission
    : ''  // Fallback to '' if not string
})

const makes = ref([]), models = ref([]), fuelTypes = ref([]), bodyTypes = ref([])
const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)

const filteredModels = computed(() =>
  !localFilters.value.make ? [] :
  models.value.filter(m => m.make_id === makes.value.find(make => make.name === localFilters.value.make)?.id)
)

function toggleTransmission(value) {
  localFilters.value.transmission = localFilters.value.transmission === value ? '' : value
  cleanAndEmit()
}

function cleanAndEmit() {
  const cleaned = { ...localFilters.value }
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || (cleaned[key] === '' && !stringFields.includes(key))) {
      cleaned[key] = null
    }
  })
  if (JSON.stringify(cleaned) !== JSON.stringify(props.filters)) {
    emit('update:filters', cleaned)
  }
}

watch(() => props.filters, newFilters => {
  localFilters.value = { ...newFilters }
}, { immediate: true, deep: true })

watch(localFilters, cleanAndEmit, { deep: true })

onMounted(async () => {
  const fetchData = async (table) => (await supabase.from(table).select('*')).data ?? []
  makes.value = (await fetchData('makes')).sort((a, b) => a.name.localeCompare(b.name))
  models.value = await fetchData('models')
  fuelTypes.value = await fetchData('fuel_types')
  bodyTypes.value = await fetchData('body_types')
})
</script>
