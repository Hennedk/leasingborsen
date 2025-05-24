<template>
  <div class="space-y-2">
    <h2 class="text-xl font-bold">{{ make }} {{ model }} {{ variant }}</h2>
    <p class="text-sm text-gray-600">
      {{ transmission }} • {{ bodyType }} • {{ fuelType }}
    </p>
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
