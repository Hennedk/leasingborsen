import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useCreateListingWithOffers, useUpdateListingWithOffers } from '@/hooks/useMutations'
import { carListingSchema, type CarListingFormData } from '@/lib/validations'
import { Save, ArrowLeft, HelpCircle, RotateCcw } from 'lucide-react'
import type { CarListing } from '@/types'
import { SellerSelect } from './SellerSelect'
import { ImageUpload } from './ImageUpload'
import { OffersTableManager } from './OffersTableManager'

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
  
  // Track the current listing ID (for new listings, this gets set after creation)
  const [currentListingId, setCurrentListingId] = useState<string | undefined>(
    listing?.listing_id || listing?.id
  )

  // State for UX enhancements
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [selectedMakeId, setSelectedMakeId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form with validation
  const form = useForm<CarListingFormData>({
    resolver: zodResolver(carListingSchema) as any,
    mode: 'onChange',
    defaultValues: {
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
      seller_id: listing?.seller_id || '', // Use existing seller_id when editing
      
      // Media
      images: listing?.image ? [listing.image] : [],
      image_urls: [],
    },
  })

  // Calculate loading state
  const isLoading = createMutation.isPending || updateMutation.isPending || isSubmitting

  // Watch for changes to show unsaved changes bar
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Use React Hook Form's built-in dirty detection first
      let hasChanges = form.formState.isDirty
      
      // Special handling for seller_id changes since RHF doesn't detect them reliably
      if (!hasChanges && name === 'seller_id') {
        const currentSellerId = value?.seller_id
        const originalSellerId = form.formState.defaultValues?.seller_id || ''
        hasChanges = currentSellerId !== originalSellerId
      }
      
      // For editing mode, also do comprehensive comparison with original values
      if (!hasChanges && listing && isEditing) {
        const currentValues = form.getValues()
        
        // Compare all form fields with original listing data
        // Note: seller_id is excluded since full_listing_view doesn't include it
        const originalData = {
          make: listing.make || '',
          model: listing.model || '',
          variant: listing.variant || '',
          body_type: listing.body_type || '',
          fuel_type: listing.fuel_type || '',
          transmission: listing.transmission || '',
          horsepower: listing.horsepower?.toString() || '',
          seats: listing.seats?.toString() || '',
          doors: listing.doors?.toString() || '',
          description: listing.description || '',
          co2_emission: listing.co2_emission?.toString() || '',
          co2_tax_half_year: listing.co2_tax_half_year?.toString() || '',
          consumption_l_100km: listing.consumption_l_100km?.toString() || '',
          consumption_kwh_100km: listing.consumption_kwh_100km?.toString() || '',
          wltp: listing.wltp?.toString() || '',
          // seller_id excluded - not available in full_listing_view
        }
        
        // Check if any field has changed
        hasChanges = Object.keys(originalData).some(key => {
          const original = originalData[key as keyof typeof originalData]
          const current = currentValues[key as keyof typeof currentValues]
          return original !== current
        })
      }
      
      // For new listings, any non-empty required field should enable save
      if (!hasChanges && !isEditing) {
        const values = form.getValues()
        hasChanges = Boolean(values.make || values.model || values.seller_id)
      }
      
      setHasUnsavedChanges(hasChanges)
    })
    return () => subscription.unsubscribe()
  }, [form, listing, isEditing])

  // Initialize selected make and form values when editing
  useEffect(() => {
    if (listing && referenceData?.makes && isEditing && selectedMakeId === '') {
      // Also ensure currentListingId is set for editing
      const listingId = listing.listing_id || listing.id
      if (listingId && currentListingId !== listingId) {
        setCurrentListingId(listingId)
      }
      console.log('🔍 Initializing edit form with listing:', listing)
      console.log('🔍 Available makes:', referenceData.makes)
      
      // Try to find make by ID first (if we have make_id), then by name
      let make = null
      if (listing.make_id) {
        console.log('🔍 Looking for make by ID:', listing.make_id)
        make = referenceData.makes.find(m => m.id === listing.make_id)
      } else if (listing.make) {
        console.log('🔍 Looking for make by name:', listing.make)
        make = referenceData.makes.find(m => m.name === listing.make)
      }
      
      console.log('🔍 Found make:', make)
      
      if (make) {
        console.log('✅ Setting selectedMakeId to:', make.id)
        setSelectedMakeId(make.id)
        
        // Also ensure the form values are properly set using the resolved names
        form.setValue('make', make.name)
        
        // Find and set other reference data by ID
        if (listing.model_id && referenceData.models) {
          const model = referenceData.models.find(m => m.id === listing.model_id)
          if (model) form.setValue('model', model.name)
        }
        
        if (listing.body_type_id && referenceData.bodyTypes) {
          const bodyType = referenceData.bodyTypes.find(bt => bt.id === listing.body_type_id)
          if (bodyType) form.setValue('body_type', bodyType.name)
        }
        
        if (listing.fuel_type_id && referenceData.fuelTypes) {
          const fuelType = referenceData.fuelTypes.find(ft => ft.id === listing.fuel_type_id)
          if (fuelType) form.setValue('fuel_type', fuelType.name)
        }
        
        if (listing.transmission_id && referenceData.transmissions) {
          const transmission = referenceData.transmissions.find(t => t.id === listing.transmission_id)
          if (transmission) form.setValue('transmission', transmission.name)
        }
        
        form.setValue('variant', listing.variant || '')
        
        // Set the numeric and optional fields
        if (listing.horsepower) form.setValue('horsepower', listing.horsepower.toString() as any)
        if (listing.seats) form.setValue('seats', listing.seats.toString() as any)
        if (listing.doors) form.setValue('doors', listing.doors.toString() as any)
        if (listing.co2_emission) form.setValue('co2_emission', listing.co2_emission.toString() as any)
        if (listing.co2_tax_half_year) form.setValue('co2_tax_half_year', listing.co2_tax_half_year.toString() as any)
        if (listing.consumption_l_100km) form.setValue('consumption_l_100km', listing.consumption_l_100km.toString() as any)
        if (listing.consumption_kwh_100km) form.setValue('consumption_kwh_100km', listing.consumption_kwh_100km.toString() as any)
        if (listing.wltp) form.setValue('wltp', listing.wltp.toString() as any)
        if (listing.description) form.setValue('description', listing.description)
        
        // Set image
        if (listing.image) {
          form.setValue('images', [listing.image])
        }
        
        // Set seller
        if (listing.seller_id) {
          form.setValue('seller_id', listing.seller_id)
        }
        
        // Set offers - convert the listing pricing to an offer format
        // Note: Offers will be set in a separate useEffect when existingOffers loads
        
        // Reset form dirty state after all values are set
        setTimeout(() => {
          form.reset(form.getValues())
        }, 0)
      }
    }
  }, [listing?.id, referenceData?.makes, isEditing, selectedMakeId, currentListingId])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault()
          // Prevent keyboard shortcut during submission
          if (!isLoading) {
            form.handleSubmit(onSubmitCarDetails as any)()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLoading])

  // Get filtered models based on selected make
  const filteredModels = selectedMakeId 
    ? referenceData?.models?.filter(model => model.make_id === selectedMakeId) || []
    : referenceData?.models || []

  // Car details submission (without offers)
  const onSubmitCarDetails = async (data: CarListingFormData) => {
    const submissionId = Date.now()
    console.log('🚀 Starting submission', submissionId)
    
    // Prevent double submission with multiple checks
    if (createMutation.isPending || updateMutation.isPending || isSubmitting) {
      console.log('⚠️ Submission already in progress, ignoring duplicate', submissionId)
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // No offer validation needed for car details only

      // Find the IDs for the selected names
      const makeId = referenceData?.makes?.find(m => m.name === data.make)?.id
      const modelId = referenceData?.models?.find(m => m.name === data.model)?.id
      const bodyTypeId = referenceData?.bodyTypes?.find(bt => bt.name === data.body_type)?.id
      const fuelTypeId = referenceData?.fuelTypes?.find(ft => ft.name === data.fuel_type)?.id
      const transmissionId = referenceData?.transmissions?.find(t => t.name === data.transmission)?.id

      if (!makeId || !modelId || !bodyTypeId || !fuelTypeId || !transmissionId) {
        throw new Error('Manglende reference data IDs. Sørg for at alle felter er udfyldt.')
      }

      // Transform new schema to match actual database table structure
      const legacyData = {
        // Vehicle information - using the actual database column names and IDs
        make_id: makeId,
        model_id: modelId,
        body_type_id: bodyTypeId,
        fuel_type_id: fuelTypeId,
        transmission_id: transmissionId,
        variant: data.variant,
        horsepower: data.horsepower || null,
        seats: data.seats || null,
        doors: data.doors || null,
        description: data.description || null,
        
        // Environmental & Consumption
        co2_emission: data.co2_emission || null,
        co2_tax_half_year: data.co2_tax_half_year || null,
        consumption_l_100km: data.consumption_l_100km || null,
        consumption_kwh_100km: data.consumption_kwh_100km || null,
        wltp: data.wltp || null,
        
        // Media - use first image for legacy image field
        image: data.images && data.images.length > 0 ? data.images[0] : null,
        
        // Seller
        seller_id: data.seller_id || undefined,
        
        // Set defaults for required fields
        year: new Date().getFullYear(), // Set current year as default
        mileage: 0, // Set 0 as default since we're not tracking this anymore
      }

      if (isEditing && listing) {
        const listingId = listing.listing_id || listing.id
        if (!listingId) {
          throw new Error('Listing ID ikke fundet')
        }

        console.log('🔄 Updating car details only:', {
          listingId,
          legacyData
        })

        await updateMutation.mutateAsync({
          listingId,
          listingUpdates: legacyData as any,
          offers: undefined // Don't update offers at all
        })

        console.log('✅ Car details updated successfully')
        toast.success('Annoncen blev opdateret succesfuldt')
        
      } else {
        console.log('🔄 Creating new listing (car details only):', {
          legacyData
        })
        
        // Create listing without offers (offers will be added separately)
        const result = await createMutation.mutateAsync({
          listingData: legacyData as any,
          offers: undefined // No offers needed for new listings
        })
        
        // Update the current listing ID so OffersManager can work
        if (result?.newListing?.id) {
          console.log('🔄 Updating currentListingId from', currentListingId, 'to', result.newListing.id)
          setCurrentListingId(result.newListing.id)
        } else {
          console.log('⚠️ No listing ID found in result:', result)
        }
        
        console.log('✅ New listing created successfully')
        toast.success('Ny annonce blev oprettet succesfuldt')
      }
      
      // Reset form state
      setHasUnsavedChanges(false)
      
      // Reset form dirty state to prevent SaveBar from appearing
      form.reset(form.getValues())
      
    } catch (error: any) {
      console.error('❌ Form submission failed:', error)
      
      // Extract more detailed error information
      let errorMessage = 'Der opstod en ukendt fejl'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      // Show error details in console for debugging
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stack: error?.stack,
        response: error?.response?.data,
      })
      
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Du har ugemte ændringer. Er du sikker på, at du vil forlade siden?')) {
        navigate('/admin/listings')
      }
    } else {
      navigate('/admin/listings')
    }
  }

  const handleMakeChange = (makeId: string) => {
    setSelectedMakeId(makeId)
    const make = referenceData?.makes?.find(m => m.id === makeId)
    if (make) {
      form.setValue('make', make.name)
      form.setValue('model', '') // Reset model when make changes
    }
  }

  const handleModelChange = (modelId: string) => {
    const model = filteredModels.find(m => m.id === modelId)
    if (model) {
      form.setValue('model', model.name)
    }
  }

  // Auto-save images when they change
  // Reset form to latest saved state
  const handleReset = () => {
    if (listing && referenceData?.makes) {
      // Get current seller_id before reset since listing data might not include it
      // (full_listing_view doesn't include seller_id, only seller_name)
      const currentSellerId = form.getValues('seller_id')
      
      // Prepare the reset data
      const resetData = {
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
        
        // Seller - preserve current value since listing data doesn't include seller_id
        seller_id: listing?.seller_id || currentSellerId || '',
        
        // Media
        images: listing?.image ? [listing.image] : [],
        image_urls: [],
      }

      // Reset form with new baseline data
      form.reset(resetData)

      // Also reset the selected make state
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

      // Force clear dirty state after reset
      setTimeout(() => {
        setHasUnsavedChanges(false)
        
        // Force form state to recognize the reset as clean
        form.reset(form.getValues())
      }, 100)
    }
  }

  const handleImagesChange = async (images: string[]) => {
    form.setValue('images', images)
    
    // Only auto-save if we already have a listing ID (not during initial creation)
    if (currentListingId && !isLoading) {
      try {
        // Get current form values
        const formData = form.getValues()
        
        // Find the IDs for the selected names
        const makeId = referenceData?.makes?.find(m => m.name === formData.make)?.id
        const modelId = referenceData?.models?.find(m => m.name === formData.model)?.id
        const bodyTypeId = referenceData?.bodyTypes?.find(bt => bt.name === formData.body_type)?.id
        const fuelTypeId = referenceData?.fuelTypes?.find(ft => ft.name === formData.fuel_type)?.id
        const transmissionId = referenceData?.transmissions?.find(t => t.name === formData.transmission)?.id

        if (!makeId || !modelId || !bodyTypeId || !fuelTypeId || !transmissionId) {
          return // Don't auto-save if missing required data
        }

        // Update only the image field
        const imageUpdateData = {
          image: images && images.length > 0 ? images[0] : null,
        }

        await updateMutation.mutateAsync({
          listingId: currentListingId,
          listingUpdates: imageUpdateData as any,
          offers: undefined
        })
      } catch (error) {
        console.error('❌ Failed to auto-save images:', error)
      }
    }
  }

  if (referenceLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitCarDetails as any)} className="space-y-4">
            {/* Form header */}
            <div className="flex items-center justify-between">
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

            {/* Vehicle Information Container */}
            <Card>
              <CardHeader className="pt-6 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>Bil Information</CardTitle>
                  <div className="flex items-center gap-2">
                    {(hasUnsavedChanges || !currentListingId) && (
                      <span className="text-xs text-muted-foreground">Ctrl+S for at gemme</span>
                    )}
                    <Button 
                      type="submit" 
                      disabled={isLoading || (Boolean(currentListingId) && !hasUnsavedChanges)} 
                      className="flex items-center gap-2"
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
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Nulstil
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Make */}
                  <FormField
                    control={form.control as any}
                    name="make"
                    render={() => (
                      <FormItem>
                        <FormLabel>Mærke *</FormLabel>
                        <Select value={selectedMakeId} onValueChange={handleMakeChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vælg mærke" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {referenceData?.makes?.map((make) => (
                              <SelectItem key={make.id} value={make.id}>
                                {make.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Model */}
                  <FormField
                    control={form.control as any}
                    name="model"
                    render={() => (
                      <FormItem>
                        <FormLabel>Model *</FormLabel>
                        <Select 
                          value={filteredModels.find(m => m.name === form.getValues('model'))?.id || ''} 
                          onValueChange={handleModelChange}
                          disabled={!selectedMakeId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedMakeId ? "Vælg model" : "Vælg først et mærke"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Variant */}
                  <FormField
                    control={form.control as any}
                    name="variant"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Variant
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>F.eks. "2.0 TDI", "Hybrid", "S-Line"</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="f.eks. 2.0 TDI" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Body Type */}
                  <FormField
                    control={form.control as any}
                    name="body_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biltype *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vælg biltype" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {referenceData?.bodyTypes?.map((type) => (
                              <SelectItem key={type.name} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Fuel Type */}
                  <FormField
                    control={form.control as any}
                    name="fuel_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brændstof *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vælg brændstof" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {referenceData?.fuelTypes?.map((type) => (
                              <SelectItem key={type.name} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Transmission */}
                  <FormField
                    control={form.control as any}
                    name="transmission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transmission *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Vælg transmission" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {referenceData?.transmissions?.map((transmission) => (
                              <SelectItem key={transmission.id} value={transmission.name}>
                                {transmission.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Horsepower */}
                  <FormField
                    control={form.control as any}
                    name="horsepower"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hestekræfter</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="2000"
                            placeholder="f.eks. 200"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Seats */}
                  <FormField
                    control={form.control as any}
                    name="seats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antal sæder</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="2"
                            max="9"
                            placeholder="f.eks. 5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Doors */}
                  <FormField
                    control={form.control as any}
                    name="doors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Antal døre</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="2"
                            max="5"
                            placeholder="f.eks. 4"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Environmental & Consumption Section */}
                <div className="space-y-6">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Miljø & Forbrug
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* CO2 Emission */}
                    <FormField
                      control={form.control as any}
                      name="co2_emission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CO2 udslip</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="1000"
                              placeholder="f.eks. 120"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* CO2 Tax Half Year */}
                    <FormField
                      control={form.control as any}
                      name="co2_tax_half_year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CO2 afgift (halvår)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="50000"
                              placeholder="f.eks. 5000"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Consumption L/100km - only if NOT electric */}
                    {form.watch('fuel_type') !== 'Electric' && form.watch('fuel_type') !== 'Elektricitet' && (
                      <FormField
                        control={form.control as any}
                        name="consumption_l_100km"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forbrug</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="50"
                                step="0.1"
                                placeholder="f.eks. 6.5"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Consumption kWh/100km - only if electric */}
                    {(form.watch('fuel_type') === 'Electric' || form.watch('fuel_type') === 'Elektricitet') && (
                      <FormField
                        control={form.control as any}
                        name="consumption_kwh_100km"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Forbrug</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="f.eks. 18.0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* WLTP - only if electric */}
                    {(form.watch('fuel_type') === 'Electric' || form.watch('fuel_type') === 'Elektricitet') && (
                      <FormField
                        control={form.control as any}
                        name="wltp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WLTP rækkevidde</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="1000"
                                placeholder="f.eks. 400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Description */}
                <FormField
                  control={form.control as any}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beskrivelse</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Uddybende beskrivelse af bilen..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Seller Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">
                    Sælger
                  </h4>
                  <FormField
                    control={form.control as any}
                    name="seller_id"
                    render={({ field }) => (
                      <SellerSelect
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        required
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>


            {/* Media Container */}
            <Card>
              <CardHeader className="pt-6 pb-3">
                <CardTitle>Billeder</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Billeder gemmes automatisk ved upload
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <FormField
                  control={form.control as any}
                  name="images"
                  render={({ field }) => (
                    <ImageUpload
                      images={field.value || []}
                      onImagesChange={handleImagesChange}
                      maxImages={5}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Offers Container - Independent from main form */}
            <OffersTableManager
              listingId={currentListingId}
            />

          </form>
        </Form>
      </div>
    </TooltipProvider>
  )
}

export default AdminListingFormNew