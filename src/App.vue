<script setup>
import { ref, onMounted, provide, watch } from 'vue'

// Theme management
const currentTheme = ref('light')

// Provide theme state to all child components
provide('theme', {
  currentTheme,
  setTheme: (theme) => {
    console.log('Setting theme to:', theme)
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
    console.log('Theme updated, currentTheme.value is now:', currentTheme.value)
  }
})

// Watch theme changes for debugging
watch(currentTheme, (newTheme) => {
  console.log('Theme changed to:', newTheme)
}, { immediate: true })

// Initialize theme on mount
onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  console.log('Initializing theme:', savedTheme)
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
