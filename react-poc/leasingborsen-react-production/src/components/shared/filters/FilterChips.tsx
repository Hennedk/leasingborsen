import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FilterOption {
  readonly name: string
  readonly label: string
}

interface FilterChipsProps {
  label: string
  options: readonly FilterOption[]
  selectedValues: string[]
  onToggle: (value: string) => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

/**
 * FilterChips - Reusable multi-select chip component
 * 
 * Used for fuel type, transmission, and body type filters
 */
export const FilterChips: React.FC<FilterChipsProps> = ({
  label,
  options,
  selectedValues,
  onToggle,
  className = '',
  variant = 'desktop'
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <Label className={cn(
        'font-medium text-foreground',
        variant === 'mobile' ? 'text-base' : 'text-sm'
      )}>
        {label}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.name)
          return (
            <Badge
              key={option.name}
              variant={isSelected ? "filter-selected" : "filter-unselected"}
              size="default"
              className="cursor-pointer transition-colors"
              onClick={() => onToggle(option.name)}
            >
              {option.label}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}

FilterChips.displayName = 'FilterChips'