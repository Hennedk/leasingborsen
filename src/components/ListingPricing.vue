<script setup>
import { ref, watch, computed } from 'vue'

// ✅ Correctly define props
const props = defineProps({
  leaseOptions: {
    type: Array,
    default: () => []
  }
})

// 🔥 Reference leaseOptions through props
const selectedPeriod = ref(null)
const selectedMileage = ref(null)
const selectedFirstPayment = ref(null)

// 🔥 Use props.leaseOptions, not just leaseOptions
watch(() => props.leaseOptions, (newOptions) => {
  if (newOptions?.length) {
    selectedPeriod.value = newOptions[0].period_months
    selectedMileage.value = newOptions[0].mileage_per_year
    selectedFirstPayment.value = newOptions[0].first_payment
  }
}, { immediate: true })

const selectedOption = computed(() => {
  return props.leaseOptions.find(opt =>
    opt.period_months === selectedPeriod.value &&
    opt.mileage_per_year === selectedMileage.value &&
    opt.first_payment === selectedFirstPayment.value
  ) || props.leaseOptions[0]
})
</script>

<template>
  <div v-if="props.leaseOptions.length" class="bg-white p-6 rounded-xl shadow-md space-y-4">
    <p class="text-3xl font-semibold text-primary leading-snug">
      {{ selectedOption?.monthly_price?.toLocaleString() }} kr/md
    </p>

    <div>
      <label>Udbetaling</label>
      <select v-model="selectedFirstPayment">
        <option v-for="opt in [...new Set(props.leaseOptions.map(o => o.first_payment))]" :key="opt" :value="opt">
          {{ opt.toLocaleString() }} kr
        </option>
      </select>
    </div>

    <div>
      <label>Periode</label>
      <select v-model="selectedPeriod">
        <option v-for="opt in [...new Set(props.leaseOptions.map(o => o.period_months))]" :key="opt" :value="opt">
          {{ opt }} mdr
        </option>
      </select>
    </div>

    <div>
      <label>Km/år</label>
      <select v-model="selectedMileage">
        <option v-for="opt in [...new Set(props.leaseOptions.map(o => o.mileage_per_year))]" :key="opt" :value="opt">
          {{ opt.toLocaleString() }} km
        </option>
      </select>
    </div>

    <div>
      <a href="#" class="btn btn-primary">GÅ TIL TILBUD</a>
    </div>
  </div>

  <div v-else>
    <p>Ingen leasingmuligheder tilgængelige for denne bil.</p>
  </div>
</template>
