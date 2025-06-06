<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Reactive state
const listings = ref([])
const loading = ref(true)
const error = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const submitMessage = ref('')

// Edit/Delete state
const editMode = ref(false)
const editingListingId = ref(null)
const showDeleteModal = ref(false)
const deletingListing = ref(null)
const deleting = ref(false)

// Reference data from lookup tables
const makes = ref([])
const models = ref([])
const bodyTypes = ref([])
const fuelTypes = ref([])
const transmissions = ref([])
const colours = ref([])
const sellers = ref([])
const loadingReferenceData = ref(false)

// Form data for new listing
const newListing = ref({
  seller_id: '',
  make_id: '',
  model_id: '',
  variant: '',
  year: new Date().getFullYear(),
  mileage: 0,
  horsepower: 0,
  kw: 0,
  fuel_type_id: '',
  transmission_id: '',
  body_type_id: '',
  drive_type: '',
  seats: 5,
  doors: 4,
  wltp: 0,
  consumption_l_100km: 0,
  consumption_kwh_100km: 0,
  co2_emission: 0,
  co2_tax_half_year: 0,
  image: '',
  description: '',
  // Lease pricing
  lease_prices: [{
    monthly_price: 0,
    first_payment: 0,
    mileage_per_year: 20000,
    period_months: 36
  }],
  // Listing offers
  offers: [{
    colour_id: '',
    condition: 'new',
    availability_date: new Date().toISOString().split('T')[0],
    insurance_included: false,
    security_deposit: 0,
    final_payment: 0,
    excess_km_rate: 0,
    listing_status: 'active'
  }]
})

// Computed properties
const sortedListings = computed(() => {
  return [...listings.value].sort((a, b) => {
    // Sort by make, then model, then year (newest first)
    if (a.make !== b.make) return a.make?.localeCompare(b.make || '') || 0
    if (a.model !== b.model) return a.model?.localeCompare(b.model || '') || 0
    return (b.year || 0) - (a.year || 0)
  })
})

const filteredModels = computed(() => {
  if (!newListing.value.make_id) return []
  return models.value.filter(model => model.make_id === newListing.value.make_id)
})

// Methods
const fetchReferenceData = async () => {
  try {
    loadingReferenceData.value = true
    
    // Fetch all reference data in parallel
    const [makesRes, modelsRes, bodyTypesRes, fuelTypesRes, transmissionsRes, coloursRes, sellersRes] = await Promise.all([
      supabase.from('makes').select('*').order('name'),
      supabase.from('models').select('*').order('name'),
      supabase.from('body_types').select('*').order('name'),
      supabase.from('fuel_types').select('*').order('name'),
      supabase.from('transmissions').select('*').order('name'),
      supabase.from('colours').select('*').order('name'),
      supabase.from('sellers').select('*').order('name')
    ])
    
    if (makesRes.error) throw makesRes.error
    if (modelsRes.error) throw modelsRes.error
    if (bodyTypesRes.error) throw bodyTypesRes.error
    if (fuelTypesRes.error) throw fuelTypesRes.error
    if (transmissionsRes.error) throw transmissionsRes.error
    if (coloursRes.error) throw coloursRes.error
    if (sellersRes.error) throw sellersRes.error
    
    makes.value = makesRes.data || []
    models.value = modelsRes.data || []
    bodyTypes.value = bodyTypesRes.data || []
    fuelTypes.value = fuelTypesRes.data || []
    transmissions.value = transmissionsRes.data || []
    colours.value = coloursRes.data || []
    sellers.value = sellersRes.data || []
    
    console.log('Reference data loaded:', {
      makes: makes.value.length,
      models: models.value.length,
      bodyTypes: bodyTypes.value.length,
      fuelTypes: fuelTypes.value.length,
      transmissions: transmissions.value.length,
      colours: colours.value.length,
      sellers: sellers.value.length
    })
    
  } catch (err) {
    console.error('Error fetching reference data:', err)
    error.value = `Fejl ved hentning af reference data: ${err.message}`
  } finally {
    loadingReferenceData.value = false
  }
}

