<script setup>
defineProps({
  details: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-800 mb-4">Detaljer</h2>
    <div v-if="details && details.trim()" class="text-gray-700 leading-relaxed">
      {{ details }}
    </div>
    <div v-else class="text-gray-500 italic">
      Ingen detaljer tilgængelige.
    </div>
  </div>
</template>