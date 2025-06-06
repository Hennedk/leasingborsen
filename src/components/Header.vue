<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { Filter, Palette } from 'lucide-vue-next'

const mobileMenuOpen = ref(false)
const scrollY = ref(0)

// Inject theme state from App.vue
const themeState = inject('theme')

if (!themeState) {
  console.error('Theme state not available! Make sure App.vue provides the theme.')
}

const currentTheme = themeState?.currentTheme || ref('light')
const setTheme = (theme) => {
  if (themeState?.setTheme) {
    themeState.setTheme(theme)
  } else {
    console.error('setTheme function not available!')
  }
}

const HEADER_HEIGHT = 64

// Available themes
const themes = [
  { value: 'light', label: '☀️ Light', description: 'Clean and bright' },
  { value: 'dark', label: '🌙 Dark', description: 'Dark and modern' },
  { value: 'corporate', label: '💼 Corporate', description: 'Professional blue' },
  { value: 'business', label: '🏢 Business', description: 'Clean business' },
  { value: 'synthwave', label: '🌈 Synthwave', description: 'Retro and colorful' },
  { value: 'cyberpunk', label: '🤖 Cyberpunk', description: 'Futuristic' },
  { value: 'fantasy', label: '🧚 Fantasy', description: 'Magical and pink' },
  { value: 'luxury', label: '✨ Luxury', description: 'Elegant and gold' },
]

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

// Get current theme display info
const currentThemeInfo = computed(() => 
  themes.find(t => t.value === currentTheme.value) || themes[0]
)
</script>

<template>
  <header 
    class="bg-base-100 shadow-sm sticky top-0 z-40"
    :class="headerClasses"
    :style="headerStyle"
  >
    <div class="mx-auto w-full max-w-[1440px] px-6 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/" class="text-2xl font-bold text-primary">
        Leasingbørsen
      </router-link>

      <!-- Desktop menu with theme switcher -->
      <div class="hidden lg:flex items-center space-x-8">
        <!-- Navigation -->
        <ul class="flex space-x-8 text-base">
          <li><router-link to="/listings" class="text-primary font-semibold hover:underline">Alle biler</router-link></li>
          <li><router-link to="/about" class="text-primary font-semibold hover:underline">Om Leasingbuddy</router-link></li>
        </ul>
        
        <!-- Theme Switcher Dropdown -->
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-2">
            <Palette class="w-4 h-4" />
            <span class="hidden sm:inline">{{ currentThemeInfo.label }}</span>
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow-xl border border-base-300">
            <li class="menu-title">
              <span class="text-base-content opacity-60">Choose Theme</span>
            </li>
            <li v-for="theme in themes" :key="theme.value">
              <a 
                @click="setTheme(theme.value)"
                :class="{ 'active': currentTheme === theme.value }"
                class="flex flex-col items-start gap-1 py-3"
              >
                <span class="font-semibold">{{ theme.label }}</span>
                <span class="text-xs opacity-60">{{ theme.description }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Mobile actions: menu + theme -->
      <div class="flex items-center gap-2 lg:hidden">
        <!-- Mobile Theme Switcher -->
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
            <Palette class="w-4 h-4" />
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-xl border border-base-300">
            <li v-for="theme in themes" :key="theme.value">
              <a 
                @click="setTheme(theme.value)"
                :class="{ 'active': currentTheme === theme.value }"
                class="text-sm"
              >
                {{ theme.label }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Menu Button -->
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
        <ul class="bg-base-100 w-full py-3 rounded-lg shadow-lg space-y-2 text-base">
          <li><router-link to="/listings" @click="mobileMenuOpen = false" class="block px-4 py-2">Alle biler</router-link></li>
          <li><router-link to="/about" @click="mobileMenuOpen = false" class="block px-4 py-2">Om Leasingbuddy</router-link></li>
        </ul>
      </div>
    </div>
  </header>
</template>