<script setup>
import { ref } from 'vue'

const mobileMenuOpen = ref(false)
</script>

<template>
  <header class="bg-base-100 shadow">
    <div class="mx-auto w-full max-w-[1440px] flex items-center justify-between h-16">
      <div class="w-full px-4 md:px-16 flex items-center justify-between">
        <!-- Logo -->
        <router-link to="/" class="text-xl uppercase font-medium">Leasingbørsen</router-link>

        <!-- Desktop menu -->
        <ul class="hidden lg:flex space-x-6">
          <li><router-link to="/" class="hover:text-primary">Home</router-link></li>
          <li><router-link to="/listings" class="hover:text-primary">Listings</router-link></li>
          <li><router-link to="/create" class="hover:text-primary">Opret</router-link></li>
          <li><router-link to="/about" class="hover:text-primary">Om</router-link></li>
        </ul>

        <!-- Mobile toggle -->
        <button class="lg:hidden btn btn-square btn-ghost" @click="mobileMenuOpen = !mobileMenuOpen">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="lg:hidden">
      <div class="mx-auto w-full max-w-[1440px]">
        <div class="px-4 md:px-16 pb-4">
          <ul class="bg-base-100 w-full py-2 rounded-box space-y-2">
            <li><router-link to="/" @click="mobileMenuOpen = false" class="block px-4 py-2 hover:bg-base-200">Home</router-link></li>
            <li><router-link to="/listings" @click="mobileMenuOpen = false" class="block px-4 py-2 hover:bg-base-200">Listings</router-link></li>
            <li><router-link to="/create" @click="mobileMenuOpen = false" class="block px-4 py-2 hover:bg-base-200">Opret</router-link></li>
            <li><router-link to="/about" @click="mobileMenuOpen = false" class="block px-4 py-2 hover:bg-base-200">Om</router-link></li>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>