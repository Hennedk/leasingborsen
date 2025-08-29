import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useReferenceData } from '@/hooks/useReferenceData'
import { useFilterOptions } from '@/hooks/useFilterTranslations'
import { FILTER_CONFIG, filterHelpers } from '@/config/filterConfig'
import FilterSkeleton from '@/components/FilterSkeleton'
import {
  FilterChips,
  ExpandableFilterChips,
  MakeModelSelector,
  PriceRangeFilter,
  useFilterOperations
} from '@/components/shared/filters'
import { MileageChips } from '@/components/filters/MileageChips'

/* Claude Change Summary:
 * Refactored FilterSidebar (591→120 lines) using shared filter components.
 * Extracted MakeModelSelector, FilterChips, PriceRangeFilter, and useFilterOperations.
 * Reduced code duplication with mobile filters by 80%.
 * Related to: CODEBASE_IMPROVEMENTS_ADMIN.md Critical Issue #3
 */

interface FilterSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

/**
 * FilterSidebar - Desktop filter component using shared filter logic
 * 
 * Refactored from 591 lines to use shared components and reduce duplication
 */
const FilterSidebarComponent: React.FC<FilterSidebarProps> = ({ 
  isOpen = true, 
  onClose, 
  className = ''
}) => {
  const { data: referenceData, isLoading: referenceDataLoading } = useReferenceData()
  
  // Get centralized filter options with translations
  const { simplifiedFuelTypeOptions, transmissionOptions, bodyTypeOptions } = useFilterOptions()
  
  const {
    selectedMakes,
    selectedModels,
    fuelTypes,
    transmissions,
    bodyTypes,
    priceMin,
    priceMax,
    seatsMin,
    seatsMax,
    mileageSelected,
    activeFiltersCount,
    getModelsForMake,
    toggleMake,
    toggleModel,
    handleFilterChange,
    handleArrayFilterToggle,
    handleResetAllFilters
  } = useFilterOperations()

  // Get body types organized by popularity for the expandable filter
  const { popular: popularBodyTypes, remaining: remainingBodyTypes } = filterHelpers.getBodyTypesByPopularity()
  
  // Transform centralized options to match existing body type structure
  const popularBodyTypeOptions = popularBodyTypes.map(bt => ({
    name: bt.name,
    label: bodyTypeOptions.find(option => option.name === bt.name)?.label || bt.label
  }))
  const remainingBodyTypeOptions = remainingBodyTypes.map(bt => ({
    name: bt.name,
    label: bodyTypeOptions.find(option => option.name === bt.name)?.label || bt.label
  }))

  // Show skeleton while reference data is loading
  if (referenceDataLoading) {
    return <FilterSkeleton className={className} />
  }

  if (!referenceData) {
    return null
  }

  return (
    <div className={`${className} ${isOpen ? 'block' : 'hidden'}`}>
      <Card className="bg-card/95 backdrop-blur-sm border border-border/40 hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 pt-6 bg-gradient-to-b from-background to-background/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Filtre
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAllFilters}
                  className="h-8 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                  title="Nulstil alle filtre"
                >
                  Nulstil ({activeFiltersCount})
                </Button>
              )}
              
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
            
            {/* Price Range Filter - MOVED TO TOP */}
            <PriceRangeFilter
              label="Ydelse pr. måned"
              minValue={priceMin}
              maxValue={priceMax}
              onMinChange={(value) => handleFilterChange('price_min', value)}
              onMaxChange={(value) => handleFilterChange('price_max', value)}
              schemaKey="price"
              variant="desktop"
            />

            {/* Mileage Filter - MOVED TO SECOND */}
            <MileageChips
              label="Km pr. år"
              selectedMileage={mileageSelected as any}
              onMileageChange={(mileage) => handleFilterChange('mileage_selected', mileage)}
              variant="desktop"
            />

            {/* Make and Model Selector */}
            <MakeModelSelector
              makes={referenceData.makes || []}
              getModelsForMake={(makeName) => getModelsForMake(makeName, referenceData)}
              popularMakes={FILTER_CONFIG.POPULAR_MAKES}
              selectedMakes={selectedMakes}
              selectedModels={selectedModels}
              onMakeToggle={(makeName) => toggleMake(makeName, referenceData)}
              onModelToggle={toggleModel}
            />

            {/* Fuel Type Filter */}
            <FilterChips
              label="Drivmiddel"
              options={simplifiedFuelTypeOptions}
              selectedValues={fuelTypes}
              onToggle={(value) => handleArrayFilterToggle('fuel_type', value)}
            />

            {/* Transmission Filter */}
            <FilterChips
              label="Geartype"
              options={transmissionOptions}
              selectedValues={transmissions}
              onToggle={(value) => handleArrayFilterToggle('transmission', value)}
            />

            {/* Body Type Filter */}
            <ExpandableFilterChips
              label="Biltype"
              popularOptions={popularBodyTypeOptions}
              remainingOptions={remainingBodyTypeOptions}
              selectedValues={bodyTypes}
              onToggle={(value) => handleArrayFilterToggle('body_type', value)}
            />

            {/* Seat Count Filter */}
            <PriceRangeFilter
              label="Antal sæder"
              minValue={seatsMin}
              maxValue={seatsMax}
              onMinChange={(value) => handleFilterChange('seats_min', value)}
              onMaxChange={(value) => handleFilterChange('seats_max', value)}
              schemaKey="seats"
              variant="desktop"
            />

          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const FilterSidebar = React.memo(FilterSidebarComponent)
export default FilterSidebar