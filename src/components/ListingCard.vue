<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Fuel, Settings, Car, Gauge, AlertCircle, RotateCcw, Flag } from 'lucide-vue-next'

const props = defineProps({
  car: {
    type: Object,
    required: false,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()

// Image loading states
const imageLoaded = ref(false)
const imageError = ref(false)
const imageRef = ref(null)

// Interaction states
const showRipple = ref(false)
const navigating = ref(false)
const isPressed = ref(false)

// Error recovery
const imageRetryCount = ref(0)
const maxRetries = 3

// Smart skeleton content
const skeletonWidths = ['w-24', 'w-32', 'w-28', 'w-36', 'w-20', 'w-16']
const getRandomWidth = () => skeletonWidths[Math.floor(Math.random() * skeletonWidths.length)]

// Progressive image loading setup
onMounted(() => {
  if (!props.loading && props.car && imageRef.value) {
    setupImageLoading()
  }
})

const setupImageLoading = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage()
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })
  
  if (imageRef.value) {
    observer.observe(imageRef.value)
  }
}

const loadImage = () => {
  if (!props.car.image) return
  
  const img = new Image()
  img.onload = () => {
    imageLoaded.value = true
    imageError.value = false
  }
  img.onerror = () => {
    imageError.value = true
    imageLoaded.value = false
  }
  img.src = props.car.image
}

// Error recovery actions
const retryImage = () => {
  if (imageRetryCount.value < maxRetries) {
    imageRetryCount.value++
    imageError.value = false
    loadImage()
  }
}

const reportIssue = () => {
  // Implement issue reporting
  console.log('Issue reported for car:', props.car.id)
  // Could integrate with analytics or support system
}

// Interaction handlers
const onCardClick = async (event) => {
  // Immediate visual feedback
  showRipple.value = true
  isPressed.value = true
  
  // Clear ripple after animation
  setTimeout(() => {
    showRipple.value = false
    isPressed.value = false
  }, 400)
  
  // Show loading if navigation is slow
  const navigationTimer = setTimeout(() => {
    navigating.value = true
  }, 150)
  
  // Pre-load route component (if available)
  try {
    await router.prefetch?.(event.target.href)
  } catch (error) {
    // Prefetch not available or failed
  }
  
  clearTimeout(navigationTimer)
  navigating.value = false
}

// Utility functions
const formatPrice = (price) => {
  return price ? `${price.toLocaleString('da-DK')} kr/måned` : 'Pris ikke tilgængelig'
}

const formatMileage = (mileage) => {
  return mileage ? `${mileage.toLocaleString()} km/år` : 'Km ikke angivet'
}

// Computed properties for enhanced animations
const cardClasses = computed(() => ({
  'scale-95 shadow-sm': isPressed.value
}))
</script>

