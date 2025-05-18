<script setup>
import Header from './Header.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-base-200">
    <!-- Header -->
    <Header />

    <!-- Main content -->
    <main class="flex-1 w-full py-6">
      <div class="mx-auto w-full max-w-[1600px] px-2 sm:px-12">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer footer-center p-4 bg-base-300 text-base-content px-2 sm:px-12">
      <aside>
        <p>© 2025 Leasingbørsen</p>
      </aside>
    </footer>
  </div>
</template>
