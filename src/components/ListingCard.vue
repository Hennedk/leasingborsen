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
    class="block transition hover:shadow-md hover:-translate-y-1 duration-200"
  >
    <div class="card bg-base-100 border border-base-200 rounded-[var(--rounded-box)] overflow-hidden">
      <!-- Image -->
      <figure class="relative">
        <img :src="car.image || '/placeholder.jpg'" :alt="`${car.make} ${car.model}`" class="w-full h-48 object-cover" />
      </figure>

      <!-- Title -->
      <div class="px-4 pt-4 pb-1">
        <div class="text-lg font-semibold text-neutral leading-tight">
          {{ car.make }} {{ car.model }}
        </div>
        <div class="text-base text-base-content/70 leading-tight">
          {{ car.variant }}
        </div>
      </div>

      <!-- Price -->
      <div class="px-4 pb-1 pt-2">
        <div class="text-xl font-bold text-neutral leading-tight">
          {{ car.monthly_price ? `${car.monthly_price.toLocaleString('da-DK')} kr. / måned` : 'Pris ikke tilgængelig' }}
        </div>
        <p class="text-sm text-base-content/60">
          {{ car.mileage_per_year ? `${car.mileage_per_year.toLocaleString()} km/år` : 'Km ikke angivet' }} •
          {{ car.first_payment ? `Udbetaling: ${car.first_payment.toLocaleString()} kr` : 'Udbetaling ikke angivet' }}
        </p>
      </div>

      <!-- Divider -->
      <div class="border-t border-base-200 mx-4 my-2"></div>

      <!-- Specs -->
      <div class="px-4 pb-4">
        <div class="grid grid-cols-2 gap-2 text-sm text-base-content/60">
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
