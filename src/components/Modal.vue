<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  modalId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const dialogRef = ref(null)

// Watch for isOpen changes to control dialog
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
})

// Handle dialog close event
const handleClose = () => {
  emit('close')
}

// Handle close button click
const handleCloseClick = (e) => {
  e.preventDefault()
  e.stopPropagation()
  handleClose()
}
</script>

<template>
  <dialog :id="modalId" ref="dialogRef" class="modal" @close="handleClose">
    <div class="modal-box space-y-4 max-w-md relative">
      <!-- Close button with specific overrides -->
      <button
        @click="handleCloseClick"
        class="modal-close-btn"
        aria-label="Luk"
        type="button"
      >
        ✕
      </button>

      <!-- Modal title -->
      <div v-if="title || $slots.title">
        <slot name="title">
          <h3 class="text-lg font-bold">{{ title }}</h3>
        </slot>
      </div>

      <!-- Modal content -->
      <div>
        <slot />
      </div>

      <!-- Modal footer -->
      <div v-if="$slots.footer">
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.modal-close-btn {
  @apply absolute right-2 top-2 z-10;
  @apply w-8 h-8 rounded-full flex items-center justify-center;
  @apply bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-700;
  @apply transition-colors duration-200 cursor-pointer;

  font-size: 20px;
  line-height: 1;
  font-weight: normal;
}
</style>
