import React, { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { X, ChevronLeft, Plus, Search, ArrowUpDown, ChevronRight } from 'lucide-react'
import { useConsolidatedFilterStore } from '@/stores/consolidatedFilterStore'
import { useReferenceData } from '@/hooks/useReferenceData'
import { FILTER_CONFIG } from '@/config/filterConfig'
import { useDebouncedSearch } from '@/hooks/useDebounce'
import { MobileFilterSkeleton } from '@/components/FilterSkeleton'
import { cn } from '@/lib/utils'
import type { Make, Model, SortOrder } from '@/types'

// Sort options configuration - adapted for Radix UI Select (no empty string values)
const mobileSelectOptions = [
  { value: 'asc', label: 'Laveste pris' },
  { value: 'desc', label: 'Højeste pris' }
]

// Map mobile select values to backend sort values
const mapToBackendSort = (selectValue: string): SortOrder => {
  if (selectValue === 'asc') return ''
  if (selectValue === 'desc') return 'desc'
  if (selectValue === 'lease_score_desc') return 'lease_score_desc'
  return ''
}

// Map backend sort values to mobile select values
const mapToSelectValue = (sortOrder: SortOrder): string => {
  if (sortOrder === '') return 'asc'
  if (sortOrder === 'desc') return 'desc'
  if (sortOrder === 'lease_score_desc') return 'lease_score_desc'
  return 'asc'
}

interface MobileFilterOverlayProps {
  isOpen: boolean
  onClose: () => void
  resultCount: number
  sortOrder: SortOrder
  onSortChange: (sortOrder: SortOrder) => void
}

type MobileView = 'filters' | 'makes' | 'makeSelection' | 'models'

const MobileFilterOverlayComponent: React.FC<MobileFilterOverlayProps> = ({
  isOpen,
  onClose,
  resultCount,
  sortOrder,
  onSortChange
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
    setFilter,
    toggleArrayFilter,
    resetFilters, 
    getActiveFilters
  } = useConsolidatedFilterStore()
  
  const { data: referenceData, isLoading: referenceDataLoading } = useReferenceData()
  const activeFilters = getActiveFilters()
  
  // Navigation state
  const [currentView, setCurrentView] = useState<MobileView>('filters')
  const { searchTerm, debouncedSearchTerm, setSearchTerm, clearSearch } = useDebouncedSearch()
  const [selectedMakeForModels, setSelectedMakeForModels] = useState<string | null>(null)
  
  // Get selected makes and models
  const selectedMakes = makes
  const selectedModels = models
  
  // Helper function to get models for a specific make - memoized for performance
  const getModelsForMake = useCallback((makeName: string) => {
    if (!referenceData?.makes || !referenceData?.models) return []
    const make = referenceData.makes.find((m: Make) => m.name === makeName)
    if (!make) return []
    return referenceData.models.filter((model: Model) => model.make_id === make.id)
  }, [referenceData?.makes, referenceData?.models])
  
  // Toggle functions - memoized for performance
  const toggleMake = useCallback((makeName: string) => {
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
  }, [toggleArrayFilter, selectedMakes, selectedModels, getModelsForMake])

  const toggleModel = useCallback((modelName: string) => {
    toggleArrayFilter('models', modelName)
  }, [toggleArrayFilter])

  // Navigation functions - memoized for performance
  const navigateToView = useCallback((view: MobileView, makeName?: string) => {
    if (view === 'models' && makeName) {
      setSelectedMakeForModels(makeName)
    }
    setCurrentView(view)
    // Clear search when changing views
    clearSearch()
  }, [clearSearch])

  const goBack = useCallback(() => {
    switch (currentView) {
      case 'makes':
      case 'makeSelection':
        setCurrentView('filters')
        break
      case 'models':
        setCurrentView('makeSelection')
        setSelectedMakeForModels(null)
        break
      default:
        setCurrentView('filters')
    }
    clearSearch()
  }, [currentView, clearSearch])

  // Filter data based on search - memoized for performance
  const filteredMakes = useMemo(() => {
    if (!referenceData?.makes) return []
    if (!debouncedSearchTerm) return referenceData.makes
    return referenceData.makes.filter((make: Make) =>
      make.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [referenceData?.makes, debouncedSearchTerm])
  
  // Separate popular and other makes for display
  const popularMakesList = useMemo(() => {
    return filteredMakes.filter((make: Make) => 
      FILTER_CONFIG.POPULAR_MAKES.includes(make.name as any)
    )
  }, [filteredMakes])
  
  const otherMakesList = useMemo(() => {
    return filteredMakes.filter((make: Make) => 
      !FILTER_CONFIG.POPULAR_MAKES.includes(make.name as any)
    )
  }, [filteredMakes])

  const filteredModelsForMake = useMemo(() => {
    if (!selectedMakeForModels) return []
    const modelsForMake = getModelsForMake(selectedMakeForModels)
    if (!debouncedSearchTerm) return modelsForMake
    return modelsForMake.filter((model: Model) =>
      model.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [selectedMakeForModels, getModelsForMake, debouncedSearchTerm])

  // Memoized filter count calculations
  const activeFiltersCount = useMemo(() => activeFilters.length, [activeFilters])
  
  // Count of selected models for the current make being viewed
  const selectedModelsForCurrentMake = useMemo(() => {
    if (!selectedMakeForModels) return 0
    const modelsForMake = getModelsForMake(selectedMakeForModels)
    return selectedModels.filter(modelName => 
      modelsForMake.some(model => model.name === modelName)
    ).length
  }, [selectedMakeForModels, selectedModels, getModelsForMake])

  // Handle sort change - memoized for performance
  const handleSortChange = useCallback((value: string) => {
    const backendSort = mapToBackendSort(value)
    onSortChange(backendSort)
  }, [onSortChange])


  // Array filter toggle handlers - memoized for performance
  const handleBodyTypeToggle = useCallback((bodyType: string) => {
    toggleArrayFilter('body_type', bodyType)
  }, [toggleArrayFilter])

  const handleFuelTypeToggle = useCallback((fuelType: string) => {
    toggleArrayFilter('fuel_type', fuelType)
  }, [toggleArrayFilter])

  const handleTransmissionToggle = useCallback((transmission: string) => {
    toggleArrayFilter('transmission', transmission)
  }, [toggleArrayFilter])

  // Don't render if not open
  if (!isOpen) return null

  // Loading state
  if (referenceDataLoading) {
    return (
      <div 
        className={cn(
          // Layout & positioning
          "fixed inset-0 z-50 overflow-hidden",
          // Responsive
          "lg:hidden"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-overlay-title"
      >
        {/* Backdrop */}
        <div 
          className={cn(
            // Positioning
            "absolute inset-0",
            // Styling
            "bg-black/60 backdrop-blur-sm"
          )}
          onClick={onClose}
        />
        
        {/* Slide-up overlay */}
        <div 
          className={cn(
            // Positioning
            "absolute bottom-0 left-0 right-0",
            // Layout
            "flex flex-col",
            // Styling
            "bg-background rounded-t-2xl shadow-2xl border-t border-border/50",
            // Animation
            "transform transition-transform duration-300 ease-out translate-y-0",
            // Sizing - matches mobile price overlay
            "h-[min(90vh,100dvh-2rem)] max-h-[90vh]"
          )}>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-5 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Filtrér</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 w-9 p-0 hover:bg-muted/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <MobileFilterSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // Header component for all views
  const renderHeader = () => (
    <div className="flex items-center justify-between p-5 border-b border-border/50 flex-shrink-0">
      <div className="flex items-center gap-3">
        {currentView !== 'filters' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="h-9 w-9 p-0 hover:bg-muted/50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 id="filter-overlay-title" className="text-lg font-bold">
          {currentView === 'filters' && 'Filtrér'}
          {currentView === 'makes' && 'Vælg mærke'}
          {currentView === 'makeSelection' && 'Mærker og modeller'}
          {currentView === 'models' && `${selectedMakeForModels} modeller`}
        </h2>
        {currentView === 'filters' && activeFiltersCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount}
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-9 w-9 p-0 hover:bg-muted/50 flex-shrink-0"
        aria-label="Luk filter"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )

  // Search input for make/model views
  const renderSearchInput = () => (
    <div className="p-5 border-b border-border/50 flex-shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={currentView === 'makes' ? 'Søg efter mærke...' : 'Søg efter model...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 border-input focus:border-ring"
        />
      </div>
    </div>
  )

  // Main filters view
  const renderFiltersView = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-5 space-y-6">
        {/* Sorting */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Sortering
          </Label>
          <Select
            value={mapToSelectValue(sortOrder)}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-full h-12 border-input focus:border-ring">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mobileSelectOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Make and Model Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">Mærke</Label>
          <Button
            variant="outline"
            onClick={() => navigateToView('makes')}
            className="w-full justify-between h-12 border-input focus:border-ring"
          >
            <span>
              {selectedMakes.length > 0 ? (
                `${selectedMakes.length} mærker valgt`
              ) : (
                'Vælg mærker'
              )}
            </span>
            <Plus className="h-4 w-4 ml-2 flex-shrink-0" />
          </Button>

          <Label className="text-sm font-semibold text-primary">Model</Label>
          <Button
            variant="outline"
            onClick={() => {
              if (selectedMakes.length === 1) {
                // If only one make is selected, go directly to models view
                navigateToView('models', selectedMakes[0])
              } else {
                // If multiple makes, use the make selection view
                navigateToView('makeSelection')
              }
            }}
            disabled={selectedMakes.length === 0}
            className="w-full justify-between h-12 border-input focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {selectedModels.length > 0 ? (
                `${selectedModels.length} modeller valgt`
              ) : (
                selectedMakes.length === 0 ? 'Vælg først mærker' : 'Vælg modeller'
              )}
            </span>
            <Plus className="h-4 w-4 ml-2 flex-shrink-0" />
          </Button>
        </div>

        {/* Fuel Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">Brændstof</Label>
          <div className="flex flex-wrap gap-2">
            {referenceData?.fuelTypes?.map((fuelType) => (
              <Badge
                key={fuelType.name}
                variant={fuel_type?.includes(fuelType.name) ? "default" : "outline"}
                className="cursor-pointer text-sm px-3 py-2 hover:bg-muted"
                onClick={() => handleFuelTypeToggle(fuelType.name)}
              >
                {fuelType.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Transmission */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">Geartype</Label>
          <div className="flex flex-wrap gap-2">
            {FILTER_CONFIG.TRANSMISSION_TYPES.map((trans) => (
              <Badge
                key={trans.value}
                variant={transmission?.includes(trans.value) ? "default" : "outline"}
                className="cursor-pointer text-sm px-3 py-2 hover:bg-muted"
                onClick={() => handleTransmissionToggle(trans.value)}
              >
                {trans.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Body Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">Biltype</Label>
          <div className="flex flex-wrap gap-2">
            {referenceData?.bodyTypes?.map((bodyType) => (
              <Badge
                key={bodyType.name}
                variant={body_type?.includes(bodyType.name) ? "default" : "outline"}
                className="cursor-pointer text-sm px-3 py-2 hover:bg-muted"
                onClick={() => handleBodyTypeToggle(bodyType.name)}
              >
                {bodyType.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">Pris pr. måned</Label>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={price_min?.toString() || 'none'}
              onValueChange={(value) => setFilter('price_min', value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                <SelectValue placeholder="Fra pris" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen min.</SelectItem>
                {FILTER_CONFIG.PRICE.STEPS.map((price) => (
                  <SelectItem key={`price-min-${price}`} value={price.toString()}>
                    {price.toLocaleString('da-DK')} kr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={price_max?.toString() || 'none'}
              onValueChange={(value) => setFilter('price_max', value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                <SelectValue placeholder="Til pris" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen maks.</SelectItem>
                {FILTER_CONFIG.PRICE.STEPS.map((price) => (
                  <SelectItem key={`price-max-${price}`} value={price.toString()}>
                    {price.toLocaleString('da-DK')} kr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Seats Range */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">Antal sæder</Label>
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={seats_min?.toString() || 'none'}
              onValueChange={(value) => setFilter('seats_min', value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                <SelectValue placeholder="Fra sæder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen min.</SelectItem>
                {FILTER_CONFIG.SEATS.RANGE.map((seats) => (
                  <SelectItem key={`seats-min-${seats}`} value={seats.toString()}>
                    {seats} sæder
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={seats_max?.toString() || 'none'}
              onValueChange={(value) => setFilter('seats_max', value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-full h-12 border-input focus:border-ring">
                <SelectValue placeholder="Til sæder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen maks.</SelectItem>
                {FILTER_CONFIG.SEATS.RANGE.map((seats) => (
                  <SelectItem key={`seats-max-${seats}`} value={seats.toString()}>
                    {seats} sæder
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )

  // Makes selection view
  const renderMakesView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {renderSearchInput()}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Popular Makes */}
        {popularMakesList.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Populære mærker</h4>
            <div className="space-y-2">
              {popularMakesList.map((make: Make) => (
                <div key={make.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={`popular-make-${make.id}`}
                    checked={selectedMakes.includes(make.name)}
                    onCheckedChange={() => toggleMake(make.name)}
                  />
                  <Label
                    htmlFor={`popular-make-${make.id}`}
                    className="flex-1 text-sm cursor-pointer font-medium"
                  >
                    {make.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Makes */}
        {otherMakesList.length > 0 && (
          <div className="space-y-3">
            {popularMakesList.length > 0 && <Separator />}
            <h4 className="text-sm font-semibold text-muted-foreground">Andre mærker</h4>
            <div className="space-y-2">
              {otherMakesList.map((make: Make) => (
                <div key={make.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={`other-make-${make.id}`}
                    checked={selectedMakes.includes(make.name)}
                    onCheckedChange={() => toggleMake(make.name)}
                  />
                  <Label
                    htmlFor={`other-make-${make.id}`}
                    className="flex-1 text-sm cursor-pointer font-medium"
                  >
                    {make.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredMakes.length === 0 && debouncedSearchTerm && (
          <div className="text-center text-muted-foreground py-8">
            Ingen mærker fundet for "{debouncedSearchTerm}"
          </div>
        )}
      </div>
      
      {/* Sticky CTA for makes selection */}
      <div className={cn(
        "sticky bottom-0 flex-shrink-0",
        "p-5 border-t border-border/50 bg-background shadow-lg",
        "pb-[max(1rem,env(safe-area-inset-bottom))]"
      )}>
        <Button
          onClick={() => navigateToView('filters')}
          disabled={selectedMakes.length === 0}
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          size="lg"
        >
          Vælg {selectedMakes.length > 0 ? `${selectedMakes.length} ` : ''}mærker
        </Button>
      </div>
    </div>
  )

  // Make selection overview
  const renderMakeSelectionView = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-5 space-y-4">
        {selectedMakes.map((makeName) => {
          const modelsForMake = getModelsForMake(makeName)
          const selectedModelsForMake = selectedModels.filter(modelName =>
            modelsForMake.some(model => model.name === modelName)
          )
          const totalModels = modelsForMake.length
          const selectedCount = selectedModelsForMake.length
          
          return (
            <div key={makeName} className="border border-border/50 rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigateToView('models', makeName)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-base">{makeName}</h3>
                  <div className="text-sm text-muted-foreground">
                    {selectedCount > 0 ? `${selectedCount} af ${totalModels} modeller valgt` : `${totalModels} modeller tilgængelige`}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )
        })}
        
        {selectedMakes.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Vælg mærker for at se modeller
          </div>
        )}
      </div>
    </div>
  )

  // Models selection view
  const renderModelsView = () => (
    <div className="flex-1 flex flex-col min-h-0">
      {renderSearchInput()}
      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        {filteredModelsForMake.map((model: Model) => (
          <div key={model.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
            <Checkbox
              id={`model-${model.id}`}
              checked={selectedModels.includes(model.name)}
              onCheckedChange={() => toggleModel(model.name)}
            />
            <Label
              htmlFor={`model-${model.id}`}
              className="flex-1 text-sm cursor-pointer font-medium"
            >
              {model.name}
            </Label>
          </div>
        ))}
        {filteredModelsForMake.length === 0 && debouncedSearchTerm && (
          <div className="text-center text-muted-foreground py-8">
            Ingen modeller fundet for "{debouncedSearchTerm}"
          </div>
        )}
      </div>
      
      {/* Sticky CTA for models selection */}
      <div className={cn(
        "sticky bottom-0 flex-shrink-0",
        "p-5 border-t border-border/50 bg-background shadow-lg",
        "pb-[max(1rem,env(safe-area-inset-bottom))]"
      )}>
        <Button
          onClick={() => navigateToView('makeSelection')}
          disabled={selectedModelsForCurrentMake === 0}
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          size="lg"
        >
          Vælg {selectedModelsForCurrentMake > 0 ? `${selectedModelsForCurrentMake} ` : ''}modeller
        </Button>
      </div>
    </div>
  )

  // Footer with results button and reset filter
  const renderFooter = () => (
    <div className={cn(
      // Positioning
      "sticky bottom-0",
      // Layout
      "flex-shrink-0",
      // Styling
      "p-5 border-t border-border/50 bg-background shadow-lg",
      // iOS safe area support
      "pb-[max(1rem,env(safe-area-inset-bottom))]"
    )}>
      <div className="flex gap-3 w-full">
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            onClick={resetFilters}
            className="flex-shrink-0 h-12"
          >
            Nulstil
          </Button>
        )}
        <Button
          onClick={onClose}
          className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          Vis {resultCount} resultater
        </Button>
      </div>
    </div>
  )

  return (
    <div 
      className={cn(
        // Layout & positioning
        "fixed inset-0 z-50 overflow-hidden",
        // Responsive
        "lg:hidden"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-overlay-title"
    >
      {/* Backdrop */}
      <div 
        className={cn(
          // Positioning
          "absolute inset-0",
          // Styling
          "bg-black/60 backdrop-blur-sm"
        )}
        onClick={onClose}
      />
      
      {/* Slide-up overlay */}
      <div 
        className={cn(
          // Positioning
          "absolute bottom-0 left-0 right-0",
          // Layout
          "flex flex-col",
          // Styling
          "bg-background rounded-t-2xl shadow-2xl border-t border-border/50",
          // Animation
          "transform transition-transform duration-300 ease-out translate-y-0",
          // Sizing - matches mobile price overlay
          "h-[min(90vh,100dvh-2rem)] max-h-[90vh]"
        )}>
        <div className="flex-1 flex flex-col min-h-0">
          {renderHeader()}
          
          {currentView === 'filters' && renderFiltersView()}
          {currentView === 'makes' && renderMakesView()}
          {currentView === 'makeSelection' && renderMakeSelectionView()}
          {currentView === 'models' && renderModelsView()}
          
          {currentView === 'filters' && renderFooter()}
        </div>
      </div>
    </div>
  )
}

// Memoize the component for performance
export const MobileFilterOverlay = React.memo(MobileFilterOverlayComponent)
export default MobileFilterOverlay