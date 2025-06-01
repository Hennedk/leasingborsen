<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const filters = ref({
  make: '',
  model: '',
  fuel_type: '',
  body_type: '',
  transmission: '',
  horsepower: null,
  seats_min: null,
  seats_max: null,
  price_min: null,
  price_max: null,
  condition: '',
  listingStatus: '',
  driveType: '',
  availableBefore: ''
})

// Data from Supabase (aligned with filter components)
const makes = ref([])
const models = ref([])
const fuelTypes = ref([])
const bodyTypes = ref([])
const resultCount = ref(0)
const isMounted = ref(false)

const filteredModels = computed(() => {
  if (!filters.value.make) return []
  return models.value.filter(m => 
    m.make_id === makes.value.find(make => make.name === filters.value.make)?.id
  )
})

// Computed property to create clean query parameters (only non-empty values)
const queryParams = computed(() => {
  const cleanFilters = {}
  Object.entries(filters.value).forEach(([key, value]) => {
    if (value && value !== '') {
      cleanFilters[key] = value
    }
  })
  return cleanFilters
})

// Reset model when make changes
watch(() => filters.value.make, () => {
  filters.value.model = ''
})

// Fetch result count based on current filters (aligned with ListingResults)
async function fetchCount() {
  if (!isMounted.value) return
  
  try {
    let query = supabase.from('full_listing_view').select('*', { count: 'exact', head: true })
    const f = filters.value
    
    // Use exact same logic as ListingResults fetchCars function
    if (f.make) query = query.ilike('make', `%${f.make}%`)
    if (f.model) query = query.ilike('model', `%${f.model}%`)
    if (f.fuel_type) query = query.eq('fuel_type', f.fuel_type)
    if (f.body_type) query = query.eq('body_type', f.body_type)
    if (f.transmission) query = query.eq('transmission', f.transmission)
    if (f.horsepower) query = query.gte('horsepower', f.horsepower)
    if (f.seats_min != null) query = query.gte('seats', f.seats_min)
    if (f.seats_max != null) query = query.lte('seats', f.seats_max)
    if (f.price_min != null) query = query.gte('monthly_price', f.price_min)
    if (f.price_max != null) query = query.lte('monthly_price', f.price_max)
    if (f.condition) query = query.eq('condition', f.condition)
    if (f.listingStatus) query = query.eq('listing_status', f.listingStatus)
    if (f.driveType) query = query.eq('drive_type', f.driveType)
    if (f.availableBefore) query = query.lte('availability_date', f.availableBefore)

    const { count, error } = await query
    if (isMounted.value) {
      resultCount.value = error ? 0 : count ?? 0
    }
  } catch (e) {
    console.error('Count fetch failed:', e)
    if (isMounted.value) {
      resultCount.value = 0
    }
  }
}

// Watch filters and fetch count (removed immediate to prevent unmount issues)
const watchStopHandle = watch(filters, fetchCount, { deep: true })

// Fetch data on mount (aligned with filter components)
onMounted(async () => {
  isMounted.value = true
  
  const fetchData = async (table) => (await supabase.from(table).select('*')).data ?? []
  
  makes.value = (await fetchData('makes')).sort((a, b) => a.name.localeCompare(b.name))
  models.value = await fetchData('models')
  fuelTypes.value = await fetchData('fuel_types')
  bodyTypes.value = await fetchData('body_types')
  
  await fetchCount()
})

onUnmounted(() => {
  isMounted.value = false
  watchStopHandle()
})

// Navigation function
function navigateToListings() {
  router.push({ path: '/listings', query: queryParams.value })
}
</script>

<template>
  <section class="hero min-h-[60vh] bg-primary text-neutral-content mb-10">
    <div class="hero-overlay bg-opacity-60"></div>
    <div class="hero-content w-full px-6">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full">
        <!-- Filters -->
        <div class="lg:col-span-2 bg-base-100 p-6 rounded-lg shadow space-y-4 text-neutral">
          <h2 class="text-xl font-semibold">Find din bil</h2>

          <select v-model="filters.make" class="select select-bordered w-full">
            <option value="">Alle mærker</option>
            <option v-for="make in makes" :key="make.id" :value="make.name">
              {{ make.name }}
            </option>
          </select>

          <select v-model="filters.model" class="select select-bordered w-full" :disabled="!filters.make">
            <option value="">
              {{ filters.make ? 'Alle modeller' : 'Vælg mærke først' }}
            </option>
            <option v-for="model in filteredModels" :key="model.id" :value="model.name">
              {{ model.name }}
            </option>
          </select>

          <select v-model="filters.body_type" class="select select-bordered w-full">
            <option value="">Alle biltyper</option>
            <option v-for="bodyType in bodyTypes" :key="bodyType.name" :value="bodyType.name">
              {{ bodyType.name }}
            </option>
          </select>

          <select v-model="filters.fuel_type" class="select select-bordered w-full">
            <option value="">Alle drivmidler</option>
            <option v-for="fuelType in fuelTypes" :key="fuelType.name" :value="fuelType.name">
              {{ fuelType.name }}
            </option>
          </select>

          <button class="btn btn-primary w-full mt-4" @click="navigateToListings">
            Vis {{ resultCount }} biler
          </button>
        </div>

        <!-- Headline -->
        <div class="lg:col-span-3 flex flex-col justify-center items-center text-center space-y-6">
          <h1 class="text-4xl font-bold leading-tight max-w-xl">
            Leasing uden bøvl – find din næste bil her
          </h1>
        </div>
      </div>
    </div>
  </section>
</template>