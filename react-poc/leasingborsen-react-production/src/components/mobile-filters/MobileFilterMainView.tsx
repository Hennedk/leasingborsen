import React, { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, ArrowUpDown } from 'lucide-react'
import { useFilterStore } from '@/stores/filterStore'
import { cn } from '@/lib/utils'
import { FILTER_CONFIG } from '@/config/filterConfig'
import MobileViewHeader from './MobileViewHeader'
import type { FilterChip, SortOrder, SortOption } from '@/types'

// Sort options configuration - consistent with backend values
const sortOptions: SortOption[] = [
  { value: '', label: 'Laveste pris' },
  { value: 'desc', label: 'Højeste pris' }
]

interface MobileFilterMainViewProps {
  onNavigateToMakes: () => void
  onNavigateToModels: () => void
  onClose: () => void
  resultCount: number
  activeFilters: FilterChip[]
  sortOrder: SortOrder
  onSortChange: (sortOrder: SortOrder) => void
}

/**
 * Main filter view for mobile overlay
 * Handles all filter options except make/model selection which use dedicated views
 * 
 * Optimized features:
 * - Memoized badge rendering
 * - Efficient filter change handlers
 * - Proper accessibility labels
 * - Responsive grid layouts
 * - Desktop-consistent badge behavior (no X icons)
 */
const MobileFilterMainView: React.FC<MobileFilterMainViewProps> = ({
  onNavigateToMakes,
  onNavigateToModels,
  onClose,
  resultCount,
  activeFilters,
  sortOrder,
  onSortChange
}) => {
  const {
    makes = [],
    models = [],
    body_type = [],
    fuel_type = [],
    transmission = [],
    price_min,
    price_max,
    seats_min,
    seats_max,
    setFilter,
    toggleArrayFilter,
    resetFilters
  } = useFilterStore()

  // Get filter options from config
  const consolidatedFuelTypes = FILTER_CONFIG.FUEL_TYPES
  const consolidatedBodyTypes = FILTER_CONFIG.BODY_TYPES
  const priceSteps = FILTER_CONFIG.PRICE.STEPS

  // Optimized filter change handler
  const handleFilterChange = useCallback((key: string, value: string | number) => {
    const isNumericField = ['price_min', 'price_max', 'seats_min', 'seats_max'].includes(key)
    
    if (isNumericField && value !== 'all' && value !== '') {
      const numericValue = parseInt(value as string)
      setFilter(key as any, numericValue)
    } else if (isNumericField) {
      setFilter(key as any, null)
    }
  }, [setFilter])

  // Clear all filters handler
  const handleClearAll = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  // Sort change handler
  const handleSortChange = useCallback((newSortOrder: SortOrder) => {
    onSortChange(newSortOrder)
  }, [onSortChange])

  // Get current sort label
  const currentSortLabel = sortOptions.find(option => option.value === sortOrder)?.label || 'Laveste pris'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <MobileViewHeader
        title="Filtrér"
        onClose={onClose}
        showActiveCount
        activeCount={activeFilters.length}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-6">
          {/* Sorting Section - at the top */}
          <div className="space-y-3">
            <Label className="font-medium text-foreground">Sortering</Label>
            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full h-12">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <SelectValue placeholder={currentSortLabel} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className={sortOrder === option.value ? 'bg-muted font-medium' : ''}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Make Filter */}
          <div className="space-y-3">
            <Label className="font-medium text-foreground">Mærke</Label>
            <Button
              variant="outline"
              className="w-full justify-between h-12"
              onClick={onNavigateToMakes}
            >
              {makes.length > 0 
                ? `${makes.length} ${makes.length === 1 ? 'mærke' : 'mærker'} valgt`
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
              className="w-full justify-between h-12"
              disabled={makes.length === 0}
              onClick={onNavigateToModels}
            >
              {makes.length === 0 
                ? 'Vælg mærker først'
                : models.length > 0 
                  ? `${models.length} ${models.length === 1 ? 'model' : 'modeller'} valgt`
                  : 'Vælg modeller'
              }
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Fuel Type Filter - Consistent with desktop (no X icons) */}
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
                      "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-2 text-sm",
                      isSelected 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-muted border-border hover:border-primary/50"
                    )}
                    onClick={() => toggleArrayFilter('fuel_type', fuelTypeItem.name)}
                  >
                    {fuelTypeItem.label}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Transmission Filter - Consistent with desktop (no X icons) */}
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
                      "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-2 text-sm",
                      isSelected 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-muted border-border hover:border-primary/50"
                    )}
                    onClick={() => toggleArrayFilter('transmission', transmissionType)}
                  >
                    {label}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Body Type Filter - Consistent with desktop (no X icons) */}
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
                      "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-2 text-sm",
                      isSelected 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-muted border-border hover:border-primary/50"
                    )}
                    onClick={() => toggleArrayFilter('body_type', bodyTypeItem.name)}
                  >
                    {bodyTypeItem.label}
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
                <SelectTrigger className="h-12">
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
                <SelectTrigger className="h-12">
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
                <SelectTrigger className="h-12">
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
                <SelectTrigger className="h-12">
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
        </div>
      </div>
      
      {/* Footer - Sticky CTA */}
      <div className="sticky bottom-0 p-4 border-t border-border/50 bg-background shadow-lg flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleClearAll}
            disabled={activeFilters.length === 0}
            className="flex-1 h-12"
          >
            Nulstil alle
          </Button>
          <Button 
            onClick={onClose} 
            className="flex-1 h-12"
          >
            Vis {resultCount} resultater
          </Button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(MobileFilterMainView)