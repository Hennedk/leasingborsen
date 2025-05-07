<script setup>
import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'
</script>

<template>
  <div class="container mx-auto p-4">
    <header class="flex flex-col items-center lg:flex-row lg:justify-between mb-8">
      <img alt="Vue logo" class="w-32 h-32 mb-4 lg:mb-0" src="./assets/logo.svg" />
      <div class="flex-1 text-center lg:text-left lg:ml-8">
        <HelloWorld msg="Welcome to Your Vue.js App" />
      </div>
    </header>

    <main class="prose max-w-none">
      <TheWelcome />
    </main>
  </div>
</template>

<style scoped>
/* Any component-specific styles can go here */
</style>