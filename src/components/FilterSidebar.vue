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

    <!-- Fuel Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Drivmiddel</label>
      <select v-model="localFilters.fuel_type" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
      </select>
    </div>

    <!-- Transmission -->
    <div>
      <label class="block text-sm font-medium mb-1">Gearkasse</label>
      <select v-model="localFilters.transmission" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="t in transmissions" :key="t.name" :value="t.name">{{ t.name }}</option>
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

    <!-- Drive Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Drivaksel</label>
      <select v-model="localFilters.drive_type" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="d in driveTypes" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>

    <!-- Condition -->
    <div>
      <label class="block text-sm font-medium mb-1">Stand</label>
      <select v-model="localFilters.condition" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="c in conditions" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Listing Status -->
    <div>
      <label class="block text-sm font-medium mb-1">Status</label>
      <select v-model="localFilters.listing_status" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option v-for="s in listingStatuses" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>

    <!-- Horsepower -->
    <div>
      <label class="block text-sm font-medium mb-1">Min. Hestekræfter</label>
      <input v-model.number="localFilters.horsepower" type="number" class="input input-bordered w-full" placeholder="f.eks. 150" />
    </div>

    <!-- Seats -->
    <div>
      <label class="block text-sm font-medium mb-1">Min. antal sæder</label>
      <input v-model.number="localFilters.seats" type="number" class="input input-bordered w-full" placeholder="f.eks. 5" />
    </div>

    <!-- Max price -->
    <div>
      <label class="block text-sm font-medium mb-1">Maks. pris (kr/md)</label>
      <input v-model.number="localFilters.monthly_price" type="number" class="input input-bordered w-full" placeholder="f.eks. 3500" />
    </div>

    <!-- Available Before -->
    <div>
      <label class="block text-sm font-medium mb-1">Tilgængelig før</label>
      <input v-model="localFilters.availability_date" type="date" class="input input-bordered w-full" />
    </div>

    <button class="btn btn-outline btn-sm w-full" @click="clearFilters">Ryd filtre</button>
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
const localFilters = ref({ ...props.filters })

const makes = ref([])
const models = ref([])
const fuelTypes = ref([])
const transmissions = ref([])
const bodyTypes = ref([])
const driveTypes = ref(['fwd', 'rwd', 'awd', '4wd'])
const conditions = ref(['new', 'used', 'demo'])
const listingStatuses = ref(['active', 'inactive', 'archived'])

const filteredModels = computed(() => {
  if (!localFilters.value.make) return []
  const makeId = makes.value.find(m => m.name === localFilters.value.make)?.id
  return models.value.filter(m => m.make_id === makeId)
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
    if (cleanedFilters[key] === '' || cleanedFilters[key] === undefined) {
      cleanedFilters[key] = null
    }
  })
  emit('filter', cleanedFilters)
}, { deep: true })

function clearFilters() {
  Object.keys(localFilters.value).forEach(key => {
    localFilters.value[key] = null
  })
  emit('filter', { ...localFilters.value })
}
</script>
