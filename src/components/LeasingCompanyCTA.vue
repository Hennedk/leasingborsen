<script setup>
import { ExternalLink, Building2, Phone, Mail } from 'lucide-vue-next'

defineProps({
  seller: {
    type: Object,
    default: () => ({
      name: 'Leasingselskab A/S',
      website: 'https://example.com',
      phone: '+45 12 34 56 78',
      email: 'kontakt@leasingselskab.dk',
      description: 'Professionel leasingudbyder med over 10 års erfaring'
    })
  }
})
</script>

<template>
  <div class="card bg-base-100 shadow-md">
    <div class="card-body p-6 space-y-4">
      <!-- Seller Header -->
      <div class="flex items-center gap-3 pb-3 border-b border-base-300">
        <Building2 class="w-5 h-5 text-primary" />
        <div class="flex-1">
          <h3 class="card-title text-base font-semibold">{{ seller.name }}</h3>
          <p v-if="seller.description" class="text-sm text-base-content opacity-70">
            {{ seller.description }}
          </p>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="space-y-2">
        <div v-if="seller.phone" class="flex items-center gap-2 text-sm text-base-content opacity-70">
          <Phone class="w-4 h-4 flex-shrink-0" />
          <span>{{ seller.phone }}</span>
        </div>
        <div v-if="seller.email" class="flex items-center gap-2 text-sm text-base-content opacity-70">
          <Mail class="w-4 h-4 flex-shrink-0" />
          <span>{{ seller.email }}</span>
        </div>
      </div>

      <!-- CTA Button -->
      <div class="card-actions justify-stretch pt-2">
        <a 
          :href="seller.website" 
          target="_blank" 
          rel="noopener noreferrer"
          class="btn btn-secondary btn-sm w-full gap-2"
        >
          <ExternalLink class="w-4 h-4" />
          Se tilbud hos leasingselskab
        </a>
      </div>
    </div>
  </div>
</template> 