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
      <div class="grid grid-cols-2 gap-2">
        <button
          class="btn btn-sm w-full"
          :class="localFilters.transmission.includes('Automatic') ? 'btn-primary' : 'btn-outline'"
          @click="toggleTransmission('Automatic')"
        >
          Automatic
        </button>
        <button
          class="btn btn-sm w-full"
          :class="localFilters.transmission.includes('Manual') ? 'btn-primary' : 'btn-outline'"
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
          <option v-for="n in 9" :key="'min-' + n" :value="n">{{ n }}</option>
        </select>
        <select class="select select-sm select-bordered w-full" v-model.number="localFilters.seats_max">
          <option :value="null">Max</option>
          <option v-for="n in 9" :key="'max-' + n" :value="n">{{ n }}</option>
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
          <option
            v-if="localFilters.price_min == null || 9999999 >= localFilters.price_min"
            :value="9999999"
          >
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

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['filter'])

const stringFields = ['make', 'model', 'fuel_type', 'body_type']
const localFilters = ref({ ...props.filters })

const makes = ref([])
const models = ref([])
const fuelTypes = ref([])
const transmissions = ref([])
const bodyTypes = ref([])

const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)

const filteredModels = computed(() => {
  if (!localFilters.value.make) return []
  const makeId = makes.value.find(m => m.name === localFilters.value.make)?.id
  return models.value.filter(m => m.make_id === makeId)
})

function toggleTransmission(value) {
  if (!Array.isArray(localFilters.value.transmission)) {
    localFilters.value.transmission = []
  }

  const list = localFilters.value.transmission
  const index = list.indexOf(value)

  if (index > -1) {
    list.splice(index, 1)
  } else {
    list.push(value)
  }

  localFilters.value.transmission = [...list]
}

watch(() => localFilters.value.price_min, (min) => {
  const max = localFilters.value.price_max
  if (min != null && max != null && max < min) {
    localFilters.value.price_max = null
  }
})

watch(() => localFilters.value.price_max, (max) => {
  const min = localFilters.value.price_min
  if (min != null && max != null && max < min) {
    localFilters.value.price_min = null
  }
})

onMounted(async () => {
  const fetchRefData = async (table, sort = true) => {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`Error fetching ${table}:`, error)
      return []
    }
    return sort ? data.sort((a, b) => a.name.localeCompare(b.name)) : data
  }

  makes.value = await fetchRefData('makes')
  models.value = await fetchRefData('models')
  fuelTypes.value = await fetchRefData('fuel_types')
  transmissions.value = await fetchRefData('transmissions')
  bodyTypes.value = await fetchRefData('body_types')
})

watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { immediate: true, deep: true })

watch(localFilters, () => {
  const cleanedFilters = { ...localFilters.value }
  Object.keys(cleanedFilters).forEach(key => {
    if (cleanedFilters[key] === undefined) {
      cleanedFilters[key] = null
    } else if (cleanedFilters[key] === '' && !stringFields.includes(key)) {
      cleanedFilters[key] = null
    }
  })
  emit('filter', cleanedFilters)
}, { deep: true })

function clearFilters() {
  Object.keys(localFilters.value).forEach(key => {
    if (Array.isArray(localFilters.value[key])) {
      localFilters.value[key] = []
    } else {
      localFilters.value[key] = null
    }
  })
  localFilters.value.seats_min = null
  localFilters.value.seats_max = null
  emit('filter', { ...localFilters.value })
}
</script>
