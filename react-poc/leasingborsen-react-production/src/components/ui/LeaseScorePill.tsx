import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

interface LeaseScorePillProps {
  score: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  animationDelay?: number
  enableScoreAnimation?: boolean
  enableCircleAnimation?: boolean
}

export const LeaseScorePill: React.FC<LeaseScorePillProps> = ({ 
  score, 
  size = 'md', 
  className,
  animationDelay = 0,
  enableScoreAnimation = true,
  enableCircleAnimation = true
}) => {
  // Animation hook for scroll-triggered animation
  const { elementRef, isInView } = useAnimateOnScroll({ 
    threshold: 0.1, 
    rootMargin: '50px' 
  })

  // Immediate fallback for elements that are already visible
  useEffect(() => {
    if (!enableScoreAnimation) return
    
    // Check if element is already visible after a short delay
    const immediateCheck = setTimeout(() => {
      if (!isInView && elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0
        if (isVisible) {
          setDisplayScore(score)
        }
      }
    }, 100)
    
    return () => clearTimeout(immediateCheck)
  }, [elementRef, isInView, score, enableScoreAnimation])

  // Score animation state
  const [displayScore, setDisplayScore] = useState(enableScoreAnimation ? 0 : score)
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false

  // Animate score number when component comes into view
  useEffect(() => {
    if (!enableScoreAnimation || prefersReducedMotion) {
      setDisplayScore(score)
      return
    }
    
    if (!isInView) {
      // Fallback: Show real score after 2 seconds if animation hasn't triggered
      const fallbackTimeout = setTimeout(() => {
        setDisplayScore(score)
      }, 2000)
      
      return () => clearTimeout(fallbackTimeout)
    }
    
    const duration = 1000 // ms - matches circle animation
    let animationFrameId: number
    
    const startTime = Date.now()
    
    const animateScore = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      if (progress >= 1) {
        setDisplayScore(score)
      } else {
        setDisplayScore(Math.floor(score * progress))
        animationFrameId = requestAnimationFrame(animateScore)
      }
    }
    
    // Add delay if specified
    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animateScore)
    }, animationDelay)
    
    return () => {
      clearTimeout(timeoutId)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isInView, score, enableScoreAnimation, prefersReducedMotion, animationDelay])

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
    xs: {
      diameter: 30,
      strokeWidth: 2.5,
      fontSize: 'text-xs',
      labelSize: 'text-[10px]',
      descriptorSize: 'text-[10px]',
      paddingX: 'px-2.5',
      paddingY: 'py-1.5',
      gap: 'gap-2'
    },
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
  
  // Determine what score to show in the circle
  let circleScore = score // Default: always show the actual score
  if (enableCircleAnimation && !prefersReducedMotion) {
    // Only start at 0 if animation is enabled and we're still waiting for trigger
    if (isInView) {
      circleScore = score // Animation triggered, show full score
    } else {
      // Check if we should show fallback (after delay or if already visible)
      const shouldShowFallback = displayScore === score // If number is showing, show circle too
      circleScore = shouldShowFallback ? score : 0
    }
  }
  
  const strokeDashoffset = circumference - (circleScore / 100) * circumference
  
  const scoreColor = getScoreColor(score)
  const descriptor = getScoreDescriptor(score)

  return (
    <div
      ref={elementRef}
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
              filter: score >= 90 ? 'drop-shadow(0 0 4px rgba(5, 150, 105, 0.4))' : undefined,
              transitionDelay: prefersReducedMotion ? '0ms' : `${animationDelay}ms`,
              transition: prefersReducedMotion ? 'none' : undefined
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
          {displayScore}
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