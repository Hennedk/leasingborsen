<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

// Reactive state
const sellers = ref([])
const loading = ref(true)
const error = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const submitMessage = ref('')

// Edit/Delete state
const editMode = ref(false)
const editingSellerId = ref(null)
const showDeleteModal = ref(false)
const deletingSeller = ref(null)
const deleting = ref(false)

// Form data for new seller
const newSeller = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  country: '',
  logo_url: ''
})

// Computed properties
const sortedSellers = computed(() => {
  return [...sellers.value].sort((a, b) => a.name?.localeCompare(b.name || '') || 0)
})

// Methods
const fetchSellers = async () => {
  try {
    loading.value = true
    error.value = null
    
    const { data, error: fetchError } = await supabase
      .from('sellers')
      .select('*')
      .order('name')
    
    if (fetchError) {
      console.error('Supabase fetch error:', fetchError)
      throw fetchError
    }
    
    sellers.value = data || []
    console.log('Successfully fetched sellers:', sellers.value.length, 'items')
    
  } catch (err) {
    console.error('Error fetching sellers:', err)
    error.value = `Fejl ved hentning af sælgere: ${err.message}`
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  editMode.value = false
  editingSellerId.value = null
  showModal.value = true
  resetForm()
}

const openEditModal = (seller) => {
  editMode.value = true
  editingSellerId.value = seller.id
  showModal.value = true
  
  // Populate form with existing data
  newSeller.value = {
    name: seller.name,
    email: seller.email || '',
    phone: seller.phone || '',
    address: seller.address || '',
    country: seller.country || '',
    logo_url: seller.logo_url || ''
  }
}

const closeModal = () => {
  showModal.value = false
  editMode.value = false
  editingSellerId.value = null
  resetForm()
}

const resetForm = () => {
  newSeller.value = {
    name: '',
    email: '',
    phone: '',
    address: '',
    country: '',
    logo_url: ''
  }
  submitMessage.value = ''
}

const submitSeller = async () => {
  try {
    submitting.value = true
    submitMessage.value = ''
    
    // Validate required fields
    if (!newSeller.value.name.trim()) {
      throw new Error('Navn er påkrævet')
    }
    
    if (editMode.value) {
      await updateSeller()
    } else {
      await createSeller()
    }
    
    submitMessage.value = editMode.value ? 'Sælger opdateret succesfuldt!' : 'Sælger oprettet succesfuldt!'
    
    // Refresh sellers
    await fetchSellers()
    
    // Close modal after a short delay
    setTimeout(() => {
      closeModal()
    }, 1500)
    
  } catch (err) {
    console.error('Error submitting seller:', err)
    submitMessage.value = `Fejl: ${err.message}`
  } finally {
    submitting.value = false
  }
}

const createSeller = async () => {
  const sellerData = {
    name: newSeller.value.name.trim(),
    email: newSeller.value.email?.trim() || null,
    phone: newSeller.value.phone?.trim() || null,
    address: newSeller.value.address?.trim() || null,
    country: newSeller.value.country?.trim() || null,
    logo_url: newSeller.value.logo_url?.trim() || null
  }
  
  const { error } = await supabase
    .from('sellers')
    .insert([sellerData])
  
  if (error) {
    console.error('Seller insertion error:', error)
    throw error
  }
}

const updateSeller = async () => {
  const sellerData = {
    name: newSeller.value.name.trim(),
    email: newSeller.value.email?.trim() || null,
    phone: newSeller.value.phone?.trim() || null,
    address: newSeller.value.address?.trim() || null,
    country: newSeller.value.country?.trim() || null,
    logo_url: newSeller.value.logo_url?.trim() || null
  }
  
  const { error } = await supabase
    .from('sellers')
    .update(sellerData)
    .eq('id', editingSellerId.value)
  
  if (error) {
    console.error('Seller update error:', error)
    throw error
  }
}

// Delete functions
const openDeleteModal = (seller) => {
  deletingSeller.value = seller
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingSeller.value = null
}

const confirmDelete = async () => {
  if (!deletingSeller.value) return
  
  try {
    deleting.value = true
    
    const { error } = await supabase
      .from('sellers')
      .delete()
      .eq('id', deletingSeller.value.id)
    
    if (error) {
      console.error('Error deleting seller:', error)
      throw error
    }
    
    await fetchSellers()
    closeDeleteModal()
    
  } catch (err) {
    console.error('Error deleting seller:', err)
    error.value = `Fejl ved sletning: ${err.message}`
  } finally {
    deleting.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '–'
  return new Date(dateString).toLocaleDateString('da-DK')
}

// Lifecycle
onMounted(() => {
  fetchSellers()
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Breadcrumbs -->
    <div class="breadcrumbs text-sm mb-6 px-4 lg:px-6">
      <ul>
        <li><a href="/" class="text-base-content/70 hover:text-primary">Hjem</a></li>
        <li><a href="/admin" class="text-base-content/70 hover:text-primary">Admin</a></li>
        <li class="text-base-content font-medium">Sælgere</li>
      </ul>
    </div>

    <!-- Header -->
    <div class="flex justify-between items-center mb-6 px-4 lg:px-6">
      <h1 class="text-3xl font-bold text-base-content">Sælgere</h1>
      <button 
        @click="openModal"
        class="btn btn-primary"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Ny sælger
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-base-content opacity-70">Henter sælgere...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-error mb-6 mx-4 lg:mx-6">
      <span>{{ error }}</span>
      <button 
        @click="fetchSellers"
        class="btn btn-sm btn-outline"
      >
        Prøv igen
      </button>
    </div>

    <!-- Sellers Table -->
    <div v-else class="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden mx-4 lg:mx-6">
      <!-- Table Header -->
      <div class="px-6 py-4 border-b border-base-300 bg-base-50">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-base-content">Alle sælgere</h3>
            <p class="text-sm text-base-content/60 mt-1">{{ sortedSellers.length }} sælgere i systemet</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="form-control">
              <input type="text" placeholder="Søg sælgere..." class="input input-bordered input-sm w-64" />
            </div>
            <div class="dropdown dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m6-6h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5" />
                </svg>
                Filter
              </div>
              <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-lg w-52 border border-base-300">
                <li><a>Alle sælgere</a></li>
                <li><a>Aktive</a></li>
                <li><a>Inaktive</a></li>
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
                  Sælger
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 opacity-50">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                  </svg>
                </div>
              </th>
              <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Status</th>
              <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Kontakt</th>
              <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Oprettet</th>
              <th class="bg-transparent font-medium text-base-content/70 py-4 px-6 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="seller in sortedSellers" :key="seller.id"
                class="border-b border-base-300/50 hover:bg-base-50 transition-colors">
              
              <!-- Seller Info -->
              <td class="py-3 px-6">
                <div class="flex items-center gap-4">
                  <div class="avatar">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span class="text-primary font-bold text-lg">{{ seller.name?.charAt(0).toUpperCase() || 'S' }}</span>
                    </div>
                  </div>
                  <div>
                    <div class="font-semibold text-base-content">{{ seller.name || 'N/A' }}</div>
                    <div class="text-xs text-base-content/50">ID: {{ seller.id?.substring(0, 8) }}...</div>
                  </div>
                </div>
              </td>
              
              <!-- Status -->
              <td class="py-3 px-6">
                <div class="badge badge-success badge-sm gap-1">
                  <div class="w-1.5 h-1.5 bg-success rounded-full"></div>
                  Aktiv
                </div>
              </td>
              
              <!-- Contact -->
              <td class="py-3 px-6">
                <div class="flex flex-col gap-1">
                  <div v-if="seller.email" class="text-sm text-base-content/80">
                    📧 {{ seller.email }}
                  </div>
                  <div v-if="seller.phone" class="text-sm text-base-content/80">
                    📞 {{ seller.phone }}
                  </div>
                  <div v-if="seller.country" class="text-sm text-base-content/60">
                    🌍 {{ seller.country }}
                  </div>
                </div>
              </td>
              
              <!-- Created Date -->
              <td class="py-3 px-6">
                <div class="flex flex-col">
                  <div class="text-base-content/80">{{ formatDate(seller.created_at) }}</div>
                </div>
              </td>
              
              <!-- Actions -->
              <td class="py-3 px-6">
                <div class="flex items-center gap-1 justify-end">
                  <button 
                    @click="openEditModal(seller)"
                    class="btn btn-ghost btn-xs text-primary hover:bg-primary/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button 
                    @click="openDeleteModal(seller)"
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
      
      <!-- Enhanced Empty State -->
      <div v-if="!loading && sortedSellers.length === 0" class="p-16 text-center">
        <div class="w-24 h-24 mx-auto mb-6 bg-base-200 rounded-2xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-base-content/40">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-base-content mb-2">Ingen sælgere endnu</h3>
        <p class="text-base-content/60 mb-6 max-w-md mx-auto">Kom i gang ved at oprette den første sælger i systemet.</p>
        <button 
          @click="openModal"
          class="btn btn-primary btn-lg gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Opret første sælger
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal modal-open">
      <div class="modal-box w-11/12 max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-lg">
            {{ editMode ? 'Rediger sælger' : 'Opret ny sælger' }}
          </h3>
          <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitSeller" class="space-y-4">
          <!-- Name field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Navn <span class="text-error">*</span></span>
            </label>
            <input 
              v-model="newSeller.name" 
              type="text" 
              class="input input-bordered" 
              placeholder="Indtast sælgernavn..." 
              required 
              maxlength="100"
            >
          </div>

          <!-- Email field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Email</span>
            </label>
            <input 
              v-model="newSeller.email" 
              type="email" 
              class="input input-bordered" 
              placeholder="Indtast sælgers email..." 
              maxlength="100"
            >
          </div>

          <!-- Phone field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Telefon</span>
            </label>
            <input 
              v-model="newSeller.phone" 
              type="tel" 
              class="input input-bordered" 
              placeholder="Indtast sælgers telefon..." 
              maxlength="15"
            >
          </div>

          <!-- Address field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Adresse</span>
            </label>
            <input 
              v-model="newSeller.address" 
              type="text" 
              class="input input-bordered" 
              placeholder="Indtast sælgers adresse..." 
              maxlength="200"
            >
          </div>

          <!-- Country field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Land</span>
            </label>
            <input 
              v-model="newSeller.country" 
              type="text" 
              class="input input-bordered" 
              placeholder="Indtast sælgers land..." 
              maxlength="50"
            >
          </div>

          <!-- Logo URL field -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Logo URL</span>
            </label>
            <input 
              v-model="newSeller.logo_url" 
              type="text" 
              class="input input-bordered" 
              placeholder="Indtast sælgers logo URL..." 
              maxlength="200"
            >
          </div>

          <!-- Submit message -->
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
        <h3 class="font-bold text-lg text-error mb-4">Slet sælger</h3>
        
        <div v-if="deletingSeller" class="mb-6">
          <p class="mb-2">Er du sikker på, at du vil slette denne sælger?</p>
          <div class="bg-base-200 p-4 rounded-lg">
            <p class="font-medium">{{ deletingSeller.name }}</p>
            <div v-if="deletingSeller.email" class="text-sm opacity-70">📧 {{ deletingSeller.email }}</div>
          </div>
          <div class="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.764 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Denne handling kan ikke fortrydes. Alle tilknyttede annoncer vil blive påvirket.</span>
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