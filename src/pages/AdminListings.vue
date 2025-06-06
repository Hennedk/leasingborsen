<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()

// Navigation state
const currentAdminView = ref('listings')

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

// Navigation menu structure
const navigationMenu = computed(() => [
  {
    section: 'Listings',
    icon: '📦',
    items: [
      { 
        key: 'listings', 
        label: 'Alle annoncer', 
        icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h8.25m-1.5 0H18a2.25 2.25 0 002.25-2.25m-1.5 0h1.5m-1.5 0c-1.012 0-1.867-.668-2.15-1.586',
        route: '/admin/listings'
      },
      { 
        key: 'create-listing', 
        label: '+ Ny bil', 
        icon: 'M12 4.5v15m7.5-7.5h-15',
        action: 'createListing'
      }
    ]
  },
  {
    section: 'Sellers',
    icon: '🏢',
    items: [
      { 
        key: 'sellers', 
        label: 'Sælgere', 
        icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
        route: '/admin/sellers'
      }
    ]
  },
  {
    section: 'Listingindstillinger',
    icon: '⚙️',
    items: [
      { 
        key: 'makes', 
        label: 'Mærker', 
        icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z',
        route: '/admin/makes'
      },
      { 
        key: 'models', 
        label: 'Modeller', 
        icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m3.75 4.5v2.25m0-2.25h4.5m0 0h3.75m-3.75 0v2.25m0-2.25v-4.5c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v1.5h1.5a3 3 0 013 3v1.5m-1.5 0V9a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 9v6.75',
        route: '/admin/models'
      },
      { 
        key: 'body-types', 
        label: 'Karrosserier', 
        icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m3.75 4.5v2.25m0-2.25h4.5m0 0h3.75m-3.75 0v2.25',
        route: '/admin/body-types'
      },
      { 
        key: 'transmissions', 
        label: 'Gearkasser', 
        icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z',
        route: '/admin/transmissions'
      },
      { 
        key: 'fuel-types', 
        label: 'Brændstoffer', 
        icon: 'M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z',
        route: '/admin/fuel-types'
      },
      { 
        key: 'colours', 
        label: 'Farver', 
        icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
        route: '/admin/colours'
      }
    ]
  }
])

// Methods for navigation
const navigateToView = (item) => {
  if (item.action === 'createListing') {
    openModal()
  } else if (item.route) {
    router.push(item.route)
  }
}

const isActiveRoute = (route) => {
  return router.currentRoute.value.path === route
}

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

