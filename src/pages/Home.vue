<script setup>
import BaseLayout from '../components/BaseLayout.vue'
import HeroBanner from '../components/HeroBanner.vue'
import PopularCategories from '../components/PopularCategories.vue'
import CarListingGrid from '../components/CarListingGrid.vue'
import Header from '../components/Header.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const latestListings = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    // Fetch from the same table other components use, without created_at ordering
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .limit(4)  // Just get 4 records without ordering

    if (!error && data) {
      // Use listing_id which is the correct field name
      latestListings.value = data.filter(listing => {
        return listing && listing.listing_id
      })
    } else {
      console.error('❌ Error fetching data:', error)
    }
  } catch (err) {
    console.error('💥 Exception during fetch:', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- Custom layout for home page with full-width hero -->
  <div class="min-h-screen flex flex-col text-base-content bg-base-200">
    <!-- Header -->
    <Header />
    
    <!-- Hero section - Full width outside of container -->
    <HeroBanner />

    <!-- Main content with container -->
    <main class="flex-1 w-full pb-6">
      <div class="mx-auto w-full max-w-[1440px] px-6">
        <!-- Main content sections with proper spacing -->
        <div class="space-y-12 pt-12 sm:pt-16">
    <!-- Popular Categories section -->
          <PopularCategories :no-top-padding="true" />

          <!-- Latest Cars section - uses dynamic context -->
    <CarListingGrid
      :cars="latestListings"
      :loading="loading"
            context="newest"
      :show-cta="true"
            :use-container="false"
    />
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer md:footer-horizontal p-6 bg-neutral text-neutral-content">
      <div class="mx-auto w-full max-w-[1440px] px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm">© 2025 Leasingbørsen | Inspired by Carwow</p>
        <div class="flex gap-6 text-sm">
          <a href="#" class="hover:text-accent transition">About Us</a>
          <a href="#" class="hover:text-accent transition">Privacy</a>
          <a href="#" class="hover:text-accent transition">Terms</a>
        </div>
      </div>
    </footer>
  </div>
</template>
