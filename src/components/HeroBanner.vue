<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const filters = ref({
  make: '',
  model: '',
  body_type: '', // Vehicle type
  price_max: null, // Max price
})

// Data from Supabase
const makes = ref([])
const models = ref([])
const bodyTypes = ref([])
const resultCount = ref(0)
const isMounted = ref(false)

// Price steps for max price dropdown (reusing existing logic)
const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)

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
    if (value && value !== '' && value !== null) {
      cleanFilters[key] = value
    }
  })
  return cleanFilters
})

// Reset model when make changes
watch(() => filters.value.make, () => {
  filters.value.model = ''
})

// Fetch result count based on current filters
async function fetchCount() {
  if (!isMounted.value) return
  
  try {
    let query = supabase.from('full_listing_view').select('*', { count: 'exact', head: true })
    const f = filters.value
    
    if (f.make) query = query.ilike('make', `%${f.make}%`)
    if (f.model) query = query.ilike('model', `%${f.model}%`)
    if (f.body_type) query = query.eq('body_type', f.body_type)
    if (f.price_max != null) query = query.lte('monthly_price', f.price_max)

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

// Watch filters and fetch count
const watchStopHandle = watch(filters, fetchCount, { deep: true })

// Fetch data on mount
onMounted(async () => {
  isMounted.value = true
  
  const fetchData = async (table) => (await supabase.from(table).select('*')).data ?? []
  
  makes.value = (await fetchData('makes')).sort((a, b) => a.name.localeCompare(b.name))
  models.value = await fetchData('models')
  bodyTypes.value = await fetchData('body_types')
  
  await fetchCount()
})

onUnmounted(() => {
  isMounted.value = false
  watchStopHandle()
})

// Navigation function
function findCars() {
  router.push({ path: '/listings', query: queryParams.value })
}
</script>

<template>
  <section class="hero min-h-[400px] lg:min-h-[600px] bg-gradient-to-br from-primary via-primary to-primary relative overflow-hidden w-full">
    <!-- Enhanced Background decorative elements -->
    <div class="absolute inset-0 bg-gradient-to-br from-black/30 via-black/20 to-black/40"></div>
    <div class="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 via-white/2 to-transparent"></div>
    <div class="absolute bottom-0 left-0 w-1/3 h-1/2 bg-gradient-to-tr from-white/3 to-transparent"></div>
    <!-- Subtle radial gradient behind content -->
    <div class="absolute inset-0 bg-radial-gradient from-white/5 via-transparent to-transparent"></div>
    
    <div class="w-full">
      <div class="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-12 w-full items-center">
          
          <!-- LEFT SIDE: Promotional Text with enhanced contrast -->
          <div class="order-1 lg:order-1 lg:col-span-3 text-center px-4 py-4 lg:px-8 lg:py-6 animate-slide-in-left">
            <div class="max-w-none space-y-4 lg:space-y-6">
              <div class="space-y-3 lg:space-y-4">
                <h1 class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                  Find de bedste leasingtilbud
                </h1>
                <p class="text-base sm:text-lg lg:text-xl text-white/85 leading-relaxed tracking-wide max-w-2xl mx-auto">
                  Sammenlign leasingaftaler fra forhandlere over hele Danmark – hurtigt og nemt.
                </p>
              </div>
              
              <!-- Promotional Banner Image with reduced gap -->
              <div class="mt-6 lg:mt-8 animate-slide-in-up" style="animation-delay: 0.4s;">
                <img 
                  src="https://a.storyblok.com/f/143588/840x287/6cc6a872d2/cin00416_q4-spring-price-reduction-2025-840x287.png/m/750x0/filters:quality(75)" 
                  alt="Spring Price Reduction 2025 - Special leasing offers" 
                  class="w-full max-w-lg mx-auto rounded-xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <!-- RIGHT SIDE: Search Box with improved grouping -->
          <div class="order-2 lg:order-2 lg:col-span-2 animate-slide-in-right px-2 py-4 lg:p-0">
            <div class="bg-base-100 backdrop-blur-md rounded-3xl shadow-2xl p-6 lg:p-8 w-full max-w-[95%] sm:max-w-lg lg:max-w-none mx-auto border border-base-300/50 space-y-6 lg:space-y-8 transition-all duration-500 ease-in hover:shadow-xl">
              <!-- Grouped heading and form with enhanced spacing -->
              <div class="space-y-3 lg:space-y-4">
                <h2 class="text-xl lg:text-2xl font-bold text-base-content text-center lg:text-left leading-tight">
                  Søg blandt hundredvis af leasingbiler – find din drømmebil nu
                </h2>
                
                <div class="space-y-4 lg:space-y-6">
                  <!-- First Row: Make and Model -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <!-- Make Dropdown -->
                    <div>
                      <label class="label">
                        <span class="label-text font-semibold text-primary">Mærke</span>
                      </label>
                      <select
                        v-model="filters.make"
                        class="select select-primary w-full"
                      >
                        <option value="">Vælg mærke</option>
                        <option v-for="make in makes" :key="make.id" :value="make.name">
                          {{ make.name }}
                        </option>
                      </select>
                    </div>

                    <!-- Model Dropdown -->
                    <div>
                      <label class="label">
                        <span class="label-text font-semibold text-primary">Model</span>
                      </label>
                      <select
                        v-model="filters.model"
                        class="select select-primary w-full"
                        :disabled="!filters.make"
                      >
                        <option value="">
                          {{ filters.make ? 'Vælg model' : 'Vælg mærke først' }}
                        </option>
                        <option v-for="model in filteredModels" :key="model.id" :value="model.name">
                          {{ model.name }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <!-- Second Row: Vehicle Type and Max Price -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <!-- Vehicle Type Dropdown -->
                    <div>
                      <label class="label">
                        <span class="label-text font-semibold text-primary">Biltype</span>
                      </label>
                      <select
                        v-model="filters.body_type"
                        class="select select-primary w-full"
                      >
                        <option value="">Alle biltyper</option>
                        <option v-for="bodyType in bodyTypes" :key="bodyType.name" :value="bodyType.name">
                          {{ bodyType.name }}
                        </option>
                      </select>
                    </div>

                    <!-- Max Price Dropdown -->
                    <div>
                      <label class="label">
                        <span class="label-text font-semibold text-primary">Maks pris</span>
                      </label>
                      <select
                        v-model.number="filters.price_max"
                        class="select select-primary w-full"
                      >
                        <option :value="null">Ingen grænse</option>
                        <option v-for="p in priceSteps" :key="'max-' + p" :value="p">{{ p.toLocaleString() }} kr./måned</option>
                        <option :value="9999999">10.000+ kr./måned</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Enhanced Primary CTA -->
              <button 
                class="btn btn-primary btn-lg w-full shadow-xl hover:shadow-2xl font-bold tracking-wide" 
                @click="findCars"
                aria-label="Søg efter biler med de valgte kriterier"
              >
                Vis {{ resultCount }} biler
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Enhanced entrance animations */
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-60px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(60px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in-left {
  animation: slideInLeft 0.8s ease-out forwards;
}

.animate-slide-in-right {
  animation: slideInRight 0.8s ease-out forwards;
  animation-delay: 0.2s;
  opacity: 0;
}

.animate-slide-in-up {
  animation: slideInUp 0.6s ease-out forwards;
  opacity: 0;
}

/* Radial gradient background */
.bg-radial-gradient {
  background: radial-gradient(ellipse at center, var(--tw-gradient-stops));
}

/* Mobile-specific improvements */
@media (max-width: 1023px) {
  .animate-slide-in-right {
    animation-delay: 0s;
  }
  
  /* Ensure proper mobile stacking */
  .order-1 {
    margin-bottom: 1rem;
  }
  
  .order-2 {
    margin-top: 1rem;
  }
}

/* Improved backdrop blur for better form visibility */
@supports (backdrop-filter: blur(12px)) {
  .backdrop-blur-md {
    backdrop-filter: blur(12px);
  }
}
</style>