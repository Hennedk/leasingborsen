import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { X, RotateCcw, Plus } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { cn } from '@/lib/utils'
import type { Make, Model } from '@/types'

interface FilterSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  className = ''
}) => {
  const { 
    makes = [],
    models = [],
    body_type,
    fuel_type,
    transmission,
    price_min,
    price_max,
    seats_min,
    seats_max,
    horsepower_min,
    horsepower_max,
    setFilter,
    toggleArrayFilter,
    resetFilters 
  } = useFilterStore()
  
  const { data: referenceData } = useReferenceData()

  // Consolidated fuel types
  const consolidatedFuelTypes = [
    { name: 'Electric', label: 'Electric' },
    { name: 'Hybrid', label: 'Hybrid' },
    { name: 'Benzin', label: 'Benzin' },
    { name: 'Diesel', label: 'Diesel' },
    { name: 'Others', label: 'Andre' }
  ]

  // Consolidated body types
  const consolidatedBodyTypes = [
    { name: 'Mikro', label: 'Mikro' },
    { name: 'Stationcar', label: 'Stationcar' },
    { name: 'SUV', label: 'SUV' },
    { name: 'Crossover (CUV)', label: 'Crossover (CUV)' },
    { name: 'Minibus (MPV)', label: 'Minibus (MPV)' },
    { name: 'Sedan', label: 'Sedan' },
    { name: 'Hatchback', label: 'Hatchback' },
    { name: 'Cabriolet', label: 'Cabriolet' },
    { name: 'Coupe', label: 'Coupe' }
  ]

  // Price steps for filtering
  const priceSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 1000)
  
  // Horsepower steps for filtering
  const horsepowerSteps = [100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 1000]
  
  // State for modal dialogs
  const [makeModalOpen, setMakeModalOpen] = React.useState(false)
  const [modelModalOpen, setModelModalOpen] = React.useState(false)
  // Search state for modals
  const [makeSearch, setMakeSearch] = React.useState('')
  const [modelSearch, setModelSearch] = React.useState('')
  
  // Get selected makes and models
  const selectedMakes = makes
  const selectedModels = models
  
  // Helper function to get models for a specific make
  const getModelsForMake = (makeName: string) => {
    if (!referenceData?.makes || !referenceData?.models) return []
    const make = referenceData.makes.find((m: Make) => m.name === makeName)
    if (!make) return []
    return referenceData.models.filter((model: Model) => model.make_id === make.id)
  }
  
  // Toggle functions
  const toggleMake = (makeName: string) => {
    toggleArrayFilter('makes', makeName)
    // Clear models when removing a make
    if (selectedMakes.includes(makeName)) {
      const modelsToRemove = getModelsForMake(makeName)
      modelsToRemove.forEach(model => {
        if (selectedModels.includes(model.name)) {
          toggleArrayFilter('models', model.name)
        }
      })
    }
  }
  
  const toggleModel = (modelName: string) => {
    toggleArrayFilter('models', modelName)
  }
  
  // Define popular makes
  const popularMakes = ['Volkswagen', 'Skoda', 'Toyota', 'Audi', 'Mercedes-Benz', 'BMW', 'Cupra', 'Hyundai', 'Kia', 'Renault']
  
  // Filter makes for search
  const filteredMakes = React.useMemo(() => {
    if (!referenceData?.makes) return []
    const allMakes = referenceData.makes
    if (!makeSearch) return allMakes
    return allMakes.filter((make: Make) => 
      make.name.toLowerCase().includes(makeSearch.toLowerCase())
    )
  }, [referenceData?.makes, makeSearch])
  
  // Separate popular and other makes for display
  const popularMakesList = filteredMakes.filter((make: Make) => popularMakes.includes(make.name))
  const otherMakesList = filteredMakes.filter((make: Make) => !popularMakes.includes(make.name))
  

  // Active filters count
  const activeFiltersCount = [
    makes.length > 0 ? makes : null,
    models.length > 0 ? models : null, 
    body_type.length > 0 ? body_type : null, 
    fuel_type.length > 0 ? fuel_type : null, 
    transmission.length > 0 ? transmission : null, 
    price_min, 
    price_max, 
    seats_min, 
    seats_max, 
    horsepower_min,
    horsepower_max
  ].filter(value => value !== '' && value !== null && value !== undefined).length

  const handleFilterChange = (key: string, value: string | number) => {
    const isNumericField = ['price_min', 'price_max', 'seats_min', 'seats_max', 'horsepower_min', 'horsepower_max'].includes(key)
    // Handle both 'all' and empty string as clearing the filter
    const filterValue = (value === 'all' || value === '') ? (isNumericField ? null : '') : value
    
    if (isNumericField && value !== 'all' && value !== '') {
      const numericValue = parseInt(value as string)
      if (key === 'price_min') setFilter('price_min', numericValue)
      else if (key === 'price_max') setFilter('price_max', numericValue)
      else if (key === 'seats_min') setFilter('seats_min', numericValue)
      else if (key === 'seats_max') setFilter('seats_max', numericValue)
      else if (key === 'horsepower_min') setFilter('horsepower_min', numericValue)
      else if (key === 'horsepower_max') setFilter('horsepower_max', numericValue)
    } else {
      if (isNumericField) {
        if (key === 'price_min') setFilter('price_min', null)
        else if (key === 'price_max') setFilter('price_max', null)
        else if (key === 'seats_min') setFilter('seats_min', null)
        else if (key === 'seats_max') setFilter('seats_max', null)
        else if (key === 'horsepower_min') setFilter('horsepower_min', null)
        else if (key === 'horsepower_max') setFilter('horsepower_max', null)
      }
    }
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
            
            {/* Make Filter - Modal Selector */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Mærke</Label>
              
              {/* Selected Makes Display */}
              {selectedMakes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMakes.map((makeName: string) => (
                    <Badge
                      key={makeName}
                      variant="secondary"
                      className="text-sm"
                    >
                      {makeName}
                      <button
                        onClick={() => toggleMake(makeName)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Make Selector Button */}
              <Dialog open={makeModalOpen} onOpenChange={setMakeModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {selectedMakes.length > 0 
                      ? `${selectedMakes.length} mærker valgt`
                      : 'Vælg mærker'
                    }
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Vælg bilmærker</DialogTitle>
                    <DialogDescription>
                      Vælg et eller flere bilmærker for at filtrere søgeresultaterne.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Search */}
                  <div className="space-y-4">
                    <Input
                      placeholder="Søg mærker..."
                      value={makeSearch}
                      onChange={(e) => setMakeSearch(e.target.value)}
                    />
                    
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {/* Popular Makes */}
                        {popularMakesList.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Populære mærker</h4>
                            <div className="space-y-2">
                              {popularMakesList.map((make: Make) => {
                                const isSelected = selectedMakes.includes(make.name)
                                return (
                                  <div key={make.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleMake(make.name)}
                                    />
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                      {make.name}
                                    </label>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Other Makes */}
                        {otherMakesList.length > 0 && (
                          <div className="space-y-2">
                            {popularMakesList.length > 0 && <Separator />}
                            <h4 className="text-sm font-medium text-muted-foreground">Andre mærker</h4>
                            <div className="space-y-2">
                              {otherMakesList.map((make: Make) => {
                                const isSelected = selectedMakes.includes(make.name)
                                return (
                                  <div key={make.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleMake(make.name)}
                                    />
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                      {make.name}
                                    </label>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Model Filter - Modal Selector */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Model</Label>
              
              {/* Selected Models Display */}
              {selectedModels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedModels.map((modelName: string) => (
                    <Badge
                      key={modelName}
                      variant="secondary"
                      className="text-sm"
                    >
                      {modelName}
                      <button
                        onClick={() => toggleModel(modelName)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Model Selector Button */}
              <Dialog open={modelModalOpen} onOpenChange={setModelModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={selectedMakes.length === 0}
                  >
                    {selectedMakes.length === 0 
                      ? 'Vælg mærker først'
                      : selectedModels.length > 0 
                        ? `${selectedModels.length} modeller valgt`
                        : 'Vælg modeller'
                    }
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Vælg modeller</DialogTitle>
                    <DialogDescription>
                      Vælg en eller flere modeller for de valgte bilmærker.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Search */}
                  <div className="space-y-4">
                    <Input
                      placeholder="Søg modeller..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                    />
                    
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {selectedMakes.map((makeName: string) => {
                          const makeModels = getModelsForMake(makeName).filter((model: Model) => 
                            !modelSearch || model.name.toLowerCase().includes(modelSearch.toLowerCase())
                          )
                          
                          if (makeModels.length === 0) return null
                          
                          return (
                            <div key={makeName} className="space-y-2">
                              <h4 className="text-sm font-medium text-muted-foreground">{makeName}</h4>
                              <div className="space-y-2">
                                {makeModels.map((model: Model) => {
                                  const isSelected = selectedModels.includes(model.name)
                                  return (
                                    <div key={model.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleModel(model.name)}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {model.name}
                                      </label>
                                    </div>
                                  )
                                })}
                              </div>
                              {makeName !== selectedMakes[selectedMakes.length - 1] && <Separator />}
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Fuel Type Filter - Multi-select Chips */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Brændstof</Label>
              <div className="flex flex-wrap gap-2">
                {consolidatedFuelTypes.map((fuelTypeItem) => {
                  const isSelected = fuel_type.includes(fuelTypeItem.name)
                  return (
                    <Badge
                      key={fuelTypeItem.name}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-1.5 text-sm",
                        isSelected 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "hover:bg-muted border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleArrayFilter('fuel_type', fuelTypeItem.name)}
                    >
                      {fuelTypeItem.label}
                      {isSelected && (
                        <X className="w-3 h-3 ml-1.5" />
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Transmission Filter - Multi-select Chips */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Geartype</Label>
              <div className="flex flex-wrap gap-2">
                {['Automatic', 'Manual'].map((transmissionType) => {
                  const isSelected = transmission.includes(transmissionType)
                  const label = transmissionType === 'Automatic' ? 'Automatisk' : 'Manuelt'
                  return (
                    <Badge
                      key={transmissionType}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-1.5 text-sm",
                        isSelected 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "hover:bg-muted border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleArrayFilter('transmission', transmissionType)}
                    >
                      {label}
                      {isSelected && (
                        <X className="w-3 h-3 ml-1.5" />
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Body Type Filter - Multi-select Chips */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Biltype</Label>
              <div className="flex flex-wrap gap-2">
                {consolidatedBodyTypes.map((bodyTypeItem) => {
                  const isSelected = body_type.includes(bodyTypeItem.name)
                  return (
                    <Badge
                      key={bodyTypeItem.name}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-1.5 text-sm",
                        isSelected 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "hover:bg-muted border-border hover:border-primary/50"
                      )}
                      onClick={() => toggleArrayFilter('body_type', bodyTypeItem.name)}
                    >
                      {bodyTypeItem.label}
                      {isSelected && (
                        <X className="w-3 h-3 ml-1.5" />
                      )}
                    </Badge>
                  )
                })}
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

            {/* Horsepower Range Filter */}
            <div className="space-y-3">
              <Label className="font-medium text-foreground">Hestekræfter</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select 
                  value={horsepower_min?.toString() || 'all'} 
                  onValueChange={(value) => handleFilterChange('horsepower_min', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Min HK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Min HK</SelectItem>
                    {horsepowerSteps.map((hp) => (
                      <SelectItem key={`min-${hp}`} value={hp.toString()}>
                        {hp.toLocaleString('da-DK')} hk
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={horsepower_max?.toString() || 'all'} 
                  onValueChange={(value) => handleFilterChange('horsepower_max', value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Max HK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Max HK</SelectItem>
                    {horsepowerSteps.map((hp) => (
                      <SelectItem key={`max-${hp}`} value={hp.toString()}>
                        {hp.toLocaleString('da-DK')} hk
                      </SelectItem>
                    ))}
                    <SelectItem value="9999999">1.000+ hk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>


        </CardContent>
      </Card>
    </div>
  )
}

export default FilterSidebar