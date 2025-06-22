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
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="font-medium text-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.name)
          return (
            <Badge
              key={option.name}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105 px-3 py-1.5 text-sm font-medium",
                isSelected 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "hover:bg-muted border-muted-foreground/30 text-muted-foreground/60 hover:border-primary/50"
              )}
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