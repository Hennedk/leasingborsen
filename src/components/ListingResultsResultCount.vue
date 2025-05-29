<template>
  <span v-if="count === 0">Ingen resultater</span>
  <span v-else>{{ count }} {{ count === 1 ? 'resultat' : 'resultater' }}</span>
</template>

<script setup>
const props = defineProps({ count: Number })
</script>
