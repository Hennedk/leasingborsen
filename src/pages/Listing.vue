<template>
  <BaseLayout>
    <!-- Loading State for Main Content -->
    <div v-if="loadingListing" class="w-full py-6 sm:py-8 relative flex flex-col-reverse lg:grid lg:grid-cols-[2fr_1fr] gap-8">
      <!-- Left Column Skeleton -->
      <div class="space-y-6 mt-6 lg:mt-0">
        <!-- Gallery Skeleton -->
        <div class="animate-pulse">
          <div class="bg-base-300 rounded-xl w-full h-64 sm:h-80 lg:h-96"></div>
          <div class="h-3 bg-base-300 rounded w-32 mt-2"></div>
        </div>
        
        <!-- Details Skeleton -->
        <div class="animate-pulse space-y-4">
          <div class="h-6 bg-base-300 rounded w-24"></div>
          <div class="space-y-2">
            <div class="h-4 bg-base-300 rounded w-full"></div>
            <div class="h-4 bg-base-300 rounded w-full"></div>
            <div class="h-4 bg-base-300 rounded w-3/4"></div>
          </div>
        </div>
        
        <!-- Specs Skeleton -->
        <div class="animate-pulse space-y-4">
          <div class="h-6 bg-base-300 rounded w-32"></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="h-4 bg-base-300 rounded"></div>
            <div class="h-4 bg-base-300 rounded"></div>
            <div class="h-4 bg-base-300 rounded"></div>
            <div class="h-4 bg-base-300 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Right Column Skeleton -->
      <div class="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <!-- Header Skeleton -->
        <div class="animate-pulse space-y-4">
          <div class="h-8 bg-base-300 rounded w-3/4"></div>
          <div class="h-4 bg-base-300 rounded w-1/2"></div>
          <div class="flex gap-2">
            <div class="h-6 bg-base-300 rounded-full w-16"></div>
            <div class="h-6 bg-base-300 rounded-full w-12"></div>
            <div class="h-6 bg-base-300 rounded-full w-20"></div>
          </div>
        </div>
        
        <!-- Pricing Skeleton -->
        <div class="animate-pulse space-y-4 p-6 bg-base-200 rounded-lg">
          <div class="h-8 bg-base-300 rounded w-32"></div>
          <div class="h-6 bg-base-300 rounded w-24"></div>
          <div class="h-10 bg-base-300 rounded w-full"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="w-full py-6 sm:py-8 text-center">
      <div class="max-w-md mx-auto">
        <div class="text-error mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-base-content mb-2">Kunne ikke indlæse annonce</h2>
        <p class="text-base-content opacity-70 mb-4">{{ error }}</p>
        <button @click="retryLoad" class="btn btn-primary">
          Prøv igen
        </button>
      </div>
    </div>

    <!-- Main Content (Loaded) -->
    <div v-else class="w-full py-6 sm:py-8 relative flex flex-col-reverse lg:grid lg:grid-cols-[2fr_1fr] gap-8">
      <!-- Left Column -->
      <div class="space-y-6 mt-6 lg:mt-0">
        <ListingGallery :image="listing.image" :make="listing.make" :model="listing.model" />
        <ListingDetails :details="listing.details" />
        <ListingSpecs :listing="listing" />
      </div>

      <!-- Right Column -->
      <div class="space-y-6 lg:sticky lg:top-4 lg:self-start">
        <ListingHeader
          :make="listing.make"
          :model="listing.model"
          :variant="listing.variant"
          :transmission="listing.transmission"
          :bodyType="listing.body_type"
          :fuelType="listing.fuel_type"
          :horsepower="listing.horsepower"
        />
        <ListingPricing
          :leaseOptions="leaseOptions"
        />
      </div>
    </div>

    <!-- Similar Cars Section - Show during loading and when cars exist -->
    <div v-if="!loadingListing && (loadingSimilarCars || similarCars.length > 0)" class="mt-16 transition-all duration-500 ease-in-out">
      <!-- Optional divider for visual separation -->
      <hr class="my-8 border-base-300" />
      
      <!-- CarListingGrid with dynamic context handles its own header -->
      <CarListingGrid 
        :cars="similarCars" 
        :loading="loadingSimilarCars"
        context="similar"
        :context-data="{ baseCar: { make: listing.make, model: listing.model } }"
        :show-cta="false"
        :skeleton-count="4"
        :use-container="false"
      />
      
      <!-- Loading message (optional) -->
      <div v-if="loadingSimilarCars && similarCars.length === 0" class="text-center py-4">
        <p class="text-sm text-base-content opacity-60 animate-pulse">Finder lignende biler...</p>
      </div>
    </div>

    <!-- Subtle ID Reference at bottom -->
    <div v-if="!loadingListing && !error" class="text-center py-4 mt-8">
      <p class="text-xs text-base-content opacity-40 text-center mt-6">
        Listing ID: {{ listing.listing_id || '12345' }}
      </p>
    </div>
  </BaseLayout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

