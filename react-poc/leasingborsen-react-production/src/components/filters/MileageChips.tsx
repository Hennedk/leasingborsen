import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { MILEAGE_OPTIONS, type MileageOption } from '@/types'

interface MileageChipsProps {
  label?: string
  selectedMileage: MileageOption
  onMileageChange: (mileage: MileageOption) => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

export const MileageChips: React.FC<MileageChipsProps> = ({
  label,
  selectedMileage,
  onMileageChange,
  className,
  variant = 'desktop'
}) => {
  const formatLabel = (mileage: MileageOption) => {
    if (mileage === 35000) return '35.000+'
    return mileage.toLocaleString('da-DK')
  }
  
  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <Label className={cn(
          'font-medium text-foreground',
          variant === 'mobile' ? 'text-base' : 'text-sm'
        )}>
          {label}
        </Label>
      )}
      <div className="flex flex-wrap gap-2">
        {MILEAGE_OPTIONS.map((mileage) => {
          const isSelected = selectedMileage === mileage
          return (
            <Badge
              key={mileage}
              variant={isSelected ? "filter-selected" : "filter-unselected"}
              size="default"
              className="cursor-pointer transition-colors"
              onClick={() => onMileageChange(mileage)}
            >
              {formatLabel(mileage)}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}