<template>
  <div class="bg-base-100 shadow rounded p-4 space-y-4">
    <h2 class="text-lg font-semibold">Filtre</h2>

    <!-- Make -->
    <div>
      <label class="block text-sm font-medium mb-1">Mærke</label>
      <select v-model="filters.make" @change="applyFilters" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option value="VW">VW</option>
        <option value="Tesla">Tesla</option>
        <option value="BMW">BMW</option>
        <option value="Ford">Ford</option>
      </select>
    </div>

    <!-- Model -->
    <div>
      <label class="block text-sm font-medium mb-1">Model</label>
      <input v-model="filters.model" @input="applyFilters" type="text" class="input input-bordered w-full" placeholder="f.eks. ID.4" />
    </div>

    <!-- Fuel Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Drivmiddel</label>
      <select v-model="filters.fuel_type" @change="applyFilters" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option value="El">El</option>
        <option value="Hybrid">Hybrid</option>
        <option value="Benzin">Benzin</option>
        <option value="Diesel">Diesel</option>
      </select>
    </div>

    <!-- Transmission -->
    <div>
      <label class="block text-sm font-medium mb-1">Gearkasse</label>
      <select v-model="filters.transmission" @change="applyFilters" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option value="Automatisk">Automatisk</option>
        <option value="Manuel">Manuel</option>
      </select>
    </div>

    <!-- Body Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Karosseri</label>
      <select v-model="filters.body_type" @change="applyFilters" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option value="SUV">SUV</option>
        <option value="Hatchback">Hatchback</option>
        <option value="Sedan">Sedan</option>
        <option value="Stationcar">Stationcar</option>
      </select>
    </div>

    <!-- Horsepower -->
    <div>
      <label class="block text-sm font-medium mb-1">Min. Hestekræfter</label>
      <input v-model.number="filters.horsepower" @input="applyFilters" type="number" class="input input-bordered w-full" placeholder="f.eks. 150" />
    </div>

    <!-- Seats -->
    <div>
      <label class="block text-sm font-medium mb-1">Min. antal sæder</label>
      <input v-model.number="filters.seats" @input="applyFilters" type="number" class="input input-bordered w-full" placeholder="f.eks. 5" />
    </div>

    <!-- Max price -->
    <div>
      <label class="block text-sm font-medium mb-1">Maks. pris (kr/md)</label>
      <input v-model.number="filters.maxPrice" @input="applyFilters" type="number" class="input input-bordered w-full" placeholder="f.eks. 3500" />
    </div>

    <button class="btn btn-outline btn-sm w-full" @click="clearFilters">Ryd filtre</button>
  </div>
</template>

<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['filter'])

const filters = reactive({
  make: '',
  model: '',
  fuel_type: '',
  transmission: '',
  body_type: '',
  horsepower: null,
  seats: null,
  maxPrice: null
})

function applyFilters() {
  emit('filter', { ...filters })
}

function clearFilters() {
  Object.keys(filters).forEach(key => filters[key] = key === 'maxPrice' || key === 'horsepower' || key === 'seats' ? null : '')
  emit('filter', { ...filters })
}
</script>
