<script setup>
import { Gauge, Settings, Fuel, Car, Users } from 'lucide-vue-next'

defineProps({
  listing: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div>
    <!-- Key Specs Section -->
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
    </div>

    <!-- Spacer Divider -->
    <div class="my-8 border-t border-base-300"></div>

    <!-- General Specs Section -->
    <h3 class="text-lg font-semibold text-gray-800 mb-4">General Specs</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="divide-y divide-gray-200">
        <div v-if="listing.make" class="flex justify-between py-2">
          <span class="font-semibold">Mærke</span>
          <span>{{ listing.make }}</span>
        </div>
        <div v-if="listing.model" class="flex justify-between py-2">
          <span class="font-semibold">Model</span>
          <span>{{ listing.model }}</span>
        </div>
        <div v-if="listing.variant" class="flex justify-between py-2">
          <span class="font-semibold">Variant</span>
          <span>{{ listing.variant }}</span>
        </div>
        <div v-if="listing.year" class="flex justify-between py-2">
          <span class="font-semibold">Årgang</span>
          <span>{{ listing.year }}</span>
        </div>
        <div v-if="listing.drive_type" class="flex justify-between py-2">
          <span class="font-semibold">Drivtype</span>
          <span>{{ listing.drive_type }}</span>
        </div>
        <div v-if="listing.doors" class="flex justify-between py-2">
          <span class="font-semibold">Døre</span>
          <span>{{ listing.doors }}</span>
        </div>
      </div>
      <div class="divide-y divide-gray-200">
        <div v-if="listing.wltp" class="flex justify-between py-2">
          <span class="font-semibold">WLTP</span>
          <span>{{ listing.wltp }} km</span>
        </div>
        <div v-if="listing.co2_emission" class="flex justify-between py-2">
          <span class="font-semibold">CO₂ udslip</span>
          <span>{{ listing.co2_emission }} g/km</span>
        </div>
        <div v-if="listing.consumption_l_100km" class="flex justify-between py-2">
          <span class="font-semibold">Forbrug (benzin)</span>
          <span>{{ listing.consumption_l_100km }} l/100km</span>
        </div>
        <div v-if="listing.consumption_kwh_100km" class="flex justify-between py-2">
          <span class="font-semibold">Forbrug (el)</span>
          <span>{{ listing.consumption_kwh_100km }} kWh/100km</span>
        </div>
        <div v-if="listing.co2_tax_half_year" class="flex justify-between py-2">
          <span class="font-semibold">CO₂-afgift (halvår)</span>
          <span>{{ listing.co2_tax_half_year.toLocaleString() }} kr</span>
        </div>
        <div v-if="listing.description" class="flex justify-between py-2">
          <span class="font-semibold">Beskrivelse</span>
          <span>{{ listing.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
