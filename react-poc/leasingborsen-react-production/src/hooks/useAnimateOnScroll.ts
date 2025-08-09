import { useState, useEffect, useRef, useCallback } from 'react'

interface UseAnimateOnScrollOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

interface UseAnimateOnScrollReturn {
  elementRef: React.RefObject<HTMLDivElement | null>
  isInView: boolean
}

// Global intersection observer instance for better performance (following useImageLazyLoading pattern)
let globalAnimationObserver: IntersectionObserver | null = null
const observedAnimationElements = new Map<Element, () => void>()

const getGlobalAnimationObserver = (threshold: number, rootMargin: string): IntersectionObserver => {
  if (!globalAnimationObserver) {
    globalAnimationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const callback = observedAnimationElements.get(entry.target)
          if (callback) {
            callback()
            // For triggerOnce behavior, we'll handle unobserve in the callback
          }
        }
      })
    }, { threshold, rootMargin })
  }
  return globalAnimationObserver
}

/**
 * Custom hook for scroll-triggered animations using shared intersection observer
 * Optimized for performance when used across multiple components
 * 
 * Features:
 * - Shared global intersection observer for better performance
 * - One-time animation trigger (triggerOnce: true by default)
 * - Customizable threshold and root margin
 * - Automatic cleanup on unmount
 * 
 * @param options - Configuration options
 * @returns Element ref and visibility state
 */
export const useAnimateOnScroll = (
  options: UseAnimateOnScrollOptions = {}
): UseAnimateOnScrollReturn => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options

  const elementRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const [isObserving, setIsObserving] = useState(false)

  // Animation trigger callback
  const triggerAnimation = useCallback(() => {
    if (!isInView) {
      setIsInView(true)
      
      // If triggerOnce is enabled, unobserve after first trigger
      if (triggerOnce && elementRef.current && globalAnimationObserver) {
        globalAnimationObserver.unobserve(elementRef.current)
        observedAnimationElements.delete(elementRef.current)
        setIsObserving(false)
      }
    }
  }, [isInView, triggerOnce])

  // Setup intersection observer
  useEffect(() => {
    const currentRef = elementRef.current
    
    if (!currentRef || isObserving || (triggerOnce && isInView)) return

    const observer = getGlobalAnimationObserver(threshold, rootMargin)
    
    // Add to observed elements map
    observedAnimationElements.set(currentRef, triggerAnimation)
    observer.observe(currentRef)
    setIsObserving(true)

    // Cleanup function
    return () => {
      if (currentRef && observer) {
        observer.unobserve(currentRef)
        observedAnimationElements.delete(currentRef)
      }
    }
  }, [triggerAnimation, threshold, rootMargin, isObserving, isInView, triggerOnce])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentRef = elementRef.current
      if (currentRef && globalAnimationObserver) {
        globalAnimationObserver.unobserve(currentRef)
        observedAnimationElements.delete(currentRef)
      }
    }
  }, [])

  return {
    elementRef,
    isInView
  }
}

/**
 * Cleanup function to destroy the global animation observer
 * Useful for testing or when completely unmounting the app
 */
export const cleanupGlobalAnimationObserver = () => {
  if (globalAnimationObserver) {
    globalAnimationObserver.disconnect()
    globalAnimationObserver = null
    observedAnimationElements.clear()
  }
}