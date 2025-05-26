<template>
  <div class="mb-4">
    <label class="block text-sm font-medium mb-1">{{ label }}</label>
    <slot></slot> <!-- Slot for field (e.g. select, buttons) -->
  </div>
</template>

<script setup>
defineProps({
  label: String
})
</script>
