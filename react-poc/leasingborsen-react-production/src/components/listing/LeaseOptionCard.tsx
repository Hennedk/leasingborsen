import React from 'react'
import { cn } from '@/lib/utils'
import LeaseScoreGauge from './LeaseScoreGauge'
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
    if (isSelected) {
      return (
        <span className="text-xs text-current opacity-70">
          Valgt
        </span>
      )
    }

    if (!priceImpact || !priceImpact.difference || priceImpact.difference === 0) {
      return null
    }

    const { difference } = priceImpact
    const isPositive = difference > 0
    
    return (
      <span
        className={cn(
          'text-xs font-medium',
          isPositive ? 'text-red-600' : 'text-green-600'
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
        // Base styles
        'flex items-center justify-between gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left w-full min-h-[72px]',
        // Touch target size for mobile
        'touch-manipulation',
        // Default state
        !isSelected && [
          'bg-background border-border hover:border-primary/40 hover:bg-muted/50',
          'active:scale-[0.98] active:bg-muted'
        ],
        // Selected state
        isSelected && [
          'bg-foreground text-background border-foreground',
          'shadow-lg shadow-foreground/20'
        ],
        // Custom className
        className
      )}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Vælg ${label}: ${value}`}
    >
      {/* Left: Score gauge */}
      <div className="flex-shrink-0">
        <LeaseScoreGauge 
          score={score} 
          size="default"
          inverted={isSelected}
        />
      </div>

      {/* Center: Option details */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm leading-tight">
          {value}
        </div>
        <div className={cn(
          'text-xs leading-tight mt-0.5',
          isSelected ? 'text-current opacity-70' : 'text-muted-foreground'
        )}>
          {label}
        </div>
      </div>

      {/* Right: Price impact */}
      <div className="flex-shrink-0 text-right">
        {renderPriceImpact()}
      </div>
    </button>
  )
}

export default LeaseOptionCard