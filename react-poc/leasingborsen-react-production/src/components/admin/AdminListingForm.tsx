import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useCreateListing, useUpdateListing } from '@/hooks/useMutations'
import { Save, ArrowLeft } from 'lucide-react'
import type { CarListing } from '@/lib/supabase'

interface AdminListingFormProps {
  listing?: CarListing
  isEditing?: boolean
}

const AdminListingForm: React.FC<AdminListingFormProps> = ({ 
  listing, 
  isEditing = false 
}) => {
  const navigate = useNavigate()
  const { data: referenceData, isLoading: referenceLoading } = useReferenceData()
  const createMutation = useCreateListing()
  const updateMutation = useUpdateListing()

  // Form state
  const [formData, setFormData] = useState<Partial<CarListing>>({
    make: '',
    model: '',
    variant: '',
    year: new Date().getFullYear(),
    monthly_price: 0,
    mileage: 0,
    mileage_per_year: 20000,
    first_payment: 0,
    fuel_type: '',
    transmission: '',
    body_type: '',
    horsepower: 0,
    seats: 5,
    image: '',
    colour: '',
    drive_type: 'fwd',
    wltp: 0,
    co2_emission: 0,
    co2_tax_half_year: 0,
    period_months: 36,
    description: '',
    ...listing
  })

  const [selectedMakeId, setSelectedMakeId] = useState<string>('')

  // Initialize form with existing listing data
  useEffect(() => {
    if (listing && referenceData?.makes) {
      const make = referenceData.makes.find(m => m.name === listing.make)
      if (make) {
        setSelectedMakeId(make.id)
      }
    }
  }, [listing, referenceData])

  // Get filtered models based on selected make
  const filteredModels = selectedMakeId 
    ? referenceData?.models?.filter(model => model.make_id === selectedMakeId) || []
    : referenceData?.models || []

  // Form handlers
  const handleInputChange = (field: keyof CarListing, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMakeChange = (makeId: string) => {
    setSelectedMakeId(makeId)
    const make = referenceData?.makes?.find(m => m.id === makeId)
    if (make) {
      setFormData(prev => ({
        ...prev,
        make: make.name,
        model: '' // Reset model when make changes
      }))
    }
  }

  const handleModelChange = (modelId: string) => {
    const model = filteredModels.find(m => m.id === modelId)
    if (model) {
      setFormData(prev => ({
        ...prev,
        model: model.name
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isEditing && listing) {
        // Get the correct ID - it could be listing_id (from view) or id (from table)
        const listingId = listing.listing_id || listing.id
        
        if (!listingId) {
          throw new Error('Listing ID not found')
        }
        
        // Create a clean update object with fields that exist in listings table
        const cleanUpdates = {
          description: formData.description || '',
          variant: formData.variant || '',
          year: formData.year || new Date().getFullYear(),
          mileage: formData.mileage || 0,
          horsepower: formData.horsepower || 0,
          seats: formData.seats || 5,
          image: formData.image || '',
          wltp: formData.wltp || 0,
          co2_emission: formData.co2_emission || 0,
          co2_tax_half_year: formData.co2_tax_half_year || 0,
          drive_type: formData.drive_type || 'fwd',
        }
        
        console.log('Updating listing with ID:', listingId, 'and fields:', cleanUpdates)
        
        await updateMutation.mutateAsync({
          id: listingId,
          updates: cleanUpdates
        })
      } else {
        await createMutation.mutateAsync(formData)
      }
      
      // Navigate back to listings
      navigate('/admin/listings')
    } catch (error: any) {
      console.error('Form submission failed:', error)
      // You could add a toast notification here for better UX
      alert(`Fejl ved gemning: ${error?.message || 'Ukendt fejl'}`)
    }
  }

  const handleCancel = () => {
    navigate('/admin/listings')
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

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
    <form onSubmit={handleSubmit} className="space-y-6">
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
        
        <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? 'Gemmer...' : (isEditing ? 'Gem ændringer' : 'Opret annonce')}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Grundlæggende Information</CardTitle>
          <CardDescription>
            Bil mærke, model og grundlæggende specifikationer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Make */}
            <div className="space-y-2">
              <Label htmlFor="make">Mærke *</Label>
              <Select value={selectedMakeId} onValueChange={handleMakeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg mærke" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData?.makes?.map((make) => (
                    <SelectItem key={make.id} value={make.id}>
                      {make.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Select 
                value={filteredModels.find(m => m.name === formData.model)?.id || ''} 
                onValueChange={handleModelChange}
                disabled={!selectedMakeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg model" />
                </SelectTrigger>
                <SelectContent>
                  {filteredModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Variant */}
            <div className="space-y-2">
              <Label htmlFor="variant">Variant</Label>
              <Input
                id="variant"
                value={formData.variant || ''}
                onChange={(e) => handleInputChange('variant', e.target.value)}
                placeholder="f.eks. 2.0 TDI"
              />
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">Årgang *</Label>
              <Input
                id="year"
                type="number"
                value={formData.year || ''}
                onChange={(e) => handleInputChange('year', parseInt(e.target.value))}
                min="1990"
                max={new Date().getFullYear() + 1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Specifikationer</CardTitle>
          <CardDescription>
            Tekniske detaljer og bilens karakteristika
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Body Type */}
            <div className="space-y-2">
              <Label htmlFor="body_type">Biltype</Label>
              <Select 
                value={formData.body_type || ''} 
                onValueChange={(value) => handleInputChange('body_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg biltype" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData?.bodyTypes?.map((type) => (
                    <SelectItem key={type.name} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Type */}
            <div className="space-y-2">
              <Label htmlFor="fuel_type">Brændstof</Label>
              <Select 
                value={formData.fuel_type || ''} 
                onValueChange={(value) => handleInputChange('fuel_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg brændstof" />
                </SelectTrigger>
                <SelectContent>
                  {referenceData?.fuelTypes?.map((type) => (
                    <SelectItem key={type.name} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transmission */}
            <div className="space-y-2">
              <Label htmlFor="transmission">Transmission</Label>
              <Select 
                value={formData.transmission || ''} 
                onValueChange={(value) => handleInputChange('transmission', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg transmission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manuel</SelectItem>
                  <SelectItem value="Automatic">Automatisk</SelectItem>
                  <SelectItem value="Semi-automatic">Semi-automatisk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Horsepower */}
            <div className="space-y-2">
              <Label htmlFor="horsepower">Hestekræfter</Label>
              <Input
                id="horsepower"
                type="number"
                value={formData.horsepower || ''}
                onChange={(e) => handleInputChange('horsepower', parseInt(e.target.value))}
                min="0"
              />
            </div>

            {/* Seats */}
            <div className="space-y-2">
              <Label htmlFor="seats">Antal sæder</Label>
              <Input
                id="seats"
                type="number"
                value={formData.seats || ''}
                onChange={(e) => handleInputChange('seats', parseInt(e.target.value))}
                min="2"
                max="9"
              />
            </div>

            {/* Mileage */}
            <div className="space-y-2">
              <Label htmlFor="mileage">Kilometerstand</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage || ''}
                onChange={(e) => handleInputChange('mileage', parseInt(e.target.value))}
                min="0"
                placeholder="km"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Priser og Leasing</CardTitle>
          <CardDescription>
            Månedspris og leasing betingelser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Monthly Price */}
            <div className="space-y-2">
              <Label htmlFor="monthly_price">Månedspris *</Label>
              <Input
                id="monthly_price"
                type="number"
                value={formData.monthly_price || ''}
                onChange={(e) => handleInputChange('monthly_price', parseInt(e.target.value))}
                min="0"
                placeholder="kr/måned"
              />
            </div>

            {/* First Payment */}
            <div className="space-y-2">
              <Label htmlFor="first_payment">Udbetaling</Label>
              <Input
                id="first_payment"
                type="number"
                value={formData.first_payment || ''}
                onChange={(e) => handleInputChange('first_payment', parseInt(e.target.value))}
                min="0"
                placeholder="kr"
              />
            </div>

            {/* Mileage per year */}
            <div className="space-y-2">
              <Label htmlFor="mileage_per_year">Km/år</Label>
              <Input
                id="mileage_per_year"
                type="number"
                value={formData.mileage_per_year || ''}
                onChange={(e) => handleInputChange('mileage_per_year', parseInt(e.target.value))}
                min="0"
                placeholder="km/år"
              />
            </div>

            {/* Period months */}
            <div className="space-y-2">
              <Label htmlFor="period_months">Periode (måneder)</Label>
              <Input
                id="period_months"
                type="number"
                value={formData.period_months || ''}
                onChange={(e) => handleInputChange('period_months', parseInt(e.target.value))}
                min="1"
                placeholder="måneder"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Yderligere Information</CardTitle>
          <CardDescription>
            Billede og beskrivelse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="image">Billede URL</Label>
            <Input
              id="image"
              value={formData.image || ''}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>


          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <textarea
              id="description"
              className="w-full min-h-[100px] p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Uddybende beskrivelse af bilen..."
            />
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default AdminListingForm