<template>
  <div class="card bg-base-100 shadow">
    <figure>
      <img :src="image" :alt="`${make} ${model}`" class="rounded-xl" />
    </figure>
  </div>

</template>

<script setup>
defineProps(['image', 'make', 'model'])
</script>

