<script setup>
import Header from './Header.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-base-200">
    <!-- Header -->
    <Header />

    <!-- Main content -->
    <main class="flex-1 w-full py-6">
      <div class="mx-auto w-full max-w-[1440px] px-4 md:px-16">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer footer-center p-4 bg-base-300 text-base-content">
      <div class="mx-auto w-full max-w-[1440px] px-4 md:px-16">
        <p>© 2025 Leasingbørsen</p>
      </div>
    </footer>
  </div>
</template>