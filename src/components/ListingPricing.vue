<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
  leaseOptions: {
    type: Array,
    required: true
  }
})

// State
const selectedMileage = ref(null)
const selectedPeriod = ref(null)
const selectedUpfront = ref(null)

// Derived options
const availableMileages = computed(() =>
  [...new Set(props.leaseOptions.map(o => o.mileage_per_year))]
)
const availablePeriods = computed(() =>
  [...new Set(props.leaseOptions.map(o => o.period_months))]
)
const availableUpfronts = computed(() =>
  [...new Set(props.leaseOptions.map(o => o.first_payment))]
)

// Computed selected lease
const selectedLease = computed(() =>
  props.leaseOptions.find(o =>
    o.mileage_per_year === selectedMileage.value &&
    o.period_months === selectedPeriod.value &&
    o.first_payment === selectedUpfront.value
  )
)

// Reset to cheapest option
const resetToCheapest = () => {
  const cheapest = props.leaseOptions[0]
  if (cheapest) {
    selectedMileage.value = cheapest.mileage_per_year
    selectedPeriod.value = cheapest.period_months
    selectedUpfront.value = cheapest.first_payment
  }
}

// Watch for changes
watch(() => props.leaseOptions, (newOptions) => {
  if (newOptions.length) resetToCheapest()
}, { immediate: true })
</script>

<template>
  <div class="border border-gray-200 rounded-lg p-6 space-y-6">
    <!-- Monthly Price -->
    <h3 class="text-3xl font-bold text-primary">
      {{ selectedLease?.monthly_price?.toLocaleString('da-DK') ?? '–' }} kr/md
    </h3>

    <!-- Mileage Selection -->
    <div>
      <label class="label text-sm font-medium">Årligt km-forbrug</label>
      <select v-model="selectedMileage" class="select select-bordered w-full">
        <option v-for="m in availableMileages" :key="m" :value="m">{{ m.toLocaleString() }} km/år</option>
      </select>
    </div>

    <!-- Period Selection -->
    <div>
      <label class="label text-sm font-medium">Leasingperiode (mdr)</label>
      <select v-model="selectedPeriod" class="select select-bordered w-full">
        <option v-for="p in availablePeriods" :key="p" :value="p">{{ p }} mdr</option>
      </select>
    </div>

    <!-- Upfront Payment Selection -->
    <div>
      <label class="label text-sm font-medium">Udbetaling</label>
      <select v-model="selectedUpfront" class="select select-bordered w-full">
        <option v-for="f in availableUpfronts" :key="f" :value="f">{{ f?.toLocaleString() }} kr</option>
      </select>
    </div>

    <!-- Reset Button -->
    <button @click="resetToCheapest" class="btn btn-outline w-full">
      Nulstil til laveste pris 🔄
    </button>
  </div>
</template>