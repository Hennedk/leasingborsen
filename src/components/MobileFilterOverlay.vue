<template>
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-end lg:hidden">
    <div class="bg-base-100 w-full h-full rounded-none shadow-2xl flex flex-col">

      <!-- Sticky Header with Ryd Alle and Close -->
      <div class="flex justify-between items-center p-4 border-b border-base-200 shadow-sm sticky top-0 bg-base-100 z-10">
        <a @click="resetFilters" class="text-primary underline cursor-pointer text-sm font-semibold inline-block">
          Ryd alle
        </a>
        <button @click="emit('close')" class="text-base-content hover:text-error p-2 rounded-full transition">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Filter Fields Section (NO card look) -->
      <div class="flex-1 overflow-auto p-4 space-y-6">
        <!-- Mærke -->
        <div>
          <label class="block text-sm font-bold mb-2 text-primary">Mærke</label>
          <select v-model="localFilters.make" class="select select-bordered w-full font-medium">
            <option value="">Alle</option>
            <option v-for="make in makes" :key="make.id" :value="make.name">{{ make.name }}</option>
          </select>
        </div>

        <!-- Model -->
        <div>
          <label class="block text-sm font-bold mb-2 text-primary">Model</label>
          <select v-model="localFilters.model" class="select select-bordered w-full font-medium" :disabled="!localFilters.make">
            <option value="">Alle</option>
            <option v-for="model in filteredModels" :key="model.id" :value="model.name">{{ model.name }}</option>
          </select>
        </div>

        <!-- Karosseri -->
        <div>
          <label class="block text-sm font-bold mb-2 text-primary">Karosseri</label>
          <select v-model="localFilters.body_type" class="select select-bordered w-full font-medium">
            <option value="">Alle</option>
            <option v-for="b in bodyTypes" :key="b.name" :value="b.name">{{ b.name }}</option>
          </select>
        </div>

        <!-- Drivmiddel -->
        <div>
          <label class="block text-sm font-bold mb-2 text-primary">Drivmiddel</label>
          <select v-model="localFilters.fuel_type" class="select select-bordered w-full font-medium">
            <option value="">Alle</option>
            <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
          </select>
        </div>

        <!-- Gearkasse Buttons -->
<div>
  <label class="block text-sm font-bold mb-2 text-primary">Geartype</label>
  <div class="grid grid-cols-2 gap-4">
    <button
      class="w-full h-12 rounded-lg border border-base-300 font-medium text-sm transition"
      :class="localFilters.transmission === 'Automatic' ? 'bg-primary text-primary-content' : 'bg-base-100 text-primary'"
      @click="toggleTransmission('Automatic')"
    >
      Automatisk
    </button>
    <button
      class="w-full h-12 rounded-lg border border-base-300 font-medium text-sm transition"
      :class="localFilters.transmission === 'Manual' ? 'bg-primary text-primary-content' : 'bg-base-100 text-primary'"
      @click="toggleTransmission('Manual')"
    >
      Manuelt
    </button>
  </div>
</div>

<!-- Seats -->
<div>
  <label class="block text-sm font-bold mb-2 text-primary">Antal sæder</label>
  <div class="grid grid-cols-2 gap-4">
    <select v-model.number="localFilters.seats_min" class="select select-bordered w-full h-12 font-medium">
      <option :value="null">Min</option>
      <option v-for="n in 9" :key="n" :value="n">{{ n }}</option>
    </select>
    <select v-model.number="localFilters.seats_max" class="select select-bordered w-full h-12 font-medium">
      <option :value="null">Max</option>
      <option v-for="n in 9" :key="n" :value="n">{{ n }}</option>
    </select>
  </div>
</div>

        <!-- Price -->
        <div>
          <label class="block text-sm font-bold mb-2 text-primary">Pris</label>
          <div class="grid grid-cols-2 gap-4">
            <select v-model.number="localFilters.price_min" class="select select-bordered w-full font-medium">
              <option :value="null">Min</option>
              <option v-for="p in priceSteps" :key="'min-' + p" :value="p">{{ p.toLocaleString() }} kr.</option>
            </select>
            <select v-model.number="localFilters.price_max" class="select select-bordered w-full font-medium">
              <option :value="null">Max</option>
              <option v-for="p in priceSteps" :key="'max-' + p" :value="p">{{ p.toLocaleString() }} kr.</option>
              <option :value="9999999">10.000+ kr.</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Sticky Bottom Bar -->
      <div class="bg-base-200 p-4 border-t">
        <button class="btn btn-primary w-full font-bold" @click="applyFilters">
          Vis {{ resultCount }} resultater
        </button>
      </div>
    </div>
  </div>
</template>





<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-vue-next'

const props = defineProps({
  filters: Object,
  resultCount: { type: Number, default: 0 }
})
const emit = defineEmits(['update:filters', 'close', 'apply-filters'])

const defaultFilters = {
  make: '', model: '', fuel_type: '', transmission: '', body_type: '',
  horsepower: null, seats_min: null, seats_max: null, price_min: null, price_max: null,
  condition: '', listingStatus: '', driveType: '', availableBefore: ''
}

const localFilters = ref({ ...defaultFilters, ...props.filters })
const makes = ref([]), models = ref([]), fuelTypes = ref([]), bodyTypes = ref([])
const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
const resultCount = ref(0)

watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...defaultFilters, ...newFilters }
}, { immediate: true, deep: true })


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
  // Emit the apply-filters event with the current filters
  emit('apply-filters', { ...localFilters.value })
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
