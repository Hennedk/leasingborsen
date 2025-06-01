<template>
  <div class="flex gap-2" :class="{ 'flex-wrap': !$attrs.class?.includes('flex-nowrap') }">
    <!-- Show placeholder chip when no filters are active -->
    <transition name="chip">
      <div
        v-if="activeFilters.length === 0"
        key="placeholder"
        class="inline-flex items-center gap-1 bg-gray-100 rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-500 whitespace-nowrap flex-shrink-0"
      >
        <span>Ingen filtre anvendt</span>
      </div>
    </transition>
    
    <!-- Show actual filter chips when filters are active -->
    <transition-group
      v-if="activeFilters.length > 0"
      name="chip"
      tag="div"
      class="flex gap-2 flex-wrap"
      :class="{ 'flex-nowrap': $attrs.class?.includes('flex-nowrap') }"
    >
      <div
        v-for="filter in activeFilters" 
        :key="filter.key"
        class="inline-flex items-center gap-1 bg-white rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-black shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 whitespace-nowrap flex-shrink-0"
      >
        <span>{{ filter.label }}</span>
        <button
          @click="$emit('remove-filter', filter.key)"
          class="text-neutral-600 text-base leading-none hover:text-red-500 hover:scale-110 focus:outline-none transition-all duration-200 cursor-pointer rounded-full"
          aria-label="Fjern filter"
        >
          ×
        </button>
      </div>
    </transition-group>
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

<style scoped>
/* Chip enter/leave animations - left to right flow */
.chip-enter-active {
  transition: all 0.3s ease-out;
}

.chip-leave-active {
  transition: all 0.3s ease-in;
}

.chip-enter-from {
  opacity: 0;
  transform: scale(0.8) translateX(-20px);
}

.chip-leave-to {
  opacity: 0;
  transform: scale(0.8) translateX(-20px);
}

.chip-move {
  transition: transform 0.3s ease;
}
</style>
