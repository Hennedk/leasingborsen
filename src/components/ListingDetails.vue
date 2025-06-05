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
    <h2 class="text-lg font-semibold text-base-content mb-4">Detaljer</h2>
    <div v-if="details && details.trim()" class="text-base-content opacity-80 leading-relaxed">
      {{ details }}
    </div>
    <p v-else class="text-sm italic text-base-content opacity-60">
      Denne bil har ikke yderligere beskrivelser endnu.
    </p>
  </div>
</template>