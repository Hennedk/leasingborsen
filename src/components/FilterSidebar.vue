<template>
  <div class="bg-base-100 shadow rounded p-4 space-y-4">
    <h2 class="text-lg font-semibold">Filtre</h2>

    <!-- Make -->
    <div>
      <label class="block text-sm font-medium mb-1">Mærke</label>
      <select v-model="localFilters.make" class="select select-bordered w-full">
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
      <input v-model="localFilters.model" type="text" class="input input-bordered w-full" placeholder="f.eks. ID.4" />
    </div>

    <!-- Fuel Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Drivmiddel</label>
      <select v-model="localFilters.fuel_type" class="select select-bordered w-full">
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
      <select v-model="localFilters.transmission" class="select select-bordered w-full">
        <option value="">Alle</option>
        <option value="Automatisk">Automatisk</option>
        <option value="Manuel">Manuel</option>
      </select>
    </div>

    <!-- Body Type -->
    <div>
      <label class="block text-sm font-medium mb-1">Karosseri</label>
      <select v-model="localFilters.body_type" class="select select-bordered w-full">
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
      <input v-model.number="localFilters.maxPrice" type="number" class="input input-bordered w-full" placeholder="f.eks. 3500" />
    </div>

    <button class="btn btn-outline btn-sm w-full" @click="clearFilters">Ryd filtre</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['filter'])

const localFilters = ref({ ...props.filters })

// Update localFilters when parent filters change
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { immediate: true, deep: true })

// Emit new filters on local change
watch(localFilters, () => {
  emit('filter', { ...localFilters.value })
}, { deep: true })

function clearFilters() {
  Object.keys(localFilters.value).forEach(key => {
    localFilters.value[key] = ['horsepower', 'seats', 'maxPrice'].includes(key) ? null : ''
  })
  emit('filter', { ...localFilters.value })
}
</script>