const fetchListings = async () => {
  try {
    loading.value = true
    error.value = null
    
    // Use the existing full_listing_view (removed created_at ordering since it doesn't exist in view)
    const { data, error: fetchError } = await supabase
      .from('full_listing_view')
      .select('*')
    
    if (fetchError) {
      console.error('Supabase fetch error:', fetchError)
      console.error('Error code:', fetchError.code)
      console.error('Error message:', fetchError.message)
      console.error('Error details:', fetchError.details)
      throw fetchError
    }
    
    listings.value = data || []
    console.log('Successfully fetched listings:', listings.value.length, 'items')
    
  } catch (err) {
    console.error('Error fetching listings:', err)
    console.error('Full error object:', JSON.stringify(err, null, 2))
    
    // More descriptive error messages based on common issues
    if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
      error.value = 'Database view "full_listing_view" findes ikke. Kontroller database opsætning.'
    } else if (err.message?.includes('permission denied')) {
      error.value = 'Adgang nægtet til listings data. Kontroller database tilladelser.'
    } else if (err.code === 'PGRST116') {
      error.value = 'Database tabellen eller view findes ikke.'
    } else {
      error.value = `Database fejl: ${err.message || 'Der opstod en fejl ved hentning af annoncer'}`
    }
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  editMode.value = false
  editingListingId.value = null
  showModal.value = true
  resetForm()
}

const openEditModal = async (listing) => {
  try {
    editMode.value = true
    editingListingId.value = listing.listing_id
    showModal.value = true
    
    // Load full listing data from base tables for editing
    await loadListingForEdit(listing.listing_id)
    
  } catch (err) {
    console.error('Error opening edit modal:', err)
    error.value = `Fejl ved indlæsning af annonce: ${err.message}`
  }
}

const loadListingForEdit = async (listingId) => {
  try {
    // Load listing data
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()
    
    if (listingError) throw listingError
    
    // Load lease pricing data
    const { data: leasePrices, error: pricesError } = await supabase
      .from('lease_pricing')
      .select('*')
      .eq('listing_id', listingId)
      .order('monthly_price')
    
    if (pricesError) throw pricesError
    
    // Load listing offers data
    const { data: offers, error: offersError } = await supabase
      .from('listing_offers')
      .select('*')
      .eq('listing_id', listingId)
      .limit(1)
    
    if (offersError) throw offersError
    
    // Populate form with existing data
    newListing.value = {
      seller_id: listing.seller_id || '',
      make_id: listing.make_id,
      model_id: listing.model_id,
      variant: listing.variant || '',
      year: listing.year,
      mileage: listing.mileage,
      horsepower: listing.horsepower,
      kw: listing.kw,
      fuel_type_id: listing.fuel_type_id,
      transmission_id: listing.transmission_id,
      body_type_id: listing.body_type_id,
      drive_type: listing.drive_type || '',
      seats: listing.seats,
      doors: listing.doors,
      wltp: listing.wltp,
      consumption_l_100km: listing.consumption_l_100km,
      consumption_kwh_100km: listing.consumption_kwh_100km,
      co2_emission: listing.co2_emission,
      co2_tax_half_year: listing.co2_tax_half_year,
      image: listing.image || '',
      description: listing.description || '',
      lease_prices: leasePrices.length > 0 ? leasePrices.map(price => ({
        id: price.id,
        monthly_price: price.monthly_price,
        first_payment: price.first_payment,
        mileage_per_year: price.mileage_per_year,
        period_months: price.period_months
      })) : [{
        monthly_price: 0,
        first_payment: 0,
        mileage_per_year: 20000,
        period_months: 36
      }],
      offers: offers.length > 0 ? offers.map(offer => ({
        id: offer.id,
        colour_id: offer.colour_id,
        condition: offer.condition,
        availability_date: offer.availability_date,
        insurance_included: offer.insurance_included,
        security_deposit: offer.security_deposit,
        final_payment: offer.final_payment,
        excess_km_rate: offer.excess_km_rate,
        listing_status: offer.listing_status
      })) : [{
        colour_id: '',
        condition: 'new',
        availability_date: new Date().toISOString().split('T')[0],
        insurance_included: false,
        security_deposit: 0,
        final_payment: 0,
        excess_km_rate: 0,
        listing_status: 'active'
      }]
    }
    
    console.log('Loaded listing for edit:', newListing.value)
    
  } catch (err) {
    console.error('Error loading listing for edit:', err)
    throw new Error(`Kunne ikke indlæse annonce data: ${err.message}`)
  }
}

const closeModal = () => {
  showModal.value = false
  editMode.value = false
  editingListingId.value = null
  resetForm()
}

