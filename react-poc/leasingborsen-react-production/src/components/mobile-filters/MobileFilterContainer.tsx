import React, { useMemo } from 'react'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useDebouncedSearch } from '@/hooks/useDebounce'
import { useFilterNavigation } from '@/hooks/useFilterNavigation'
import { useFilterOperations } from '@/hooks/useFilterOperations'
import { MobileFilterHeader } from './MobileFilterHeader'
import { MobileFilterSearch } from './MobileFilterSearch'
import { MobileFilterCategories } from './MobileFilterCategories'
import { MobileFilterChips } from './MobileFilterChips'
import { MobileFilterPricing } from './MobileFilterPricing'
import { MobileFilterActions } from './MobileFilterActions'
import { MobileFilterSkeleton } from '@/components/FilterSkeleton'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FILTER_CONFIG } from '@/config/filterConfig'
import type { Make, Model, SortOrder } from '@/types'

interface MobileFilterContainerProps {
  isOpen: boolean
  onClose: () => void
  resultCount: number
  sortOrder: SortOrder
  onSortChange: (sortOrder: SortOrder) => void
}

/**
 * MobileFilterContainer - Main orchestrator for mobile filter overlay
 * 
 * Manages state, data, and coordinates between all filter components
 * Reduced from original 769 lines to focused orchestration
 */
