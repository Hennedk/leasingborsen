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
    <h2 class="text-lg font-semibold text-base-content mb-4">Specifikationer</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm">
      <div class="flex items-center gap-3">
        <Gauge class="w-7 h-7 text-base-content opacity-60" />
        <div>
          <div class="text-base-content opacity-60 uppercase text-xs font-medium">Hestekræfter</div>
          <div class="font-bold text-base-content">{{ listing.horsepower ?? '–' }} hk</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <Settings class="w-7 h-7 text-base-content opacity-60" />
        <div>
          <div class="text-base-content opacity-60 uppercase text-xs font-medium">Gearkasse</div>
          <div class="font-bold text-base-content">{{ listing.transmission ?? '–' }}</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <Fuel class="w-7 h-7 text-base-content opacity-60" />
        <div>
          <div class="text-base-content opacity-60 uppercase text-xs font-medium">Drivmiddel</div>
          <div class="font-bold text-base-content">{{ listing.fuel_type ?? '–' }}</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <Car class="w-7 h-7 text-base-content opacity-60" />
        <div>
          <div class="text-base-content opacity-60 uppercase text-xs font-medium">Karrosseri</div>
          <div class="font-bold text-base-content">{{ listing.body_type ?? '–' }}</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <Users class="w-7 h-7 text-base-content opacity-60" />
        <div>
          <div class="text-base-content opacity-60 uppercase text-xs font-medium">Sæder</div>
          <div class="font-bold text-base-content">{{ listing.seats ?? '–' }}</div>
        </div>
      </div>
    </div>

    <!-- Spacer Divider -->
    <div class="my-8 border-t border-base-300"></div>

    <!-- General Specs Section -->
    <h3 class="text-lg font-semibold text-base-content mb-4">General Specs</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="divide-y divide-base-300">
        <div v-if="listing.make" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Mærke</span>
          <span class="font-semibold text-base-content">{{ listing.make }}</span>
        </div>
        <div v-if="listing.model" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Model</span>
          <span class="font-semibold text-base-content">{{ listing.model }}</span>
        </div>
        <div v-if="listing.variant" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Variant</span>
          <span class="font-semibold text-base-content">{{ listing.variant }}</span>
        </div>
        <div v-if="listing.year" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Årgang</span>
          <span class="font-semibold text-base-content">{{ listing.year }}</span>
        </div>
        <div v-if="listing.drive_type" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Drivtype</span>
          <span class="font-semibold text-base-content">{{ listing.drive_type }}</span>
        </div>
        <div v-if="listing.doors" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Døre</span>
          <span class="font-semibold text-base-content">{{ listing.doors }}</span>
        </div>
      </div>
      <div class="divide-y divide-base-300">
        <div v-if="listing.wltp" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">WLTP</span>
          <span class="font-semibold text-base-content">{{ listing.wltp }} km</span>
        </div>
        <div v-if="listing.co2_emission" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">CO₂ udslip</span>
          <span class="font-semibold text-base-content">{{ listing.co2_emission }} g/km</span>
        </div>
        <div v-if="listing.consumption_l_100km" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Forbrug (benzin)</span>
          <span class="font-semibold text-base-content">{{ listing.consumption_l_100km }} l/100km</span>
        </div>
        <div v-if="listing.consumption_kwh_100km" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Forbrug (el)</span>
          <span class="font-semibold text-base-content">{{ listing.consumption_kwh_100km }} kWh/100km</span>
        </div>
        <div v-if="listing.co2_tax_half_year" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">CO₂-afgift (halvår)</span>
          <span class="font-semibold text-base-content">{{ listing.co2_tax_half_year.toLocaleString() }} kr</span>
        </div>
        <div v-if="listing.description" class="flex justify-between py-2">
          <span class="font-medium text-base-content opacity-70">Beskrivelse</span>
          <span class="font-semibold text-base-content">{{ listing.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
