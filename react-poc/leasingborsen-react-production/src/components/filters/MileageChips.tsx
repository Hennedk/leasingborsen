import React from 'react'
import { cn } from '@/lib/utils'
import { MILEAGE_OPTIONS, type MileageOption } from '@/types'

interface MileageChipsProps {
  selectedMileage: MileageOption
  onMileageChange: (mileage: MileageOption) => void
  className?: string
  variant?: 'desktop' | 'mobile'
}

export const MileageChips: React.FC<MileageChipsProps> = ({
  selectedMileage,
  onMileageChange,
  className,
  variant = 'desktop'
}) => {
  const formatLabel = (mileage: MileageOption) => {
    if (mileage === 35000) return '35k+'
    return `${mileage / 1000}k`
  }
  
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {variant === 'desktop' && (
        <div className="text-sm font-medium text-muted-foreground mb-2 w-full">
          Årlig kørselsgrænse
        </div>
      )}
      {MILEAGE_OPTIONS.map((mileage) => (
        <button
          key={mileage}
          type="button"
          onClick={() => onMileageChange(mileage)}
          aria-pressed={selectedMileage === mileage}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onMileageChange(mileage)
            }
          }}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "disabled:opacity-50 disabled:pointer-events-none",
            selectedMileage === mileage
              ? "bg-primary text-primary-foreground shadow-md font-semibold"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
          )}
        >
          {formatLabel(mileage)} km/år
        </button>
      ))}
    </div>
  )
}