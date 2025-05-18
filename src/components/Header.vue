<script setup>
import { ref } from 'vue'

const mobileMenuOpen = ref(false)
</script>

<template>
  <header class="bg-base-100 shadow">
    <div class="mx-auto w-full max-w-[1440px] px-4 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/" class="btn btn-ghost text-xl">Leasingbørsen</router-link>

      <!-- Desktop menu -->
      <ul class="hidden lg:flex menu menu-horizontal px-1">
        <li><router-link to="/">Home</router-link></li>
        <li><router-link to="/listings">Listings</router-link></li>
        <li><router-link to="/create">Opret</router-link></li>
        <li><router-link to="/about">Om</router-link></li>
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

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="lg:hidden px-4 pb-4">
      <ul class="menu bg-base-100 w-full rounded-box">
        <li><router-link to="/" @click="mobileMenuOpen = false">Home</router-link></li>
        <li><router-link to="/listings" @click="mobileMenuOpen = false">Listings</router-link></li>
        <li><router-link to="/create" @click="mobileMenuOpen = false">Opret</router-link></li>
        <li><router-link to="/about" @click="mobileMenuOpen = false">Om</router-link></li>
      </ul>
    </div>
  </header>
</template>
