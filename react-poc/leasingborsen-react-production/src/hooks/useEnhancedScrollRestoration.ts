import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigationContext } from './useNavigationContext'

interface ScrollState {
  position: number
  loadedPages: number
  contentHeight: number
  timestamp: number
}

/**
 * Enhanced scroll restoration that handles infinite scroll and dynamic content
 * Provides instant restoration with no visible scrolling
 */
export function useEnhancedScrollRestoration(key: string) {
  const { getNavigationInfo } = useNavigationContext()
  const [isPositioned, setIsPositioned] = useState(false)
  const isRestoringRef = useRef(false)
  const mutationObserverRef = useRef<MutationObserver | null>(null)
  
  // Save current scroll state with debouncing
  const saveScrollState = useCallback((loadedPages: number = 1) => {
    if (isRestoringRef.current) return
    
    const state: ScrollState = {
      position: window.scrollY,
      loadedPages,
      contentHeight: document.documentElement.scrollHeight,
      timestamp: Date.now()
    }
    
    try {
      sessionStorage.setItem(`scroll-enhanced-${key}`, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save scroll state:', error)
    }
  }, [key])
  
  // Debounced scroll handler using useRef for timeout persistence
  const debouncedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedSaveScroll = useCallback((loadedPages: number = 1) => {
    if (debouncedTimeoutRef.current) {
      clearTimeout(debouncedTimeoutRef.current)
    }
    debouncedTimeoutRef.current = setTimeout(() => saveScrollState(loadedPages), 100)
  }, [saveScrollState])
  
  // Restore scroll position instantly
  const restoreScrollPosition = useCallback((targetPosition: number) => {
    if (targetPosition <= 0) {
      setIsPositioned(true)
      return
    }

    isRestoringRef.current = true
    
    // Force instant scroll behavior
    const originalScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'
    
    // Scroll immediately
    window.scrollTo(0, targetPosition)
    
    // Restore original scroll behavior
    document.documentElement.style.scrollBehavior = originalScrollBehavior
    
    isRestoringRef.current = false
    setIsPositioned(true)
  }, [])
  
  
  // Initialize positioning state and restore scroll position on mount
  useEffect(() => {
    const navInfo = getNavigationInfo()
    
    // If not coming from listings, we're positioned by default
    if (navInfo.from !== 'listings') {
      setIsPositioned(true)
      return
    }
    
    try {
      const stored = sessionStorage.getItem(`scroll-enhanced-${key}`)
      if (!stored) {
        setIsPositioned(true)
        return
      }
      
      const state: ScrollState = JSON.parse(stored)
      
      // Check if state is recent enough
      if (Date.now() - state.timestamp > 30 * 60 * 1000) {
        sessionStorage.removeItem(`scroll-enhanced-${key}`)
        setIsPositioned(true)
        return
      }
      
      // Use navigation state if available, otherwise fall back to stored state
      const targetPosition = navInfo.scrollPosition || state.position
      
      // Restore position immediately - no delays
      restoreScrollPosition(targetPosition)
      
    } catch (error) {
      console.error('Failed to restore scroll state:', error)
      setIsPositioned(true)
    }
  }, [key, getNavigationInfo, restoreScrollPosition])
  
  // Set up scroll tracking
  useEffect(() => {
    const handleScroll = () => debouncedSaveScroll()
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      
      // Save final position on unmount
      if (!isRestoringRef.current) {
        saveScrollState()
      }
    }
  }, [debouncedSaveScroll, saveScrollState])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect()
      }
    }
  }, [])
  
  return {
    saveScrollState: debouncedSaveScroll,
    isRestoring: isRestoringRef.current,
    isPositioned
  }
}