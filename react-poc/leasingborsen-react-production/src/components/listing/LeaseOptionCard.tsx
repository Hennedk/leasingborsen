import React from 'react'
import { cn } from '@/lib/utils'
import type { PriceImpactData } from '@/types/priceImpact'

interface LeaseOptionCardProps {
  value: string | number
  label: string
  score?: number
  priceImpact?: PriceImpactData | null
  isSelected: boolean
  onClick: () => void
  className?: string
}

const LeaseOptionCard: React.FC<LeaseOptionCardProps> = ({
  value,
  label,
  score,
  priceImpact,
  isSelected,
  onClick,
  className
}) => {
  
  // Format price impact display
  const renderPriceImpact = () => {
    if (!priceImpact || !priceImpact.difference || priceImpact.difference === 0) {
      return <span className={cn(
        "text-xs",
        isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
      )}>{isSelected ? "" : "–"}</span>
    }

    const { difference } = priceImpact
    const isPositive = difference > 0
    
    return (
      <span
        className={cn(
          'text-xs font-medium',
          isSelected 
            ? 'text-primary-foreground' 
            : isPositive ? 'text-red-600' : 'text-green-600'
        )}
      >
        {isPositive ? '+' : ''}{difference.toLocaleString('da-DK')} kr
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        // Base styles with vertical layout
        'flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 w-full',
        // Touch target size for mobile
        'touch-manipulation',
        // Default state with light grey border
        !isSelected && [
          'bg-background border-2 border-gray-200 hover:border-primary/40 hover:bg-muted/50',
          'active:scale-[0.98] active:bg-muted'
        ],
        // Selected state - primary background with white text
        isSelected && [
          'bg-primary text-primary-foreground border-2 border-transparent',
          ''
        ],
        // Custom className
        className
      )}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Vælg ${label}: ${value}`}
    >
      {/* Option value - Bold */}
      <div className="text-center mb-1">
        <div className={cn(
          'text-sm font-bold leading-tight',
          isSelected ? 'text-primary-foreground' : 'text-foreground'
        )}>
          {value}
        </div>
      </div>

      {/* Price impact - Non-bold below */}
      <div className="text-center">
        {renderPriceImpact()}
      </div>
    </button>
  )
}

export default LeaseOptionCard