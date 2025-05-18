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


      <div class="flex items-center gap-3">
        <Gauge class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Hestekræfter</div>
          <div class="font-semibold text-gray-800">{{ listing.horsepower ?? '–' }} hk</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Settings class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Gearkasse</div>
          <div class="font-semibold text-gray-800">{{ listing.transmission ?? '–' }}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Fuel class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Drivmiddel</div>
          <div class="font-semibold text-gray-800">{{ listing.fuel_type ?? '–' }}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Car class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Karrosseri</div>
          <div class="font-semibold text-gray-800">{{ listing.body_type ?? '–' }}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Users class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">Sæder</div>
          <div class="font-semibold text-gray-800">{{ listing.seats ?? '–' }}</div>
        </div>
      </div>

      <div v-if="listing.wltp" class="flex items-center gap-3">
        <Route class="w-7 h-7 text-gray-500" />
        <div>
          <div class="text-gray-500 uppercase text-xs font-medium">WLTP</div>
          <div class="font-semibold text-gray-800">{{ listing.wltp }} km</div>
        </div>
      </div>

    </div>
  </div>
</template>

