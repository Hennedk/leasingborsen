import React from 'react'
import { cn } from '@/lib/utils'

interface LeaseScoreGaugeProps {
  score?: number
  size?: 'sm' | 'default'
  inverted?: boolean
  className?: string
}

const LeaseScoreGauge: React.FC<LeaseScoreGaugeProps> = ({
  score,
  size = 'default',
  inverted = false,
  className
}) => {
  // Return null if no score available
  if (score === undefined || score === null) {
    return null
  }

  // Determine colors based on score ranges
  const getScoreColors = (score: number, inverted: boolean) => {
    if (inverted) {
      // Inverted colors for selected state (white background, black text)
      return 'bg-white text-black border-white'
    }
    
    // Normal colors based on score ranges
    if (score >= 80) {
      return 'bg-green-100 text-green-800 border-green-300'
    }
    if (score >= 60) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    }
    return 'bg-red-100 text-red-800 border-red-300'
  }

  // Size variants
  const sizeStyles = {
    sm: 'h-6 w-6 text-xs',
    default: 'h-8 w-8 text-sm'
  }

  return (
    <div
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-full border font-bold',
        // Size variant
        sizeStyles[size],
        // Color variant
        getScoreColors(score, inverted),
        // Custom className
        className
      )}
      role="img"
      aria-label={`Leasing score: ${score} ud af 100`}
    >
      {score}
    </div>
  )
}

export default LeaseScoreGauge