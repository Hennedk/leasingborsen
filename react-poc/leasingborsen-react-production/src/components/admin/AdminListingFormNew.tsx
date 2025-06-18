import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Form,
} from '@/components/ui/form'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useCreateListingWithOffers, useUpdateListingWithOffers } from '@/hooks/mutations'
import { carListingSchema, type CarListingFormData } from '@/lib/validations'
import { Save, ArrowLeft, RotateCcw } from 'lucide-react'
import type { CarListing } from '@/types'
import {
  BasicInfoSection,
  SpecificationsSection,
  MediaSection,
  OffersSection,
  SellerSection
} from './form-sections'

interface AdminListingFormProps {
  listing?: CarListing
  isEditing?: boolean
}


const AdminListingFormNew: React.FC<AdminListingFormProps> = ({ 
  listing, 
  isEditing = false 
}) => {
  const navigate = useNavigate()
  const { data: referenceData, isLoading: referenceLoading } = useReferenceData()
  const createMutation = useCreateListingWithOffers()
  const updateMutation = useUpdateListingWithOffers()
  
  // State management
  const [currentListingId, setCurrentListingId] = useState<string | undefined>(
    listing?.listing_id || listing?.id
  )
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedMakeId, setSelectedMakeId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form initialization with memoized default values
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

  // Initialize form with validation
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


  // Event handlers with useCallback
  const handleMakeChange = useCallback((makeId: string) => {
    const make = referenceData?.makes?.find(m => m.id === makeId)
    if (make) {
      setSelectedMakeId(makeId)
      // Update the form field with the make name
      form.setValue('make', make.name, { shouldDirty: true })
      // Reset model when make changes
      form.setValue('model', '', { shouldDirty: true })
    }
  }, [referenceData?.makes, form])

  const handleModelChange = useCallback((modelId: string) => {
    // The form field will handle the setValue - we just need this for any additional logic
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
      // Reset form to original values
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
      
      // Force reset dirty state with a timeout to ensure form state is properly updated
      setTimeout(() => {
        setHasUnsavedChanges(false)
        // Force form to recognize this as the new clean state
        form.reset(form.getValues())
      }, 0)
      
      toast.success('Formular nulstillet til original værdier')
    }
  }, [listing, referenceData, defaultValues, form])

  // Form submission handler
  const onSubmitCarDetails = useCallback(async (data: CarListingFormData) => {
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
      // Don't reset form values after save - just mark as clean
      // The cache invalidation will handle updating the form with fresh data
      
    } catch (error: any) {
      console.error('Form submission failed:', error)
      toast.error(error?.message || 'Der opstod en fejl ved gemning')
    } finally {
      setIsSubmitting(false)
    }
  }, [isLoading, referenceData, currentListingId, isEditing, createMutation, updateMutation, form])

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      let hasChanges = form.formState.isDirty
      
      // Special handling for seller_id changes since RHF doesn't detect them reliably
      if (!hasChanges && name === 'seller_id') {
        const currentSellerId = value?.seller_id
        const originalSellerId = form.formState.defaultValues?.seller_id || ''
        hasChanges = currentSellerId !== originalSellerId
      }
      
      // Special handling for make/model changes that might not be detected by RHF
      if (!hasChanges && (name === 'make' || name === 'model')) {
        const currentValue = value?.[name]
        const originalValue = form.formState.defaultValues?.[name] || ''
        hasChanges = currentValue !== originalValue
      }
      
      // Special handling for dropdown fields that might not be detected by RHF
      if (!hasChanges && (name === 'transmission' || name === 'body_type' || name === 'fuel_type')) {
        const currentValue = value?.[name] || ''
        const originalValue = form.formState.defaultValues?.[name] || ''
        hasChanges = currentValue !== originalValue
      }
      
      // Special handling for images array changes that might not be detected by RHF
      if (!hasChanges && (name === 'images' || name === 'image_urls')) {
        const currentImages = value?.images || []
        const originalImages = form.formState.defaultValues?.images || []
        hasChanges = JSON.stringify(currentImages) !== JSON.stringify(originalImages)
      }
      
      setHasUnsavedChanges(hasChanges)
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Initialize form data when listing changes
  useEffect(() => {
    if (listing && referenceData?.makes && isEditing) {
      // Only reset if this is actually a different listing or first load
      const currentListingInForm = form.getValues()
      const hasFormData = currentListingInForm.make || currentListingInForm.model || currentListingInForm.variant
      
      // Protective check: Don't reset form if we have unsaved changes or recent data
      if (hasUnsavedChanges && hasFormData) {
        console.log('🛡️ Preserving form data during cache update - has unsaved changes')
        return
      }
      
      // Don't reset form if we have data and it's the same listing (prevents wiping during refetch)
      if (hasFormData && currentListingId === listing.listing_id) {
        console.log('🛡️ Preserving form data for same listing ID:', currentListingId)
        return
      }
      
      // Only reset if listing actually changed or this is initial load
      if (currentListingId !== listing.listing_id || !hasFormData) {
        console.log('✅ Resetting form for listing change:', listing.listing_id)
        
        // Reset form with the listing data to establish proper default state
        form.reset(defaultValues)
        
        // Set make selection
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
        
        // Force clean state after initialization
        setTimeout(() => {
          setHasUnsavedChanges(false)
          // Ensure form recognizes current values as the clean baseline
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
          form.handleSubmit(onSubmitCarDetails)()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLoading, form, onSubmitCarDetails])


  if (referenceLoading) {
    return <div>Indlæser...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-0 max-w-6xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitCarDetails)} className="space-y-8">
            {/* Header Navigation */}
            <div className="flex items-center justify-between mb-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Tilbage til annoncer
              </Button>
            </div>

            {/* Header with Save Actions */}
            <Card className="shadow-lg border-border/50">
              <CardHeader className="py-6 px-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-semibold">
                      {isEditing ? 'Rediger bil' : 'Opret ny bil'}
                    </CardTitle>
                    <p className="text-muted-foreground mt-2">
                      {isEditing ? 'Opdater bilens oplysninger nedenfor' : 'Udfyld alle nødvendige felter for at oprette en ny bil'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(hasUnsavedChanges || !currentListingId) && (
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
                        Ctrl+S for at gemme
                      </span>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isLoading || (Boolean(currentListingId) && !hasUnsavedChanges)} 
                      className="flex items-center gap-2 px-6"
                      size="lg"
                    >
                      <Save className="h-4 w-4" />
                      {isLoading ? 'Gemmer...' : 
                       currentListingId && !hasUnsavedChanges ? 'Bil gemt' :
                       (isEditing ? 'Gem biloplysninger' : 'Opret bil')}
                    </Button>
                    {isEditing && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleReset}
                        disabled={isLoading || !hasUnsavedChanges}
                        className="flex items-center gap-2 px-6"
                        size="lg"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Nulstil
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* All Form Sections in One Page */}
            <div className="space-y-8">
              {/* Basic Information */}
              <Card className="shadow-lg border-border/50">
                <CardHeader className="py-4 px-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    Grundoplysninger
                    <span className="text-destructive text-sm">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6 px-4">
                  <BasicInfoSection
                    control={form.control}
                    referenceData={referenceData!}
                    selectedMakeId={selectedMakeId}
                    onMakeChange={handleMakeChange}
                    onModelChange={handleModelChange}
                    setValue={form.setValue}
                  />
                </CardContent>
              </Card>

              {/* Specifications */}
              <Card className="shadow-lg border-border/50">
                <CardHeader className="py-4 px-4 border-b border-border/50">
                  <CardTitle className="text-xl">Specifikationer</CardTitle>
                </CardHeader>
                <CardContent className="py-6 px-4">
                  <SpecificationsSection 
                    control={form.control} 
                    fuelType={form.watch('fuel_type')}
                  />
                </CardContent>
              </Card>

              {/* Seller */}
              <Card className="shadow-lg border-border/50">
                <CardHeader className="py-4 px-4 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    Sælger
                    <span className="text-destructive text-sm">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-6 px-4">
                  <SellerSection 
                    control={form.control} 
                    setValue={form.setValue}
                  />
                </CardContent>
              </Card>

              {/* Media */}
              <Card className="shadow-lg border-border/50">
                <CardHeader className="py-4 px-4 border-b border-border/50">
                  <CardTitle className="text-xl">Billeder</CardTitle>
                </CardHeader>
                <CardContent className="py-6 px-4">
                  <MediaSection 
                    control={form.control}
                    onImagesChange={handleImagesChange}
                  />
                </CardContent>
              </Card>

              {/* Offers */}
              <Card className="shadow-lg border-border/50">
                <CardHeader className="py-4 px-4 border-b border-border/50">
                  <CardTitle className="text-xl">Tilbud</CardTitle>
                </CardHeader>
                <CardContent className="py-6 px-4">
                  <OffersSection 
                    control={form.control}
                    currentListingId={currentListingId}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Footer Spacing */}
            <div className="py-8"></div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default AdminListingFormNew