const resetForm = () => {
  newListing.value = {
    seller_id: '',
    make_id: '',
    model_id: '',
    variant: '',
    year: new Date().getFullYear(),
    mileage: 0,
    horsepower: 0,
    kw: 0,
    fuel_type_id: '',
    transmission_id: '',
    body_type_id: '',
    drive_type: '',
    seats: 5,
    doors: 4,
    wltp: 0,
    consumption_l_100km: 0,
    consumption_kwh_100km: 0,
    co2_emission: 0,
    co2_tax_half_year: 0,
    image: '',
    description: '',
    lease_prices: [{
      monthly_price: 0,
      first_payment: 0,
      mileage_per_year: 20000,
      period_months: 36
    }],
    offers: [{
      colour_id: '',
      condition: 'new',
      availability_date: new Date().toISOString().split('T')[0],
      insurance_included: false,
      security_deposit: 0,
      final_payment: 0,
      excess_km_rate: 0,
      listing_status: 'active'
    }]
  }
  submitMessage.value = ''
}

const addLeasePrice = () => {
  newListing.value.lease_prices.push({
    monthly_price: 0,
    first_payment: 0,
    mileage_per_year: 20000,
    period_months: 36
  })
}

const removeLeasePrice = (index) => {
  if (newListing.value.lease_prices.length > 1) {
    newListing.value.lease_prices.splice(index, 1)
  }
}

const formatPrice = (price) => {
  return price?.toLocaleString('da-DK') || '–'
}

const formatMileage = (mileage) => {
  return mileage?.toLocaleString('da-DK') || '–'
}

const submitListing = async () => {
  try {
    submitting.value = true
    submitMessage.value = ''
    
    // Validate required fields (updated to match view requirements)
    if (!newListing.value.make_id || !newListing.value.model_id || !newListing.value.body_type_id || !newListing.value.fuel_type_id || !newListing.value.transmission_id) {
      throw new Error('Mærke, model, karrosseri, brændstof og gearkasse er påkrævet')
    }
    
    // Validate that colour is selected (required for view)
    if (!newListing.value.offers[0].colour_id) {
      throw new Error('Farve er påkrævet')
    }
    
    // Validate at least one lease price
    if (!newListing.value.lease_prices.some(price => price.monthly_price > 0)) {
      throw new Error('Mindst én leasingpris skal angives')
    }
    
    if (editMode.value) {
      // Update existing listing
      await updateListing()
    } else {
      // Create new listing
      await createListing()
    }
    
    submitMessage.value = editMode.value ? 'Bil opdateret succesfuldt!' : 'Bil oprettet succesfuldt!'
    
    // Refresh listings
    await fetchListings()
    
    // Close modal after a short delay
    setTimeout(() => {
      closeModal()
    }, 1500)
    
  } catch (err) {
    console.error('Error submitting listing:', err)
    submitMessage.value = `Fejl: ${err.message}`
  } finally {
    submitting.value = false
  }
}

const createListing = async () => {
  // Prepare listing data for insertion using the actual database column names
  const listingData = {
    seller_id: newListing.value.seller_id || null,
    make_id: newListing.value.make_id,
    model_id: newListing.value.model_id,
    variant: newListing.value.variant || null,
    year: newListing.value.year,
    mileage: newListing.value.mileage,
    horsepower: newListing.value.horsepower,
    kw: newListing.value.kw,
    fuel_type_id: newListing.value.fuel_type_id,
    transmission_id: newListing.value.transmission_id,
    body_type_id: newListing.value.body_type_id,
    drive_type: newListing.value.drive_type || null,
    seats: newListing.value.seats,
    doors: newListing.value.doors,
    wltp: newListing.value.wltp,
    consumption_l_100km: newListing.value.consumption_l_100km,
    consumption_kwh_100km: newListing.value.consumption_kwh_100km,
    co2_emission: newListing.value.co2_emission,
    co2_tax_half_year: newListing.value.co2_tax_half_year,
    image: newListing.value.image || null,
    description: newListing.value.description || null,
    created_at: new Date().toISOString()
  }
  
  console.log('Inserting listing data:', listingData)
  
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert([listingData])
    .select()
    .single()
  
  if (listingError) {
    console.error('Listing insertion error:', listingError)
    throw listingError
  }
  
  console.log('Listing created:', listing)
  
  // Insert lease prices
  const leasePricesData = newListing.value.lease_prices
    .filter(price => price.monthly_price > 0) // Only insert prices with valid amounts
    .map(price => ({
      listing_id: listing.id, // Note: using 'id' not 'listing_id'
      monthly_price: price.monthly_price,
      first_payment: price.first_payment,
      mileage_per_year: price.mileage_per_year,
      period_months: price.period_months
    }))
  
  console.log('Inserting lease prices:', leasePricesData)
  
  const { error: pricesError } = await supabase
    .from('lease_pricing')
    .insert(leasePricesData)
  
  if (pricesError) {
    console.error('Lease pricing insertion error:', pricesError)
    throw pricesError
  }
  
  // Insert listing offers (required for view to work)
  const offersData = newListing.value.offers.map(offer => ({
    listing_id: listing.id, // Note: using 'id' not 'listing_id'
    colour_id: offer.colour_id,
    condition: offer.condition,
    availability_date: offer.availability_date,
    insurance_included: offer.insurance_included,
    security_deposit: offer.security_deposit,
    final_payment: offer.final_payment,
    excess_km_rate: offer.excess_km_rate,
    listing_status: offer.listing_status
  }))
  
  console.log('Inserting listing offers:', offersData)
  
  const { error: offersError } = await supabase
    .from('listing_offers')
    .insert(offersData)
  
  if (offersError) {
    console.error('Listing offers insertion error:', offersError)
    throw offersError
  }
}

