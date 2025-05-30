<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Filter } from 'lucide-vue-next'

const mobileMenuOpen = ref(false)
const scrollY = ref(0)

// Match the transition distance from Listings.vue
const TRANSITION_DISTANCE = 80
const HEADER_HEIGHT = 64

onMounted(() => {
  const handleScroll = () => {
    scrollY.value = window.scrollY
  }
  // Use passive listener for better performance
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })
})

// Smooth transition progress (0 = fully visible, 1 = fully hidden)
const hideProgress = computed(() => {
  return Math.min(Math.max(scrollY.value / TRANSITION_DISTANCE, 0), 1)
})

// Check if header should be completely hidden
const isFullyHidden = computed(() => scrollY.value >= TRANSITION_DISTANCE)

// Dynamic header styling for smooth transition
const headerStyle = computed(() => {
  const progress = hideProgress.value
  
  return {
    transform: `translateY(-${progress * 100}%)`,
    opacity: 1 - (progress * 0.3), // Subtle opacity fade
    transition: scrollY.value < 10 ? 'none' : 'opacity 0.3s ease-out', // Only animate opacity
  }
})

// Dynamic z-index to ensure proper layering
const headerClasses = computed(() => ({
  'pointer-events-none': isFullyHidden.value, // Disable interactions when hidden
}))
</script>

<template>
  <header 
    class="bg-neutral shadow-sm sticky top-0 z-40"
    :class="headerClasses"
    :style="headerStyle"
  >
    <div class="mx-auto w-full max-w-[1440px] px-6 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/" class="text-2xl font-bold text-primary">
        Leasingbørsen
      </router-link>

      <!-- Desktop menu -->
      <ul class="hidden lg:flex space-x-8 text-base">
        <li><router-link to="/" class="text-primary font-semibold hover:underline">Home</router-link></li>
        <li><router-link to="/listings" class="text-primary font-semibold hover:underline">Listings</router-link></li>
        <li><router-link to="/create" class="text-primary font-semibold hover:underline">Opret</router-link></li>
        <li><router-link to="/about" class="text-primary font-semibold hover:underline">Om</router-link></li>
      </ul>

      <!-- Mobile actions: menu + filter stacked for spacing -->
      <div class="flex flex-col items-center gap-2 lg:hidden">
        <!-- Menu Button: less prominent -->
        <button 
          class="btn btn-outline btn-sm rounded-full" 
          @click="mobileMenuOpen = !mobileMenuOpen"
          :disabled="isFullyHidden"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu - only show when header is visible and menu is open -->
    <div v-if="mobileMenuOpen && !isFullyHidden" class="lg:hidden">
      <div class="mx-auto w-full max-w-[1440px] px-6">
        <ul class="bg-neutral w-full py-3 rounded-lg shadow-lg space-y-2 text-base">
          <li><router-link to="/" @click="mobileMenuOpen = false" class="block px-4 py-2">Home</router-link></li>
          <li><router-link to="/listings" @click="mobileMenuOpen = false" class="block px-4 py-2">Listings</router-link></li>
          <li><router-link to="/create" @click="mobileMenuOpen = false" class="block px-4 py-2">Opret</router-link></li>
          <li><router-link to="/about" @click="mobileMenuOpen = false" class="block px-4 py-2">Om</router-link></li>
        </ul>
      </div>
    </div>
  </header>
</template>