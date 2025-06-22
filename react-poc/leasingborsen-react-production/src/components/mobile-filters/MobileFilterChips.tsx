import React from 'react'
import { FilterChips } from '@/components/shared/filters'

interface FilterOption {
  name: string
  value: string
  count?: number
}

interface MobileFilterChipsProps {
  // Current selections
  fuelTypes?: string[]
  transmissions?: string[]
  bodyTypes?: string[]
  // Available options
  consolidatedFuelTypes: FilterOption[]
  consolidatedBodyTypes: FilterOption[]
  // Handler
  onArrayFilterToggle: (key: string, value: string) => void
  className?: string
}

/**
 * MobileFilterChips - Multi-select filter chips component using shared components
 * 
 * Renders fuel type, transmission, and body type filter chips
 * Refactored to use shared FilterChips component for consistency
 */
export const MobileFilterChips: React.FC<MobileFilterChipsProps> = React.memo(({
  fuelTypes = [],
  transmissions = [],
  bodyTypes = [],
  consolidatedFuelTypes,
  consolidatedBodyTypes,
  onArrayFilterToggle,
  className = ''
}) => {
  // Transform options to match shared component interface
  const fuelTypeOptions = consolidatedFuelTypes.map(ft => ({ name: ft.name, label: ft.name }))
  const bodyTypeOptions = consolidatedBodyTypes.map(bt => ({ name: bt.name, label: bt.name }))
  const transmissionOptions = [
    { name: 'Manual', label: 'Manuelt' },
    { name: 'Automatic', label: 'Automatisk' }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Fuel Types */}
      <FilterChips
        label="Brændstof"
        options={fuelTypeOptions}
        selectedValues={fuelTypes}
        onToggle={(value) => onArrayFilterToggle('fuel_type', value)}
      />

      {/* Transmissions */}
      <FilterChips
        label="Gearkasse"
        options={transmissionOptions}
        selectedValues={transmissions}
        onToggle={(value) => onArrayFilterToggle('transmission', value)}
      />

      {/* Body Types */}
      <FilterChips
        label="Biltype"
        options={bodyTypeOptions}
        selectedValues={bodyTypes}
        onToggle={(value) => onArrayFilterToggle('body_type', value)}
      />
    </div>
  )
})

MobileFilterChips.displayName = 'MobileFilterChips'