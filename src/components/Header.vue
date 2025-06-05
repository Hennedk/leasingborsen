<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Filter } from 'lucide-vue-next'

const mobileMenuOpen = ref(false)
const scrollY = ref(0)

const HEADER_HEIGHT = 64

// Initialize scroll position on mount
onMounted(() => {
  // Set initial scroll position
  scrollY.value = window.scrollY

  const handleScroll = () => {
    scrollY.value = window.scrollY
  }
  
  // Use passive listener for better performance
  window.addEventListener('scroll', handleScroll, { passive: true })
  
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  // Handle initial page load scroll position
  if (window.scrollY > 0) {
    scrollY.value = window.scrollY
  }
})

// Natural scroll progress (0 = visible, 1 = hidden)
const hideProgress = computed(() => {
  const progress = scrollY.value / HEADER_HEIGHT
  return Math.min(Math.max(progress, 0), 1)
})

// Check if header should be completely hidden
const isFullyHidden = computed(() => scrollY.value >= HEADER_HEIGHT)

// Dynamic header styling that follows natural scroll
const headerStyle = computed(() => {
  const currentPosition = -scrollY.value
  const progress = hideProgress.value
  
  return {
    transform: `translateY(${currentPosition}px)`,
    opacity: 1 - (progress * 0.3),
    transition: 'opacity 0.2s ease-out',
    willChange: 'transform',
    visibility: isFullyHidden.value ? 'hidden' : 'visible',
    pointerEvents: isFullyHidden.value ? 'none' : 'auto'
  }
})

// Dynamic z-index to ensure proper layering
const headerClasses = computed(() => ({
  'pointer-events-none': isFullyHidden.value,
  'invisible': isFullyHidden.value
}))
</script>

<template>
  <header 
    class="bg-card-bg shadow-sm sticky top-0 z-40"
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
        <li><router-link to="/listings" class="text-primary font-semibold hover:underline">Alle biler</router-link></li>
        <li><router-link to="/about" class="text-primary font-semibold hover:underline">Om Leasingbuddy</router-link></li>
      </ul>

      <!-- Mobile actions: menu + filter stacked for spacing -->
      <div class="flex flex-col items-center gap-2 lg:hidden">
        <!-- Menu Button: simple icon without background -->
        <button 
          class="p-2 text-primary hover:text-primary/70 transition-colors" 
          @click="mobileMenuOpen = !mobileMenuOpen"
          :disabled="isFullyHidden"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Menu - only show when header is visible and menu is open -->
    <div v-if="mobileMenuOpen && !isFullyHidden" class="lg:hidden">
      <div class="mx-auto w-full max-w-[1440px] px-6">
        <ul class="bg-card-bg w-full py-3 rounded-lg shadow-lg space-y-2 text-base">
          <li><router-link to="/listings" @click="mobileMenuOpen = false" class="block px-4 py-2">Alle biler</router-link></li>
          <li><router-link to="/about" @click="mobileMenuOpen = false" class="block px-4 py-2">Om Leasingbuddy</router-link></li>
        </ul>
      </div>
    </div>
  </header>
</template>