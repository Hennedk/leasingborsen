import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PriceRangeFilterProps {
  label: string
  minValue?: number | null
  maxValue?: number | null
  steps: number[]
  onMinChange: (value: string | number) => void
  onMaxChange: (value: string | number) => void
  minPlaceholder?: string
  maxPlaceholder?: string
  maxLabel?: string
  className?: string
}

/**
 * PriceRangeFilter - Reusable price range selection component
 * 
 * Used for price and seat count filters
 */
export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  label,
  minValue,
  maxValue,
  steps,
  onMinChange,
  onMaxChange,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  maxLabel,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-semibold text-primary">{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        <Select 
          value={minValue?.toString() || 'all'} 
          onValueChange={onMinChange}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder={minPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{minPlaceholder}</SelectItem>
            {steps.map((step) => (
              <SelectItem key={`min-${step}`} value={step.toString()}>
                {typeof step === 'number' && step > 1000 
                  ? `${step.toLocaleString('da-DK')} kr`
                  : step.toString()
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={maxValue?.toString() || 'all'} 
          onValueChange={onMaxChange}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder={maxPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{maxPlaceholder}</SelectItem>
            {steps.map((step) => (
              <SelectItem key={`max-${step}`} value={step.toString()}>
                {typeof step === 'number' && step > 1000 
                  ? `${step.toLocaleString('da-DK')} kr`
                  : step.toString()
                }
              </SelectItem>
            ))}
            {maxLabel && (
              <SelectItem value="9999999">{maxLabel}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

PriceRangeFilter.displayName = 'PriceRangeFilter'