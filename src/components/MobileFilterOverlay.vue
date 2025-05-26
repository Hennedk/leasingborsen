<template>
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-end lg:hidden">
    <div class="bg-base-100 w-full h-[90%] rounded-t-lg flex flex-col">
      <div class="p-4 flex-1 overflow-auto">
        <h2 class="text-lg font-bold mb-4">Filtrer</h2>

        <a v-if="activeFilterExists" class="text-blue-500 underline cursor-pointer text-sm" @click="resetFilters">
          Nulstil filtre
        </a>

        <!-- 🔥 Mærke -->
        <div>
          <label class="block text-sm font-medium mb-1">Mærke</label>
          <select v-model="localFilters.make" class="select select-bordered w-full">
            <option value="">Alle</option>
            <option v-for="make in makes" :key="make.id" :value="make.name">{{ make.name }}</option>
          </select>
        </div>

        <!-- 🔥 Model -->
        <div>
          <label class="block text-sm font-medium mb-1">Model</label>
          <select v-model="localFilters.model" class="select select-bordered w-full" :disabled="!localFilters.make">
            <option value="">Alle</option>
            <option v-for="model in filteredModels" :key="model.id" :value="model.name">{{ model.name }}</option>
          </select>
        </div>

        <!-- 🔥 Body Type -->
        <div>
          <label class="block text-sm font-medium mb-1">Karosseri</label>
          <select v-model="localFilters.body_type" class="select select-bordered w-full">
            <option value="">Alle</option>
            <option v-for="b in bodyTypes" :key="b.name" :value="b.name">{{ b.name }}</option>
          </select>
        </div>

        <!-- 🔥 Fuel Type -->
        <div>
          <label class="block text-sm font-medium mb-1">Drivmiddel</label>
          <select v-model="localFilters.fuel_type" class="select select-bordered w-full">
            <option value="">Alle</option>
            <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
          </select>
        </div>

        <!-- 🔥 Transmission (Multiple) -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Gearkasse</label>
          <div class="flex gap-2">
            <button
              class="btn btn-sm flex-1"
              :class="localFilters.transmission.includes('Automatic') ? 'btn-primary' : 'btn-outline'"
              @click="toggleTransmission('Automatic')"
            >
              Automatisk
            </button>
            <button
              class="btn btn-sm flex-1"
              :class="localFilters.transmission.includes('Manual') ? 'btn-primary' : 'btn-outline'"
              @click="toggleTransmission('Manual')"
            >
              Manual
            </button>
          </div>
        </div>

        <!-- 🔥 Seats -->
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

        <!-- 🔥 Price -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Pris</label>
          <div class="grid grid-cols-2 gap-2">
            <select class="select select-sm select-bordered w-full" v-model.number="localFilters.price_min">
              <option :value="null">Min</option>
              <option v-for="price in priceSteps.filter(p => localFilters.price_max == null || p <= localFilters.price_max)" :key="'min-' + price" :value="price">{{ price.toLocaleString() }} kr.</option>
            </select>
            <select class="select select-sm select-bordered w-full" v-model.number="localFilters.price_max">
              <option :value="null">Max</option>
              <option v-for="price in priceSteps.filter(p => localFilters.price_min == null || p >= localFilters.price_min)" :key="'max-' + price" :value="price">{{ price.toLocaleString() }} kr.</option>
              <option v-if="localFilters.price_min == null || 9999999 >= localFilters.price_min" :value="9999999">10.000+ kr.</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 🔥 Sticky Bottom Bar with Live Result Count -->
      <div class="bg-base-200 p-4 border-t flex justify-between items-center">
        <button class="btn btn-error" @click="resetFilters">Ryd alle</button>
        <button class="btn btn-primary" :disabled="loading || cars.length === 0" @click="applyFilters">
          <template v-if="loading">Indlæser...</template>
          <template v-else-if="cars.length === 0">Ingen resultater</template>
          <template v-else>Vis {{ cars.length }} {{ cars.length === 1 ? 'resultat' : 'resultater' }}</template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({ filters: Object })
const emit = defineEmits(['update:filters', 'close'])

const localFilters = ref({ ...props.filters })
const makes = ref([]), models = ref([]), fuelTypes = ref([]), bodyTypes = ref([])
const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
const loading = ref(false)
const cars = ref([])

const filteredModels = computed(() =>
  !localFilters.value.make ? [] :
  models.value.filter(m => m.make_id === makes.value.find(make => make.name === localFilters.value.make)?.id)
)

const activeFilterExists = computed(() =>
  Object.values(localFilters.value).some(value => Array.isArray(value) ? value.length > 0 : value !== '' && value != null)
)

function toggleTransmission(value) {
  if (!Array.isArray(localFilters.value.transmission)) localFilters.value.transmission = []
  const index = localFilters.value.transmission.indexOf(value)
  if (index > -1) localFilters.value.transmission.splice(index, 1)
  else localFilters.value.transmission.push(value)
}

function resetFilters() {
  localFilters.value = {
    make: '', model: '', fuel_type: '', transmission: [],
    body_type: '', horsepower: null, seats_min: null, seats_max: null,
    price_min: null, price_max: null, condition: '', listingStatus: '',
    driveType: '', availableBefore: ''
  }
}

function applyFilters() {
  emit('update:filters', { ...localFilters.value })
  emit('close')
}

async function fetchCars() {
  loading.value = true
  try {
    let query = supabase.from('full_listing_view').select('*')
    const f = localFilters.value
    if (f.make) query = query.ilike('make', `%${f.make}%`)
    if (f.model) query = query.ilike('model', `%${f.model}%`)
    if (f.fuel_type) query = query.eq('fuel_type', f.fuel_type)
    if (f.body_type) query = query.eq('body_type', f.body_type)
    if (Array.isArray(f.transmission) && f.transmission.length) query = query.in('transmission', f.transmission)
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
    if (!error) { await nextTick(); cars.value = data }
  } finally {
    loading.value = false
  }
}

watch(localFilters, fetchCars, { immediate: true, deep: true })

watch(() => props.filters, (newVal) => {
  localFilters.value = { ...newVal }
}, { deep: true, immediate: true })

onMounted(async () => {
  const fetchData = async (table) => (await supabase.from(table).select('*')).data ?? []
  makes.value = (await fetchData('makes')).sort((a, b) => a.name.localeCompare(b.name))
  models.value = await fetchData('models')
  fuelTypes.value = await fetchData('fuel_types')
  bodyTypes.value = await fetchData('body_types')
})
</script>
