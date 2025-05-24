<script setup>
import { ref, computed, watch } from 'vue'

// Define props
const props = defineProps({
  leaseOptions: {
    type: Array,
    required: true
  }
})

// Reactive state
const selectedMileage = ref(null)
const selectedPeriod = ref(null)
const selectedUpfront = ref(null)

// Derived unique options
const availableMileages = computed(() =>
  [...new Set(props.leaseOptions.map(o => o.mileage_per_year))]
)
const availablePeriods = computed(() =>
  [...new Set(props.leaseOptions.map(o => o.period_months))]
)
const availableUpfronts = computed(() =>
  [...new Set(props.leaseOptions.map(o => o.first_payment))]
)

// Computed selected option
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

// Initialize selections when leaseOptions change
watch(() => props.leaseOptions, (newOptions) => {
  if (newOptions.length) {
    resetToCheapest()
  }
}, { immediate: true })
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-md space-y-6">
    <!-- Monthly Price -->
    <p class="text-3xl font-bold text-primary">
      {{ selectedLease?.monthly_price?.toLocaleString('da-DK') ?? '–' }} kr/md
    </p>

    <!-- Mileage Selection -->
    <div>
      <label class="block text-sm font-medium mb-1">Hvad er dit forventede årlige kilometerforbrug?</label>
      <select v-model="selectedMileage" class="select select-bordered w-full">
        <option v-for="m in availableMileages" :key="m" :value="m">
          {{ m.toLocaleString() }} km/år
        </option>
      </select>
    </div>

    <!-- Duration Selection (Dropdown) -->
    <div>
      <label class="block text-sm font-medium mb-1">Hvor længe vil du have bilen? (mdr)</label>
      <select v-model="selectedPeriod" class="select select-bordered w-full">
        <option v-for="p in availablePeriods" :key="p" :value="p">
          {{ p }} mdr
        </option>
      </select>
    </div>

    <!-- Upfront Payment Selection (Dropdown) -->
    <div>
      <label class="block text-sm font-medium mb-1">Hvor meget vil du betale op front?</label>
      <select v-model="selectedUpfront" class="select select-bordered w-full">
        <option v-for="f in availableUpfronts" :key="f" :value="f">
          {{ f?.toLocaleString() }} kr
        </option>
      </select>
    </div>

    <!-- Reset Button -->
    <div>
      <button @click="resetToCheapest" class="btn btn-link text-primary">
        Nulstil til laveste månedlige pris 🔄
      </button>
    </div>
  </div>
</template>