import BaseLayout from '../components/BaseLayout.vue'
import ListingGallery from '../components/ListingGallery.vue'
import ListingSpecs from '../components/ListingSpecs.vue'
import ListingHeader from '../components/ListingHeader.vue'
import ListingPricing from '../components/ListingPricing.vue'
import ListingDetails from '../components/ListingDetails.vue'
import CarListingGrid from '../components/CarListingGrid.vue'

const route = useRoute()
const listing = ref({})
const similarCars = ref([])
const loadingSimilarCars = ref(false)
const loadingListing = ref(true)
const error = ref(null)

// Mock data for testing similar cars component
const mockSimilarCars = [
  // Tier 1: Exact matches (same make & model)
  {
    listing_id: 'mock-1',
    make: 'BMW',
    model: '3 Series',
    variant: '320d xDrive',
    body_type: 'Sedan',
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    horsepower: 190,
    monthly_price: 4200,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 0,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400',
    matchLevel: 'exact',
    matchWeight: 100,
    matchReason: 'Same make & model'
  },
  {
    listing_id: 'mock-2',
    make: 'BMW',
    model: '3 Series',
    variant: '330i',
    body_type: 'Sedan',
    fuel_type: 'Petrol',
    transmission: 'Automatic',
    horsepower: 258,
    monthly_price: 4800,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 0,
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400',
    matchLevel: 'exact',
    matchWeight: 100,
    matchReason: 'Same make & model'
  },
  // Tier 2: Same body type
  {
    listing_id: 'mock-3',
    make: 'Audi',
    model: 'A4',
    variant: '2.0 TDI',
    body_type: 'Sedan',
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    horsepower: 190,
    monthly_price: 4300,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 0,
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400',
    matchLevel: 'bodyType',
    matchWeight: 80,
    matchReason: 'Same body type'
  },
  // Tier 3: Same make & body type
  {
    listing_id: 'mock-4',
    make: 'BMW',
    model: '5 Series',
    variant: '520d',
    body_type: 'Sedan',
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    horsepower: 190,
    monthly_price: 5200,
    mileage_per_year: 15000,
    period_months: 36,
    first_payment: 0,
    image: 'https://images.unsplash.com/photo-1551830820-330a71b90771?w=400',
    matchLevel: 'makeBodyType',
    matchWeight: 60,
    matchReason: 'Same make & body type'
  }
]

// Flag to use mock data for testing
const useMockData = ref(true) // Set to false to use real database queries

// Computed property to create leaseOptions array from listing data
const leaseOptions = computed(() => {
  if (!listing.value || !listing.value.monthly_price) {
    return []
  }
  
  // Create a single lease option from the listing data
  return [{
    monthly_price: listing.value.monthly_price,
    mileage_per_year: listing.value.mileage_per_year || 15000,
    period_months: listing.value.period_months || 36,
    first_payment: listing.value.first_payment || 0
  }]
})

