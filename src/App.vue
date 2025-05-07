
<script setup>
import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-base-200">
    <!-- 🔹 Header -->
    <header class="navbar bg-base-100 shadow">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl">Leasingbørsen</a>
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal px-1 hidden sm:flex">
          <li><a>Browse</a></li>
          <li><a>List a Car</a></li>
          <li><a>Contact</a></li>
        </ul>
        <button class="btn btn-primary btn-sm sm:hidden">Menu</button>
      </div>
    </header>

    <!-- 🔸 Main Content -->
    <main class="flex-1 container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-4">Welcome to Leasingbørsen</h1>
      <p class="text-gray-600 mb-8">Find or list lease takeovers with ease.</p>

      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div class="card bg-base-100 shadow-md">
          <div class="card-body">
            <h2 class="card-title">VW ID.4</h2>
            <p>3.200 kr/md – 18 mdr. tilbage</p>
            <div class="card-actions justify-end">
              <button class="btn btn-sm btn-primary">Se mere</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 🔻 Footer -->
    <footer class="footer footer-center p-4 bg-base-300 text-base-content">
      <aside>
        <p>© 2025 Leasingbørsen — Built with DaisyUI</p>
      </aside>
    </footer>
  </div>
</template>

<style>
/* Optional: global custom styles */
</style>
