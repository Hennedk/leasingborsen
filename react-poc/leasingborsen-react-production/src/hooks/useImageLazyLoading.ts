import { useState, useEffect, useRef, useCallback } from 'react'

interface UseImageLazyLoadingOptions {
  threshold?: number
  rootMargin?: string
  maxRetries?: number
}

interface UseImageLazyLoadingReturn {
  imageRef: React.RefObject<HTMLImageElement>
  imageLoaded: boolean
  imageError: boolean
  retryCount: number
  retryImage: () => void
  canRetry: boolean
}

// Global intersection observer instance for better performance
let globalObserver: IntersectionObserver | null = null
const observedElements = new Map<Element, () => void>()

const getGlobalObserver = (threshold: number, rootMargin: string): IntersectionObserver => {
  if (!globalObserver) {
    globalObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const callback = observedElements.get(entry.target)
          if (callback) {
            callback()
            globalObserver?.unobserve(entry.target)
            observedElements.delete(entry.target)
          }
        }
      })
    }, { threshold, rootMargin })
  }
  return globalObserver
}

/**
 * Custom hook for optimized image lazy loading with shared intersection observer
 * Provides better performance when used across multiple ListingCard components
 * 
 * Features:
 * - Shared global intersection observer
 * - Error recovery with retry mechanism
 * - Loading and error state management
 * - Automatic cleanup on unmount
 * 
 * @param imageUrl - URL of the image to load
 * @param options - Configuration options
 * @returns Image loading state and controls
 */
export const useImageLazyLoading = (
  imageUrl?: string,
  options: UseImageLazyLoadingOptions = {}
): UseImageLazyLoadingReturn => {
  const {
    threshold = 0.1,
    rootMargin = '200px',
    maxRetries = 3
  } = options

  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isObserving, setIsObserving] = useState(false)

  // Load image function
  const loadImage = useCallback(() => {
    if (!imageUrl) return

    const img = new Image()
    
    img.onload = () => {
      setImageLoaded(true)
      setImageError(false)
    }
    
    img.onerror = () => {
      setImageError(true)
      setImageLoaded(false)
    }
    
    img.src = imageUrl
  }, [imageUrl])

  // Retry image loading
  const retryImage = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1)
      setImageError(false)
      setImageLoaded(false)
      loadImage()
    }
  }, [retryCount, maxRetries, loadImage])

  // Setup intersection observer
  useEffect(() => {
    const currentRef = imageRef.current
    
    if (!currentRef || !imageUrl || isObserving) return

    const observer = getGlobalObserver(threshold, rootMargin)
    
    // Add to observed elements map
    observedElements.set(currentRef, loadImage)
    observer.observe(currentRef)
    setIsObserving(true)

    // Cleanup function
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
        observedElements.delete(currentRef)
      }
    }
  }, [imageUrl, loadImage, threshold, rootMargin, isObserving])

  // Reset states when imageUrl changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setRetryCount(0)
    setIsObserving(false)
  }, [imageUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentRef = imageRef.current
      if (currentRef && globalObserver) {
        globalObserver.unobserve(currentRef)
        observedElements.delete(currentRef)
      }
    }
  }, [])

  return {
    imageRef,
    imageLoaded,
    imageError,
    retryCount,
    retryImage,
    canRetry: retryCount < maxRetries
  }
}

/**
 * Utility function to preload images for better UX
 * Useful for critical images that should load immediately
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

/**
 * Cleanup function to destroy the global observer
 * Useful for testing or when completely unmounting the app
 */
export const cleanupGlobalObserver = () => {
  if (globalObserver) {
    globalObserver.disconnect()
    globalObserver = null
    observedElements.clear()
  }
}