<template>
  <div class="min-h-screen flex flex-col bg-base-200">
    <!-- Header -->
    <header class="navbar bg-base-100 shadow px-4">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl">Leasingbørsen</a>
      </div>
      <div class="flex-none">
        <ul class="menu menu-horizontal px-1">
          <li><a>Home</a></li>
        </ul>
      </div>
    </header>

    <!-- Main Content Slot -->
    <main class="flex-1 container mx-auto px-4 py-6">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="footer footer-center p-4 bg-base-300 text-base-content">
      <aside>
        <p>© 2025 Leasingbørsen</p>
      </aside>
    </footer>
  </div>
</template>
