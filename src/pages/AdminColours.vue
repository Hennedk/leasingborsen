<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const colours = ref([])
const loading = ref(true)
const error = ref(null)
const showModal = ref(false)
const submitting = ref(false)
const submitMessage = ref('')
const editMode = ref(false)
const editingColourId = ref(null)
const showDeleteModal = ref(false)
const deletingColour = ref(null)
const deleting = ref(false)

const newColour = ref({ name: '' })

const sortedColours = computed(() => {
  return [...colours.value].sort((a, b) => a.name.localeCompare(b.name))
})

const fetchColours = async () => {
  try {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await supabase.from('colours').select('*').order('name')
    if (fetchError) throw fetchError
    colours.value = data || []
  } catch (err) {
    console.error('Error fetching colours:', err)
    error.value = `Fejl ved hentning af farver: ${err.message}`
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  editMode.value = false
  editingColourId.value = null
  showModal.value = true
  resetForm()
}

const openEditModal = (colour) => {
  editMode.value = true
  editingColourId.value = colour.id
  showModal.value = true
  newColour.value = { name: colour.name }
}

const closeModal = () => {
  showModal.value = false
  editMode.value = false
  editingColourId.value = null
  resetForm()
}

const resetForm = () => {
  newColour.value = { name: '' }
  submitMessage.value = ''
}

const submitColour = async () => {
  try {
    submitting.value = true
    submitMessage.value = ''
    
    if (!newColour.value.name.trim()) {
      throw new Error('Farvenavn er påkrævet')
    }
    
    const colourData = { name: newColour.value.name.trim() }
    
    if (editMode.value) {
      const { error } = await supabase.from('colours').update(colourData).eq('id', editingColourId.value)
      if (error) throw error
      submitMessage.value = 'Farve opdateret succesfuldt!'
    } else {
      const { error } = await supabase.from('colours').insert([colourData])
      if (error) throw error
      submitMessage.value = 'Farve oprettet succesfuldt!'
    }
    
    await fetchColours()
    setTimeout(() => closeModal(), 1500)
    
  } catch (err) {
    console.error('Error submitting colour:', err)
    submitMessage.value = `Fejl: ${err.message}`
  } finally {
    submitting.value = false
  }
}

const openDeleteModal = (colour) => {
  deletingColour.value = colour
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingColour.value = null
}

const confirmDelete = async () => {
  if (!deletingColour.value) return
  
  try {
    deleting.value = true
    const { error } = await supabase.from('colours').delete().eq('id', deletingColour.value.id)
    if (error) throw error
    await fetchColours()
    closeDeleteModal()
  } catch (err) {
    console.error('Error deleting colour:', err)
    error.value = `Fejl ved sletning: ${err.message}`
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchColours()
})
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <div class="breadcrumbs text-sm mb-6 px-4 lg:px-6">
      <ul>
        <li><a href="/" class="text-base-content/70 hover:text-primary">Hjem</a></li>
        <li><a href="/admin" class="text-base-content/70 hover:text-primary">Admin</a></li>
        <li class="text-base-content font-medium">Farver</li>
      </ul>
    </div>

    <div class="flex justify-between items-center mb-6 px-4 lg:px-6">
      <h1 class="text-3xl font-bold text-base-content">Farver</h1>
      <button @click="openModal" class="btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Ny farve
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-4 text-base-content opacity-70">Henter farver...</p>
    </div>

    <div v-else-if="error" class="alert alert-error mb-6 mx-4 lg:mx-6">
      <span>{{ error }}</span>
      <button @click="fetchColours" class="btn btn-sm btn-outline">Prøv igen</button>
    </div>

    <div v-else class="bg-base-100 rounded-xl shadow-sm border border-base-300 overflow-hidden mx-4 lg:mx-6">
      <div class="px-6 py-4 border-b border-base-300 bg-base-50">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-base-content">Alle farver</h3>
            <p class="text-sm text-base-content/60 mt-1">{{ sortedColours.length }} farver i systemet</p>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr class="border-b border-base-300">
              <th class="bg-transparent font-medium text-base-content/70 py-4 px-6">Farve</th>
              <th class="bg-transparent font-medium text-base-content/70 py-4 px-6 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="colour in sortedColours" :key="colour.id" class="border-b border-base-300/50 hover:bg-base-50 transition-colors">
              <td class="py-3 px-6">
                <div class="flex items-center gap-4">
                  <div class="avatar">
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span class="text-primary font-bold text-lg">{{ colour.name?.charAt(0).toUpperCase() || 'F' }}</span>
                    </div>
                  </div>
                  <div>
                    <div class="font-semibold text-base-content">{{ colour.name || 'N/A' }}</div>
                    <div class="text-xs text-base-content/50">ID: {{ colour.id?.substring(0, 8) }}...</div>
                  </div>
                </div>
              </td>
              <td class="py-3 px-6">
                <div class="flex items-center gap-1 justify-end">
                  <button @click="openEditModal(colour)" class="btn btn-ghost btn-xs text-primary hover:bg-primary/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button @click="openDeleteModal(colour)" class="btn btn-ghost btn-xs text-error hover:bg-error/10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="!loading && sortedColours.length === 0" class="p-16 text-center">
        <div class="w-24 h-24 mx-auto mb-6 bg-base-200 rounded-2xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-base-content/40">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-base-content mb-2">Ingen farver endnu</h3>
        <p class="text-base-content/60 mb-6 max-w-md mx-auto">Kom i gang ved at oprette den første farve i systemet.</p>
        <button @click="openModal" class="btn btn-primary btn-lg gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Opret første farve
        </button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal modal-open">
      <div class="modal-box">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-lg">{{ editMode ? 'Rediger farve' : 'Opret ny farve' }}</h3>
          <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>
        <form @submit.prevent="submitColour" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-medium">Farvenavn <span class="text-error">*</span></span></label>
            <input v-model="newColour.name" type="text" class="input input-bordered" placeholder="f.eks. Hvid, Sort, Rød..." required maxlength="100">
          </div>
          <div v-if="submitMessage" class="alert" :class="submitMessage.startsWith('Fejl') ? 'alert-error' : 'alert-success'">
            <span>{{ submitMessage }}</span>
          </div>
          <div class="modal-action">
            <button type="button" @click="closeModal" class="btn btn-outline" :disabled="submitting">Annuller</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              <span v-if="submitting" class="loading loading-spinner loading-sm mr-2"></span>
              {{ editMode ? 'Opdater' : 'Opret' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Slet farve</h3>
        <div v-if="deletingColour" class="mb-6">
          <p class="mb-2">Er du sikker på, at du vil slette denne farve?</p>
          <div class="bg-base-200 p-4 rounded-lg">
            <p class="font-medium">{{ deletingColour.name }}</p>
          </div>
          <div class="alert alert-warning mt-4">
            <span>Denne handling kan ikke fortrydes. Alle tilknyttede annoncer vil blive påvirket.</span>
          </div>
        </div>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn btn-ghost" :disabled="deleting">Annuller</button>
          <button @click="confirmDelete" class="btn btn-error" :disabled="deleting">
            <span v-if="deleting" class="loading loading-spinner loading-sm"></span>
            Slet permanent
          </button>
        </div>
      </div>
    </div>
  </div>
</template> 