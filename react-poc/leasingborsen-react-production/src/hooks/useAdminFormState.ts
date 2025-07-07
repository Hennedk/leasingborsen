import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useCreateListingWithOffers, useUpdateListingWithOffers } from '@/hooks/mutations'
import { carListingSchema, type CarListingFormData } from '@/lib/validations'
import { useAutoSave } from '@/hooks/useAutoSave'
import type { CarListing } from '@/types'

interface UseAdminFormStateProps {
  listing?: CarListing
  isEditing?: boolean
}

/**
 * useAdminFormState - Centralized form state management for admin listing forms
 * Extracted from AdminListingFormNew for better separation of concerns
 */
export const useAdminFormState = ({ listing, isEditing = false }: UseAdminFormStateProps) => {
  const navigate = useNavigate()
  const { data: referenceData, isLoading: referenceLoading } = useReferenceData()
  const createMutation = useCreateListingWithOffers()
  const updateMutation = useUpdateListingWithOffers()
  
  // Local state
  const [currentListingId, setCurrentListingId] = useState<string | undefined>(
    listing?.listing_id || listing?.id
  )
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedMakeId, setSelectedMakeId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processedImages, setProcessedImages] = useState<{
    grid: string | null
    detail: string | null
  }>({ grid: null, detail: null })
  const [currentImages, setCurrentImages] = useState<string[]>(
    listing?.image ? [listing.image] : []
  )
  const isAutoSavingRef = useRef(false)
  const preventWatcherOverride = useRef(false)

  // Form default values
  const defaultValues = useMemo(() => ({
    // Vehicle Information
    make: listing?.make || '',
    model: listing?.model || '',
    variant: listing?.variant || '',
    body_type: listing?.body_type || '',
    fuel_type: listing?.fuel_type || '',
    transmission: listing?.transmission || '',
    horsepower: listing?.horsepower?.toString() || '' as any,
    seats: listing?.seats?.toString() || '' as any,
    doors: listing?.doors?.toString() || '' as any,
    description: listing?.description || '',
    
    // Environmental & Consumption
    co2_emission: listing?.co2_emission?.toString() || '' as any,
    co2_tax_half_year: listing?.co2_tax_half_year?.toString() || '' as any,
    consumption_l_100km: listing?.consumption_l_100km?.toString() || '' as any,
    consumption_kwh_100km: listing?.consumption_kwh_100km?.toString() || '' as any,
    wltp: listing?.wltp?.toString() || '' as any,
    
    // Pricing
    retail_price: listing?.retail_price?.toString() || '' as any,
    
    // Seller
    seller_id: listing?.seller_id || '',
    
    // Media
    images: listing?.image ? [listing.image] : [],
    image_urls: [],
    processed_image_grid: listing?.processed_image_grid || '',
    processed_image_detail: listing?.processed_image_detail || '',
  }), [listing])

  // Initialize form
  const form = useForm<CarListingFormData>({
    resolver: zodResolver(carListingSchema) as any,
    mode: 'onChange',
    defaultValues
  })

  // Auto-save function for images only
  const performImageAutoSave = useCallback(async (images: string[]) => {
    console.log('performImageAutoSave called with:', { 
      images, 
      currentListingId, 
      isEditing, 
      isAutoSaving: isAutoSavingRef.current,
      hasReferenceData: !!referenceData 
    })
    
    // Prevent concurrent auto-saves
    if (isAutoSavingRef.current) {
      console.log('Skipping auto-save: Already in progress')
      return
    }

    // Only auto-save if we have a current listing ID (editing mode)
    if (!currentListingId || !isEditing) {
      console.log('Skipping auto-save: No listing ID or not in edit mode', { currentListingId, isEditing })
      return
    }

    // Set flag to prevent concurrent saves
    isAutoSavingRef.current = true

    try {
      // Get current form data
      const formData = form.getValues()
      
      // Find reference data IDs
      const makeId = referenceData?.makes?.find(m => m.name === formData.make)?.id
      const modelId = referenceData?.models?.find(m => m.name === formData.model)?.id
      const bodyTypeId = referenceData?.bodyTypes?.find(bt => bt.name === formData.body_type)?.id
      const fuelTypeId = referenceData?.fuelTypes?.find(ft => ft.name === formData.fuel_type)?.id
      const transmissionId = referenceData?.transmissions?.find(t => t.name === formData.transmission)?.id

      if (!makeId || !modelId || !bodyTypeId || !fuelTypeId || !transmissionId) {
        console.log('Skipping auto-save: Missing reference data')
        return
      }

      // Prepare minimal listing data for auto-save (only images and essential data)
      const listingData = {
        make_id: makeId,
        model_id: modelId,
        body_type_id: bodyTypeId,
        fuel_type_id: fuelTypeId,
        transmission_id: transmissionId,
        variant: formData.variant || null,
        horsepower: formData.horsepower ? parseInt(formData.horsepower as unknown as string) : null,
        seats: formData.seats ? parseInt(formData.seats as unknown as string) : null,
        doors: formData.doors ? parseInt(formData.doors as unknown as string) : null,
        description: formData.description || null,
        co2_emission: formData.co2_emission ? parseInt(formData.co2_emission as unknown as string) : null,
        co2_tax_half_year: formData.co2_tax_half_year ? parseInt(formData.co2_tax_half_year as unknown as string) : null,
        consumption_l_100km: formData.consumption_l_100km ? parseFloat(formData.consumption_l_100km as unknown as string) : null,
        consumption_kwh_100km: formData.consumption_kwh_100km ? parseFloat(formData.consumption_kwh_100km as unknown as string) : null,
        wltp: formData.wltp ? parseInt(formData.wltp as unknown as string) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price as unknown as string) : null,
        seller_id: formData.seller_id || null,
        image: images?.[0] || null,
        images: images || [],
        processed_image_grid: processedImages.grid || null,
        processed_image_detail: processedImages.detail || null,
      }

      await updateMutation.mutateAsync({
        listingId: currentListingId,
        listingUpdates: listingData as any,
        offers: undefined
      })

      // Clear unsaved changes after successful auto-save
      console.log('🔄 Starting auto-save state reset...')
      preventWatcherOverride.current = true
      setHasUnsavedChanges(false)
      
      // Reset form dirty state to reflect that data is now saved
      const currentValues = form.getValues()
      console.log('📋 Current form values before reset:', JSON.stringify(currentValues, null, 2))
      
      // Update the current values to reflect the auto-saved images
      currentValues.images = images
      currentValues.image_urls = images
      currentValues.processed_image_grid = processedImages.grid || ''
      currentValues.processed_image_detail = processedImages.detail || ''
      
      console.log('📋 Updated values for reset:', JSON.stringify(currentValues, null, 2))
      form.reset(currentValues)
      
      console.log('✅ Form reset completed, isDirty:', form.formState.isDirty)
      console.log('📊 Dirty fields after reset:', JSON.stringify(form.formState.dirtyFields, null, 2))
      
      // Allow watcher to resume after a brief delay
      setTimeout(() => {
        preventWatcherOverride.current = false
        console.log('🔓 Form watcher re-enabled')
      }, 100)
      
      console.log('Images auto-saved successfully')
    } catch (error: any) {
      console.error('Auto-save failed:', error)
      throw new Error(error?.message || 'Auto-gemning fejlede')
    } finally {
      // Always reset the flag
      isAutoSavingRef.current = false
    }
  }, [currentListingId, isEditing, form, referenceData, processedImages])

  // Auto-save hook for images
  const autoSaveEnabled = isEditing && !!currentListingId && !!referenceData
  console.log('Auto-save enabled check:', { 
    autoSaveEnabled, 
    isEditing, 
    currentListingId, 
    hasReferenceData: !!referenceData,
    currentImages 
  })
  
  const imageAutoSave = useAutoSave(currentImages, {
    delay: 1500,
    onSave: performImageAutoSave,
    enabled: autoSaveEnabled,
    onSuccess: () => {
      console.log('Auto-save success callback triggered')
      // Additional success handling if needed
    },
    onError: (error) => {
      console.error('Auto-save error callback triggered:', error)
    }
  })

  // Calculate loading state
  const isLoading = useMemo(() => 
    createMutation.isPending || updateMutation.isPending || isSubmitting || imageAutoSave.isAutoSaving,
    [createMutation.isPending, updateMutation.isPending, isSubmitting, imageAutoSave.isAutoSaving]
  )

  // Event handlers
  const handleMakeChange = useCallback((makeId: string) => {
    const make = referenceData?.makes?.find(m => m.id === makeId)
    if (make) {
      setSelectedMakeId(makeId)
      form.setValue('make', make.name, { shouldDirty: true })
      form.setValue('model', '', { shouldDirty: true })
    }
  }, [referenceData?.makes, form])

  const handleModelChange = useCallback((modelId: string) => {
    const model = referenceData?.models?.find(m => m.id === modelId)
    if (model) {
      // Any additional logic when model changes can go here
    }
  }, [referenceData?.models])

  const handleImagesChange = useCallback((images: string[]) => {
    // Compare against currentImages state, not form values (which may already be updated)
    const changed = JSON.stringify(currentImages) !== JSON.stringify(images)
    
    console.log('handleImagesChange called:', { 
      newImages: images, 
      currentImages,
      changed,
      newImagesStr: JSON.stringify(images),
      currentImagesStr: JSON.stringify(currentImages),
      isEditing,
      currentListingId 
    })
    
    if (changed) {
      form.setValue('images', images, { shouldDirty: true })
      form.setValue('image_urls', images, { shouldDirty: true })
      setCurrentImages(images) // This will trigger auto-save
      console.log('Form values updated, triggering auto-save')
    } else {
      console.log('No change detected, skipping auto-save. Images already match.')
    }
  }, [form, isEditing, currentListingId, currentImages])

  const handleProcessedImagesChange = useCallback((grid: string | null, detail: string | null) => {
    setProcessedImages({ grid, detail })
    if (grid) form.setValue('processed_image_grid', grid, { shouldDirty: true })
    if (detail) form.setValue('processed_image_detail', detail, { shouldDirty: true })
  }, [form])

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('Du har ikke-gemte ændringer. Er du sikker på, at du vil forlade siden?')
      if (!confirmed) return
    }
    navigate('/admin/listings')
  }, [hasUnsavedChanges, navigate])

  const handleReset = useCallback(() => {
    if (listing && referenceData) {
      form.reset(defaultValues)
      
      // Reset make selection
      if (listing.make_id) {
        const make = referenceData.makes?.find(m => m.id === listing.make_id)
        if (make) {
          setSelectedMakeId(make.id)
        }
      } else if (listing.make) {
        const make = referenceData.makes?.find(m => m.name === listing.make)
        if (make) {
          setSelectedMakeId(make.id)
        }
      }
      
      setTimeout(() => {
        setHasUnsavedChanges(false)
        form.reset(form.getValues())
      }, 0)
      
      toast.success('Formular nulstillet til original værdier')
    }
  }, [listing, referenceData, defaultValues, form])

  // Form submission
  const handleSubmit = useCallback(async (data: CarListingFormData) => {
    if (isLoading) return
    
    setIsSubmitting(true)
    
    try {
      // Find reference data IDs
      const makeId = referenceData?.makes?.find(m => m.name === data.make)?.id
      const modelId = referenceData?.models?.find(m => m.name === data.model)?.id
      const bodyTypeId = referenceData?.bodyTypes?.find(bt => bt.name === data.body_type)?.id
      const fuelTypeId = referenceData?.fuelTypes?.find(ft => ft.name === data.fuel_type)?.id
      const transmissionId = referenceData?.transmissions?.find(t => t.name === data.transmission)?.id

      if (!makeId || !modelId || !bodyTypeId || !fuelTypeId || !transmissionId) {
        throw new Error('Manglende reference data IDs. Sørg for at alle felter er udfyldt.')
      }

      // Prepare listing data
      const listingData = {
        make_id: makeId,
        model_id: modelId,
        body_type_id: bodyTypeId,
        fuel_type_id: fuelTypeId,
        transmission_id: transmissionId,
        variant: data.variant || null,
        horsepower: data.horsepower ? parseInt(data.horsepower as unknown as string) : null,
        seats: data.seats ? parseInt(data.seats as unknown as string) : null,
        doors: data.doors ? parseInt(data.doors as unknown as string) : null,
        description: data.description || null,
        co2_emission: data.co2_emission ? parseInt(data.co2_emission as unknown as string) : null,
        co2_tax_half_year: data.co2_tax_half_year ? parseInt(data.co2_tax_half_year as unknown as string) : null,
        consumption_l_100km: data.consumption_l_100km ? parseFloat(data.consumption_l_100km as unknown as string) : null,
        consumption_kwh_100km: data.consumption_kwh_100km ? parseFloat(data.consumption_kwh_100km as unknown as string) : null,
        wltp: data.wltp ? parseInt(data.wltp as unknown as string) : null,
        retail_price: data.retail_price ? parseFloat(data.retail_price as unknown as string) : null,
        seller_id: data.seller_id || null,
        image: data.images?.[0] || null,
        images: data.images || [],
        processed_image_grid: processedImages.grid || null,
        processed_image_detail: processedImages.detail || null,
      }

      if (isEditing && currentListingId) {
        const result = await updateMutation.mutateAsync({
          listingId: currentListingId,
          listingUpdates: listingData as any,
          offers: undefined
        })
        
        toast.success('Annoncen blev opdateret succesfuldt')
        
        // Update form with the fresh data from the server
        if (result?.updatedListing) {
          // Build fresh form data from the server response
          const freshData = {
            // Vehicle Information
            make: result.updatedListing.make || '',
            model: result.updatedListing.model || '',
            variant: result.updatedListing.variant || '',
            body_type: result.updatedListing.body_type || '',
            fuel_type: result.updatedListing.fuel_type || '',
            transmission: result.updatedListing.transmission || '',
            horsepower: result.updatedListing.horsepower?.toString() || '' as any,
            seats: result.updatedListing.seats?.toString() || '' as any,
            doors: result.updatedListing.doors?.toString() || '' as any,
            description: result.updatedListing.description || '',
            
            // Environmental & Consumption
            co2_emission: result.updatedListing.co2_emission?.toString() || '' as any,
            co2_tax_half_year: result.updatedListing.co2_tax_half_year?.toString() || '' as any,
            consumption_l_100km: result.updatedListing.consumption_l_100km?.toString() || '' as any,
            consumption_kwh_100km: result.updatedListing.consumption_kwh_100km?.toString() || '' as any,
            wltp: result.updatedListing.wltp?.toString() || '' as any,
            
            // Pricing
            retail_price: result.updatedListing.retail_price?.toString() || '' as any,
            
            // Seller
            seller_id: result.updatedListing.seller_id || '',
            
            // Media
            images: result.updatedListing.image ? [result.updatedListing.image] : [],
            image_urls: [],
            processed_image_grid: result.updatedListing.processed_image_grid || '',
            processed_image_detail: result.updatedListing.processed_image_detail || '',
          }
          
          // Reset form state immediately with fresh data
          setHasUnsavedChanges(false)
          
          // Use setTimeout to ensure React has processed the state update
          setTimeout(() => {
            console.log('Resetting form with fresh data:', { retail_price: freshData.retail_price })
            form.reset(freshData, {
              keepValues: false,
              keepDirty: false,
              keepDirtyValues: false,
              keepErrors: false,
              keepTouched: false,
              keepIsSubmitted: false,
            })
          }, 0)
        }
      } else {
        const result = await createMutation.mutateAsync({
          listingData: listingData as any,
          offers: undefined
        })
        
        if (result?.newListing?.id) {
          setCurrentListingId(result.newListing.id)
        }
        
        toast.success('Ny annonce blev oprettet succesfuldt')
        setHasUnsavedChanges(false)
      }
      
    } catch (error: any) {
      console.error('Form submission failed:', error)
      toast.error(error?.message || 'Der opstod en fejl ved gemning')
    } finally {
      setIsSubmitting(false)
    }
  }, [isLoading, referenceData, currentListingId, isEditing, createMutation, updateMutation])

  // Sync currentImages with listing changes (but not during auto-save)
  useEffect(() => {
    if (listing && !isAutoSavingRef.current) {
      const listingImages = listing.image ? [listing.image] : []
      const currentFormImages = form.getValues('images') || []
      
      // Only update if we're not already in sync and not auto-saving
      if (JSON.stringify(listingImages) !== JSON.stringify(currentFormImages) && 
          JSON.stringify(listingImages) !== JSON.stringify(currentImages)) {
        setCurrentImages(listingImages)
      }
    }
  }, [listing?.image, listing?.images, form])

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      let hasChanges = form.formState.isDirty
      
      // Special handling for fields that might not be detected by RHF
      if (!hasChanges && name) {
        // Handle special cases for form change detection
        if (name === 'seller_id') {
          const currentSellerId = value?.seller_id
          const originalSellerId = form.formState.defaultValues?.seller_id || ''
          hasChanges = currentSellerId !== originalSellerId
        }
        
        if (name === 'make' || name === 'model' || name === 'transmission' || 
            name === 'body_type' || name === 'fuel_type') {
          const currentFieldValue = (value as any)?.[name] || ''
          const originalFieldValue = (form.formState.defaultValues as any)?.[name] || ''
          hasChanges = currentFieldValue !== originalFieldValue
        }
        
        if (name === 'images' || name === 'image_urls') {
          const currentImages = value?.images || []
          const originalImages = form.formState.defaultValues?.images || []
          hasChanges = JSON.stringify(currentImages) !== JSON.stringify(originalImages)
        }
      }
      
      // Don't override hasUnsavedChanges if we just auto-saved
      if (!preventWatcherOverride.current) {
        // Only log significant changes, not every keystroke
        if (hasChanges !== hasUnsavedChanges) {
          console.log('Form state changed:', { hasChanges, isDirty: form.formState.isDirty, fieldName: name })
        }
        setHasUnsavedChanges(hasChanges)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, hasUnsavedChanges])

  // Initialize form data when listing changes
  useEffect(() => {
    if (listing && referenceData?.makes && isEditing) {
      const currentListingInForm = form.getValues()
      const hasFormData = currentListingInForm.make || currentListingInForm.model || currentListingInForm.variant
      
      if (hasUnsavedChanges && hasFormData) {
        console.log('🛡️ Preserving form data during cache update - has unsaved changes')
        return
      }
      
      if (hasFormData && currentListingId === listing.listing_id) {
        console.log('🛡️ Preserving form data for same listing ID:', currentListingId)
        return
      }
      
      if (currentListingId !== listing.listing_id || !hasFormData) {
        console.log('✅ Resetting form for listing change:', listing.listing_id)
        
        form.reset(defaultValues)
        
        if (listing.make_id) {
          const make = referenceData.makes.find(m => m.id === listing.make_id)
          if (make) {
            setSelectedMakeId(make.id)
          }
        } else if (listing.make) {
          const make = referenceData.makes.find(m => m.name === listing.make)
          if (make) {
            setSelectedMakeId(make.id)
          }
        }
        
        setTimeout(() => {
          setHasUnsavedChanges(false)
          form.reset(form.getValues())
        }, 100)
      }
    }
  }, [listing?.id, referenceData?.makes, isEditing, defaultValues, form, currentListingId, hasUnsavedChanges])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!isLoading) {
          form.handleSubmit(handleSubmit)()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, form, handleSubmit])

  return {
    // Form instance
    form,
    
    // State
    isLoading,
    hasUnsavedChanges,
    selectedMakeId,
    currentListingId,
    referenceLoading,
    referenceData,
    isEditing,
    
    // Auto-save state
    isAutoSaving: imageAutoSave.isAutoSaving,
    autoSaveError: imageAutoSave.error,
    lastSaved: imageAutoSave.lastSaved,
    
    // Handlers
    handleSubmit,
    handleCancel,
    handleReset,
    handleMakeChange,
    handleModelChange,
    handleImagesChange,
    handleProcessedImagesChange
  }
}