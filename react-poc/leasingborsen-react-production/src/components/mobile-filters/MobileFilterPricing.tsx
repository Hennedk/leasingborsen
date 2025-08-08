import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpDown } from 'lucide-react'
import { PriceRangeFilter } from '@/components/shared/filters'
import type { SortOrder } from '@/types'

interface MobileFilterPricingProps {
  // Current values
  sortOrder: SortOrder
  priceMin?: number | null
  priceMax?: number | null
  seatsMin?: number | null
  seatsMax?: number | null
  // Handlers
  onSortChange: (sortOrder: SortOrder) => void
  onFilterChange: (key: string, value: string | number) => void
  // Config
  priceSteps: number[]
  className?: string
}

/**
 * MobileFilterPricing - Price range and sorting controls using shared components
 * 
 * Handles sorting, price range, and seat count selections
 * Refactored to use shared PriceRangeFilter for consistency
 */
export const MobileFilterPricing: React.FC<MobileFilterPricingProps> = React.memo(({
  sortOrder,
  priceMin,
  priceMax,
  seatsMin,
  seatsMax,
  onSortChange,
  onFilterChange,
  priceSteps,
  className = ''
}) => {
  // Sort options configuration - adapted for Radix UI Select (no empty string values)
  const mobileSelectOptions = [
    { value: 'asc', label: 'Laveste pris' },
    { value: 'desc', label: 'Højeste pris' },
    { value: 'lease_score_desc', label: 'Bedste værdi' }
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

  const handleSortChange = (value: string) => {
    const backendSort = mapToBackendSort(value)
    onSortChange(backendSort)
  }

  const seatOptions = [2, 3, 4, 5, 6, 7, 8, 9]

  // Handle filter change with proper key mapping
  const handlePriceMinChange = (value: string | number) => {
    onFilterChange('priceMin', value === 'all' ? '' : value)
  }

  const handlePriceMaxChange = (value: string | number) => {
    onFilterChange('priceMax', value === 'all' ? '' : value)
  }

  const handleSeatsMinChange = (value: string | number) => {
    onFilterChange('seatsMin', value === 'all' ? '' : value)
  }

  const handleSeatsMaxChange = (value: string | number) => {
    onFilterChange('seatsMax', value === 'all' ? '' : value)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sorting */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          Sortering
        </Label>
        <Select
          value={mapToSelectValue(sortOrder)}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Vælg sortering" />
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

      {/* Price Range using shared component */}
      <PriceRangeFilter
        label="Prisinterval (kr/md)"
        minValue={priceMin}
        maxValue={priceMax}
        steps={priceSteps}
        onMinChange={handlePriceMinChange}
        onMaxChange={handlePriceMaxChange}
        minPlaceholder="Fra"
        maxPlaceholder="Til"
        maxLabel="10.000+ kr"
      />

      {/* Seat Count using shared component */}
      <PriceRangeFilter
        label="Antal sæder"
        minValue={seatsMin}
        maxValue={seatsMax}
        steps={seatOptions}
        onMinChange={handleSeatsMinChange}
        onMaxChange={handleSeatsMaxChange}
        minPlaceholder="Min"
        maxPlaceholder="Max"
      />
    </div>
  )
})

MobileFilterPricing.displayName = 'MobileFilterPricing'