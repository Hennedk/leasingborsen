<template>
  <div>
    <img :src="image || '/placeholder.jpg'" :alt="`${make} ${model}`" class="rounded-xl w-full" />
    <p class="text-xs text-gray-500 text-left mt-2 italic">
      Photo is for illustration purposes
    </p>
  </div>
</template>

<script setup>
defineProps({
  image: String,
  make: String,
  model: String
})
</script>