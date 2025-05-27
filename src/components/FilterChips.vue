<template>
  <div class="flex flex-wrap gap-2">
    <template v-for="filter in activeFilters" :key="filter.key">
      <div
        class="inline-flex items-center gap-1 bg-white rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-black shadow-sm hover:shadow-md transition-shadow duration-200"
      >
        <span>{{ filter.label }}</span>
        <button
          @click="$emit('remove-filter', filter.key)"
          class="text-neutral-600 text-base leading-none hover:text-red-500 focus:outline-none transition-colors duration-200 cursor-pointer"
          aria-label="Fjern filter"
        >
          ×
        </button>
      </div>
    </template>

  </div>
</template>

<script setup>
const props = defineProps({
  activeFilters: {
    type: Array,
    required: true
  }
})
const emit = defineEmits(['remove-filter', 'reset-filters'])
</script>
