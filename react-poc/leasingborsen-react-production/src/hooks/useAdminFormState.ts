import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useCreateListingWithOffers, useUpdateListingWithOffers } from '@/hooks/mutations'
import { carListingSchema, type CarListingFormData } from '@/lib/validations'
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
    
    // Seller
    seller_id: listing?.seller_id || '',
    
    // Media
    images: listing?.image ? [listing.image] : [],
    image_urls: [],
  }), [listing])

  // Initialize form
  const form = useForm<CarListingFormData>({
    resolver: zodResolver(carListingSchema) as any,
    mode: 'onChange',
    defaultValues
  })

  // Calculate loading state
  const isLoading = useMemo(() => 
    createMutation.isPending || updateMutation.isPending || isSubmitting,
    [createMutation.isPending, updateMutation.isPending, isSubmitting]
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
    form.setValue('images', images, { shouldDirty: true })
    form.setValue('image_urls', images, { shouldDirty: true })
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
        seller_id: data.seller_id || null,
        image: data.images?.[0] || null,
      }

      if (isEditing && currentListingId) {
        await updateMutation.mutateAsync({
          listingId: currentListingId,
          listingUpdates: listingData as any,
          offers: undefined
        })
        toast.success('Annoncen blev opdateret succesfuldt')
      } else {
        const result = await createMutation.mutateAsync({
          listingData: listingData as any,
          offers: undefined
        })
        
        if (result?.newListing?.id) {
          setCurrentListingId(result.newListing.id)
        }
        
        toast.success('Ny annonce blev oprettet succesfuldt')
      }
      
      setHasUnsavedChanges(false)
      
    } catch (error: any) {
      console.error('Form submission failed:', error)
      toast.error(error?.message || 'Der opstod en fejl ved gemning')
    } finally {
      setIsSubmitting(false)
    }
  }, [isLoading, referenceData, currentListingId, isEditing, createMutation, updateMutation])

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
      
      setHasUnsavedChanges(hasChanges)
    })
    return () => subscription.unsubscribe()
  }, [form])

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
    
    // Handlers
    handleSubmit,
    handleCancel,
    handleReset,
    handleMakeChange,
    handleModelChange,
    handleImagesChange
  }
}