// Fetch similar cars with tiered fallback logic
const fetchSimilarCars = async (currentListing) => {
  if (!currentListing.listing_id || !currentListing.monthly_price) return

  loadingSimilarCars.value = true

  try {
    // Use mock data for testing
    if (useMockData.value) {
      console.log('Using mock data for similar cars testing')
      
      // Simulate loading delay with minimum 800ms for smooth skeleton transition
      await new Promise(resolve => setTimeout(resolve, 800))
      
      similarCars.value = mockSimilarCars
      
      console.log('Mock similar cars loaded:', {
        totalFound: similarCars.value.length,
        breakdown: similarCars.value.reduce((acc, car) => {
          acc[car.matchLevel] = (acc[car.matchLevel] || 0) + 1
          return acc
        }, {}),
        matchReasons: similarCars.value.map(car => car.matchReason)
      })
      
      return
    }

    const currentPrice = currentListing.monthly_price
    const currentListingId = currentListing.listing_id
    const excludedIds = new Set([currentListingId])
    let allSimilarCars = []

    // Start timing for minimum loading time
    const startTime = Date.now()
    const minLoadingTime = 600 // Minimum 600ms loading time

    console.log('Fetching similar cars with tiered logic for:', {
      make: currentListing.make,
      model: currentListing.model,
      bodyType: currentListing.body_type,
      price: currentPrice,
      excludeId: currentListingId
    })

    // Tier 1 – Same Make & Model (85%-115%, Weight: 100)
    const tier1PriceMin = Math.floor(currentPrice * 0.85)
    const tier1PriceMax = Math.ceil(currentPrice * 1.15)
    
    const { data: tier1Results, error: tier1Error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('make', currentListing.make)
      .eq('model', currentListing.model)
      .gte('monthly_price', tier1PriceMin)
      .lte('monthly_price', tier1PriceMax)
      .neq('listing_id', currentListingId)
      .limit(4)

    if (!tier1Error && tier1Results) {
      const tier1Cars = tier1Results.map(car => ({
        ...car,
        matchLevel: 'exact',
        matchWeight: 100,
        matchReason: 'Same make & model'
      }))
      allSimilarCars.push(...tier1Cars)
      tier1Cars.forEach(car => excludedIds.add(car.listing_id))
      console.log(`Tier 1 (Same Make & Model): ${tier1Cars.length} cars`)
    }

    // Tier 2 – Same Body Type + Price (80%-120%, Weight: 80)
    if (allSimilarCars.length < 4) {
      const tier2PriceMin = Math.floor(currentPrice * 0.80)
      const tier2PriceMax = Math.ceil(currentPrice * 1.20)
      
      const { data: tier2Results, error: tier2Error } = await supabase
        .from('full_listing_view')
        .select('*')
        .eq('body_type', currentListing.body_type)
        .gte('monthly_price', tier2PriceMin)
        .lte('monthly_price', tier2PriceMax)
        .not('listing_id', 'in', `(${Array.from(excludedIds).join(',')})`)
        .limit(4 - allSimilarCars.length)

      if (!tier2Error && tier2Results) {
        const tier2Cars = tier2Results.map(car => ({
          ...car,
          matchLevel: 'bodyType',
          matchWeight: 80,
          matchReason: 'Same body type'
        }))
        allSimilarCars.push(...tier2Cars)
        tier2Cars.forEach(car => excludedIds.add(car.listing_id))
        console.log(`Tier 2 (Same Body Type): ${tier2Cars.length} cars`)
      }
    }

    // Tier 3 – Make + Body Type (75%-125%, Weight: 60)
    if (allSimilarCars.length < 4) {
      const tier3PriceMin = Math.floor(currentPrice * 0.75)
      const tier3PriceMax = Math.ceil(currentPrice * 1.25)
      
      const { data: tier3Results, error: tier3Error } = await supabase
        .from('full_listing_view')
        .select('*')
        .eq('make', currentListing.make)
        .eq('body_type', currentListing.body_type)
        .gte('monthly_price', tier3PriceMin)
        .lte('monthly_price', tier3PriceMax)
        .not('listing_id', 'in', `(${Array.from(excludedIds).join(',')})`)
        .limit(4 - allSimilarCars.length)

      if (!tier3Error && tier3Results) {
        const tier3Cars = tier3Results.map(car => ({
          ...car,
          matchLevel: 'makeBodyType',
          matchWeight: 60,
          matchReason: 'Same make & body type'
        }))
        allSimilarCars.push(...tier3Cars)
        tier3Cars.forEach(car => excludedIds.add(car.listing_id))
        console.log(`Tier 3 (Make + Body Type): ${tier3Cars.length} cars`)
      }
    }

    // Tier 4 – Only Make (70%-130%, Weight: 40)
    if (allSimilarCars.length < 4) {
      const tier4PriceMin = Math.floor(currentPrice * 0.70)
      const tier4PriceMax = Math.ceil(currentPrice * 1.30)
      
      const { data: tier4Results, error: tier4Error } = await supabase
        .from('full_listing_view')
        .select('*')
        .eq('make', currentListing.make)
        .gte('monthly_price', tier4PriceMin)
        .lte('monthly_price', tier4PriceMax)
        .not('listing_id', 'in', `(${Array.from(excludedIds).join(',')})`)
        .limit(4 - allSimilarCars.length)

      if (!tier4Error && tier4Results) {
        const tier4Cars = tier4Results.map(car => ({
          ...car,
          matchLevel: 'make',
          matchWeight: 40,
          matchReason: 'Same make'
        }))
        allSimilarCars.push(...tier4Cars)
        tier4Cars.forEach(car => excludedIds.add(car.listing_id))
        console.log(`Tier 4 (Same Make): ${tier4Cars.length} cars`)
      }
    }

    // Tier 5 – Popular Cars Fallback (75%-125%, Weight: 20)
    if (allSimilarCars.length < 4) {
      const tier5PriceMin = Math.floor(currentPrice * 0.75)
      const tier5PriceMax = Math.ceil(currentPrice * 1.25)
      
      const { data: tier5Results, error: tier5Error } = await supabase
        .from('full_listing_view')
        .select('*')
        .gte('monthly_price', tier5PriceMin)
        .lte('monthly_price', tier5PriceMax)
        .not('listing_id', 'in', `(${Array.from(excludedIds).join(',')})`)
        .order('created_at', { ascending: false }) // Sort by newest as popularity proxy
        .limit(4 - allSimilarCars.length)

      if (!tier5Error && tier5Results) {
        const tier5Cars = tier5Results.map(car => ({
          ...car,
          matchLevel: 'popular',
          matchWeight: 20,
          matchReason: 'Popular cars'
        }))
        allSimilarCars.push(...tier5Cars)
        console.log(`Tier 5 (Popular Cars): ${tier5Cars.length} cars`)
      }
    }

    // Combine all tiers and take only 4 results
    similarCars.value = allSimilarCars.slice(0, 4)

    // Ensure minimum loading time for smooth skeleton transition
    const elapsedTime = Date.now() - startTime
    const remainingTime = Math.max(0, minLoadingTime - elapsedTime)
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    }

    console.log('Similar cars summary:', {
      totalFound: similarCars.value.length,
      breakdown: similarCars.value.reduce((acc, car) => {
        acc[car.matchLevel] = (acc[car.matchLevel] || 0) + 1
        return acc
      }, {}),
      matchReasons: similarCars.value.map(car => car.matchReason)
    })

  } catch (err) {
    console.error('Error in fetchSimilarCars:', err)
  } finally {
    loadingSimilarCars.value = false
  }
}

