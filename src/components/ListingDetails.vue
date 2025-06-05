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
    <p v-else class="text-sm italic text-gray-500">
      Denne bil har ikke yderligere beskrivelser endnu.
    </p>
  </div>
</template>