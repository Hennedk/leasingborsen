<template>
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-end lg:hidden">
    <div class="bg-base-100 w-full h-full rounded-none shadow-2xl flex flex-col">
      <!-- Sticky Header -->
      <div class="flex justify-between items-center p-4 border-b shadow-sm sticky top-0 bg-base-100 z-10">
        <h2 class="text-lg font-bold">Filtrer</h2>
        <button class="btn btn-sm btn-outline" @click="emit('close')">Luk</button>
      </div>

      <!-- Filter Content -->
      <div class="flex-1 overflow-auto p-4 space-y-4">
        <div v-if="activeFilterExists" class="text-right">
          <button class="text-sm text-primary underline" @click="resetFilters">Nulstil filtre</button>
        </div>

        <div class="space-y-4">
          <!-- Filters -->
          <div>
            <label class="block text-base font-bold mb-2">Mærke</label>
            <select v-model="localFilters.make" class="select select-bordered w-full">
              <option value="">Alle</option>
              <option v-for="make in makes" :key="make.id" :value="make.name">{{ make.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-base font-bold mb-2">Model</label>
            <select v-model="localFilters.model" class="select select-bordered w-full" :disabled="!localFilters.make">
              <option value="">Alle</option>
              <option v-for="model in filteredModels" :key="model.id" :value="model.name">{{ model.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-base font-bold mb-2">Karosseri</label>
            <select v-model="localFilters.body_type" class="select select-bordered w-full">
              <option value="">Alle</option>
              <option v-for="b in bodyTypes" :key="b.name" :value="b.name">{{ b.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-base font-bold mb-2">Drivmiddel</label>
            <select v-model="localFilters.fuel_type" class="select select-bordered w-full">
              <option value="">Alle</option>
              <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
            </select>
          </div>

      <!-- Transmission -->
<div class="mb-4">
  <label class="block text-base font-bold mb-2">Gearkasse</label>
  <div class="grid grid-cols-2 gap-2">
    <button
      class="btn w-full"
      :class="localFilters.transmission === 'Automatic' ? 'btn-primary' : 'btn-outline'"
      @click="toggleTransmission('Automatic')">
      Automatisk
    </button>
    <button
      class="btn w-full"
      :class="localFilters.transmission === 'Manual' ? 'btn-primary' : 'btn-outline'"
      @click="toggleTransmission('Manual')">
      Manual
    </button>
  </div>
</div>

<!-- Seats -->
<div class="mb-4">
  <label class="block text-base font-bold mb-2">Antal sæder</label>
  <div class="grid grid-cols-2 gap-2">
    <select class="select select-bordered w-full" v-model.number="localFilters.seats_min">
      <option :value="null">Min</option>
      <option v-for="n in 9" :key="'min-' + n" :value="n">{{ n }}</option>
    </select>
    <select class="select select-bordered w-full" v-model.number="localFilters.seats_max">
      <option :value="null">Max</option>
      <option v-for="n in 9" :key="'max-' + n" :value="n">{{ n }}</option>
    </select>
  </div>
</div>

<!-- Price -->
<div class="mb-4">
  <label class="block text-base font-bold mb-2">Pris</label>
  <div class="grid grid-cols-2 gap-2">
    <select class="select select-bordered w-full" v-model.number="localFilters.price_min">
      <option :value="null">Min</option>
      <option v-for="price in priceSteps.filter(p => localFilters.price_max == null || p <= localFilters.price_max)" :key="'min-' + price" :value="price">
        {{ price.toLocaleString() }} kr.
      </option>
    </select>
    <select class="select select-bordered w-full" v-model.number="localFilters.price_max">
      <option :value="null">Max</option>
      <option v-for="price in priceSteps.filter(p => localFilters.price_min == null || p >= localFilters.price_min)" :key="'max-' + price" :value="price">
        {{ price.toLocaleString() }} kr.
      </option>
      <option v-if="localFilters.price_min == null || 9999999 >= localFilters.price_min" :value="9999999">
        10.000+ kr.
      </option>
    </select>
  </div>
</div>

        </div>
      </div>

      <!-- Sticky Bottom Bar -->
      <div class="bg-base-200 p-4 border-t shadow-inner flex justify-between items-center">
        <button class="btn btn-outline flex-1 mr-2" @click="resetFilters">Ryd alle</button>
        <button class="btn btn-primary flex-1" @click="applyFilters">
          Vis {{ resultCount }} resultater
        </button>
      </div>
    </div>
  </div>
</template>



<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  filters: Object,
  resultCount: { type: Number, default: 0 }
})
const emit = defineEmits(['update:filters', 'close'])

const defaultFilters = {
  make: '', model: '', fuel_type: '', transmission: '', body_type: '',
  horsepower: null, seats_min: null, seats_max: null, price_min: null, price_max: null,
  condition: '', listingStatus: '', driveType: '', availableBefore: ''
}

const localFilters = ref({ ...defaultFilters, ...props.filters })
const makes = ref([]), models = ref([]), fuelTypes = ref([]), bodyTypes = ref([])
const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
const resultCount = ref(0)

const filteredModels = computed(() =>
  !localFilters.value.make ? [] :
  models.value.filter(m => m.make_id === makes.value.find(make => make.name === localFilters.value.make)?.id)
)

const activeFilterExists = computed(() =>
  Object.values(localFilters.value).some(v => Array.isArray(v) ? v.length : v !== '' && v != null)
)

function toggleTransmission(value) {
  localFilters.value.transmission = localFilters.value.transmission === value ? '' : value
}

function resetFilters() {
  localFilters.value = { ...defaultFilters }
  fetchCount()
}

function applyFilters() {
  emit('update:filters', { ...localFilters.value })
  emit('close')
}

async function fetchCount() {
  try {
    let query = supabase.from('full_listing_view').select('*', { count: 'exact', head: true })
    const f = localFilters.value
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

    const { count, error } = await query
    resultCount.value = error ? 0 : count ?? 0
  } catch (e) {
    console.error('Count fetch failed:', e)
    resultCount.value = 0
  }
}

watch(localFilters, fetchCount, { deep: true, immediate: true })

onMounted(async () => {
  const fetchData = async (table) => (await supabase.from(table).select('*')).data ?? []
  makes.value = (await fetchData('makes')).sort((a, b) => a.name.localeCompare(b.name))
  models.value = await fetchData('models')
  fuelTypes.value = await fetchData('fuel_types')
  bodyTypes.value = await fetchData('body_types')
  fetchCount()
})
</script>
