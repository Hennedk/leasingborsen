<template>
  <!-- Mobile Filter Overlay -->
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-end lg:hidden">
    <div class="bg-base-100 w-full h-[90%] rounded-t-lg flex flex-col">
      <div class="p-4 flex-1 overflow-auto">
        <h2 class="text-lg font-bold mb-4">Filtrer</h2>

        <!-- 🔥 Reset Button -->
        <a v-if="activeFilterExists" class="text-blue-500 underline cursor-pointer text-sm" @click="resetFilters">
          Nulstil filtre
        </a>

        <!-- 🔥 Filters Section -->
        <div>
          <label class="block text-sm font-medium mb-1">Mærke</label>
          <select v-model="localFilters.make" class="select select-bordered w-full">
            <option value="">Alle</option>
            <option v-for="make in makes" :key="make.id" :value="make.name">{{ make.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Model</label>
          <select v-model="localFilters.model" class="select select-bordered w-full" :disabled="!localFilters.make">
            <option value="">Alle</option>
            <option v-for="model in filteredModels" :key="model.id" :value="model.name">{{ model.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Karosseri</label>
          <select v-model="localFilters.body_type" class="select select-bordered w-full">
            <option value="">Alle</option>
            <option v-for="b in bodyTypes" :key="b.name" :value="b.name">{{ b.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Drivmiddel</label>
          <select v-model="localFilters.fuel_type" class="select select-bordered w-full">
            <option value="">Alle</option>
            <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Gearkasse</label>
          <div class="flex gap-2">
            <button class="btn btn-sm flex-1" :class="localFilters.transmission === 'Automatic' ? 'btn-primary' : 'btn-outline'" @click="toggleTransmission('Automatic')">Automatisk</button>
            <button class="btn btn-sm flex-1" :class="localFilters.transmission === 'Manual' ? 'btn-primary' : 'btn-outline'" @click="toggleTransmission('Manual')">Manual</button>
          </div>
        </div>

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

      <!-- 🔥 Sticky Bottom Bar -->
      <div class="bg-base-200 p-4 border-t flex justify-between items-center">
        <button class="btn btn-error" @click="resetFilters">Ryd alle</button>
        <button class="btn btn-primary" @click="applyFilters">Vis {{ resultCount }} resultater</button>
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
