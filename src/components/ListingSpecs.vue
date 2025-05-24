<script setup>
import {
  Gauge,
  Settings,
  Fuel,
  Car,
  Users,
  Route
} from 'lucide-vue-next'

defineProps({
  listing: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-md">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">Specifikationer</h2>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
      <!-- Horsepower -->
      <div class="flex items-center gap-3">
        <Gauge class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Hestekræfter</div>
          <div class="font-semibold text-gray-800">{{ listing.horsepower ?? '–' }} hk</div>
        </div>
      </div>

      <!-- Transmission -->
      <div class="flex items-center gap-3">
        <Settings class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Gearkasse</div>
          <div class="font-semibold text-gray-800">{{ listing.transmission ?? '–' }}</div>
        </div>
      </div>

      <!-- Fuel Type -->
      <div class="flex items-center gap-3">
        <Fuel class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Drivmiddel</div>
          <div class="font-semibold text-gray-800">{{ listing.fuel_type ?? '–' }}</div>
        </div>
      </div>

      <!-- Body Type -->
      <div class="flex items-center gap-3">
        <Car class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Karrosseri</div>
          <div class="font-semibold text-gray-800">{{ listing.body_type ?? '–' }}</div>
        </div>
      </div>

      <!-- Seats -->
      <div class="flex items-center gap-3">
        <Users class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Sæder</div>
          <div class="font-semibold text-gray-800">{{ listing.seats ?? '–' }}</div>
        </div>
      </div>

      <!-- WLTP -->
      <div v-if="listing.wltp" class="flex items-center gap-3">
        <Route class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">WLTP</div>
          <div class="font-semibold text-gray-800">{{ listing.wltp }} km</div>
        </div>
      </div>

      <!-- Future specs (prepared but hidden) -->
      <template v-if="false">
        <div>Farve: {{ listing.colour }}</div>
        <div>Årgang: {{ listing.year }}</div>
        <div>CO₂: {{ listing.co2_emission }} g/km</div>
        <div>Halvårlig CO₂-afgift: {{ listing.co2_tax_half_year }} kr</div>
        <div>Stand: {{ listing.condition }}</div>
        <div>Status: {{ listing.listing_status }}</div>
        <div>Tilgængelig før: {{ listing.availability_date }}</div>
        <div>Depositum: {{ listing.security_deposit }} kr</div>
        <div>Slutbetaling: {{ listing.final_payment }} kr</div>
        <div>Overkørte km afgift: {{ listing.excess_km_rate }} kr/km</div>
        <div>Samlet leasingudgift: {{ listing.total_lease_cost }} kr</div>
      </template>
    </div>
  </div>
</template>
