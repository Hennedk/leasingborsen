<script setup>
import { ref, computed, watch } from 'vue'
import { ExternalLink, Phone, Mail } from 'lucide-vue-next'
import Modal from './Modal.vue'

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
const showSellerModal = ref(false)

// Seller data (this could be passed as prop in real implementation)
const seller = ref({
  name: 'Leasingselskab A/S',
  website: 'https://example.com',
  phone: '+45 12 34 56 78',
  email: 'kontakt@leasingselskab.dk',
  description: 'Professionel leasingudbyder med over 10 års erfaring',
  id: 'seller-123'
})

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

// Open seller modal
const openSellerModal = () => {
  showSellerModal.value = true
}

// Close seller modal
const closeSellerModal = () => {
  showSellerModal.value = false
}

// Track seller visit (placeholder for analytics)
const trackSellerVisit = (sellerId) => {
  // Analytics tracking would go here
}

// Watch for changes
watch(() => props.leaseOptions, (newOptions) => {
  if (newOptions.length) resetToCheapest()
}, { immediate: true })
</script>

<template>
  <div class="card bg-base-100 shadow-md border border-base-300 rounded-lg">
    <div class="card-body space-y-4">
      <!-- Monthly Price -->
      <div>
        <h3 class="text-3xl font-bold text-primary mb-2">
          {{ selectedLease?.monthly_price?.toLocaleString('da-DK') ?? '–' }} kr/md
        </h3>
      </div>

      <!-- Reset Link with better separation -->
      <div class="mt-2">
        <a class="link text-sm text-base-content opacity-70 cursor-pointer" @click="resetToCheapest">
          Find billigere tilbud
        </a>
      </div>

      <!-- Form Fields -->
      <div class="space-y-4">
        <!-- Mileage Selection -->
        <div>
          <label class="label">
            <span class="label-text font-semibold text-primary">Årligt km-forbrug</span>
          </label>
          <select v-model="selectedMileage" class="select select-primary w-full">
            <option v-for="m in availableMileages" :key="m" :value="m">
              {{ m.toLocaleString() }} km/år
            </option>
          </select>
        </div>

        <!-- Period Selection -->
        <div>
          <label class="label">
            <span class="label-text font-semibold text-primary">Leasingperiode</span>
          </label>
          <select v-model="selectedPeriod" class="select select-primary w-full">
            <option v-for="p in availablePeriods" :key="p" :value="p">
              {{ p }} måneder
            </option>
          </select>
        </div>

        <!-- Upfront Payment Selection -->
        <div>
          <label class="label">
            <span class="label-text font-semibold text-primary">Udbetaling</span>
          </label>
          <select v-model="selectedUpfront" class="select select-primary w-full">
            <option v-for="f in availableUpfronts" :key="f" :value="f">
              {{ f?.toLocaleString() }} kr
            </option>
          </select>
        </div>
      </div>

      <!-- Primary CTA Button -->
      <div class="pt-4">
        <button @click="openSellerModal" class="btn btn-primary w-full gap-2">
          <ExternalLink class="w-4 h-4" />
          Se tilbud hos leasingselskab
        </button>
      </div>
    </div>
  </div>

  <!-- Seller Modal -->
  <Modal 
    :isOpen="showSellerModal" 
    @close="closeSellerModal"
    modalId="seller_modal"
  >
    <template #title>
      <h3 class="text-lg font-bold">{{ seller.name }}</h3>
    </template>

    <!-- Seller details -->
    <div class="space-y-2 text-sm text-base-content opacity-80">
      <p>{{ seller.description }}</p>
      <div class="flex items-center gap-2">
        <Phone class="w-4 h-4 text-base-content opacity-60" />
        <span>+45 12 34 56 78</span>
      </div>
      <div class="flex items-center gap-2">
        <Mail class="w-4 h-4 text-base-content opacity-60" />
        <span>info@leasingbuddy.dk</span>
      </div>
    </div>

    <template #footer>
      <!-- CTA -->
      <div class="pt-4">
        <a
          :href="seller.website"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary w-full"
          @click="trackSellerVisit(seller.id)"
        >
          <ExternalLink class="w-4 h-4 mr-2" />
          Gå til leasingselskabets hjemmeside
        </a>
      </div>
    </template>
  </Modal>
</template>