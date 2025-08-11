import React from 'react'
import { PriceRangeFilter } from './PriceRangeFilter'
import type { FilterSchemaKey } from '@/config/filterSchema'

interface RangeFilterProps {
  label: string
  minValue?: number | null
  maxValue?: number | null
  onMinChange: (value: string | number) => void
  onMaxChange: (value: string | number) => void
  schemaKey: FilterSchemaKey
  variant?: 'desktop' | 'mobile'
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Unified RangeFilter component that provides consistent range selection
 * across desktop and mobile with schema-based configuration
 */
export const RangeFilter: React.FC<RangeFilterProps> = ({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  schemaKey,
  variant = 'desktop',
  orientation = 'horizontal',
  className = ''
}) => {
  return (
    <PriceRangeFilter
      label={label}
      minValue={minValue}
      maxValue={maxValue}
      onMinChange={onMinChange}
      onMaxChange={onMaxChange}
      schemaKey={schemaKey}
      variant={variant}
      orientation={orientation}
      className={className}
    />
  )
}

RangeFilter.displayName = 'RangeFilter'
export default RangeFilter