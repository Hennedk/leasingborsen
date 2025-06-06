<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// Reactive state
const makes = ref([])
const loading = ref(true)
const error = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const submitMessage = ref('')

// Edit/Delete state
const editMode = ref(false)
const editingMakeId = ref(null)
const showDeleteModal = ref(false)
const deletingMake = ref(null)
const deleting = ref(false)

// Form data
const newMake = ref({
  name: ''
})

// Computed properties
const sortedMakes = computed(() => {
  return [...makes.value].sort((a, b) => a.name.localeCompare(b.name))
})

// Methods
const fetchMakes = async () => {
  try {
    loading.value = true
    error.value = null
    
    const { data, error: fetchError } = await supabase
      .from('makes')
      .select('*')
      .order('name')
    
    if (fetchError) throw fetchError
    
    makes.value = data || []
    console.log('Successfully fetched makes:', makes.value.length, 'items')
    
  } catch (err) {
    console.error('Error fetching makes:', err)
    error.value = `Fejl ved hentning af mærker: ${err.message}`
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  editMode.value = false
  editingMakeId.value = null
  showModal.value = true
  resetForm()
}

const openEditModal = (make) => {
  editMode.value = true
  editingMakeId.value = make.id
  showModal.value = true
  
  // Populate form with existing data
  newMake.value = {
    name: make.name
  }
}

const closeModal = () => {
  showModal.value = false
  editMode.value = false
  editingMakeId.value = null
  resetForm()
}

const resetForm = () => {
  newMake.value = {
    name: ''
  }
  submitMessage.value = ''
}

const submitMake = async () => {
  try {
    submitting.value = true
    submitMessage.value = ''
    
    // Validate required fields
    if (!newMake.value.name.trim()) {
      throw new Error('Mærkenavn er påkrævet')
    }
    
    if (editMode.value) {
      await updateMake()
    } else {
      await createMake()
    }
    
    submitMessage.value = editMode.value ? 'Mærke opdateret succesfuldt!' : 'Mærke oprettet succesfuldt!'
    
    // Refresh makes list
    await fetchMakes()
    
    // Close modal after a short delay
    setTimeout(() => {
      closeModal()
    }, 1500)
    
  } catch (err) {
    console.error('Error submitting make:', err)
    submitMessage.value = `Fejl: ${err.message}`
  } finally {
    submitting.value = false
  }
}

const createMake = async () => {
  const makeData = {
    name: newMake.value.name.trim()
  }
  
  console.log('Creating make:', makeData)
  
  const { error } = await supabase
    .from('makes')
    .insert([makeData])
  
  if (error) {
    console.error('Make creation error:', error)
    throw error
  }
}

const updateMake = async () => {
  const makeData = {
    name: newMake.value.name.trim()
  }
  
  console.log('Updating make:', makeData)
  
  const { error } = await supabase
    .from('makes')
    .update(makeData)
    .eq('id', editingMakeId.value)
  
  if (error) {
    console.error('Make update error:', error)
    throw error
  }
}

// Delete functions
const openDeleteModal = (make) => {
  deletingMake.value = make
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingMake.value = null
}

const confirmDelete = async () => {
  if (!deletingMake.value) return
  
  try {
    deleting.value = true
    
    const makeId = deletingMake.value.id
    console.log('Deleting make:', makeId)
    
    const { error } = await supabase
      .from('makes')
      .delete()
      .eq('id', makeId)
    
    if (error) {
      console.error('Error deleting make:', error)
      throw error
    }
    
    console.log('Successfully deleted make:', makeId)
    
    // Refresh makes list
    await fetchMakes()
    
    // Close modal
    closeDeleteModal()
    
  } catch (err) {
    console.error('Error deleting make:', err)
    error.value = `Fejl ved sletning: ${err.message}`
  } finally {
    deleting.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '–'
  return new Date(dateString).toLocaleDateString('da-DK')
}

const formatRelativeTime = (dateString) => {
  if (!dateString) return '–'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)
  
  if (diffInSeconds < 60) return 'Lige nu'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min siden`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} timer siden`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dage siden`
  if (diffInSeconds < 2419200) return `${Math.floor(diffInSeconds / 604800)} uger siden`
  return `${Math.floor(diffInSeconds / 2419200)} måneder siden`
}

// Lifecycle
onMounted(async () => {
  await fetchMakes()
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
            <li class="text-base-content font-medium">Mærker</li>
          </ul>
        </div>

        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-base-content">Mærker</h1>
            <p class="text-base-content/70 mt-1">Administrer bilmærker i systemet</p>
          </div>
          <button 
            @click="openModal"
            class="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nyt mærke
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-12">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="mt-4 text-base-content opacity-70">Henter mærker...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-error mb-6">
          <span>{{ error }}</span>
          <button 
            @click="fetchMakes"
            class="btn btn-sm btn-outline"
          >
            Prøv igen
          </button>
        </div>

        <!-- Makes Table -->
        <div v-else class="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden">
          <!-- Table Header -->
          <div class="px-6 py-4 border-b border-base-300 bg-base-50">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-base-content">Alle mærker</h3>
                <p class="text-sm text-base-content/60 mt-1">{{ sortedMakes.length }} mærker i systemet</p>
              </div>
              <div class="flex items-center gap-2">
                <div class="form-control">
                  <input type="text" placeholder="Søg mærker..." class="input input-bordered input-sm w-64" />
                </div>
                <button class="btn btn-ghost btn-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                </button>
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
                      Mærke
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 opacity-50">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                      </svg>
                    </div>
                  </th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Status</th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Oprettet</th>
                  <th class="bg-transparent font-medium text-base-content/70 py-4 px-6 text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(make, index) in sortedMakes" :key="make.id" 
                    class="border-b border-base-300/50 hover:bg-base-50 transition-colors">
                  <!-- Make Name (No Avatar) -->
                  <td class="py-3 px-6">
                    <div class="flex flex-col">
                      <div class="font-semibold text-base-content">{{ make.name }}</div>
                      <div class="text-sm text-base-content/60">ID: {{ make.id.substring(0, 8) }}...</div>
                    </div>
                  </td>
                  
                  <!-- Status -->
                  <td class="py-3 px-6">
                    <div class="badge badge-success badge-sm gap-1">
                      <div class="w-1.5 h-1.5 bg-success rounded-full"></div>
                      Aktiv
                    </div>
                  </td>
                  
                  <!-- Created Date -->
                  <td class="py-3 px-6">
                    <div class="flex flex-col">
                      <div class="text-base-content/80">{{ formatDate(make.created_at) }}</div>
                      <div class="text-xs text-base-content/50">{{ formatRelativeTime(make.created_at) }}</div>
                    </div>
                  </td>
                  
                  <!-- Actions -->
                  <td class="py-3 px-6">
                    <div class="flex items-center gap-1 justify-end">
                      <button 
                        @click="openEditModal(make)"
                        class="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button 
                        @click="openDeleteModal(make)"
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
                Viser {{ sortedMakes.length }} af {{ sortedMakes.length }} mærker
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
          <div v-if="!loading && sortedMakes.length === 0" class="p-16 text-center">
            <div class="w-24 h-24 mx-auto mb-6 bg-base-200 rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-base-content/40">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-base-content mb-2">Ingen mærker endnu</h3>
            <p class="text-base-content/60 mb-6 max-w-md mx-auto">Kom i gang ved at tilføje det første bilmærke til systemet.</p>
            <button 
              @click="openModal"
              class="btn btn-primary btn-lg gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Opret første mærke
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- Sidebar navigation (shared component could be extracted) -->
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
          <!-- Would use shared navigation component here -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg">⚙️</span>
              <h3 class="menu-title text-base-content/70 font-medium">Listingindstillinger</h3>
            </div>
            <ul class="menu menu-sm space-y-1">
              <li>
                <a href="/admin/makes" class="bg-primary text-primary-content flex items-center gap-3 p-3 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  </svg>
                  Mærker
                </a>
              </li>
              <li>
                <a href="/admin/listings" class="hover:bg-base-300 flex items-center gap-3 p-3 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h8.25m-1.5 0H18a2.25 2.25 0 002.25-2.25m-1.5 0h1.5m-1.5 0c-1.012 0-1.867-.668-2.15-1.586" />
                  </svg>
                  Tilbage til listings
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
    </div>

    <!-- Create/Edit Make Modal -->
    <div v-if="showModal" class="modal modal-open">
      <div class="modal-box">
        <!-- Modal Header -->
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-lg">
            {{ editMode ? 'Rediger mærke' : 'Opret nyt mærke' }}
          </h3>
          <button 
            @click="closeModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitMake" class="space-y-4">
          <!-- Name -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Mærkenavn <span class="text-error">*</span></span>
            </label>
            <input 
              v-model="newMake.name"
              type="text"
              class="input input-bordered"
              placeholder="f.eks. BMW, Audi, Mercedes"
              required
              maxlength="100"
            >
          </div>

          <!-- Submit Message -->
          <div v-if="submitMessage" 
               class="alert" 
               :class="submitMessage.startsWith('Fejl') ? 'alert-error' : 'alert-success'">
            <span>{{ submitMessage }}</span>
          </div>

          <!-- Actions -->
          <div class="modal-action">
            <button 
              type="button"
              @click="closeModal"
              class="btn btn-outline"
              :disabled="submitting"
            >
              Annuller
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="submitting"
            >
              <span v-if="submitting" class="loading loading-spinner loading-sm mr-2"></span>
              {{ editMode ? 'Opdater' : 'Opret' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Slet mærke</h3>
        
        <div v-if="deletingMake" class="mb-6">
          <p class="mb-2">Er du sikker på, at du vil slette dette mærke?</p>
          <div class="bg-base-200 p-4 rounded-lg">
            <p class="font-medium">{{ deletingMake.name }}</p>
          </div>
          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Denne handling kan ikke fortrydes. Alle relaterede modeller vil også blive påvirket.</span>
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
            <span v-if="deleting" class="loading loading-spinner loading-sm mr-2"></span>
            Slet permanent
          </button>
        </div>
      </div>
    </div>
  </div>
</template> 