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
  <div class="bg-white p-6 rounded-xl shadow-md">
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
      <div class="space-y-4">
        <div v-if="listing.make">
          <div class="font-semibold">Mærke</div>
          <div>{{ listing.make }}</div>
        </div>
        <div v-if="listing.model">
          <div class="font-semibold">Model</div>
          <div>{{ listing.model }}</div>
        </div>
        <div v-if="listing.variant">
          <div class="font-semibold">Variant</div>
          <div>{{ listing.variant }}</div>
        </div>
        <div v-if="listing.year">
          <div class="font-semibold">Årgang</div>
          <div>{{ listing.year }}</div>
        </div>
        <div v-if="listing.drive_type">
          <div class="font-semibold">Drivtype</div>
          <div>{{ listing.drive_type }}</div>
        </div>
        <div v-if="listing.doors">
          <div class="font-semibold">Døre</div>
          <div>{{ listing.doors }}</div>
        </div>
      </div>
      <div class="space-y-4">
        <div v-if="listing.wltp">
          <div class="font-semibold">WLTP</div>
          <div>{{ listing.wltp }} km</div>
        </div>
        <div v-if="listing.co2_emission">
          <div class="font-semibold">CO₂ udslip</div>
          <div>{{ listing.co2_emission }} g/km</div>
        </div>
        <div v-if="listing.consumption_l_100km">
          <div class="font-semibold">Forbrug (benzin)</div>
          <div>{{ listing.consumption_l_100km }} l/100km</div>
        </div>
        <div v-if="listing.consumption_kwh_100km">
          <div class="font-semibold">Forbrug (el)</div>
          <div>{{ listing.consumption_kwh_100km }} kWh/100km</div>
        </div>
        <div v-if="listing.co2_tax_half_year">
          <div class="font-semibold">CO₂-afgift (halvår)</div>
          <div>{{ listing.co2_tax_half_year.toLocaleString() }} kr</div>
        </div>
        <div v-if="listing.description">
          <div class="font-semibold">Beskrivelse</div>
          <div>{{ listing.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
