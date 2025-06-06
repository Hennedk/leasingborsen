<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Fuel, Settings, Car, Gauge } from 'lucide-vue-next'

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

const imageLoaded = ref(false)
const imageRef = ref(null)

onMounted(() => {
  // Only set up lazy loading if not in loading state and car exists
  if (!props.loading && props.car && imageRef.value) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.onload = () => {
            imageLoaded.value = true
          }
          observer.unobserve(img)
        }
      })
    }, { threshold: 0.1 })
    
    observer.observe(imageRef.value)
  }
})
</script>

<template>
  <!-- Skeleton State -->
  <div 
    v-if="loading" 
    class="block rounded-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 group no-underline"
  >
    <div class="card rounded-lg overflow-hidden">
      <!-- Image skeleton with shimmer -->
      <figure class="relative rounded-t-lg overflow-hidden bg-gray-100">
        <div class="w-full h-52 bg-gray-200 relative overflow-hidden">
          <!-- Shimmer effect -->
          <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      </figure>
      
      <!-- Title & Variant skeleton -->
      <div class="px-5 pt-4" style="height: 64.75px;">
        <div class="h-6 bg-gray-200 rounded w-3/4 leading-snug mb-1 animate-pulse"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2 animate-pulse" style="animation-delay: 0.1s;"></div>
      </div>

      <!-- Price skeleton -->
      <div class="px-5 pt-3" style="height: 58px;">
        <div class="h-6 bg-gray-200 rounded w-2/3 mb-1 animate-pulse" style="animation-delay: 0.2s;"></div>
        <div class="h-3 bg-gray-200 rounded w-full animate-pulse" style="animation-delay: 0.3s;"></div>
      </div>

      <!-- Divider -->
      <div class="border-t border-dashed border-base-300 mx-5 my-3"></div>

      <!-- Specs skeleton -->
      <div class="px-5 pb-5" style="height: 68px;">
        <div class="grid grid-cols-2 gap-y-2 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-gray-200 rounded animate-pulse" style="animation-delay: 0.4s;"></div>
            <div class="h-3 bg-gray-200 rounded w-12 animate-pulse" style="animation-delay: 0.5s;"></div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-gray-200 rounded animate-pulse" style="animation-delay: 0.6s;"></div>
            <div class="h-3 bg-gray-200 rounded w-16 animate-pulse" style="animation-delay: 0.7s;"></div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-gray-200 rounded animate-pulse" style="animation-delay: 0.8s;"></div>
            <div class="h-3 bg-gray-200 rounded w-10 animate-pulse" style="animation-delay: 0.9s;"></div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-gray-200 rounded animate-pulse" style="animation-delay: 1.0s;"></div>
            <div class="h-3 bg-gray-200 rounded w-14 animate-pulse" style="animation-delay: 1.1s;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Real Content State -->
  <RouterLink
    v-else-if="car && (car.id || car.listing_id)"
    :to="{ name: 'Listing', params: { id: car.id || car.listing_id } }"
    class="block rounded-lg hover:shadow-xl transition-all duration-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 group no-underline"
  >
    <div class="card rounded-lg overflow-hidden">
      <!-- Image with lazy loading and blur-up effect -->
      <figure class="relative rounded-t-lg overflow-hidden bg-gray-100">
        <!-- Blur placeholder -->
        <div 
          v-if="!imageLoaded"
          class="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
        />
        
        <img
          ref="imageRef"
          :data-src="car.image || '/placeholder.jpg'"
          :alt="`${car.make} ${car.model}`"
          class="w-full h-52 object-cover transition-opacity duration-500 ease-out"
          :class="{ 
            'opacity-0': !imageLoaded,
            'opacity-100': imageLoaded 
          }"
          loading="lazy"
        />
        
        <!-- Overlay gradient on hover -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300"></div>
      </figure>

      <!-- Title & Variant -->
      <div class="px-5 pt-4">
        <h3 class="text-lg font-bold text-primary leading-snug group-hover:text-primary/90 transition-colors duration-200">
          {{ car.make }} {{ car.model }}
        </h3>
        <p class="text-sm text-base-content/60 mt-1">{{ car.variant }}</p>
      </div>

      <!-- Price -->
      <div class="px-5 pt-3">
        <p class="text-lg font-semibold text-primary group-hover:text-primary/90 transition-colors duration-200">
          {{ car.monthly_price ? `${car.monthly_price.toLocaleString('da-DK')} kr. / måned` : 'Pris ikke tilgængelig' }}
        </p>
        <p class="text-xs text-base-content/50 mt-0.5">
          {{ car.mileage_per_year ? `${car.mileage_per_year.toLocaleString()} km/år` : 'Km ikke angivet' }}
          •
          {{ car.first_payment ? `Udbetaling: ${car.first_payment.toLocaleString()} kr` : 'Udbetaling ikke angivet' }}
        </p>
      </div>

      <!-- Divider -->
      <div class="border-t border-dashed border-base-300 mx-5 my-3 group-hover:border-base-400 transition-colors duration-200"></div>

      <!-- Specs -->
      <div class="px-5 pb-5">
        <div class="grid grid-cols-2 gap-y-2 text-sm text-base-content/60">
          <div class="flex items-center gap-2 group-hover:text-base-content/80 transition-colors duration-200">
            <Fuel class="w-4 h-4 text-base-content/50 group-hover:text-base-content/70 transition-colors duration-200" /> 
            {{ car.fuel_type || '–' }}
          </div>
          <div class="flex items-center gap-2 group-hover:text-base-content/80 transition-colors duration-200">
            <Settings class="w-4 h-4 text-base-content/50 group-hover:text-base-content/70 transition-colors duration-200" /> 
            {{ car.transmission || '–' }}
          </div>
          <div class="flex items-center gap-2 group-hover:text-base-content/80 transition-colors duration-200">
            <Car class="w-4 h-4 text-base-content/50 group-hover:text-base-content/70 transition-colors duration-200" /> 
            {{ car.body_type || '–' }}
          </div>
          <div class="flex items-center gap-2 group-hover:text-base-content/80 transition-colors duration-200">
            <Gauge class="w-4 h-4 text-base-content/50 group-hover:text-base-content/70 transition-colors duration-200" /> 
            {{ car.horsepower ? `${car.horsepower} hk` : '–' }}
          </div>
        </div>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
/* Custom shimmer animation */
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
</style>