const updateListing = async () => {
  const listingId = editingListingId.value
  
  // Prepare updated listing data
  const listingData = {
    seller_id: newListing.value.seller_id || null,
    make_id: newListing.value.make_id,
    model_id: newListing.value.model_id,
    variant: newListing.value.variant || null,
    year: newListing.value.year,
    mileage: newListing.value.mileage,
    horsepower: newListing.value.horsepower,
    kw: newListing.value.kw,
    fuel_type_id: newListing.value.fuel_type_id,
    transmission_id: newListing.value.transmission_id,
    body_type_id: newListing.value.body_type_id,
    drive_type: newListing.value.drive_type || null,
    seats: newListing.value.seats,
    doors: newListing.value.doors,
    wltp: newListing.value.wltp,
    consumption_l_100km: newListing.value.consumption_l_100km,
    consumption_kwh_100km: newListing.value.consumption_kwh_100km,
    co2_emission: newListing.value.co2_emission,
    co2_tax_half_year: newListing.value.co2_tax_half_year,
    image: newListing.value.image || null,
    description: newListing.value.description || null
  }
  
  console.log('Updating listing data:', listingData)
  
  // Update main listing
  const { error: listingError } = await supabase
    .from('listings')
    .update(listingData)
    .eq('id', listingId)
  
  if (listingError) {
    console.error('Listing update error:', listingError)
    throw listingError
  }
  
  // Update lease pricing - delete existing and insert new
  const { error: deleteError } = await supabase
    .from('lease_pricing')
    .delete()
    .eq('listing_id', listingId)
  
  if (deleteError) {
    console.error('Error deleting existing lease prices:', deleteError)
    throw deleteError
  }
  
  const leasePricesData = newListing.value.lease_prices
    .filter(price => price.monthly_price > 0)
    .map(price => ({
      listing_id: listingId,
      monthly_price: price.monthly_price,
      first_payment: price.first_payment,
      mileage_per_year: price.mileage_per_year,
      period_months: price.period_months
    }))
  
  if (leasePricesData.length > 0) {
    const { error: pricesError } = await supabase
      .from('lease_pricing')
      .insert(leasePricesData)
    
    if (pricesError) {
      console.error('Lease pricing insertion error:', pricesError)
      throw pricesError
    }
  }
  
  // Update listing offers
  const offersData = {
    colour_id: newListing.value.offers[0].colour_id,
    condition: newListing.value.offers[0].condition,
    availability_date: newListing.value.offers[0].availability_date,
    insurance_included: newListing.value.offers[0].insurance_included,
    security_deposit: newListing.value.offers[0].security_deposit,
    final_payment: newListing.value.offers[0].final_payment,
    excess_km_rate: newListing.value.offers[0].excess_km_rate,
    listing_status: newListing.value.offers[0].listing_status
  }
  
  const { error: offersError } = await supabase
    .from('listing_offers')
    .update(offersData)
    .eq('listing_id', listingId)
  
  if (offersError) {
    console.error('Listing offers update error:', offersError)
    throw offersError
  }
  
  console.log('Successfully updated listing:', listingId)
}

// Watch for make selection change to reset model
const onMakeChange = () => {
  newListing.value.model_id = ''
}

// Delete functions
const openDeleteModal = (listing) => {
  deletingListing.value = listing
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingListing.value = null
}