export const MobileFilterContainer: React.FC<MobileFilterContainerProps> = ({
  isOpen,
  onClose,
  resultCount,
  sortOrder,
  onSortChange
}) => {
  const { data: referenceData, isLoading: referenceDataLoading } = useReferenceData()
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebouncedSearch()
  
  // Navigation management
  const navigation = useFilterNavigation({ onClose })
  
  // Filter operations
  const filterOps = useFilterOperations()

  // Helper function to get models for a specific make
  const getModelsForMake = (makeName: string) => {
    if (!referenceData?.makes || !referenceData?.models) return []
    const make = referenceData.makes.find((m: Make) => m.name === makeName)
    if (!make) return []
    return referenceData.models.filter((model: Model) => model.make_id === make.id)
  }

  // Enhanced toggle functions with model cleanup
  const handleMakeToggle = (makeName: string) => {
    filterOps.toggleMake(makeName)
    // Clear models when removing a make
    if (filterOps.selectedMakes.includes(makeName)) {
      const modelsToRemove = getModelsForMake(makeName)
      modelsToRemove.forEach(model => {
        if (filterOps.selectedModels.includes(model.name)) {
          filterOps.toggleModel(model.name)
        }
      })
    }
  }

  const handleMakeSelect = (makeName: string) => {
    navigation.navigateToView('models', makeName)
  }

  // Prepare makes data with search filtering
  const { popularMakes, otherMakes } = useMemo(() => {
    if (!referenceData?.makes) return { popularMakes: [], otherMakes: [] }
    
    const popular = FILTER_CONFIG.POPULAR_MAKES as readonly string[]
    let filteredMakes = referenceData.makes

    // Apply search filter
    if (debouncedSearchTerm) {
      filteredMakes = filteredMakes.filter((make: Make) =>
        make.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    const popularMakes = filteredMakes.filter((make: Make) => popular.includes(make.name as any))
    const otherMakes = filteredMakes.filter((make: Make) => !popular.includes(make.name as any))

    return { popularMakes, otherMakes }
  }, [referenceData?.makes, debouncedSearchTerm])

  // Prepare models data for selected make
  const modelsForSelectedMake = useMemo(() => {
    if (!navigation.selectedMakeForModels) return []
    let models = getModelsForMake(navigation.selectedMakeForModels)

    // Apply search filter
    if (debouncedSearchTerm) {
      models = models.filter((model: Model) =>
        model.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    return models
  }, [navigation.selectedMakeForModels, referenceData?.models, debouncedSearchTerm])

  // Prepare filter options
  const consolidatedFuelTypes = useMemo(() => {
    if (!referenceData?.fuelTypes) return []
    return referenceData.fuelTypes.map((ft: any) => ({
      name: ft.name,
      value: ft.name
    }))
  }, [referenceData?.fuelTypes])

  const consolidatedBodyTypes = useMemo(() => {
    if (!referenceData?.bodyTypes) return []
    return referenceData.bodyTypes.map((bt: any) => ({
      name: bt.name,
      value: bt.name
    }))
  }, [referenceData?.bodyTypes])

  // Calculate can proceed states
  const canProceedFromMakes = filterOps.selectedMakes.length > 0
  const canProceedFromModels = filterOps.selectedModels.length > 0

  // Handle apply filters
  const handleApply = () => {
    navigation.resetNavigation()
    onClose()
  }

  // Loading state
  if (referenceDataLoading) {
    return <MobileFilterSkeleton />
  }

  // Main render
  if (!isOpen) return null

  const renderFiltersView = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 space-y-6">
        {/* Sorting and Pricing */}
        <MobileFilterPricing
          sortOrder={sortOrder}
          priceMin={filterOps.priceMin}
          priceMax={filterOps.priceMax}
          seatsMin={filterOps.seatsMin}
          seatsMax={filterOps.seatsMax}
          onSortChange={onSortChange}
          onFilterChange={filterOps.handleFilterChange}
          priceSteps={FILTER_CONFIG.PRICE.STEPS}
        />

        <Separator />

        {/* Make/Model Filter Buttons */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => navigation.navigateToView('makes')}
            className="w-full justify-between h-12"
          >
            <span>Mærker</span>
            <span className="text-muted-foreground">
              {filterOps.selectedMakes.length > 0 ? `${filterOps.selectedMakes.length} valgt` : 'Alle'}
            </span>
          </Button>
          
          {filterOps.selectedMakes.length > 0 && (
            <Button
              variant="outline"
              onClick={() => navigation.navigateToView('makeSelection')}
              className="w-full justify-between h-12"
            >
              <span>Modeller</span>
              <span className="text-muted-foreground">
                {filterOps.selectedModels.length > 0 ? `${filterOps.selectedModels.length} valgt` : 'Alle'}
              </span>
            </Button>
          )}
        </div>

        <Separator />

        {/* Filter Chips */}
        <MobileFilterChips
          fuelTypes={filterOps.fuelTypes}
          transmissions={filterOps.transmissions}
          bodyTypes={filterOps.bodyTypes}
          consolidatedFuelTypes={consolidatedFuelTypes}
          consolidatedBodyTypes={consolidatedBodyTypes}
          onArrayFilterToggle={filterOps.handleArrayFilterToggle}
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-x-0 bottom-0 top-16 bg-background rounded-t-xl flex flex-col">
        {/* Header */}
        <MobileFilterHeader
          currentView={navigation.currentView}
          activeFiltersCount={filterOps.activeFiltersCount}
          selectedMakeForModels={navigation.selectedMakeForModels}
          onBack={navigation.goBack}
          onClose={onClose}
          canGoBack={navigation.canGoBack}
        />

        {/* Search (conditional) */}
        <MobileFilterSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder={
            navigation.currentView === 'makes' ? 'Søg mærker...' : 'Søg modeller...'
          }
          showSearch={navigation.currentView === 'makes' || navigation.currentView === 'models'}
        />

        {/* Main Content */}
        {navigation.currentView === 'filters' && renderFiltersView()}
        
        <MobileFilterCategories
          currentView={navigation.currentView}
          popularMakes={popularMakes}
          otherMakes={otherMakes}
          selectedMakes={filterOps.selectedMakes}
          onMakeToggle={handleMakeToggle}
          models={modelsForSelectedMake}
          selectedModels={filterOps.selectedModels}
          onModelToggle={filterOps.toggleModel}
          onMakeSelect={handleMakeSelect}
          isLoading={referenceDataLoading}
        />

        {/* Actions Footer */}
        <MobileFilterActions
          currentView={navigation.currentView}
          activeFiltersCount={filterOps.activeFiltersCount}
          resultCount={resultCount}
          selectedMakesCount={filterOps.selectedMakes.length}
          selectedModelsCount={filterOps.selectedModels.length}
          canProceed={
            navigation.currentView === 'makes' ? canProceedFromMakes : canProceedFromModels
          }
          onClearAll={filterOps.handleClearAll}
          onApply={handleApply}
          onViewChange={navigation.navigateToView}
        />
      </div>
    </div>
  )
}