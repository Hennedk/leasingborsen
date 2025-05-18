<script setup>
defineProps({
  price: Number,
  firstPayment: Number,
  periodMonths: Number,
  mileage: Number,
  allowedPeriods: Array,
  allowedMileages: Array,
  allowedFirstPayments: Array
})
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-md space-y-4">
    <!-- Monthly Price -->
    <p class="text-3xl font-semibold text-primary leading-snug">{{ price?.toLocaleString() }} kr/md</p>

    <!-- First Payment (locked dropdown) -->
    <div v-if="Array.isArray(allowedFirstPayments) && allowedFirstPayments.length">
      <label class="block text-sm font-medium text-gray-700 mb-1">Udbetaling</label>
      <select :value="firstPayment" class="select select-bordered w-full" disabled>
        <option
          v-for="option in allowedFirstPayments"
          :key="option"
          :value="option"
        >
          {{ typeof option === 'number' ? option.toLocaleString() + ' kr' : '—' }}
        </option>
      </select>
    </div>

    <!-- Period (locked dropdown) -->
    <div v-if="Array.isArray(allowedPeriods) && allowedPeriods.length">
      <label class="block text-sm font-medium text-gray-700 mb-1">Periode</label>
      <select :value="periodMonths" class="select select-bordered w-full" disabled>
        <option v-for="option in allowedPeriods" :key="option" :value="option">
          {{ option }} mdr
        </option>
      </select>
    </div>

    <!-- Mileage (locked dropdown) -->
    <div v-if="Array.isArray(allowedMileages) && allowedMileages.length">
      <label class="block text-sm font-medium text-gray-700 mb-1">Km/år</label>
      <select class="select select-bordered w-full" disabled>
        <option
          v-for="option in allowedMileages"
          :key="option"
          :value="option"
          :selected="option === mileage"
        >
          {{ typeof option === 'number' ? option.toLocaleString() + ' km' : '—' }}
        </option>
      </select>
    </div>

    <!-- CTA -->
    <div class="pt-2">
      <a
        href="#"
        target="_blank"
        class="btn btn-primary w-full py-3 font-semibold shadow-md hover:shadow-lg transition-all"
      >
        GÅ TIL TILBUD
      </a>
    </div>
  </div>
</template>
