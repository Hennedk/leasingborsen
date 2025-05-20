// HeroBanner.vue
<template>
  <section class="hero min-h-[60vh] bg-primary bg-cover bg-center text-neutral-content mb-12">
    <div class="hero-overlay bg-opacity-60"></div>
    <div class="hero-content w-full px-6">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full">
        <!-- Filter section (2/5) -->
        <div class="lg:col-span-2 bg-base-100 p-6 rounded-lg shadow space-y-4 text-neutral">
          <h2 class="text-xl font-semibold">Find din bil</h2>

          <select v-model="filters.make" class="select select-bordered w-full">
            <option value="">Alle mærker</option>
            <option value="VW">VW</option>
            <option value="Tesla">Tesla</option>
            <option value="Ford">Ford</option>
          </select>

          <input
            v-model="filters.model"
            type="text"
            placeholder="Model, fx ID.4"
            class="input input-bordered w-full"
          />

          <select v-model="filters.body_type" class="select select-bordered w-full">
            <option value="">Alle biltyper</option>
            <option value="SUV">SUV</option>
            <option value="Hatchback">Hatchback</option>
          </select>

          <select v-model="filters.fuel_type" class="select select-bordered w-full">
            <option value="">Alle drivmidler</option>
            <option value="El">El</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Benzin">Benzin</option>
          </select>

          <RouterLink :to="{ path: '/listings', query: { ...filters } }">
            <button class="btn btn-primary w-full">Søg</button>
          </RouterLink>
        </div>

        <!-- Headline (3/5) -->
        <div class="lg:col-span-3 flex flex-col justify-center items-center text-center space-y-6">
          <h1 class="text-4xl font-bold leading-tight max-w-xl">
            Leasing uden bøvl – find din næste bil her
          </h1>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const filters = ref({
  make: '',
  model: '',
  fuel_type: '',
  body_type: ''
})
</script>