// Watch for listing changes to fetch similar cars
watch(listing, (newListing) => {
  if (newListing && newListing.listing_id) {
    fetchSimilarCars(newListing)
  }
}, { deep: true })

// Retry function for error handling
const retryLoad = () => {
  error.value = null
  loadingListing.value = true
  loadListing()
}

// Main listing loading function
const loadListing = async () => {
  const id = route.params.id
  if (!id) {
    error.value = 'Manglende listing ID'
    loadingListing.value = false
    return
  }

  try {
    const { data, error: fetchError } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('listing_id', id)
      .single()

    if (fetchError) {
      throw new Error(`Fejl ved hentning af annonce: ${fetchError.message}`)
    }

    if (!data) {
      throw new Error('Annonce ikke fundet')
    }

    listing.value = data
    
    // Start loading similar cars after main listing is loaded
    if (data.listing_id) {
      // Don't await here - let similar cars load in background
      fetchSimilarCars(data)
    }
    
  } catch (err) {
    console.error('Error loading listing:', err)
    error.value = err.message || 'Der opstod en fejl ved indlæsning af annoncen'
  } finally {
    loadingListing.value = false
  }
}

onMounted(async () => {
  // Start loading similar cars early to show skeleton if needed
  loadingSimilarCars.value = true
  
  // Load main listing
  await loadListing()
})

</script>