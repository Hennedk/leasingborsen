<template>
  <section :class="sectionClasses">
    <!-- Subtle top shadow/divider to separate from dark hero -->
    <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-base-300 to-transparent"></div>
    
    <!-- Section Header -->
    <div class="mb-6 lg:mb-8">
      <h2 class="text-2xl lg:text-3xl font-bold text-base-content mb-3">
        Populære kategorier
      </h2>
    </div>

    <!-- Category Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
      <div
        v-for="category in categories"
        :key="category.id"
        @click="navigateToCategory(category.filters)"
        class="group cursor-pointer w-full"
      >
        <div class="card bg-base-100 border border-base-300 rounded-xl p-4 lg:p-5 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:bg-base-200 focus-within:ring-2 focus-within:ring-primary/20">
          <!-- Icon -->
          <div class="flex justify-center mb-3">
            <div class="text-primary group-hover:scale-110 transition-transform duration-300">
              <component :is="category.icon" class="w-6 h-6 lg:w-7 lg:h-7" />
            </div>
          </div>
          
          <!-- Label -->
          <h3 class="font-semibold text-sm sm:text-base text-base-content group-hover:text-primary transition-colors duration-200 leading-tight">
            {{ category.label }}
          </h3>
          
          <!-- Subtitle -->
          <p class="text-xs text-base-content opacity-60 mt-1 leading-relaxed">
            {{ category.subtitle }}
          </p>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="text-center mt-8 lg:mt-12">
      <router-link 
        to="/listings" 
        class="inline-flex items-center text-primary hover:text-primary-focus font-medium transition-all duration-200 hover:gap-3 group"
      >
        Se alle biler
        <ChevronRight class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Zap, DollarSign, Users, Building, Settings, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  noTopPadding: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()

// Computed property for section classes
const sectionClasses = computed(() => {
  const baseClasses = 'relative'
  const paddingClasses = props.noTopPadding 
    ? 'pb-6 sm:pb-8' 
    : 'py-6 sm:py-8'
  
  return `${baseClasses} ${paddingClasses}`
})

// Category definitions with filters and styling
const categories = ref([
  {
    id: 'electric',
    label: 'Elbiler',
    subtitle: 'Miljøvenlige valg',
    icon: Zap,
    filters: {
      fuel_type: 'Electric'
    }
  },
  {
    id: 'cheap',
    label: 'Billige biler',
    subtitle: 'Under 2.000 kr./md',
    icon: DollarSign,
    filters: {
      price_max: 2000
    }
  },
  {
    id: 'family',
    label: 'Familiebiler',
    subtitle: 'SUV & Stationcars',
    icon: Users,
    filters: {
      body_type: 'SUV' // Note: We'll handle multiple types in the navigation
    }
  },
  {
    id: 'city',
    label: 'Bybiler',
    subtitle: 'Kompakte & smarte',
    icon: Building,
    filters: {
      body_type: 'Microcar'
    }
  },
  {
    id: 'automatic',
    label: 'Automatgear',
    subtitle: 'Nem kørsel',
    icon: Settings,
    filters: {
      transmission: 'Automatic'
    }
  }
])

// Navigation function
function navigateToCategory(filters) {
  // Handle special case for family cars (multiple body types)
  if (filters.body_type === 'SUV') {
    // For family cars, we'll just use SUV as the most common family car type
    // In a real implementation, you might want to handle multiple values
    router.push({ 
      path: '/listings', 
      query: { body_type: 'SUV' }
    })
    return
  }
  
  // Convert filters to query parameters
  const query = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query[key] = value
    }
  })
  
  router.push({ path: '/listings', query })
}
</script>

<style scoped>
/* Enhanced hover animations */
.group:hover .group-hover\:scale-110 {
  transform: scale(1.1);
}

/* Smooth card transitions */
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* CTA hover effect */
.group:hover .group-hover\:translate-x-1 {
  transform: translateX(0.25rem);
}

/* Ensure consistent card heights on mobile */
@media (max-width: 640px) {
  .grid > div {
    min-height: 120px;
  }
}

/* Focus states for accessibility */
.cursor-pointer:focus {
  outline: 0;
}

.cursor-pointer:focus-visible .card {
  ring: 2px;
  ring-color: hsl(var(--p) / 0.2);
  ring-offset: 2px;
}
</style> 