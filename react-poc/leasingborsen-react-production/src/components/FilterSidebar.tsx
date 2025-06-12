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
import { X, RotateCcw, Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { cn } from '@/lib/utils'
import { FILTER_CONFIG } from '@/config/filterConfig'
import { useDebouncedSearch } from '@/hooks/useDebounce'
import type { Make, Model } from '@/types'

interface FilterSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

const FilterSidebarComponent: React.FC<FilterSidebarProps> = ({ 
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

  // Get consolidated filter options from config
  const consolidatedFuelTypes = FILTER_CONFIG.FUEL_TYPES
  const consolidatedBodyTypes = FILTER_CONFIG.BODY_TYPES
  const priceSteps = FILTER_CONFIG.PRICE.STEPS
  const horsepowerSteps = FILTER_CONFIG.HORSEPOWER.STEPS
  
  // State for modal dialogs
  const [makeModalOpen, setMakeModalOpen] = React.useState(false)
  const [modelModalOpen, setModelModalOpen] = React.useState(false)
  // Debounced search state for modals
  const { searchTerm: makeSearch, debouncedSearchTerm: debouncedMakeSearch, setSearchTerm: setMakeSearch } = useDebouncedSearch()
  const { searchTerm: modelSearch, debouncedSearchTerm: debouncedModelSearch, setSearchTerm: setModelSearch } = useDebouncedSearch()
  
  // Model selection state (for multiple makes flow)
  const [selectedMakeForModels, setSelectedMakeForModels] = React.useState<string | null>(null)
  const [modelSelectionView, setModelSelectionView] = React.useState<'makeSelection' | 'models'>('makeSelection')
  
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
  
  // Get popular makes from config
  const popularMakes = FILTER_CONFIG.POPULAR_MAKES
  
  // Filter makes for search (using debounced search term)
  const filteredMakes = React.useMemo(() => {
    if (!referenceData?.makes) return []
    const allMakes = referenceData.makes
    if (!debouncedMakeSearch) return allMakes
    return allMakes.filter((make: Make) => 
      make.name.toLowerCase().includes(debouncedMakeSearch.toLowerCase())
    )
  }, [referenceData?.makes, debouncedMakeSearch])
  
  // Separate popular and other makes for display
  const popularMakesList = filteredMakes.filter((make: Make) => (popularMakes as readonly string[]).includes(make.name))
  const otherMakesList = filteredMakes.filter((make: Make) => !(popularMakes as readonly string[]).includes(make.name))
  

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
  ].filter(value => value !== null && value !== undefined).length

  const handleFilterChange = (key: string, value: string | number) => {
    const isNumericField = ['price_min', 'price_max', 'seats_min', 'seats_max', 'horsepower_min', 'horsepower_max'].includes(key)
    // Handle both 'all' and empty string as clearing the filter
    // const filterValue = (value === 'all' || value === '') ? (isNumericField ? null : '') : value
    
    if (isNumericField && value !== 'all' && value !== '') {
      const numericValue = parseInt(value as string)
      if (key === 'price_min') setFilter('price_min', numericValue)
      else if (key === 'price_max') setFilter('price_max', numericValue)
      else if (key === 'seats_min') setFilter('seats_min', numericValue)
      else if (key === 'seats_max') setFilter('seats_max', numericValue)
      // else if (key === 'horsepower_min') setFilter('horsepower_min', numericValue)
      // else if (key === 'horsepower_max') setFilter('horsepower_max', numericValue)
    } else {
      if (isNumericField) {
        if (key === 'price_min') setFilter('price_min', null)
        else if (key === 'price_max') setFilter('price_max', null)
        else if (key === 'seats_min') setFilter('seats_min', null)
        else if (key === 'seats_max') setFilter('seats_max', null)
        // else if (key === 'horsepower_min') setFilter('horsepower_min', null)
        // else if (key === 'horsepower_max') setFilter('horsepower_max', null)
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
              
              {/* Make Selector Button */}
              <Dialog open={makeModalOpen} onOpenChange={setMakeModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {selectedMakes.length > 0 
                      ? `${selectedMakes.length} ${selectedMakes.length === 1 ? 'mærke' : 'mærker'} valgt`
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
              
              {/* Model Selector Button */}
              <Dialog open={modelModalOpen} onOpenChange={(open) => {
                setModelModalOpen(open)
                if (open) {
                  // Reset view state when opening
                  if (selectedMakes.length === 1) {
                    setSelectedMakeForModels(selectedMakes[0])
                    setModelSelectionView('models')
                  } else {
                    setSelectedMakeForModels(null)
                    setModelSelectionView('makeSelection')
                  }
                  setModelSearch('')
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={selectedMakes.length === 0}
                  >
                    {selectedMakes.length === 0 
                      ? 'Vælg mærker først'
                      : selectedModels.length > 0 
                        ? `${selectedModels.length} ${selectedModels.length === 1 ? 'model' : 'modeller'} valgt`
                        : 'Vælg modeller'
                    }
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  {modelSelectionView === 'makeSelection' ? (
                    // Make Selection View (for multiple makes)
                    <>
                      <DialogHeader>
                        <DialogTitle>Vælg mærke</DialogTitle>
                        <DialogDescription>
                          Vælg hvilket mærke du vil se modeller for.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <ScrollArea className="h-80">
                        <div className="space-y-2">
                          {selectedMakes.map((makeName: string) => {
                            const makeModels = getModelsForMake(makeName)
                            const selectedModelsForMake = makeModels.filter(model => selectedModels.includes(model.name))
                            const selectedModelCount = selectedModelsForMake.length
                            const modelCount = makeModels.length
                            
                            return (
                              <Button
                                key={makeName}
                                variant="outline"
                                className="w-full justify-between h-auto p-4"
                                onClick={() => {
                                  setSelectedMakeForModels(makeName)
                                  setModelSelectionView('models')
                                  setModelSearch('')
                                }}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{makeName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {selectedModelCount > 0 
                                      ? `${selectedModelCount} af ${modelCount} ${modelCount === 1 ? 'model' : 'modeller'} valgt`
                                      : `${modelCount} ${modelCount === 1 ? 'model' : 'modeller'} tilgængelige`
                                    }
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    // Model Selection View (for specific make)
                    <>
                      <DialogHeader>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModelSelectionView('makeSelection')}
                            className="p-0 h-auto"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </Button>
                          <div>
                            <DialogTitle>{selectedMakeForModels}</DialogTitle>
                            <DialogDescription className="text-left">
                              Vælg modeller
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <Input
                          placeholder="Søg modeller..."
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                        />
                        
                        <ScrollArea className="h-80">
                          <div className="space-y-2">
                            {selectedMakeForModels && getModelsForMake(selectedMakeForModels)
                              .filter((model: Model) => 
                                !debouncedModelSearch || model.name.toLowerCase().includes(debouncedModelSearch.toLowerCase())
                              )
                              .map((model: Model) => {
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
                              })
                            }
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  )}
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

const FilterSidebar = React.memo(FilterSidebarComponent)
export default FilterSidebar