<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({ filters: Object })
const emit = defineEmits(['update:filters'])

const stringFields = ['make', 'model', 'fuel_type', 'body_type']
const localFilters = ref({ ...props.filters, transmission: typeof props.filters.transmission === 'string' ? props.filters.transmission : '' })

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

function resetFilters() {
  localFilters.value = {
    make: '', model: '', fuel_type: '', transmission: '',
    body_type: '', horsepower: null, seats_min: null, seats_max: null,
    price_min: null, price_max: null, condition: '', listingStatus: '',
    driveType: '', availableBefore: ''
  }
  cleanAndEmit()
}
</script>

<template>
  <div>
    <div class="card bg-base-100 shadow-md border border-base-300">
      <div class="card-body space-y-6">
        <a class="text-primary underline cursor-pointer text-sm font-semibold inline-block" @click="resetFilters">
          Nulstil filtre
        </a>

        <!-- Mærke -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Mærke</span>
          </label>
          <select v-model="localFilters.make" class="select select-primary w-full">
            <option value="">Alle</option>
            <option v-for="make in makes" :key="make.id" :value="make.name">{{ make.name }}</option>
          </select>
        </div>

        <!-- Model -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Model</span>
          </label>
          <select v-model="localFilters.model" class="select select-primary w-full" :disabled="!localFilters.make">
            <option value="">Alle</option>
            <option v-for="model in filteredModels" :key="model.id" :value="model.name">{{ model.name }}</option>
          </select>
        </div>

        <!-- Karosseri -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Karosseri</span>
          </label>
          <select v-model="localFilters.body_type" class="select select-primary w-full">
            <option value="">Alle</option>
            <option v-for="b in bodyTypes" :key="b.name" :value="b.name">{{ b.name }}</option>
          </select>
        </div>

        <!-- Drivmiddel -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Drivmiddel</span>
          </label>
          <select v-model="localFilters.fuel_type" class="select select-primary w-full">
            <option value="">Alle</option>
            <option v-for="fuel in fuelTypes" :key="fuel.name" :value="fuel.name">{{ fuel.name }}</option>
          </select>
        </div>

        <!-- Gearkasse -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Geartype</span>
          </label>
          <div class="grid grid-cols-2 gap-4">
            <button
              class="btn btn-sm border-base-300 transition-all duration-200"
              :class="localFilters.transmission === 'Automatic' ? 'btn-primary' : 'btn-outline btn-primary'"
              @click="toggleTransmission('Automatic')"
            >
              Automatisk
            </button>
            <button
              class="btn btn-sm border-base-300 transition-all duration-200"
              :class="localFilters.transmission === 'Manual' ? 'btn-primary' : 'btn-outline btn-primary'"
              @click="toggleTransmission('Manual')"
            >
              Manuelt
            </button>
          </div>
        </div>

        <!-- Antal sæder -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Antal sæder</span>
          </label>
          <div class="grid grid-cols-2 gap-4">
            <select v-model.number="localFilters.seats_min" class="select select-primary w-full">
              <option :value="null">Min</option>
              <option v-for="n in 9" :key="n" :value="n">{{ n }}</option>
            </select>
            <select v-model.number="localFilters.seats_max" class="select select-primary w-full">
              <option :value="null">Max</option>
              <option v-for="n in 9" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <!-- Pris -->
        <div>
          <label class="label">
            <span class="label-text font-bold text-primary">Pris</span>
          </label>
          <div class="grid grid-cols-2 gap-4">
            <select v-model.number="localFilters.price_min" class="select select-primary w-full">
              <option :value="null">Min</option>
              <option v-for="p in priceSteps" :key="'min-' + p" :value="p">{{ p.toLocaleString() }} kr.</option>
            </select>
            <select v-model.number="localFilters.price_max" class="select select-primary w-full">
              <option :value="null">Max</option>
              <option v-for="p in priceSteps" :key="'max-' + p" :value="p">{{ p.toLocaleString() }} kr.</option>
              <option :value="9999999">10.000+ kr.</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
