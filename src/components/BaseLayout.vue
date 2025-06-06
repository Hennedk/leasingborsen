<script setup>
import { ref } from 'vue'
import Header from './Header.vue'
import MobileFilterOverlay from './MobileFilterOverlay.vue'

const showMobileFilter = ref(false)

const props = defineProps({
  background: {
    type: String,
    default: 'bg-base-200'
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-base-content" :class="props.background">
    
    <!-- Header with event to toggle mobile filter -->
    <Header @toggleMobileFilter="showMobileFilter = true" />

    <!-- Main content -->
    <main class="flex-1 w-full pb-6">
      <div class="mx-auto w-full max-w-[1440px] px-6">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer md:footer-horizontal p-6 bg-neutral text-neutral-content">
      <div class="mx-auto w-full max-w-[1440px] px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm">© 2025 Leasingbørsen | Inspired by Carwow</p>
        <div class="flex gap-6 text-sm">
          <a href="#" class="hover:text-accent transition">About Us</a>
          <a href="#" class="hover:text-accent transition">Privacy</a>
          <a href="#" class="hover:text-accent transition">Terms</a>
        </div>
      </div>
    </footer>

    <!-- 📱 Mobile Filter Overlay (globally accessible) -->
    <MobileFilterOverlay v-show="showMobileFilter" @close="showMobileFilter = false" />
  </div>
</template>
