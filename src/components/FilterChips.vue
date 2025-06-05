<template>
  <div class="filter-chips-container relative min-h-[2rem] flex items-center gap-2" :class="{ 'flex-wrap': !$attrs.class?.includes('flex-nowrap') }">
    <!-- Placeholder chip -->
    <transition 
      name="fade" 
      @before-leave="handlePlaceholderLeave"
      @after-leave="handlePlaceholderAfterLeave"
    >
      <div
        v-if="shouldShowPlaceholder"
        key="placeholder"
        class="chip-placeholder inline-flex items-center gap-1 bg-base-200 rounded-full border border-base-300 px-3 py-1 text-sm font-medium text-base-content opacity-60 whitespace-nowrap flex-shrink-0"
      >
        <span>Ingen filtre anvendt</span>
      </div>
    </transition>
    
    <!-- Filter chips container -->
    <transition-group 
      name="chip" 
      tag="div" 
      class="flex gap-2 flex-wrap"
      :class="{ 'flex-nowrap': $attrs.class?.includes('flex-nowrap') }"
      @before-enter="handleChipEnter"
    >
      <div
        v-for="filter in displayFilters" 
        :key="filter.key"
        class="inline-flex items-center gap-1 bg-base-100 rounded-full border border-base-300 px-3 py-1 text-sm font-medium text-base-content shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 whitespace-nowrap flex-shrink-0"
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
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  activeFilters: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['remove-filter', 'reset-filters'])

const placeholderVisible = ref(true)
const filtersVisible = ref(false)

// Control when to show placeholder
const shouldShowPlaceholder = computed(() => {
  return props.activeFilters.length === 0 && placeholderVisible.value
})

// Control when to show filters  
const displayFilters = computed(() => {
  return filtersVisible.value ? props.activeFilters : []
})

// Watch for changes in active filters
watch(() => props.activeFilters.length, (newLength, oldLength) => {
  if (oldLength === 0 && newLength > 0) {
    // Going from no filters to having filters
    // Placeholder leaves while filters enter (truly parallel)
    placeholderVisible.value = false
    filtersVisible.value = true
  } else if (oldLength > 0 && newLength === 0) {
    // Going from having filters to no filters  
    // Filters leave while placeholder enters (truly parallel)
    filtersVisible.value = false
    placeholderVisible.value = true
  } else if (newLength > 0) {
    // Filter count changed but still have filters
    filtersVisible.value = true
    placeholderVisible.value = false
  }
}, { immediate: true })

// Initialize state based on current filters
if (props.activeFilters.length > 0) {
  placeholderVisible.value = false
  filtersVisible.value = true
} else {
  placeholderVisible.value = true
  filtersVisible.value = false
}

function handlePlaceholderLeave() {
  // Placeholder is starting to leave
}

function handlePlaceholderAfterLeave() {
  // Placeholder has finished leaving - no longer need to trigger filters here
  // since they're now triggered simultaneously in the watcher
}

function handleChipEnter() {
  // Chips are entering
}
</script>

<style scoped>
.filter-chips-container {
  transition: all 0.3s ease;
}

/* Fade transitions for placeholder */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Chip transitions */
.chip-enter-active {
  transition: all 0.3s ease-out;
}

.chip-leave-active {
  transition: all 0.3s ease-in;
}

.chip-enter-from {
  opacity: 0;
  transform: translateX(-15px) scale(0.9);
}

.chip-leave-to {
  opacity: 0;
  transform: translateX(15px) scale(0.9);
}

.chip-move {
  transition: transform 0.3s ease;
}

/* Prevent layout shift during transitions */
.chip-leave-active {
  position: absolute;
}
</style>
