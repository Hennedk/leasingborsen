<script setup>
import { X } from 'lucide-vue-next'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  modalId: {
    type: String,
    required: true
  }
})

defineEmits(['close'])
</script>

<template>
  <!-- Enhanced DaisyUI 5 Modal -->
  <div v-if="isOpen" class="modal modal-open backdrop-blur-sm">
    <div class="modal-box relative shadow-2xl border border-base-300/20">
      <!-- Enhanced Close Button -->
      <button
        @click="$emit('close')"
        class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 hover:btn-error hover:scale-110 transition-all duration-200"
        aria-label="Close modal"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Modal Header -->
      <div v-if="$slots.title" class="mb-6">
        <slot name="title" />
      </div>

      <!-- Modal Content -->
      <div class="space-y-4">
        <slot />
      </div>

      <!-- Modal Footer -->
      <div v-if="$slots.footer" class="modal-action pt-6">
        <slot name="footer" />
      </div>
    </div>
    
    <!-- Enhanced backdrop click to close -->
    <div class="modal-backdrop" @click="$emit('close')"></div>
  </div>
</template>
