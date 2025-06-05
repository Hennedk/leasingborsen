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
    console.log('🔍 Fetching latest listings...')
    
    // Fetch from the same table other components use, without created_at ordering
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .limit(4)  // Just get 4 records without ordering

    console.log('📊 Supabase response:', { data, error })
    console.log('📊 Raw data array:', data)
    console.log('📊 Data length:', data?.length)

    if (!error && data) {
      console.log('🔍 Before filtering - raw data:', data)
      console.log('🔍 First item structure:', data[0])
      console.log('🔍 First item keys:', Object.keys(data[0] || {}))
      console.log('🔍 Looking for ID fields:', {
        id: data[0]?.id,
        listing_id: data[0]?.listing_id, 
        car_id: data[0]?.car_id,
        vehicle_id: data[0]?.vehicle_id
      })
      
      // Use listing_id which is the correct field name
      latestListings.value = data.filter(listing => {
        console.log('🔍 Checking listing:', listing, 'Has listing_id?', !!listing?.listing_id)
        return listing && listing.listing_id
      })
      
      console.log('✅ After filtering - count:', latestListings.value.length)
      console.log('✅ Filtered listings:', latestListings.value)
    } else {
      console.error('❌ Error fetching data:', error)
    }
  } catch (err) {
    console.error('💥 Exception during fetch:', err)
  } finally {
    console.log('🏁 Setting loading to false. Final latestListings:', latestListings.value)
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col text-base-content bg-neutral" data-theme="carwow">
    <!-- Header (needs to be outside BaseLayout to not create nested headers) -->
    <Header />
    
    <!-- Hero section with search - FULL WIDTH -->
    <HeroBanner />

    <!-- Main content area - constrained by container with generous spacing after hero -->
    <main class="flex-1 w-full pb-6 pt-12 sm:pt-16">
      <div class="mx-auto w-full max-w-[1440px] px-6">
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
    </main>

    <!-- Footer -->
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
