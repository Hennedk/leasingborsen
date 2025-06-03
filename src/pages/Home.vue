<script setup>
import BaseLayout from '../components/BaseLayout.vue'
import HeroBanner from '../components/HeroBanner.vue'
import PopularCategories from '../components/PopularCategories.vue'
import CarListingGrid from '../components/CarListingGrid.vue'
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import Header from '../components/Header.vue'

const latestListings = ref([])

onMounted(async () => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(4)

    if (!error && data) {
      // Filter out any listings without proper id
      latestListings.value = data.filter(listing => listing && listing.id)
    }
  } catch (err) {
    console.error('Error fetching latest listings:', err)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-base-content bg-neutral" data-theme="carwow">
    <!-- Header (manually included since HeroBanner is outside BaseLayout) -->
    <Header />
    
    <!-- Hero section with search - FULL WIDTH -->
    <HeroBanner />

    <!-- Popular Categories section -->
    <PopularCategories />

    <!-- Main content wrapped in BaseLayout structure -->
    <main class="flex-1 w-full pb-6">
      <div class="mx-auto w-full max-w-[1440px] px-6">
        <!-- Dynamic car grid -->
        <CarListingGrid
          title="Nyeste leasingbiler"
          :cars="latestListings"
        />
      </div>
    </main>

    <!-- Footer (manually included) -->
    <footer class="footer p-6 bg-neutral text-neutral-content">
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
