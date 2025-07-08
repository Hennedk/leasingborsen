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
 * 
 * Handles form state, validation, auto-save for images, and manual save for other fields
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
    defaultValues,
    resetOptions: {
      keepDirtyValues: false,
      keepErrors: false
    }
  })

  // Auto-save function for images only
  const performImageAutoSave = useCallback(async (images: string[]) => {
    
    // Prevent concurrent auto-saves
    if (isAutoSavingRef.current) {
      return
    }

    // Only auto-save if we have a current listing ID (editing mode)
    if (!currentListingId || !isEditing) {
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
      preventWatcherOverride.current = true
      setHasUnsavedChanges(false)
      
      // Reset form dirty state to reflect that data is now saved
      const currentValues = form.getValues()
      
      // Update the current values to reflect the auto-saved images
      currentValues.images = images
      currentValues.image_urls = images
      currentValues.processed_image_grid = processedImages.grid || ''
      currentValues.processed_image_detail = processedImages.detail || ''
      
      form.reset(currentValues)
      
      // Allow watcher to resume after a brief delay
      setTimeout(() => {
        preventWatcherOverride.current = false
      }, 100)
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
  
  const imageAutoSave = useAutoSave(currentImages, {
    delay: 1500,
    onSave: performImageAutoSave,
    enabled: autoSaveEnabled
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
    
    if (changed) {
      // Don't mark as dirty since images auto-save
      form.setValue('images', images, { shouldDirty: false })
      form.setValue('image_urls', images, { shouldDirty: false })
      setCurrentImages(images) // This will trigger auto-save
    }
  }, [form, isEditing, currentListingId, currentImages])

  const handleProcessedImagesChange = useCallback((grid: string | null, detail: string | null) => {
    setProcessedImages({ grid, detail })
    // Don't mark as dirty since processed images are part of auto-save
    if (grid) form.setValue('processed_image_grid', grid, { shouldDirty: false })
    if (detail) form.setValue('processed_image_detail', detail, { shouldDirty: false })
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
    if (isLoading) {
      return
    }
    
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
        console.log('🔍 Updating listing with data:', { 
          listingId: currentListingId,
          retail_price: listingData.retail_price,
          raw_retail_price: data.retail_price
        })
        
        await updateMutation.mutateAsync({
          listingId: currentListingId,
          listingUpdates: listingData as any,
          offers: undefined
        })
        toast.success('Annoncen blev opdateret succesfuldt')
        
        // Clear the dirty state without resetting form values
        preventWatcherOverride.current = true
        setHasUnsavedChanges(false)
        
        // Keep the current form values but mark as not dirty
        const currentValues = form.getValues()
        
        // Use setTimeout to ensure React has processed the state update
        setTimeout(() => {
          // Reset form with current values to clear dirty state
          form.reset(currentValues, {
            keepValues: true,
            keepDefaultValues: false
          })
          
          // Allow watcher to resume
          setTimeout(() => {
            preventWatcherOverride.current = false
            setHasUnsavedChanges(false)
          }, 100)
        }, 100)
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
      console.error('Error details:', { 
        message: error?.message, 
        stack: error?.stack,
        fullError: error 
      })
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
      // Skip watcher during form submission
      if (isSubmitting) {
        return
      }

      // Skip image-related fields since they auto-save
      if (name === 'images' || name === 'image_urls' || 
          name === 'processed_image_grid' || name === 'processed_image_detail') {
        return
      }

      // Check if form is dirty, but exclude image fields from the check
      const dirtyFields = Object.keys(form.formState.dirtyFields)
      const nonImageDirtyFields = dirtyFields.filter(field => 
        field !== 'images' && 
        field !== 'image_urls' && 
        field !== 'processed_image_grid' && 
        field !== 'processed_image_detail'
      )
      let hasChanges = nonImageDirtyFields.length > 0
      
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
        
        
        // Handle numeric fields that might be strings
        if (name === 'retail_price' || name === 'horsepower' || name === 'seats' || 
            name === 'doors' || name === 'co2_emission' || name === 'co2_tax_half_year' ||
            name === 'consumption_l_100km' || name === 'consumption_kwh_100km' || name === 'wltp') {
          const currentValue = (value as any)?.[name]
          const originalValue = (form.formState.defaultValues as any)?.[name]
          
          // Compare as strings to handle type mismatches
          const currentStr = currentValue?.toString() || ''
          const originalStr = originalValue?.toString() || ''
          
          if (currentStr !== originalStr) {
            hasChanges = true
          }
        }
      }
      
      // Don't override hasUnsavedChanges if we just auto-saved or are submitting
      if (!preventWatcherOverride.current && !isSubmitting) {
        setHasUnsavedChanges(hasChanges)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, hasUnsavedChanges, isSubmitting])

  // Initialize form data when listing changes
  useEffect(() => {
    if (listing && referenceData?.makes && isEditing) {
      const currentListingInForm = form.getValues()
      const hasFormData = currentListingInForm.make || currentListingInForm.model || currentListingInForm.variant
      
      if (hasUnsavedChanges && hasFormData && !isSubmitting) {
        return
      }
      
      if (hasFormData && currentListingId === listing.listing_id) {
        return
      }
      
      if (currentListingId !== listing.listing_id || !hasFormData) {
        
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