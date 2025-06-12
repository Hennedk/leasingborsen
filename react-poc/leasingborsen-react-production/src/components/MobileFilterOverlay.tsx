import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { X, ChevronLeft, Plus, Search } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { cn } from '@/lib/utils'
import { FILTER_CONFIG } from '@/config/filterConfig'
import { useDebouncedSearch } from '@/hooks/useDebounce'
import { MobileFilterSkeleton } from '@/components/FilterSkeleton'
import type { Make, Model } from '@/types'

interface MobileFilterOverlayProps {
  isOpen: boolean
  onClose: () => void
  resultCount: number
}

type MobileView = 'filters' | 'makes' | 'makeSelection' | 'models'

const MobileFilterOverlayComponent: React.FC<MobileFilterOverlayProps> = ({
  isOpen,
  onClose,
  resultCount
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
    resetFilters, 
    getActiveFilters
  } = useFilterStore()
  
  const { data: referenceData, isLoading: referenceDataLoading } = useReferenceData()
  const activeFilters = getActiveFilters()
  
  // Navigation state
  const [currentView, setCurrentView] = useState<MobileView>('filters')
  const { searchTerm, debouncedSearchTerm, setSearchTerm, clearSearch } = useDebouncedSearch()
  const [selectedMakeForModels, setSelectedMakeForModels] = useState<string | null>(null)
  
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
  
  const handleClearAll = () => {
    resetFilters()
  }
  
  // Reset view when opening
  React.useEffect(() => {
    if (isOpen) {
      setCurrentView('filters')
      clearSearch()
      setSelectedMakeForModels(null)
    }
  }, [isOpen])
  
  // Define popular makes
  const popularMakes = ['Volkswagen', 'Skoda', 'Toyota', 'Audi', 'Mercedes-Benz', 'BMW', 'Cupra', 'Hyundai', 'Kia', 'Renault']
  
  // Filter makes for search
  const filteredMakes = useMemo(() => {
    if (!referenceData?.makes) return []
    const allMakes = referenceData.makes
    if (!debouncedSearchTerm) return allMakes
    return allMakes.filter((make: Make) => 
      make.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [referenceData?.makes, debouncedSearchTerm])
  
  // Separate popular and other makes for display
  const popularMakesList = filteredMakes.filter((make: Make) => popularMakes.includes(make.name))
  const otherMakesList = filteredMakes.filter((make: Make) => !popularMakes.includes(make.name))
  
  // Get consolidated filter options from config
  const consolidatedFuelTypes = FILTER_CONFIG.FUEL_TYPES
  const consolidatedBodyTypes = FILTER_CONFIG.BODY_TYPES
  const priceSteps = FILTER_CONFIG.PRICE.STEPS
  const horsepowerSteps = FILTER_CONFIG.HORSEPOWER.STEPS
  
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

  if (!isOpen) return null
  
  // Show skeleton while reference data is loading
  if (referenceDataLoading) {
    return <MobileFilterSkeleton />
  }
  
  const renderMakesView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('filters')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Vælg mærker</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Search */}
      <div className="p-4 border-b border-border/50 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Søg mærker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {/* Popular Makes */}
          {popularMakesList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Populære mærker</h4>
              <div className="space-y-2">
                {popularMakesList.map((make: Make) => {
                  const isSelected = selectedMakes.includes(make.name)
                  return (
                    <div key={make.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMake(make.name)}
                      />
                      <span className="text-sm font-medium flex-1">{make.name}</span>
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
                    <div key={make.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMake(make.name)}
                      />
                      <span className="text-sm font-medium flex-1">{make.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer - Sticky CTA */}
      <div className="sticky bottom-0 p-4 border-t border-border/50 bg-background shadow-lg flex-shrink-0 mobile-overlay-footer">
        <Button 
          onClick={() => setCurrentView('filters')}
          disabled={selectedMakes.length === 0}
          className="w-full"
          size="lg"
        >
          {selectedMakes.length === 0 ? 'Vælg mærker' : 'Vælg'}
        </Button>
      </div>
    </div>
  )
  
  const renderMakeSelectionView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('filters')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Vælg mærke</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Description */}
      <div className="p-4 border-b border-border/50 flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          Vælg hvilket mærke du vil se modeller for:
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-2">
          {selectedMakes.map((makeName: string) => {
            const modelCount = getModelsForMake(makeName).length
            const selectedModelCount = getModelsForMake(makeName).filter(model => 
              selectedModels.includes(model.name)
            ).length
            
            return (
              <Button
                key={makeName}
                variant="outline"
                className="w-full justify-between p-4 h-auto"
                onClick={() => {
                  setSelectedMakeForModels(makeName)
                  clearSearch()
                  setCurrentView('models')
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
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            )
          })}
        </div>
      </div>
      
      {/* Footer - Sticky CTA */}
      <div className="sticky bottom-0 p-4 border-t border-border/50 bg-background shadow-lg flex-shrink-0 mobile-overlay-footer">
        <Button 
          onClick={() => setCurrentView('filters')}
          className="w-full"
          size="lg"
        >
          Vælg
        </Button>
      </div>
    </div>
  )
  
  const renderModelsView = () => {
    if (!selectedMakeForModels) return null
    
    const makeModels = getModelsForMake(selectedMakeForModels).filter((model: Model) => 
      !debouncedSearchTerm || model.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
    
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedMakes.length > 1) {
                  setCurrentView('makeSelection')
                } else {
                  setCurrentView('filters')
                }
                setSelectedMakeForModels(null)
              }}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedMakeForModels}</h2>
              <p className="text-sm text-muted-foreground">Vælg modeller</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-border/50 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Søg modeller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-2">
            {makeModels.map((model: Model) => {
              const isSelected = selectedModels.includes(model.name)
              return (
                <div key={model.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleModel(model.name)}
                  />
                  <span className="text-sm font-medium flex-1">{model.name}</span>
                </div>
              )
            })}
            
            {makeModels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {debouncedSearchTerm 
                    ? `Ingen modeller fundet for "${debouncedSearchTerm}"`
                    : `Ingen modeller tilgængelige for ${selectedMakeForModels}`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer - Sticky CTA */}
        <div className="sticky bottom-0 p-4 border-t border-border/50 bg-background shadow-lg flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button 
            onClick={() => {
              if (selectedMakes.length > 1) {
                setCurrentView('makeSelection')
              } else {
                setCurrentView('filters')
              }
              setSelectedMakeForModels(null)
            }}
            disabled={!selectedMakeForModels || makeModels.length === 0}
            className="w-full"
            size="lg"
          >
            {!selectedMakeForModels || makeModels.length === 0 ? 'Vælg modeller' : 'Vælg'}
          </Button>
        </div>
      </div>
    )
  }
  
  const renderFiltersView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Filtrér</h2>
          {activeFilters.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
              {activeFilters.length}
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-6">
          {/* Make Filter */}
          <div className="space-y-3">
            <Label className="font-medium text-foreground">Mærke</Label>
            
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => {
                clearSearch()
                setCurrentView('makes')
              }}
            >
              {selectedMakes.length > 0 
                ? `${selectedMakes.length} ${selectedMakes.length === 1 ? 'mærke' : 'mærker'} valgt`
                : 'Vælg mærker'
              }
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Model Filter */}
          <div className="space-y-3">
            <Label className="font-medium text-foreground">Model</Label>
            
            <Button
              variant="outline"
              className="w-full justify-between"
              disabled={selectedMakes.length === 0}
              onClick={() => {
                clearSearch()
                if (selectedMakes.length === 1) {
                  // Direct to models if only one make selected
                  setSelectedMakeForModels(selectedMakes[0])
                  setCurrentView('models')
                } else {
                  // Show make selection if multiple makes
                  setCurrentView('makeSelection')
                }
              }}
            >
              {selectedMakes.length === 0 
                ? 'Vælg mærker først'
                : selectedModels.length > 0 
                  ? `${selectedModels.length} ${selectedModels.length === 1 ? 'model' : 'modeller'} valgt`
                  : 'Vælg modeller'
              }
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Rest of filters stay the same */}
          {/* Fuel Type Filter - Multi-select Chips */}
          <div className="space-y-3">
            <Label className="font-medium text-foreground">Brændstof</Label>
            <div className="flex flex-wrap gap-2">
              {consolidatedFuelTypes.map((fuelTypeItem) => {
                const isSelected = fuel_type?.includes(fuelTypeItem.name) || false
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
                const isSelected = transmission?.includes(transmissionType) || false
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
                const isSelected = body_type?.includes(bodyTypeItem.name) || false
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
      </div>
      
      {/* Footer - Sticky CTA */}
      <div className="sticky bottom-0 p-4 border-t border-border/50 bg-background shadow-lg flex-shrink-0 mobile-overlay-footer">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleClearAll}
            disabled={activeFilters.length === 0}
            className="flex-1"
            size="lg"
          >
            Nulstil alle
          </Button>
          <Button 
            onClick={onClose} 
            className="flex-1"
            size="lg"
          >
            Vis {resultCount} resultater
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="mobile-overlay-container">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Slide-up overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl border-t border-border/50 transform transition-transform duration-300 ease-out translate-y-0 mobile-overlay flex flex-col">
        {/* Dynamic content based on current view */}
        {currentView === 'filters' && renderFiltersView()}
        {currentView === 'makes' && renderMakesView()}
        {currentView === 'makeSelection' && renderMakeSelectionView()}
        {currentView === 'models' && renderModelsView()}

      </div>
    </div>
  )
}

const MobileFilterOverlay = React.memo(MobileFilterOverlayComponent)
export default MobileFilterOverlay