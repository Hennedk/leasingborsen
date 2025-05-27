<script setup>
import { RouterLink } from 'vue-router'
import { Fuel, Settings, Car, Gauge } from 'lucide-vue-next'

defineProps({
  car: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <RouterLink
    :to="{ name: 'Listing', params: { id: car.listing_id } }"
    class="block transition hover:shadow-lg hover:-translate-y-1 duration-300"
  >
    <div class="rounded-lg border border-base-300 bg-white shadow-sm font-sans">
      <!-- Image -->
      <figure class="relative rounded-t-lg overflow-hidden">
        <img
          :src="car.image || '/placeholder.jpg'"
          :alt="`${car.make} ${car.model}`"
          class="w-full h-52 object-cover transition-transform duration-300 hover:scale-105"
        />
      </figure>

      <!-- Title & Variant -->
      <div class="px-5 pt-4">
        <h3 class="text-lg font-bold text-primary leading-snug">
          {{ car.make }} {{ car.model }}
        </h3>
        <p class="text-sm text-base-content/60 mt-1">{{ car.variant }}</p>
      </div>

      <!-- Price -->
      <div class="px-5 pt-3">
        <p class="text-lg font-semibold text-primary">
          {{ car.monthly_price ? `${car.monthly_price.toLocaleString('da-DK')} kr. / måned` : 'Pris ikke tilgængelig' }}
        </p>
        <p class="text-xs text-base-content/50 mt-0.5">
          {{ car.mileage_per_year ? `${car.mileage_per_year.toLocaleString()} km/år` : 'Km ikke angivet' }}
          •
          {{ car.first_payment ? `Udbetaling: ${car.first_payment.toLocaleString()} kr` : 'Udbetaling ikke angivet' }}
        </p>
      </div>

      <!-- Divider -->
      <div class="border-t border-dashed border-base-300 mx-5 my-3"></div>

      <!-- Specs -->
      <div class="px-5 pb-5">
        <div class="grid grid-cols-2 gap-y-2 text-sm text-base-content/60">
          <div class="flex items-center gap-2">
            <Fuel class="w-4 h-4 text-base-content/50" /> {{ car.fuel_type || '–' }}
          </div>
          <div class="flex items-center gap-2">
            <Settings class="w-4 h-4 text-base-content/50" /> {{ car.transmission || '–' }}
          </div>
          <div class="flex items-center gap-2">
            <Car class="w-4 h-4 text-base-content/50" /> {{ car.body_type || '–' }}
          </div>
          <div class="flex items-center gap-2">
            <Gauge class="w-4 h-4 text-base-content/50" /> {{ car.horsepower ? `${car.horsepower} hk` : '–' }}
          </div>
        </div>
      </div>
    </div>
  </RouterLink>
</template>
