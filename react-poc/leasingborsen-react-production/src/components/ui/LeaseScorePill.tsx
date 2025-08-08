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
  // Get score color based on 5-tier system
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#059669' // Dark Green - Exceptional
    if (score >= 80) return '#84cc16' // Light Green - Great
    if (score >= 60) return '#eab308' // Yellow - Good
    if (score >= 40) return '#f97316' // Orange - Fair
    return '#ef4444' // Red - Poor
  }

  // Get score descriptor in Danish based on 5-tier system
  const getScoreDescriptor = (score: number): string => {
    if (score >= 90) return 'Exceptionelt tilbud'
    if (score >= 80) return 'Fantastisk tilbud'
    if (score >= 60) return 'Godt tilbud'
    if (score >= 40) return 'Rimeligt tilbud'
    return 'Dårligt tilbud'
  }

  // Size variants for horizontal pill design
  const sizeConfig = {
    sm: {
      diameter: 36,
      strokeWidth: 3,
      fontSize: 'text-sm',
      labelSize: 'text-xs',
      descriptorSize: 'text-xs',
      paddingX: 'px-3',
      paddingY: 'py-2',
      gap: 'gap-2.5'
    },
    md: {
      diameter: 40,
      strokeWidth: 3,
      fontSize: 'text-base',
      labelSize: 'text-sm',
      descriptorSize: 'text-xs',
      paddingX: 'px-3',
      paddingY: 'py-2.5',
      gap: 'gap-3'
    },
    lg: {
      diameter: 48,
      strokeWidth: 4,
      fontSize: 'text-lg',
      labelSize: 'text-sm',
      descriptorSize: 'text-sm',
      paddingX: 'px-4',
      paddingY: 'py-3',
      gap: 'gap-3'
    }
  }[size]

  // Calculate SVG properties
  const radius = (sizeConfig.diameter - sizeConfig.strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const scoreColor = getScoreColor(score)
  const descriptor = getScoreDescriptor(score)

  return (
    <div
      className={cn(
        'bg-white rounded-full shadow-lg flex items-center',
        sizeConfig.paddingX,
        sizeConfig.paddingY,
        sizeConfig.gap,
        className
      )}
      role="img"
      aria-label={`LeaseScore: ${score}, ${descriptor}`}
    >
      {/* Circular Progress Indicator */}
      <div 
        className="relative flex items-center justify-center flex-shrink-0"
        style={{ 
          width: sizeConfig.diameter, 
          height: sizeConfig.diameter 
        }}
      >
        {/* SVG Progress Ring */}
        <svg
          className="transform -rotate-90"
          width={sizeConfig.diameter}
          height={sizeConfig.diameter}
        >
          {/* Background Circle */}
          <circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={sizeConfig.strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <circle
            cx={sizeConfig.diameter / 2}
            cy={sizeConfig.diameter / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={sizeConfig.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: score >= 90 ? 'drop-shadow(0 0 4px rgba(5, 150, 105, 0.4))' : undefined
            }}
          />
        </svg>
        
        {/* Score Number in Center */}
        <div 
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold',
            sizeConfig.fontSize
          )}
          style={{ color: scoreColor }}
        >
          {score}
        </div>
      </div>

      {/* Text Labels - Horizontal Layout */}
      <div className="flex flex-col">
        <div className={cn('font-semibold text-gray-900 leading-tight', sizeConfig.labelSize)}>
          LeaseScore
        </div>
        <div className={cn('text-gray-600 leading-tight', sizeConfig.descriptorSize)}>
          {descriptor}
        </div>
      </div>
    </div>
  )
}