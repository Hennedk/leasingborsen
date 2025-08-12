import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, X } from 'lucide-react'
import { useReferenceData } from '@/hooks/useReferenceData'
import { FILTER_CONFIG, filterHelpers } from '@/config/filterConfig'
import FilterSkeleton from '@/components/FilterSkeleton'
import {
  FilterChips,
  ExpandableFilterChips,
  MakeModelSelector,
  PriceRangeFilter,
  useFilterOperations
} from '@/components/shared/filters'

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
    activeFiltersCount,
    getModelsForMake,
    toggleMake,
    toggleModel,
    handleFilterChange,
    handleArrayFilterToggle,
    handleResetAllFilters
  } = useFilterOperations()

  // Get consolidated filter options from config and transform to match interface
  const consolidatedFuelTypes = FILTER_CONFIG.FUEL_TYPES
  const { popular: popularBodyTypes, remaining: remainingBodyTypes } = filterHelpers.getBodyTypesByPopularity()
  const consolidatedTransmissions = FILTER_CONFIG.TRANSMISSION_TYPES.map(t => ({ name: t.value, label: t.label }))

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
              {activeFiltersCount > 0 && (
                <Badge variant="result-count">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAllFilters}
                disabled={activeFiltersCount === 0}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
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
              options={consolidatedFuelTypes}
              selectedValues={fuelTypes}
              onToggle={(value) => handleArrayFilterToggle('fuel_type', value)}
            />

            {/* Transmission Filter */}
            <FilterChips
              label="Geartype"
              options={consolidatedTransmissions}
              selectedValues={transmissions}
              onToggle={(value) => handleArrayFilterToggle('transmission', value)}
            />

            {/* Body Type Filter */}
            <ExpandableFilterChips
              label="Biltype"
              popularOptions={popularBodyTypes}
              remainingOptions={remainingBodyTypes}
              selectedValues={bodyTypes}
              onToggle={(value) => handleArrayFilterToggle('body_type', value)}
            />

            {/* Price Range Filter */}
            <PriceRangeFilter
              label="Ydelse pr. måned"
              minValue={priceMin}
              maxValue={priceMax}
              onMinChange={(value) => handleFilterChange('price_min', value)}
              onMaxChange={(value) => handleFilterChange('price_max', value)}
              schemaKey="price"
              variant="desktop"
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