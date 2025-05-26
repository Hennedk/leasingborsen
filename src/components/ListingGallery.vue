<template>
  <div>
    <img :src="image || '/placeholder.jpg'" :alt="`${make} ${model}`" class="rounded-xl w-full" />
  </div>
</template>

<script setup>
defineProps({
  image: String,
  make: String,
  model: String
})
</script>