<template>
  <div class="bg-white p-6 rounded-xl shadow-md">
    <h2 class="text-lg font-semibold text-gray-800 mb-2">Detaljer</h2>
    <p v-if="details" class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
      {{ details }}
    </p>
    <p v-else class="text-sm text-gray-500 italic">Ingen detaljer tilgængelige.</p>
  </div>
</template>

<script setup>
defineProps({
  details: { type: String, default: '' }
})
</script>