const confirmDelete = async () => {
  if (!deletingListing.value) return
  
  try {
    deleting.value = true
    
    const listingId = deletingListing.value.listing_id
    console.log('Deleting listing:', listingId)
    
    // Delete in reverse order of creation due to foreign key constraints
    // 1. Delete listing offers first
    const { error: offersError } = await supabase
      .from('listing_offers')
      .delete()
      .eq('listing_id', listingId)
    
    if (offersError) {
      console.error('Error deleting listing offers:', offersError)
      throw offersError
    }
    
    // 2. Delete lease pricing
    const { error: pricesError } = await supabase
      .from('lease_pricing')
      .delete()
      .eq('listing_id', listingId)
    
    if (pricesError) {
      console.error('Error deleting lease pricing:', pricesError)
      throw pricesError
    }
    
    // 3. Delete main listing
    const { error: listingError } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)
    
    if (listingError) {
      console.error('Error deleting listing:', listingError)
      throw listingError
    }
    
    console.log('Successfully deleted listing:', listingId)
    
    // Refresh listings
    await fetchListings()
    
    // Close modal and show success
    closeDeleteModal()
    
    // You could add a toast notification here
    
  } catch (err) {
    console.error('Error deleting listing:', err)
    error.value = `Fejl ved sletning: ${err.message}`
  } finally {
    deleting.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Load reference data first
  await fetchReferenceData()
  
  // Then fetch listings
  await fetchListings()
})
</script>

