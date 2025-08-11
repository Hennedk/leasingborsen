import React from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRangeFilter } from '@/hooks/useRangeFilter'
import { getFilterSchema, type FilterSchemaKey } from '@/config/filterSchema'
import { cn } from '@/lib/utils'

interface PriceRangeFilterProps {
  label: string
  minValue?: number | null
  maxValue?: number | null
  steps?: number[]
  onMinChange: (value: string | number) => void
  onMaxChange: (value: string | number) => void
  minPlaceholder?: string
  maxPlaceholder?: string
  maxLabel?: string
  className?: string
  variant?: 'desktop' | 'mobile'
  schemaKey?: FilterSchemaKey
  orientation?: 'horizontal' | 'vertical'
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
  minPlaceholder,
  maxPlaceholder,
  maxLabel,
  className = '',
  variant = 'desktop',
  schemaKey,
  orientation = 'horizontal'
}) => {
  // Get schema-based configuration if provided
  const schema = schemaKey ? getFilterSchema(schemaKey) : null
  const effectiveSteps = steps || (schema?.type === 'range' ? [...schema.steps] : [])
  const effectiveFormatter = schema?.type === 'range' ? schema.formatter : undefined
  const effectiveMinPlaceholder = minPlaceholder || (schema?.type === 'range' ? schema.labels?.min : undefined) || 'Min'
  const effectiveMaxPlaceholder = maxPlaceholder || (schema?.type === 'range' ? schema.labels?.max : undefined) || 'Max'
  const effectiveMaxLabel = maxLabel || (schema?.type === 'range' && schema.labels ? schema.labels.unlimited : undefined)

  // Use shared range filter logic
  const {
    filteredMinSteps,
    filteredMaxSteps,
    formatValue,
    getValidationMessage
  } = useRangeFilter({
    steps: effectiveSteps || [],
    minValue,
    maxValue,
    formatter: effectiveFormatter,
    minLabel: effectiveMinPlaceholder,
    maxLabel: effectiveMaxPlaceholder
  })
  const isMobile = variant === 'mobile'
  const isVertical = orientation === 'vertical'
  const validationMessage = getValidationMessage?.() || null

  return (
    <div className={cn('space-y-3', className)}>
      <Label className={cn(
        'font-medium text-foreground',
        isMobile ? 'text-base' : 'text-sm'
      )}>
        {label}
      </Label>
      <div className={cn(
        'gap-3',
        isVertical ? 'space-y-3' : 'grid grid-cols-2'
      )}>
        <Select 
          value={minValue?.toString() || 'all'} 
          onValueChange={onMinChange}
        >
          <SelectTrigger className={cn(
            'border-input focus:border-ring justify-between bg-background text-foreground px-4',
            isMobile ? 'h-12 text-sm' : 'h-12 text-sm'
          )}>
            <SelectValue placeholder={effectiveMinPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isMobile && schemaKey === 'price' ? 'Ingen min.' : effectiveMinPlaceholder}
            </SelectItem>
            {filteredMinSteps.map((step) => (
              <SelectItem key={`min-${step}`} value={step.toString()}>
                {formatValue(step)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={maxValue?.toString() || 'all'} 
          onValueChange={onMaxChange}
        >
          <SelectTrigger className={cn(
            'border-input focus:border-ring justify-between bg-background text-foreground px-4',
            isMobile ? 'h-12 text-sm' : 'h-12 text-sm'
          )}>
            <SelectValue placeholder={effectiveMaxPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {isMobile && schemaKey === 'price' ? 'Ingen maks.' : effectiveMaxPlaceholder}
            </SelectItem>
            {filteredMaxSteps.map((step) => (
              <SelectItem key={`max-${step}`} value={step.toString()}>
                {formatValue(step)}
              </SelectItem>
            ))}
            {effectiveMaxLabel && (
              <SelectItem value="9999999">{effectiveMaxLabel}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      {validationMessage && (
        <p className="text-sm text-destructive mt-2">{validationMessage}</p>
      )}
    </div>
  )
}

PriceRangeFilter.displayName = 'PriceRangeFilter'