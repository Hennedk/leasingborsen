// CarListingGrid.vue
<template>
  <section class="max-w-screen-xl mx-auto">
    <h2 v-if="title" class="text-2xl font-bold mb-6">{{ title }}</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <ListingCard
        v-for="car in cars"
        :key="car.id"
        :car="car"
      />
    </div>
  </section>
</template>


<script setup>
import ListingCard from './ListingCard.vue'

defineProps({
  cars: Array,
  title: String
})
</script>