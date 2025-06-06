<script setup>
import { ref, onMounted, provide, watch } from 'vue'

// Theme management
const currentTheme = ref('light')

// Provide theme state to all child components
provide('theme', {
  currentTheme,
  setTheme: (theme) => {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
  }
})

// Watch theme changes
watch(currentTheme, (newTheme) => {
  // Theme watcher without debug logging
}, { immediate: true })

// Initialize theme on mount
onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  currentTheme.value = savedTheme
})
</script>

<template>
  <div :data-theme="currentTheme" class="min-h-screen text-base-content bg-base-100">
    <div style="position: fixed; top: 0; right: 0; background: red; color: white; padding: 4px; z-index: 9999; font-size: 12px;">
      Current theme: {{ currentTheme }}
    </div>
    <router-view />
  </div>
</template>
