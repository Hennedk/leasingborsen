<template>
  <div class="space-y-4">
    <!-- Make + Model -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900">
        {{ make }} {{ model }}
      </h2>
    </div>

    <!-- Variant -->
    <div v-if="variant">
      <p class="text-base text-gray-600">{{ variant }}</p>
    </div>

    <!-- Tags/Badges -->
    <div class="flex flex-wrap gap-2">
      <span 
        v-if="transmission" 
        class="inline-flex items-center bg-white rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-black shadow-sm whitespace-nowrap"
      >
        {{ transmission }}
      </span>
      <span 
        v-if="horsepower" 
        class="inline-flex items-center bg-white rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-black shadow-sm whitespace-nowrap"
      >
        {{ horsepower }} hk
      </span>
      <span 
        v-if="fuelType" 
        class="inline-flex items-center bg-white rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-black shadow-sm whitespace-nowrap"
      >
        {{ fuelType }}
      </span>
      <span 
        v-if="bodyType" 
        class="inline-flex items-center bg-white rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-black shadow-sm whitespace-nowrap"
      >
        {{ bodyType }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  make: String,
  model: String,
  variant: String,
  transmission: String,
  horsepower: [String, Number],
  fuelType: String,
  bodyType: String,
  listingId: [String, Number]
})
</script>
