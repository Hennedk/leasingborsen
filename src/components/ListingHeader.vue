<template>
  <div class="card bg-base-100 shadow p-4 space-y-2">
    <h2 class="text-2xl font-bold">{{ make }} {{ model }}</h2>
    <p class="text-gray-500">{{ variant }}</p>

    <div class="flex flex-wrap gap-2 pt-2">
      <span v-if="transmission" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
        {{ transmission }}
      </span>
      <span v-if="bodyType" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
        {{ bodyType }}
      </span>
      <span v-if="fuelType" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
        {{ fuelType }}
      </span>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    make: String,
    model: String,
    variant: String,
    transmission: String,
    bodyType: String,
    fuelType: String
  })

</script>
