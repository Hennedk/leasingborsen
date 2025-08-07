import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedPriceProps {
  value: number
  className?: string
  showCurrency?: boolean
  showPeriod?: boolean
  animationDuration?: number
}

const AnimatedPrice: React.FC<AnimatedPriceProps> = ({
  value,
  className,
  showCurrency = true,
  showPeriod = true,
  animationDuration = 200
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const previousValue = useRef(value)
  const animationTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    if (previousValue.current !== value) {
      // Determine direction
      const newDirection = value > previousValue.current ? 'up' : 'down'
      setDirection(newDirection)
      setIsAnimating(true)

      // Clear any existing timer
      if (animationTimer.current) {
        clearTimeout(animationTimer.current)
      }

      // Animate the number change
      const steps = 10
      const difference = value - previousValue.current
      const increment = difference / steps
      let currentStep = 0

      const animate = () => {
        currentStep++
        if (currentStep <= steps) {
          setDisplayValue(Math.round(previousValue.current + (increment * currentStep)))
          animationTimer.current = setTimeout(animate, animationDuration / steps)
        } else {
          setDisplayValue(value)
          setIsAnimating(false)
          setTimeout(() => setDirection(null), 500)
        }
      }

      animate()
      previousValue.current = value
    }

    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current)
      }
    }
  }, [value, animationDuration])

  const formattedValue = displayValue.toLocaleString('da-DK')

  return (
    <div className={cn('relative inline-block', className)}>
      <span
        className={cn(
          'transition-all duration-200',
          isAnimating && 'font-bold',
          direction === 'up' && 'text-destructive',
          direction === 'down' && 'text-success'
        )}
      >
        {formattedValue}
        {showCurrency && ' kr'}
        {showPeriod && '/md'}
      </span>
      
      {/* Price change indicator */}
      {direction && isAnimating && (
        <span
          className={cn(
            'absolute -right-2 top-0 text-xs opacity-0 animate-fade-out',
            'transform -translate-x-full',
            direction === 'up' ? 'text-destructive' : 'text-success'
          )}
          style={{
            animation: `fade-out 1s ease-out forwards`
          }}
        >
          {direction === 'up' ? '↑' : '↓'}
        </span>
      )}
    </div>
  )
}

export default AnimatedPrice