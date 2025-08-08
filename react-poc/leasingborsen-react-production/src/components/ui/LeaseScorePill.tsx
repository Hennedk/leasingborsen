import React from 'react'
import { cn } from '@/lib/utils'

interface LeaseScorePillProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LeaseScorePill: React.FC<LeaseScorePillProps> = ({ 
  score, 
  size = 'md', 
  className 
}) => {
  // Don't render for low scores
  if (score < 60) {
    return null
  }

  // Get score descriptor in Danish
  const getScoreDescriptor = (score: number): string => {
    if (score >= 85) return 'Fantastisk værdi'
    if (score >= 70) return 'God værdi'
    return 'Rimelig værdi'
  }

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'bg-green-500 text-white'
    if (score >= 70) return 'bg-yellow-500 text-white'
    return 'bg-orange-500 text-white'
  }

  // Size variants
  const sizeClasses = {
    sm: {
      container: 'px-3 py-1',
      circle: 'w-10 h-10',
      scoreText: 'text-lg',
      labelText: 'text-xs',
      descriptorText: 'text-xs'
    },
    md: {
      container: 'px-4 py-2',
      circle: 'w-12 h-12', 
      scoreText: 'text-xl',
      labelText: 'text-sm',
      descriptorText: 'text-sm'
    },
    lg: {
      container: 'px-6 py-3',
      circle: 'w-14 h-14',
      scoreText: 'text-2xl',
      labelText: 'text-base',
      descriptorText: 'text-base'
    }
  }

  const sizeConfig = sizeClasses[size]
  const descriptor = getScoreDescriptor(score)

  return (
    <div
      className={cn(
        'bg-white rounded-full shadow-lg flex items-center gap-3',
        sizeConfig.container,
        className
      )}
      role="img"
      aria-label={`LeaseScore: ${score}, ${descriptor}`}
    >
      {/* Score Circle */}
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold',
          sizeConfig.circle,
          sizeConfig.scoreText,
          getScoreColor(score)
        )}
      >
        {score}
      </div>

      {/* Text Content */}
      <div className="flex flex-col">
        <div className={cn('text-gray-800 font-semibold', sizeConfig.labelText)}>
          LeaseScore
        </div>
        <div className={cn('text-gray-600', sizeConfig.descriptorText)}>
          {descriptor}
        </div>
      </div>
    </div>
  )
}