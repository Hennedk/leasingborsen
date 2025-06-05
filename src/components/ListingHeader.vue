<template>
  <div class="space-y-4">
    <!-- Make + Model (Most Prominent) -->
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">
        {{ make }} {{ model }}
      </h1>
      <!-- Variant (Subtle, below title) -->
      <p v-if="variant" class="text-base text-gray-500 mt-1">
        {{ variant }}
      </p>
    </div>

    <!-- Tags/Badges (Separated with spacing) -->
    <div class="flex flex-wrap gap-2 mt-3">
      <span 
        v-if="transmission" 
        class="badge badge-outline text-sm"
      >
        {{ transmission }}
      </span>
      <span 
        v-if="horsepower" 
        class="badge badge-outline text-sm"
      >
        {{ horsepower }} hk
      </span>
      <span 
        v-if="fuelType" 
        class="badge badge-outline text-sm"
      >
        {{ fuelType }}
      </span>
      <span 
        v-if="bodyType" 
        class="badge badge-outline text-sm"
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