<template>
  <div class="min-h-screen bg-base-200 p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-base-content">Listings</h1>
        <button 
          @click="openModal"
          class="btn btn-primary btn-sm"
          :disabled="loadingReferenceData"
        >
          <span v-if="loadingReferenceData" class="loading loading-spinner loading-sm"></span>
          + Ny bil
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="mt-4 text-base-content opacity-70">Henter annoncer...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-error mb-6">
        <span>{{ error }}</span>
        <button 
          @click="fetchListings"
          class="btn btn-sm btn-outline"
        >
          Prøv igen
        </button>
      </div>

      <!-- Listings Table -->
      <div v-else class="bg-base-100 rounded-lg shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra table-sm w-full">
            <thead>
              <tr class="bg-base-300">
                <th>Mærke</th>
                <th>Model</th>
                <th>Variant</th>
                <th>År</th>
                <th>Kilometerstand</th>
                <th>Stand</th>
                <th>Farve</th>
                <th>Månedlig pris</th>
                <th>Status</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="listing in sortedListings" :key="`${listing.listing_id}-${listing.offer_id}`">
                <td class="font-medium text-base-content">{{ listing.make || 'N/A' }}</td>
                <td class="text-base-content">{{ listing.model || 'N/A' }}</td>
                <td class="text-base-content opacity-70">{{ listing.variant || 'N/A' }}</td>
                <td class="text-base-content">{{ listing.year || 'N/A' }}</td>
                <td class="text-base-content">{{ formatMileage(listing.mileage) }} km</td>
                <td class="text-base-content">
                  <span class="badge badge-sm" :class="{
                    'badge-success': listing.condition === 'new',
                    'badge-warning': listing.condition === 'demo', 
                    'badge-neutral': listing.condition === 'used'
                  }">
                    {{ listing.condition === 'new' ? 'Ny' : listing.condition === 'demo' ? 'Demo' : 'Brugt' }}
                  </span>
                </td>
                <td class="text-base-content">{{ listing.colour || 'N/A' }}</td>
                <td class="font-bold text-primary">{{ formatPrice(listing.monthly_price) }} kr</td>
                <td class="text-base-content">
                  <span class="badge badge-sm" :class="{
                    'badge-success': listing.listing_status === 'active',
                    'badge-error': listing.listing_status === 'inactive',
                    'badge-warning': listing.listing_status === 'pending'
                  }">
                    {{ listing.listing_status || 'N/A' }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button 
                      @click="openEditModal(listing)"
                      class="btn btn-ghost btn-xs text-primary"
                      :disabled="loadingReferenceData"
                    >
                      Rediger
                    </button>
                    <button 
                      @click="openDeleteModal(listing)"
                      class="btn btn-ghost btn-xs text-error"
                    >
                      Slet
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Empty State -->
        <div v-if="!loading && sortedListings.length === 0" class="p-12 text-center">
          <p class="text-base-content opacity-70 mb-4">Ingen annoncer fundet</p>
          <button 
            @click="openModal"
            class="btn btn-primary btn-sm"
            :disabled="loadingReferenceData"
          >
            Opret første annonce
          </button>
        </div>
      </div>
    </div>

    <!-- Create Listing Modal -->
    <div v-if="showModal" class="modal modal-open">
      <div class="modal-box w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-lg text-base-content">
            {{ editMode ? 'Rediger bil' : 'Opret ny bil' }}
          </h3>
          <button 
            @click="closeModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            ✕
          </button>
        </div>

        <!-- Info Alert -->
        <div class="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h4 class="font-bold">Påkrævet information</h4>
            <p class="text-sm">Mærke, model, karrosseri, brændstof, gearkasse, farve og mindst én leasingpris er påkrævet.</p>
          </div>
        </div>

        <form @submit.prevent="submitListing" class="space-y-6">
          <!-- Basic Information -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-base mb-4">Grundlæggende oplysninger</h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Seller -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Sælger</span>
                  </label>
                  <select 
                    v-model="newListing.seller_id"
                    class="select select-sm select-bordered"
                  >
                    <option value="">Vælg sælger (valgfrit)</option>
                    <option v-for="seller in sellers" :key="seller.id" :value="seller.id">
                      {{ seller.name }}
                    </option>
                  </select>
                </div>

                <!-- Make -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Mærke *</span>
                  </label>
                  <select 
                    v-model="newListing.make_id"
                    @change="onMakeChange"
                    class="select select-sm select-bordered"
                    required
                  >
                    <option value="">Vælg mærke</option>
                    <option v-for="make in makes" :key="make.id" :value="make.id">
                      {{ make.name }}
                    </option>
                  </select>
                </div>

                <!-- Model -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Model *</span>
                  </label>
                  <select 
                    v-model="newListing.model_id"
                    class="select select-sm select-bordered"
                    :disabled="!newListing.make_id || filteredModels.length === 0"
                    required
                  >
                    <option value="">Vælg model</option>
                    <option v-for="model in filteredModels" :key="model.id" :value="model.id">
                      {{ model.name }}
                    </option>
                  </select>
                  <div v-if="newListing.make_id && filteredModels.length === 0" class="label">
                    <span class="label-text-alt text-warning">Ingen modeller fundet for dette mærke</span>
                  </div>
                </div>

                <!-- Variant -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Variant</span>
                  </label>
                  <input 
                    v-model="newListing.variant"
                    type="text"
                    class="input input-sm input-bordered"
                    placeholder="f.eks. 2.0 TDI"
                  >
                </div>

                <!-- Year -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Årgang</span>
                  </label>
                  <input 
                    v-model.number="newListing.year"
                    type="number"
                    class="input input-sm input-bordered"
                    :min="2000"
                    :max="new Date().getFullYear() + 1"
                  >
                </div>

                <!-- Mileage -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Kilometerstand</span>
                  </label>
                  <input 
                    v-model.number="newListing.mileage"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="0"
                    min="0"
                  >
                </div>

                <!-- Body Type -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Karrosseri *</span>
                  </label>
                  <select 
                    v-model="newListing.body_type_id"
                    class="select select-sm select-bordered"
                    required
                  >
                    <option value="">Vælg karrosseri</option>
                    <option v-for="bodyType in bodyTypes" :key="bodyType.id" :value="bodyType.id">
                      {{ bodyType.name }}
                    </option>
                  </select>
                </div>

                <!-- Fuel Type -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Brændstof *</span>
                  </label>
                  <select 
                    v-model="newListing.fuel_type_id"
                    class="select select-sm select-bordered"
                    required
                  >
                    <option value="">Vælg brændstof</option>
                    <option v-for="fuelType in fuelTypes" :key="fuelType.id" :value="fuelType.id">
                      {{ fuelType.name }}
                    </option>
                  </select>
                </div>

                <!-- Transmission -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Gearkasse *</span>
                  </label>
                  <select 
                    v-model="newListing.transmission_id"
                    class="select select-sm select-bordered"
                    required
                  >
                    <option value="">Vælg gearkasse</option>
                    <option v-for="transmission in transmissions" :key="transmission.id" :value="transmission.id">
                      {{ transmission.name }}
                    </option>
                  </select>
                </div>

                <!-- Drive Type -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Træk</span>
                  </label>
                  <select 
                    v-model="newListing.drive_type"
                    class="select select-sm select-bordered"
                  >
                    <option value="">Vælg træk</option>
                    <option value="front_wheel_drive">Forhjulstræk</option>
                    <option value="rear_wheel_drive">Baghjulstræk</option>
                    <option value="all_wheel_drive">Firehjulstræk</option>
                  </select>
                </div>

                <!-- Horsepower -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Hestekræfter</span>
                  </label>
                  <input 
                    v-model.number="newListing.horsepower"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="150"
                    min="0"
                  >
                </div>

                <!-- KW -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">kW</span>
                  </label>
                  <input 
                    v-model.number="newListing.kw"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="110"
                    min="0"
                  >
                </div>

                <!-- Seats -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Sæder</span>
                  </label>
                  <input 
                    v-model.number="newListing.seats"
                    type="number"
                    class="input input-sm input-bordered"
                    min="2"
                    max="9"
                  >
                </div>

                <!-- Doors -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Døre</span>
                  </label>
                  <input 
                    v-model.number="newListing.doors"
                    type="number"
                    class="input input-sm input-bordered"
                    min="2"
                    max="5"
                  >
                </div>

                <!-- WLTP -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">WLTP (km)</span>
                  </label>
                  <input 
                    v-model.number="newListing.wltp"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="500"
                    min="0"
                  >
                </div>

                <!-- Consumption L/100km -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Forbrug (L/100km)</span>
                  </label>
                  <input 
                    v-model.number="newListing.consumption_l_100km"
                    type="number"
                    step="0.1"
                    class="input input-sm input-bordered"
                    placeholder="6.5"
                    min="0"
                  >
                </div>

                <!-- Consumption kWh/100km -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Forbrug (kWh/100km)</span>
                  </label>
                  <input 
                    v-model.number="newListing.consumption_kwh_100km"
                    type="number"
                    step="0.1"
                    class="input input-sm input-bordered"
                    placeholder="18.5"
                    min="0"
                  >
                </div>

                <!-- CO2 Emission -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">CO2 udledning (g/km)</span>
                  </label>
                  <input 
                    v-model.number="newListing.co2_emission"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="120"
                    min="0"
                  >
                </div>

                <!-- CO2 Tax Half Year -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">CO2 afgift (halvår)</span>
                  </label>
                  <input 
                    v-model.number="newListing.co2_tax_half_year"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="5000"
                    min="0"
                  >
                </div>

                <!-- Image URL -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Billede URL</span>
                  </label>
                  <input 
                    v-model="newListing.image"
                    type="url"
                    class="input input-sm input-bordered"
                    placeholder="https://..."
                  >
                </div>
              </div>

              <!-- Description -->
              <div class="form-control mt-4">
                <label class="label">
                  <span class="label-text font-medium">Beskrivelse</span>
                </label>
                <textarea 
                  v-model="newListing.description"
                  class="textarea textarea-sm textarea-bordered"
                  rows="3"
                  placeholder="Beskrivelse af bilen..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Listing Offers -->
          <div class="card bg-base-200">
            <div class="card-body">
              <h4 class="card-title text-base mb-4">Tilbudsinformation</h4>
              
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Colour -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Farve *</span>
                  </label>
                  <select 
                    v-model="newListing.offers[0].colour_id"
                    class="select select-sm select-bordered"
                    required
                  >
                    <option value="">Vælg farve</option>
                    <option v-for="colour in colours" :key="colour.id" :value="colour.id">
                      {{ colour.name }}
                    </option>
                  </select>
                </div>

                <!-- Condition -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Stand</span>
                  </label>
                  <select 
                    v-model="newListing.offers[0].condition"
                    class="select select-sm select-bordered"
                  >
                    <option value="new">Ny</option>
                    <option value="used">Brugt</option>
                    <option value="demo">Demo</option>
                  </select>
                </div>

                <!-- Listing Status -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Status</span>
                  </label>
                  <select 
                    v-model="newListing.offers[0].listing_status"
                    class="select select-sm select-bordered"
                  >
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                    <option value="pending">Afventer</option>
                  </select>
                </div>

                <!-- Availability Date -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Tilgængelig fra</span>
                  </label>
                  <input 
                    v-model="newListing.offers[0].availability_date"
                    type="date"
                    class="input input-sm input-bordered"
                  >
                </div>

                <!-- Security Deposit -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Depositum</span>
                  </label>
                  <input 
                    v-model.number="newListing.offers[0].security_deposit"
                    type="number"
                    class="input input-sm input-bordered"
                    placeholder="10000"
                    min="0"
                  >
                </div>

                <!-- Excess KM Rate -->
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Merpris pr. km</span>
                  </label>
                  <input 
                    v-model.number="newListing.offers[0].excess_km_rate"
                    type="number"
                    step="0.1"
                    class="input input-sm input-bordered"
                    placeholder="2.5"
                    min="0"
                  >
                </div>

                <!-- Insurance Included -->
                <div class="form-control">
                  <label class="label cursor-pointer justify-start">
                    <input 
                      v-model="newListing.offers[0].insurance_included"
                      type="checkbox"
                      class="checkbox checkbox-sm mr-3"
                    >
                    <span class="label-text font-medium">Forsikring inkluderet</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Lease Pricing (same as before) -->
          <div class="card bg-base-200">
            <div class="card-body">
              <div class="flex justify-between items-center mb-4">
                <div>
                  <h4 class="card-title text-base">Leasingpriser</h4>
                  <p class="text-sm text-base-content opacity-70">Tilføj mindst én pris større end 0</p>
                </div>
                <button 
                  type="button"
                  @click="addLeasePrice"
                  class="btn btn-sm btn-outline btn-primary"
                >
                  + Tilføj pris
                </button>
              </div>

              <div v-for="(price, index) in newListing.lease_prices" :key="index" class="card bg-base-100 mb-4">
                <div class="card-body">
                  <div class="flex justify-between items-center mb-4">
                    <h5 class="font-medium">Prisoption {{ index + 1 }}</h5>
                    <button 
                      v-if="newListing.lease_prices.length > 1"
                      type="button"
                      @click="removeLeasePrice(index)"
                      class="btn btn-sm btn-circle btn-ghost text-error"
                    >
                      ✕
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Månedlig pris</span>
                      </label>
                      <input 
                        v-model.number="price.monthly_price"
                        type="number"
                        class="input input-sm input-bordered"
                        placeholder="5000"
                        min="0"
                        step="100"
                      >
                    </div>

                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Udbetaling</span>
                      </label>
                      <input 
                        v-model.number="price.first_payment"
                        type="number"
                        class="input input-sm input-bordered"
                        placeholder="50000"
                        min="0"
                        step="1000"
                      >
                    </div>

                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Km/år</span>
                      </label>
                      <input 
                        v-model.number="price.mileage_per_year"
                        type="number"
                        class="input input-sm input-bordered"
                        placeholder="20000"
                        min="5000"
                        step="2500"
                      >
                    </div>

                    <div class="form-control">
                      <label class="label">
                        <span class="label-text font-medium">Periode (måneder)</span>
                      </label>
                      <input 
                        v-model.number="price.period_months"
                        type="number"
                        class="input input-sm input-bordered"
                        placeholder="36"
                        min="12"
                        max="60"
                        step="12"
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Message -->
          <div v-if="submitMessage" class="alert" :class="submitMessage.startsWith('Fejl') ? 'alert-error' : 'alert-success'">
            <span>{{ submitMessage }}</span>
          </div>

          <!-- Actions -->
          <div class="modal-action">
            <button 
              type="button"
              @click="closeModal"
              class="btn btn-ghost"
              :disabled="submitting"
            >
              Annuller
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="submitting || loadingReferenceData"
            >
              <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
              {{ editMode ? 'Opdater bil' : 'Opret bil' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Slet annonce</h3>
        
        <div v-if="deletingListing" class="mb-6">
          <p class="mb-2">Er du sikker på, at du vil slette denne annonce?</p>
          <div class="bg-base-200 p-4 rounded-lg">
            <p class="font-medium">{{ deletingListing.make }} {{ deletingListing.model }}</p>
            <p class="text-sm opacity-70">{{ deletingListing.variant || 'N/A' }} • {{ deletingListing.year }}</p>
            <p class="text-sm font-bold text-primary">{{ formatPrice(deletingListing.monthly_price) }} kr/md</p>
          </div>
          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>Denne handling kan ikke fortrydes. Alle data vil blive slettet permanent.</span>
          </div>
        </div>

        <div class="modal-action">
          <button 
            @click="closeDeleteModal"
            class="btn btn-ghost"
            :disabled="deleting"
          >
            Annuller
          </button>
          <button 
            @click="confirmDelete"
            class="btn btn-error"
            :disabled="deleting"
          >
            <span v-if="deleting" class="loading loading-spinner loading-sm"></span>
            Slet permanent
          </button>
        </div>
      </div>
    </div>
  </div>
</template> 