<script setup>
import { ref } from 'vue'

const mobileMenuOpen = ref(false)
</script>

<template>
  <header class="bg-neutral shadow-sm">
    <div class="mx-auto w-full max-w-[1440px] px-6 flex items-center justify-between h-16"> <!-- Reduced from h-20 to h-16 -->
      <!-- Logo -->
      <router-link to="/" class="text-2xl font-bold text-primary">
        Leasingbørsen
      </router-link>

      <!-- Desktop menu -->
      <ul class="hidden lg:flex space-x-8 text-base">
        <li><router-link to="/" class="text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Home</router-link></li>
        <li><router-link to="/listings" class="text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Listings</router-link></li>
        <li><router-link to="/create" class="text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Opret</router-link></li>
        <li><router-link to="/about" class="text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Om</router-link></li>
      </ul>

      <!-- Mobile menu toggle -->
      <button class="lg:hidden btn btn-square btn-ghost" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="lg:hidden">
      <div class="mx-auto w-full max-w-[1440px] px-6">
        <ul class="bg-neutral w-full py-3 rounded-lg shadow-lg space-y-2 text-base">
          <li><router-link to="/" @click="mobileMenuOpen = false" class="block px-4 py-2 text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Home</router-link></li>
          <li><router-link to="/listings" @click="mobileMenuOpen = false" class="block px-4 py-2 text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Listings</router-link></li>
          <li><router-link to="/create" @click="mobileMenuOpen = false" class="block px-4 py-2 text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Opret</router-link></li>
          <li><router-link to="/about" @click="mobileMenuOpen = false" class="block px-4 py-2 text-primary font-semibold hover:underline hover:bg-transparent hover:text-primary transition">Om</router-link></li>
        </ul>
      </div>
    </div>
  </header>
</template>