const formatDate = (dateString) => {
  if (!dateString) return '–'
  return new Date(dateString).toLocaleDateString('da-DK')
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
    description: newListing.value.description || null
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
  <div class="drawer lg:drawer-open min-h-screen">
    <!-- Mobile menu toggle -->
    <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
    
    <!-- Main content area -->
    <div class="drawer-content flex flex-col">
      <!-- Top navigation bar for mobile -->
      <div class="navbar bg-base-100 lg:hidden border-b border-base-300">
        <div class="navbar-start">
          <label for="admin-drawer" class="btn btn-square btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </label>
        </div>
        <div class="navbar-center">
          <h1 class="text-xl font-bold">Admin</h1>
        </div>
      </div>

      <!-- Page content -->
      <main class="flex-1 p-4 lg:p-6 bg-base-200">
        <!-- Breadcrumbs -->
        <div class="breadcrumbs text-sm mb-6">
          <ul>
            <li><a href="/" class="text-base-content/70 hover:text-primary">Hjem</a></li>
            <li><a href="/admin" class="text-base-content/70 hover:text-primary">Admin</a></li>
            <li class="text-base-content font-medium">Listings</li>
          </ul>
        </div>

        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-base-content">Listings</h1>
          <button 
            @click="openModal"
            class="btn btn-primary"
            :disabled="loadingReferenceData"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span v-if="loadingReferenceData" class="loading loading-spinner loading-sm"></span>
            {{ showModal ? 'Annuller' : 'Ny bil' }}
          </button>
        </div>

        <!-- Inline Form (when creating/editing) -->
        <div v-if="showModal" class="bg-base-100 rounded-xl shadow-sm border border-base-300 mb-6">
          <!-- Form Header -->
          <div class="px-6 py-4 border-b border-base-300 bg-base-50">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-base-content">
                  {{ editMode ? 'Rediger bil' : 'Opret ny bil' }}
                </h3>
                <p class="text-sm text-base-content/60 mt-1">
                  Påkrævede felter markeret med <span class="text-error font-medium">*</span>
                </p>
              </div>
              <button 
                @click="closeModal"
                class="btn btn-ghost btn-sm"
                :disabled="submitting"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Form Content -->
          <form @submit.prevent="submitListing" class="p-6">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Left Column: Basic Info -->
              <div class="lg:col-span-2 space-y-6">
                <!-- Basic Information -->
                <div class="card bg-base-50 border border-base-300">
                  <div class="card-body">
                    <h4 class="card-title text-base mb-4">Grundlæggende oplysninger</h4>
                    
                    <!-- Make & Model Row -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Mærke <span class="text-error">*</span></span>
                        </label>
                        <select 
                          v-model="newListing.make_id"
                          @change="onMakeChange"
                          class="select select-bordered select-sm"
                          required
                        >
                          <option value="">Vælg mærke</option>
                          <option v-for="make in makes" :key="make.id" :value="make.id">
                            {{ make.name }}
                          </option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Model <span class="text-error">*</span></span>
                        </label>
                        <select 
                          v-model="newListing.model_id"
                          class="select select-bordered select-sm"
                          :disabled="!newListing.make_id || filteredModels.length === 0"
                          required
                        >
                          <option value="">Vælg model</option>
                          <option v-for="model in filteredModels" :key="model.id" :value="model.id">
                            {{ model.name }}
                          </option>
                        </select>
                      </div>
                    </div>

                    <!-- Details Row -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Variant</span>
                        </label>
                        <input 
                          v-model="newListing.variant"
                          type="text"
                          class="input input-bordered input-sm"
                          placeholder="f.eks. 2.0 TDI"
                        >
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Årgang</span>
                        </label>
                        <input 
                          v-model.number="newListing.year"
                          type="number"
                          class="input input-bordered input-sm"
                          :min="2000"
                          :max="new Date().getFullYear() + 1"
                        >
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Kilometerstand</span>
                        </label>
                        <input 
                          v-model.number="newListing.mileage"
                          type="number"
                          class="input input-bordered input-sm"
                          placeholder="0"
                          min="0"
                        >
                      </div>
                    </div>

                    <!-- Specifications -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Karrosseri <span class="text-error">*</span></span>
                        </label>
                        <select 
                          v-model="newListing.body_type_id"
                          class="select select-bordered select-sm"
                          required
                        >
                          <option value="">Vælg karrosseri</option>
                          <option v-for="bodyType in bodyTypes" :key="bodyType.id" :value="bodyType.id">
                            {{ bodyType.name }}
                          </option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Brændstof <span class="text-error">*</span></span>
                        </label>
                        <select 
                          v-model="newListing.fuel_type_id"
                          class="select select-bordered select-sm"
                          required
                        >
                          <option value="">Vælg brændstof</option>
                          <option v-for="fuelType in fuelTypes" :key="fuelType.id" :value="fuelType.id">
                            {{ fuelType.name }}
                          </option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Gearkasse <span class="text-error">*</span></span>
                        </label>
                        <select 
                          v-model="newListing.transmission_id"
                          class="select select-bordered select-sm"
                          required
                        >
                          <option value="">Vælg gearkasse</option>
                          <option v-for="transmission in transmissions" :key="transmission.id" :value="transmission.id">
                            {{ transmission.name }}
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Pricing -->
                <div class="card bg-base-50 border border-base-300">
                  <div class="card-body">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="card-title text-base">Leasingpriser</h4>
                      <button 
                        type="button"
                        @click="addLeasePrice"
                        class="btn btn-outline btn-primary btn-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Tilføj pris
                      </button>
                    </div>

                    <div class="space-y-4">
                      <div v-for="(price, index) in newListing.lease_prices" :key="index" 
                           class="border border-base-300 rounded-lg p-4 bg-base-100">
                        <div class="flex items-center justify-between mb-3">
                          <span class="font-medium">Prisoption {{ index + 1 }}</span>
                          <button 
                            v-if="newListing.lease_prices.length > 1"
                            type="button"
                            @click="removeLeasePrice(index)"
                            class="btn btn-ghost btn-xs text-error"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div class="form-control">
                            <label class="label">
                              <span class="label-text-alt">Månedlig pris</span>
                            </label>
                            <div class="input-group">
                              <input 
                                v-model.number="price.monthly_price"
                                type="number"
                                class="input input-bordered input-sm flex-1"
                                placeholder="5000"
                                min="0"
                                step="100"
                              >
                              <span class="bg-base-200 px-3 flex items-center text-sm">kr</span>
                            </div>
                          </div>

                          <div class="form-control">
                            <label class="label">
                              <span class="label-text-alt">Udbetaling</span>
                            </label>
                            <div class="input-group">
                              <input 
                                v-model.number="price.first_payment"
                                type="number"
                                class="input input-bordered input-sm flex-1"
                                placeholder="50000"
                                min="0"
                                step="1000"
                              >
                              <span class="bg-base-200 px-3 flex items-center text-sm">kr</span>
                            </div>
                          </div>

                          <div class="form-control">
                            <label class="label">
                              <span class="label-text-alt">Km/år</span>
                            </label>
                            <input 
                              v-model.number="price.mileage_per_year"
                              type="number"
                              class="input input-bordered input-sm"
                              placeholder="20000"
                              min="5000"
                              step="2500"
                            >
                          </div>

                          <div class="form-control">
                            <label class="label">
                              <span class="label-text-alt">Periode (mdr)</span>
                            </label>
                            <input 
                              v-model.number="price.period_months"
                              type="number"
                              class="input input-bordered input-sm"
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
              </div>

              <!-- Right Column: Additional Details -->
              <div class="space-y-6">
                <!-- Status & Availability -->
                <div class="card bg-base-50 border border-base-300">
                  <div class="card-body">
                    <h4 class="card-title text-base mb-4">Status & Tilgængelighed</h4>
                    
                    <div class="space-y-4">
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Farve <span class="text-error">*</span></span>
                        </label>
                        <select 
                          v-model="newListing.offers[0].colour_id"
                          class="select select-bordered select-sm"
                          required
                        >
                          <option value="">Vælg farve</option>
                          <option v-for="colour in colours" :key="colour.id" :value="colour.id">
                            {{ colour.name }}
                          </option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Stand</span>
                        </label>
                        <select 
                          v-model="newListing.offers[0].condition"
                          class="select select-bordered select-sm"
                        >
                          <option value="new">Ny</option>
                          <option value="used">Brugt</option>
                          <option value="demo">Demo</option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Status</span>
                        </label>
                        <select 
                          v-model="newListing.offers[0].listing_status"
                          class="select select-bordered select-sm"
                        >
                          <option value="active">Aktiv</option>
                          <option value="inactive">Inaktiv</option>
                          <option value="pending">Afventer</option>
                        </select>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text font-medium">Tilgængelig fra</span>
                        </label>
                        <input 
                          v-model="newListing.offers[0].availability_date"
                          type="date"
                          class="input input-bordered input-sm"
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Technical Details -->
                <div class="card bg-base-50 border border-base-300">
                  <div class="card-body">
                    <h4 class="card-title text-base mb-4">Tekniske detaljer</h4>
                    
                    <div class="space-y-4">
                      <div class="grid grid-cols-2 gap-3">
                        <div class="form-control">
                          <label class="label">
                            <span class="label-text-alt">HK</span>
                          </label>
                          <input 
                            v-model.number="newListing.horsepower"
                            type="number"
                            class="input input-bordered input-sm"
                            placeholder="150"
                            min="0"
                          >
                        </div>

                        <div class="form-control">
                          <label class="label">
                            <span class="label-text-alt">kW</span>
                          </label>
                          <input 
                            v-model.number="newListing.kw"
                            type="number"
                            class="input input-bordered input-sm"
                            placeholder="110"
                            min="0"
                          >
                        </div>
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div class="form-control">
                          <label class="label">
                            <span class="label-text-alt">Sæder</span>
                          </label>
                          <input 
                            v-model.number="newListing.seats"
                            type="number"
                            class="input input-bordered input-sm"
                            min="2"
                            max="9"
                          >
                        </div>

                        <div class="form-control">
                          <label class="label">
                            <span class="label-text-alt">Døre</span>
                          </label>
                          <input 
                            v-model.number="newListing.doors"
                            type="number"
                            class="input input-bordered input-sm"
                            min="2"
                            max="5"
                          >
                        </div>
                      </div>

                      <div class="form-control">
                        <label class="label">
                          <span class="label-text-alt">CO2 (g/km)</span>
                        </label>
                        <input 
                          v-model.number="newListing.co2_emission"
                          type="number"
                          class="input input-bordered input-sm"
                          placeholder="120"
                          min="0"
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="card bg-base-50 border border-base-300">
                  <div class="card-body">
                    <!-- Submit Message -->
                    <div v-if="submitMessage" 
                         class="alert alert-sm mb-4" 
                         :class="submitMessage.startsWith('Fejl') ? 'alert-error' : 'alert-success'">
                      <span class="text-sm">{{ submitMessage }}</span>
                    </div>

                    <div class="space-y-3">
                      <button 
                        type="submit"
                        class="btn btn-primary btn-sm w-full"
                        :disabled="submitting || loadingReferenceData"
                      >
                        <span v-if="submitting" class="loading loading-spinner loading-sm mr-2"></span>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {{ editMode ? 'Opdater bil' : 'Opret bil' }}
                      </button>
                      
                      <button 
                        type="button"
                        @click="closeModal"
                        class="btn btn-outline btn-sm w-full"
                        :disabled="submitting"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Annuller
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
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
        <div v-else class="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
          <!-- Table Header -->
          <div class="px-6 py-4 border-b border-base-300 bg-base-50">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-base-content">Alle annoncer</h3>
                <p class="text-sm text-base-content/60 mt-1">{{ sortedListings.length }} aktive annoncer</p>
              </div>
              <div class="flex items-center gap-3">
                <div class="form-control">
                  <input type="text" placeholder="Søg annoncer..." class="input input-bordered input-sm w-64" />
                </div>
                <div class="dropdown dropdown-end">
                  <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m6-6h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5" />
                    </svg>
                    Filter
                  </div>
                  <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-lg w-52 border border-base-300">
                    <li><a>Alle statusser</a></li>
                    <li><a>Aktive</a></li>
                    <li><a>Inaktive</a></li>
                    <li><a>Afventer</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Table Content -->
          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr class="border-b border-base-300">
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">
                    <div class="flex items-center gap-2">
                      Bil
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 opacity-50">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                      </svg>
                    </div>
                  </th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Specifikationer</th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Pris</th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Status</th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Oprettet</th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6 text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="listing in sortedListings" :key="`${listing.listing_id}-${listing.offer_id}`"
                    class="border-b border-base-300/50 hover:bg-base-50 transition-colors">
                  <!-- Car Info (No Image) -->
                  <td class="py-3 px-6">
                    <div class="flex flex-col">
                      <div class="font-semibold text-base-content">{{ listing.make || 'N/A' }} {{ listing.model || 'N/A' }}</div>
                      <div class="text-sm text-base-content/60">{{ listing.variant || 'Standard' }} • {{ listing.year || 'N/A' }}</div>
                      <div class="text-xs text-base-content/50">ID: {{ listing.listing_id?.substring(0, 8) }}...</div>
                    </div>
                  </td>
                  
                  <!-- Specifications -->
                  <td class="py-3 px-6">
                    <div class="flex flex-col gap-1">
                      <div class="flex items-center gap-2 text-sm">
                        <div class="badge badge-outline badge-xs">{{ listing.body_type || 'N/A' }}</div>
                        <span class="text-base-content/80">{{ formatMileage(listing.mileage) }} km</span>
                      </div>
                      <div class="text-sm text-base-content/60">
                        {{ listing.fuel_type || 'N/A' }} • {{ listing.transmission || 'N/A' }}
                      </div>
                      <div class="text-xs text-base-content/50">
                        {{ listing.horsepower || 0 }} HK • {{ listing.colour || 'N/A' }}
                      </div>
                    </div>
                  </td>
                  
                  <!-- Price -->
                  <td class="py-3 px-6">
                    <div class="flex flex-col">
                      <div class="font-bold text-lg text-primary">{{ formatPrice(listing.monthly_price) }} kr</div>
                      <div class="text-sm text-base-content/60">pr. måned</div>
                      <div class="flex items-center gap-1 text-xs mt-1">
                        <div class="badge badge-sm" :class="{
                          'badge-success': listing.condition === 'new',
                          'badge-warning': listing.condition === 'demo', 
                          'badge-neutral': listing.condition === 'used'
                        }">
                          {{ listing.condition === 'new' ? 'Ny' : listing.condition === 'demo' ? 'Demo' : 'Brugt' }}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <!-- Status -->
                  <td class="py-3 px-6">
                    <div class="badge badge-sm gap-1" :class="{
                      'badge-success': listing.listing_status === 'active',
                      'badge-error': listing.listing_status === 'inactive',
                      'badge-warning': listing.listing_status === 'pending'
                    }">
                      <div class="w-1.5 h-1.5 rounded-full" :class="{
                        'bg-success': listing.listing_status === 'active',
                        'bg-error': listing.listing_status === 'inactive',
                        'bg-warning': listing.listing_status === 'pending'
                      }"></div>
                      {{ listing.listing_status === 'active' ? 'Aktiv' : 
                          listing.listing_status === 'inactive' ? 'Inaktiv' : 
                          listing.listing_status === 'pending' ? 'Afventer' : 'N/A' }}
                    </div>
                  </td>
                  
                  <!-- Created Date -->
                  <td class="py-3 px-6">
                    <div class="flex flex-col">
                      <div class="text-base-content/80">{{ formatDate(listing.created_at) }}</div>
                      <div class="text-xs text-base-content/50">For {{ Math.floor(Math.random() * 30) + 1 }} dage siden</div>
                    </div>
                  </td>
                  
                  <!-- Actions -->
                  <td class="py-3 px-6">
                    <div class="flex items-center gap-1 justify-end">
                      <button 
                        @click="openEditModal(listing)"
                        class="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
                        :disabled="loadingReferenceData"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button 
                        @click="openDeleteModal(listing)"
                        class="btn btn-ghost btn-xs text-error hover:bg-error/10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                      <div class="dropdown dropdown-end">
                        <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                          </svg>
                        </div>
                        <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-lg w-48 border border-base-300">
                          <li>
                            <a class="flex items-center gap-2 text-base-content text-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Se detaljer
                            </a>
                          </li>
                          <li>
                            <a class="flex items-center gap-2 text-base-content text-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                              </svg>
                              Duplikér
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Table Footer -->
          <div class="px-6 py-4 border-t border-base-300 bg-base-50">
            <div class="flex items-center justify-between">
              <div class="text-sm text-base-content/60">
                Viser {{ sortedListings.length }} af {{ sortedListings.length }} annoncer
              </div>
              <div class="flex items-center gap-2">
                <button class="btn btn-ghost btn-sm" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Forrige
                </button>
                <div class="join">
                  <button class="join-item btn btn-sm btn-active">1</button>
                  <button class="join-item btn btn-sm">2</button>
                  <button class="join-item btn btn-sm">3</button>
                </div>
                <button class="btn btn-ghost btn-sm">
                  Næste
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Enhanced Empty State -->
          <div v-if="!loading && sortedListings.length === 0" class="p-16 text-center">
            <div class="w-24 h-24 mx-auto mb-6 bg-base-200 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-base-content/40">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m3.75 4.5v2.25m0-2.25h4.5m0 0h3.75m-3.75 0v2.25m0-2.25v-4.5c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v1.5h1.5a3 3 0 013 3v1.5m-1.5 0V9a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 9v6.75" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-base-content mb-2">Ingen annoncer endnu</h3>
            <p class="text-base-content/60 mb-6 max-w-md mx-auto">Kom i gang ved at oprette den første bilannonce i systemet.</p>
            <button 
              @click="openModal"
              class="btn btn-primary btn-lg gap-2"
              :disabled="loadingReferenceData"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Opret første annonce
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Sidebar navigation -->
    <div class="drawer-side">
      <label for="admin-drawer" class="drawer-overlay"></label>
      
      <aside class="w-80 min-h-full bg-base-200 border-r border-base-300">
        <!-- Sidebar header -->
        <div class="p-4 border-b border-base-300">
          <h2 class="text-xl font-bold text-base-content flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-primary">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            </svg>
            Admin Panel
          </h2>
          <p class="text-sm text-base-content/70 mt-1">Leasingbørsen Administration</p>
        </div>

        <!-- Navigation menu -->
        <nav class="p-4">
          <div v-for="menuSection in navigationMenu" :key="menuSection.section" class="mb-6">
            <!-- Section header -->
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg">{{ menuSection.icon }}</span>
              <h3 class="menu-title text-base-content/70 font-medium">{{ menuSection.section }}</h3>
            </div>
            
            <!-- Menu items -->
            <ul class="menu menu-sm space-y-1">
              <li v-for="item in menuSection.items" :key="item.key">
                <a 
                  @click="navigateToView(item)"
                  class="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer"
                  :class="{
                    'bg-primary text-primary-content': isActiveRoute(item.route),
                    'hover:bg-base-300': !isActiveRoute(item.route)
                  }"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                  </svg>
                  {{ item.label }}
                  <span v-if="item.action === 'createListing'" class="badge badge-sm badge-primary ml-auto">Action</span>
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
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
            <span>Denna handling kan ikke fortrydes. Alla data vil blive slettet permanent.</span>
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