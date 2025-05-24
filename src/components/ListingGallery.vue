<template>
  <div class="card bg-base-100 shadow">
    <figure>
      <img :src="image || '/placeholder.jpg'" :alt="`${make} ${model}`" class="rounded-xl" />
    </figure>
  </div>
</template>

<script setup>
defineProps({
  image: String,
  make: String,
  model: String
})
</script>
