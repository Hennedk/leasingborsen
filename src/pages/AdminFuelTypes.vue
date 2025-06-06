<script setup>
import { ref } from 'vue'

const pageTitle = ref('Brændstoffer')
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="breadcrumbs text-sm mb-6 px-4 lg:px-6">
      <ul>
        <li><a href="/" class="text-base-content/70 hover:text-primary">Hjem</a></li>
        <li><a href="/admin" class="text-base-content/70 hover:text-primary">Admin</a></li>
        <li class="text-base-content font-medium">{{ pageTitle }}</li>
      </ul>
    </div>

    <div class="flex justify-between items-center mb-6 px-4 lg:px-6">
      <h1 class="text-3xl font-bold text-base-content">{{ pageTitle }}</h1>
    </div>

    <div class="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden mx-4 lg:mx-6">
      <div class="p-16 text-center">
        <div class="w-24 h-24 mx-auto mb-6 bg-base-200 rounded-2xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-base-content/40">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-base-content mb-2">{{ pageTitle }} administration</h3>
        <p class="text-base-content/60 mb-6 max-w-md mx-auto">Denne side er under udvikling og vil snart være tilgængelig.</p>
        <div class="badge badge-warning">Kommer snart</div>
      </div>
    </div>
  </div>
</template> 