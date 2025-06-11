import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, RotateCcw } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import type { Make, Model, BodyType, FuelType } from '@/types'

interface FilterSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  className = '',
  variant = 'desktop'
}) => {
  const { 
    make, 
    model, 
    body_type,
    fuel_type,
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max,
    horsepower,
    setFilter, 
    resetFilters 
  } = useFilterStore()
  
  const { data: referenceData } = useReferenceData()

  // Price steps for filtering
  const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
  
  // Get filtered models based on selected make
  const filteredModels = React.useMemo(() => {
    if (!make || !referenceData?.models) return []
    const selectedMake = referenceData.makes?.find((m: Make) => m.name === make)
    return referenceData.models.filter((m: Model) => m.make_id === selectedMake?.id) || []
  }, [make, referenceData])

  // Active filters count
  const activeFiltersCount = [
    make, 
    model, 
    body_type, 
    fuel_type, 
    transmission, 
    price_min, 
    price_max, 
    seats_min, 
    seats_max, 
    horsepower
  ].filter(value => value !== '' && value !== null && value !== undefined).length

  const handleFilterChange = (key: string, value: string | number) => {
    const isNumericField = ['price_min', 'price_max', 'seats_min', 'seats_max', 'horsepower'].includes(key)
    const filterValue = value === 'all' ? (isNumericField ? null : '') : value
    
    if (isNumericField && value !== 'all') {
      const numericValue = parseInt(value as string)
      if (key === 'price_min') setFilter('price_min', numericValue)
      else if (key === 'price_max') setFilter('price_max', numericValue)
      else if (key === 'seats_min') setFilter('seats_min', numericValue)
      else if (key === 'seats_max') setFilter('seats_max', numericValue)
      else if (key === 'horsepower') setFilter('horsepower', numericValue)
    } else {
      if (key === 'make') setFilter('make', filterValue as string)
      else if (key === 'model') setFilter('model', filterValue as string)
      else if (key === 'body_type') setFilter('body_type', filterValue as string)
      else if (key === 'fuel_type') setFilter('fuel_type', filterValue as string)
      else if (key === 'transmission') setFilter('transmission', filterValue as string)
      else if (isNumericField) {
        if (key === 'price_min') setFilter('price_min', null)
        else if (key === 'price_max') setFilter('price_max', null)
        else if (key === 'seats_min') setFilter('seats_min', null)
        else if (key === 'seats_max') setFilter('seats_max', null)
        else if (key === 'horsepower') setFilter('horsepower', null)
      }
    }
  }


  // Handle transmission toggle
  const handleTransmissionToggle = (value: string) => {
    const newValue = transmission === value ? '' : value
    setFilter('transmission', newValue)
  }

  const handleResetAllFilters = () => {
    resetFilters()
  }

  return (
    <div className={`${className} ${isOpen ? 'block' : 'hidden'}`}>
      <Card className="bg-card border border-border shadow-xl gap-0">
        <CardHeader className="pb-3 pt-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                Filtrér
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAllFilters}
                disabled={activeFiltersCount === 0}
                className="h-8 w-8 p-0 hover:bg-muted"
                title="Nulstil alle filtre"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="lg:hidden h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2 pb-8">
          {/* Vehicle Selection Section */}
          <div className="space-y-4">
            
            {/* Make Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Mærke</Label>
              <Select value={make || 'all'} onValueChange={(value) => handleFilterChange('make', value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Vælg mærke" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle mærker</SelectItem>
                  {referenceData?.makes?.map((makeItem: Make) => (
                    <SelectItem key={makeItem.id} value={makeItem.name}>
                      {makeItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Model</Label>
              <Select 
                value={model || 'all'} 
                onValueChange={(value) => handleFilterChange('model', value)}
                disabled={!make}
              >
                <SelectTrigger className="h-11">
                  <SelectValue 
                    placeholder={make ? 'Vælg model' : 'Vælg mærke først'} 
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle modeller</SelectItem>
                  {filteredModels.map((modelItem: Model) => (
                    <SelectItem key={modelItem.id} value={modelItem.name}>
                      {modelItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Body Type Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Biltype</Label>
              <Select value={body_type || 'all'} onValueChange={(value) => handleFilterChange('body_type', value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Alle biltyper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle biltyper</SelectItem>
                  {referenceData?.bodyTypes?.map((bodyTypeItem: BodyType) => (
                    <SelectItem key={bodyTypeItem.name} value={bodyTypeItem.name}>
                      {bodyTypeItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Type Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Brændstof</Label>
              <Select value={fuel_type || 'all'} onValueChange={(value) => handleFilterChange('fuel_type', value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Alle brændstoffer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle brændstoffer</SelectItem>
                  {referenceData?.fuelTypes?.map((fuelTypeItem: FuelType) => (
                    <SelectItem key={fuelTypeItem.name} value={fuelTypeItem.name}>
                      {fuelTypeItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transmission Filter - Toggle Buttons */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Geartype</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={transmission === 'Automatic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTransmissionToggle('Automatic')}
                  className="h-11 font-medium"
                >
                  Automatisk
                </Button>
                <Button
                  variant={transmission === 'Manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTransmissionToggle('Manual')}
                  className="h-11 font-medium"
                >
                  Manuelt
                </Button>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Prisområde</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={price_min?.toString() || 'all'} 
                  onValueChange={(value) => handleFilterChange('price_min', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Min pris" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Min pris</SelectItem>
                    {priceSteps.map((price) => (
                      <SelectItem key={`min-${price}`} value={price.toString()}>
                        {price.toLocaleString('da-DK')} kr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={price_max?.toString() || 'all'} 
                  onValueChange={(value) => handleFilterChange('price_max', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Max pris" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Max pris</SelectItem>
                    {priceSteps.map((price) => (
                      <SelectItem key={`max-${price}`} value={price.toString()}>
                        {price.toLocaleString('da-DK')} kr
                      </SelectItem>
                    ))}
                    <SelectItem value="9999999">10.000+ kr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seat Count Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Antal sæder</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={seats_min?.toString() || 'all'} 
                  onValueChange={(value) => handleFilterChange('seats_min', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Min sæder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Min sæder</SelectItem>
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((seats) => (
                      <SelectItem key={`min-seats-${seats}`} value={seats.toString()}>
                        {seats}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={seats_max?.toString() || 'all'} 
                  onValueChange={(value) => handleFilterChange('seats_max', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Max sæder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Max sæder</SelectItem>
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((seats) => (
                      <SelectItem key={`max-seats-${seats}`} value={seats.toString()}>
                        {seats}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Horsepower Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Minimum hestekræfter</Label>
              <Select 
                value={horsepower?.toString() || 'all'} 
                onValueChange={(value) => handleFilterChange('horsepower', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Ingen grænse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ingen grænse</SelectItem>
                  {[100, 150, 200, 250, 300, 400, 500].map((hp) => (
                    <SelectItem key={hp} value={hp.toString()}>
                      Min {hp} hk
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


        </CardContent>
      </Card>
    </div>
  )
}

export default FilterSidebar