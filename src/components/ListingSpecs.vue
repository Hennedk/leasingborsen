<template>
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-2xl mb-6">
        <Settings class="w-6 h-6" />
        Specifikationer
      </h2>

      <!-- 🏎️ Quick Specs Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <!-- Horsepower -->
        <div v-if="listing.horsepower" class="stat bg-base-200 rounded-lg">
          <div class="stat-figure text-primary">
            <Gauge class="w-8 h-8" />
          </div>
          <div class="stat-title text-sm">Hestekræfter</div>
          <div class="stat-value text-lg">{{ listing.horsepower }} hk</div>
        </div>

        <!-- Transmission -->
        <div v-if="listing.transmission" class="stat bg-base-200 rounded-lg">
          <div class="stat-figure text-primary">
            <Settings class="w-8 h-8" />
          </div>
          <div class="stat-title text-sm">Gearkasse</div>
          <div class="stat-value text-lg">{{ listing.transmission }}</div>
        </div>

        <!-- Fuel Type -->
        <div v-if="listing.fuel_type" class="stat bg-base-200 rounded-lg">
          <div class="stat-figure text-primary">
            <Fuel class="w-8 h-8" />
          </div>
          <div class="stat-title text-sm">Drivmiddel</div>
          <div class="stat-value text-lg">{{ listing.fuel_type }}</div>
        </div>

        <!-- Body Type -->
        <div v-if="listing.body_type" class="stat bg-base-200 rounded-lg">
          <div class="stat-figure text-primary">
            <Car class="w-8 h-8" />
          </div>
          <div class="stat-title text-sm">Karrosseri</div>
          <div class="stat-value text-lg">{{ listing.body_type }}</div>
        </div>

        <!-- Seats -->
        <div v-if="listing.seats" class="stat bg-base-200 rounded-lg">
          <div class="stat-figure text-primary">
            <Users class="w-8 h-8" />
          </div>
          <div class="stat-title text-sm">Sæder</div>
          <div class="stat-value text-lg">{{ listing.seats }}</div>
        </div>

        <!-- WLTP -->
        <div v-if="listing.wltp" class="stat bg-base-200 rounded-lg">
          <div class="stat-figure text-primary">
            <Route class="w-8 h-8" />
          </div>
          <div class="stat-title text-sm">WLTP</div>
          <div class="stat-value text-lg">{{ listing.wltp }} km</div>
        </div>
      </div>

      <!-- 🔽 Collapsible Detailed Specifications -->
      <div class="collapse collapse-arrow bg-base-200 rounded-box">
        <input type="checkbox" />
        <div class="collapse-title text-lg font-medium">
          Detaljerede specifikationer
        </div>
        <div class="collapse-content">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            
            <!-- Basic Info -->
            <div v-if="hasBasicInfo" class="space-y-3">
              <h3 class="text-base font-semibold text-primary border-b border-base-300 pb-2">Grundlæggende info</h3>
              
              <div v-if="listing.colour" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Farve</span>
                <span class="font-medium badge badge-outline">{{ listing.colour }}</span>
              </div>
              
              <div v-if="listing.year" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Årgang</span>
                <span class="font-medium badge badge-outline">{{ listing.year }}</span>
              </div>
              
              <div v-if="listing.doors" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Døre</span>
                <span class="font-medium badge badge-outline">{{ listing.doors }}</span>
              </div>
              
              <div v-if="listing.condition" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Stand</span>
                <span class="font-medium badge badge-success">{{ listing.condition }}</span>
              </div>
              
              <div v-if="listing.mileage" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Kørte km</span>
                <span class="font-medium">{{ listing.mileage.toLocaleString() }} km</span>
              </div>
            </div>

            <!-- Technical Specs -->
            <div v-if="hasTechnicalSpecs" class="space-y-3">
              <h3 class="text-base font-semibold text-primary border-b border-base-300 pb-2">Tekniske specifikationer</h3>
              
              <div v-if="listing.co2_emission" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">CO₂ udslip</span>
                <span class="font-medium">{{ listing.co2_emission }} g/km</span>
              </div>
              
              <div v-if="listing.consumption_l_100km" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Forbrug (benzin)</span>
                <span class="font-medium">{{ listing.consumption_l_100km }} l/100km</span>
              </div>
              
              <div v-if="listing.consumption_kwh_100km" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Forbrug (el)</span>
                <span class="font-medium">{{ listing.consumption_kwh_100km }} kWh/100km</span>
              </div>
              
              <div v-if="listing.drive_type" class="flex justify-between items-center py-2 border-b border-base-300">
                <span class="text-base-content/70">Drivtype</span>
                <span class="font-medium badge badge-outline">{{ listing.drive_type }}</span>
              </div>
            </div>

            <!-- Financial Info -->
            <div v-if="hasFinancialInfo" class="space-y-3 md:col-span-2">
              <h3 class="text-base font-semibold text-primary border-b border-base-300 pb-2">Økonomi & afgifter</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-if="listing.co2_tax_half_year" class="stat bg-base-300 rounded-lg">
                  <div class="stat-title text-xs">Halvårlig CO₂-afgift</div>
                  <div class="stat-value text-sm text-warning">{{ listing.co2_tax_half_year.toLocaleString() }} kr</div>
                </div>
                
                <div v-if="listing.security_deposit" class="stat bg-base-300 rounded-lg">
                  <div class="stat-title text-xs">Depositum</div>
                  <div class="stat-value text-sm text-info">{{ listing.security_deposit.toLocaleString() }} kr</div>
                </div>
                
                <div v-if="listing.final_payment" class="stat bg-base-300 rounded-lg">
                  <div class="stat-title text-xs">Slutbetaling</div>
                  <div class="stat-value text-sm text-success">{{ listing.final_payment.toLocaleString() }} kr</div>
                </div>
                
                <div v-if="listing.excess_km_rate" class="stat bg-base-300 rounded-lg">
                  <div class="stat-title text-xs">Overkørte km afgift</div>
                  <div class="stat-value text-sm text-error">{{ listing.excess_km_rate }} kr/km</div>
                </div>
                
                <div v-if="listing.total_lease_cost" class="stat bg-base-300 rounded-lg">
                  <div class="stat-title text-xs">Samlet leasingudgift</div>
                  <div class="stat-value text-sm text-primary">{{ listing.total_lease_cost.toLocaleString() }} kr</div>
                </div>
              </div>
            </div>

            <!-- Listing Info -->
            <div v-if="hasListingInfo" class="space-y-3 md:col-span-2">
              <h3 class="text-base font-semibold text-primary border-b border-base-300 pb-2">Listing information</h3>
              
              <div class="flex flex-wrap gap-4">
                <div v-if="listing.listing_status" class="flex items-center gap-2">
                  <span class="text-base-content/70">Status:</span>
                  <span class="badge badge-primary">{{ listing.listing_status }}</span>
                </div>
                
                <div v-if="listing.availability_date" class="flex items-center gap-2">
                  <span class="text-base-content/70">Tilgængelig fra:</span>
                  <span class="badge badge-secondary">{{ formatDate(listing.availability_date) }}</span>
                </div>
                
                <div v-if="listing.seller_name" class="flex items-center gap-2">
                  <span class="text-base-content/70">Sælger:</span>
                  <span class="badge badge-accent">{{ listing.seller_name }}</span>
                </div>
                
                <div v-if="listing.listing_id" class="flex items-center gap-2">
                  <span class="text-base-content/70">ID:</span>
                  <span class="font-mono text-xs bg-base-200 px-2 py-1 rounded">{{ listing.listing_id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Gauge, Settings, Fuel, Car, Users, Route } from 'lucide-vue-next'

// Props
const props = defineProps({
  listing: {
    type: Object,
    required: true
  }
})

// Computed properties to check if sections have data
const hasBasicInfo = computed(() => {
  const { listing } = props
  return listing.colour || listing.year || listing.doors || listing.condition || listing.mileage
})

const hasTechnicalSpecs = computed(() => {
  const { listing } = props
  return listing.co2_emission || listing.consumption_l_100km || listing.consumption_kwh_100km || listing.drive_type
})

const hasFinancialInfo = computed(() => {
  const { listing } = props
  return listing.co2_tax_half_year || listing.security_deposit || listing.final_payment || 
         listing.excess_km_rate || listing.total_lease_cost
})

const hasListingInfo = computed(() => {
  const { listing } = props
  return listing.listing_status || listing.availability_date || listing.seller_name || listing.listing_id
})

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleDateString('da-DK')
  } catch {
    return dateString
  }
}
</script>