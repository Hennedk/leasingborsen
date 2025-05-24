<template>
  <div class="space-y-1">
    <!-- Make + Model -->
    <h2 class="text-2xl font-bold text-neutral">
      {{ make }} {{ model }}
    </h2>

    <!-- Variant -->
    <p v-if="variant" class="text-base text-neutral-content">
      {{ variant }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  make: String,
  model: String,
  variant: String
})
</script>
