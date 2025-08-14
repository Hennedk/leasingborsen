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
  // Calculate fill percentage based on score (0-100)
  const fillPercentage = score ? Math.min(100, Math.max(0, score)) : 0
  
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
        'flex flex-col items-center justify-between p-3 rounded-xl transition-all duration-200 w-full min-h-[110px]',
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
      {/* Top: Score gauge with number inside */}
      <div className="relative w-12 h-12 mb-2">
        <svg className="w-12 h-12 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-gray-200"
          />
          {/* Filled circle based on score */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${(fillPercentage * 125.6) / 100} 125.6`}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-500',
              score && score >= 80 ? 'text-green-500' :
              score && score >= 60 ? 'text-yellow-500' :
              score && score >= 40 ? 'text-orange-500' :
              'text-red-500'
            )}
          />
        </svg>
        {/* Score number in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'text-sm font-bold',
            isSelected ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {score || '–'}
          </span>
        </div>
      </div>

      {/* Middle: Option value */}
      <div className="text-center mb-1">
        <div className={cn(
          'text-sm font-semibold leading-tight',
          isSelected ? 'text-primary-foreground' : 'text-foreground'
        )}>
          {value}
        </div>
      </div>

      {/* Bottom: Price impact or selected state */}
      <div className="text-center">
        {renderPriceImpact()}
      </div>
    </button>
  )
}

export default LeaseOptionCard