<template>
  <!-- Enhanced Skeleton State with Realistic Content Structure -->
  <div 
    v-if="loading" 
    class="block"
  >
    <div class="card bg-base-100 shadow-md border border-base-300 rounded-lg overflow-hidden">
      <!-- Image skeleton with enhanced shimmer -->
      <figure class="relative rounded-t-lg overflow-hidden bg-base-200">
        <div class="w-full h-52 bg-base-300 relative overflow-hidden">
          <!-- Enhanced shimmer effect -->
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-base-100/30 to-transparent animate-shimmer"></div>
        </div>
      </figure>
      
      <!-- Smart title & variant skeleton -->
      <div class="px-5 pt-4" style="height: 64.75px;">
        <!-- Car make and model (realistic lengths) -->
        <div class="flex items-center space-x-2 mb-2">
          <div class="h-6 bg-base-300 rounded w-20 animate-pulse"></div> <!-- Make -->
          <div class="h-6 bg-base-300 rounded w-28 animate-pulse" style="animation-delay: 0.1s;"></div> <!-- Model -->
        </div>
        <!-- Variant -->
        <div class="h-4 bg-base-300 rounded w-36 animate-pulse" style="animation-delay: 0.2s;"></div>
      </div>

      <!-- Smart price skeleton -->
      <div class="px-5 pt-3" style="height: 58px;">
        <!-- Price components -->
        <div class="flex items-baseline space-x-1 mb-2">
          <div class="h-5 bg-base-300 rounded w-16 animate-pulse" style="animation-delay: 0.3s;"></div> <!-- Amount -->
          <div class="h-4 bg-base-300 rounded w-8 animate-pulse" style="animation-delay: 0.35s;"></div> <!-- kr -->
          <div class="h-4 bg-base-300 rounded w-12 animate-pulse" style="animation-delay: 0.4s;"></div> <!-- /måned -->
        </div>
        <!-- Secondary info -->
        <div class="h-3 bg-base-300 rounded w-full animate-pulse" style="animation-delay: 0.5s;"></div>
      </div>

      <!-- Divider -->
      <div class="border-t border-dashed border-base-300 mx-5 my-3"></div>

      <!-- Smart specs skeleton -->
      <div class="px-5 pb-5" style="height: 68px;">
        <div class="grid grid-cols-2 gap-y-2 text-sm">
          <div v-for="index in 4" :key="index" 
               class="flex items-center gap-2 animate-pulse"
               :style="`animation-delay: ${0.6 + index * 0.1}s;`">
            <div class="w-4 h-4 bg-base-300 rounded"></div>
            <div class="h-3 bg-base-300 rounded" :class="getRandomWidth()"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Enhanced Real Content State -->
  <RouterLink
    v-else-if="car && (car.id || car.listing_id)"
    :to="{ name: 'Listing', params: { id: car.id || car.listing_id } }"
    class="block group no-underline relative"
    @click="onCardClick"
  >
    <!-- Click ripple effect -->
    <div 
      v-if="showRipple"
      class="absolute inset-0 bg-primary/10 rounded-lg animate-ping z-20"
      style="animation-duration: 0.4s; animation-iteration-count: 1;"
    ></div>
    
    <!-- Loading overlay for slow navigation -->
    <div 
      v-if="navigating"
      class="absolute inset-0 bg-base-100/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-30"
    >
      <div class="loading loading-spinner loading-md text-primary"></div>
    </div>

    <!-- Enhanced card with original hover effects -->
    <div 
      class="card bg-base-100 shadow-md border border-base-300 hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-lg overflow-hidden"
      :class="cardClasses"
    >
      <!-- Progressive Image Loading with Enhanced Error States -->
      <figure class="relative rounded-t-lg overflow-hidden bg-base-200">
        <!-- Enhanced placeholder for missing images -->
        <div 
          v-if="!car.image"
          class="bg-base-200 aspect-video flex items-center justify-center text-base-content w-full h-52"
        >
          <div class="text-center">
            <Car class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <span class="text-sm">Billede mangler</span>
          </div>
        </div>
        
        <!-- Progressive image loading -->
        <template v-else-if="!imageError">
          <!-- Blurred thumbnail placeholder -->
          <div 
            v-if="car.thumbnail_base64 && !imageLoaded"
            class="absolute inset-0 z-10"
          >
            <img 
              :src="car.thumbnail_base64" 
              class="w-full h-52 object-cover blur-sm scale-105 transition-opacity duration-300"
              :class="{ 'opacity-0': imageLoaded }"
            />
          </div>
          
          <!-- Gradient placeholder if no thumbnail -->
          <div 
            v-else-if="!imageLoaded"
            class="absolute inset-0 bg-gradient-to-br from-base-200 to-base-300 animate-pulse z-10"
          />
          
          <!-- High-resolution image -->
          <img
            ref="imageRef"
            :src="car.image"
            :alt="`${car.make} ${car.model} ${car.variant} - ${car.fuel_type} - ${formatPrice(car.monthly_price)}`"
            class="w-full h-52 object-cover transition-opacity duration-500 ease-out"
            :class="{ 
              'opacity-0': !imageLoaded,
              'opacity-100': imageLoaded 
            }"
            loading="lazy"
          />
        </template>

        <!-- Enhanced error state with recovery actions -->
        <div 
          v-else 
          class="bg-base-200 h-52 flex flex-col items-center justify-center p-4"
        >
          <AlertCircle class="w-8 h-8 text-warning mb-2" />
          <p class="text-sm text-center mb-3 text-base-content">
            Billedet kunne ikke indlæses
          </p>
          <div class="flex gap-2">
            <button 
              @click.prevent="retryImage" 
              class="btn btn-sm btn-primary"
              :disabled="imageRetryCount >= maxRetries"
            >
              <RotateCcw class="w-4 h-4 mr-1" />
              {{ imageRetryCount >= maxRetries ? 'Max forsøg' : 'Prøv igen' }}
            </button>
            <button 
              @click.prevent="reportIssue" 
              class="btn btn-sm btn-ghost"
            >
              <Flag class="w-4 h-4 mr-1" />
              Rapportér
            </button>
          </div>
        </div>
        
        <!-- Original overlay gradient on hover -->
        <div class="absolute inset-0 bg-neutral/0 group-hover:bg-neutral/5 transition-all duration-300"></div>
      </figure>

      <!-- Enhanced Card Body Content -->
      <div class="card-body px-5 py-4">
        <!-- Enhanced Title & Variant -->
        <div class="pb-2">
          <h3 class="card-title text-lg font-bold text-primary leading-snug group-hover:text-primary/90 transition-colors duration-200">
            {{ car.make }} {{ car.model }}
          </h3>
          <p class="text-sm text-base-content mt-1">{{ car.variant }}</p>
        </div>

        <!-- Enhanced Price with original hover -->
        <div class="py-2">
          <p class="text-lg font-semibold text-primary group-hover:text-primary/90 transition-colors duration-200">
            {{ formatPrice(car.monthly_price) }}
          </p>
          <p class="text-xs text-base-content mt-0.5">
            {{ formatMileage(car.mileage_per_year) }}
            •
            {{ car.first_payment ? `Udbetaling: ${car.first_payment.toLocaleString()} kr` : 'Udbetaling ikke angivet' }}
          </p>
        </div>

        <!-- Divider -->
        <div class="divider my-3"></div>

        <!-- Enhanced Specs with original hover effects -->
        <div class="pt-2">
          <div class="grid grid-cols-2 gap-y-2 text-sm text-base-content">
            <div class="flex items-center gap-2 group-hover:text-base-content transition-colors duration-200">
              <Fuel class="w-4 h-4 text-base-content group-hover:text-base-content transition-colors duration-200" /> 
              {{ car.fuel_type || '–' }}
            </div>
            <div class="flex items-center gap-2 group-hover:text-base-content transition-colors duration-200">
              <Settings class="w-4 h-4 text-base-content group-hover:text-base-content transition-colors duration-200" /> 
              {{ car.transmission || '–' }}
            </div>
            <div class="flex items-center gap-2 group-hover:text-base-content transition-colors duration-200">
              <Car class="w-4 h-4 text-base-content group-hover:text-base-content transition-colors duration-200" /> 
              {{ car.body_type || '–' }}
            </div>
            <div class="flex items-center gap-2 group-hover:text-base-content transition-colors duration-200">
              <Gauge class="w-4 h-4 text-base-content group-hover:text-base-content transition-colors duration-200" /> 
              {{ car.horsepower ? `${car.horsepower} hk` : '–' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
/* Enhanced shimmer animation */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

/* Accessibility - Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .animate-shimmer,
  .animate-pulse,
  .animate-ping {
    animation: none;
  }
  
  .transition-all,
  .transition-colors,
  .transition-opacity {
    transition: none;
  }
}

/* Remove text underlines from RouterLink and all child elements */
a {
  text-decoration: none !important;
}

a * {
  text-decoration: none !important;
}

a:hover,
a:hover *,
a:focus,
a:focus * {
  text-decoration: none !important;
}

/* Enhanced focus states for accessibility */
a:focus-visible {
  outline: 2px solid rgb(var(--p) / 1);
  outline-offset: 2px;
  border-radius: 0.5rem;
}

/* Custom loading spinner enhancement */
.loading-spinner {
  border-color: transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
}
</style>
