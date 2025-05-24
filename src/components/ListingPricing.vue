<template>
  <div class="bg-white p-6 rounded-xl shadow-md space-y-4">
    <p class="text-3xl font-semibold text-primary leading-snug">{{ price?.toLocaleString() }} kr/md</p>

    <div v-if="allowedFirstPayments.length">
      <label class="block text-sm font-medium text-gray-700 mb-1">Udbetaling</label>
      <select :value="firstPayment" class="select select-bordered w-full" disabled>
        <option v-for="option in allowedFirstPayments" :key="option" :value="option">
          {{ option?.toLocaleString() }} kr
        </option>
      </select>
    </div>

    <div v-if="allowedPeriods.length">
      <label class="block text-sm font-medium text-gray-700 mb-1">Periode</label>
      <select :value="periodMonths" class="select select-bordered w-full" disabled>
        <option v-for="option in allowedPeriods" :key="option" :value="option">
          {{ option }} mdr
        </option>
      </select>
    </div>

    <div v-if="allowedMileages.length">
      <label class="block text-sm font-medium text-gray-700 mb-1">Km/år</label>
      <select :value="mileage" class="select select-bordered w-full" disabled>
        <option v-for="option in allowedMileages" :key="option" :value="option">
          {{ option?.toLocaleString() }} km
        </option>
      </select>
    </div>

    <div class="pt-2">
      <a href="#" target="_blank" class="btn btn-primary w-full py-3 font-semibold shadow-md hover:shadow-lg transition-all">
        GÅ TIL TILBUD
      </a>
    </div>
  </div>
</template>

<script setup>
defineProps({
  price: Number,
  firstPayment: Number,
  periodMonths: Number,
  mileage: Number,
  allowedPeriods: { type: Array, default: () => [] },
  allowedMileages: { type: Array, default: () => [] },
  allowedFirstPayments: { type: Array, default: () => [] }
})
</script>
