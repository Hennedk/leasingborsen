import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'

interface NavigationState {
  from: 'listings' | 'direct' | 'other'
  scrollPosition: number
  loadedPages: number
  filters: string
  timestamp: number
  referrer?: string
  isNavigatingAway?: boolean
}

const STORAGE_KEY = 'leasingborsen-navigation'
const MAX_AGE = 30 * 60 * 1000 // 30 minutes

/**
 * Hook for tracking navigation context and enabling smart navigation behavior
 * Handles scroll restoration, infinite scroll state, and context-aware back navigation
 */
export function useNavigationContext() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  
  // Get current navigation state from sessionStorage
  const getCurrentState = useCallback((): NavigationState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      
      const state = JSON.parse(stored) as NavigationState
      
      // Check if state is expired
      if (Date.now() - state.timestamp > MAX_AGE) {
        sessionStorage.removeItem(STORAGE_KEY)
        return null
      }
      
      return state
    } catch {
      return null
    }
  }, [])
  
  // Save navigation state
  const saveNavigationState = useCallback((state: Partial<NavigationState>) => {
    try {
      const currentState = getCurrentState()
      const newState: NavigationState = {
        from: 'direct',
        scrollPosition: 0,
        loadedPages: 1,
        filters: '',
        timestamp: Date.now(),
        ...currentState,
        ...state
      }
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
    } catch (error) {
      console.error('Failed to save navigation state:', error)
    }
  }, [getCurrentState])
  
  // Set navigation source before navigating to listing detail
  const prepareListingNavigation = useCallback((scrollPosition: number, loadedPages: number, filters: URLSearchParams) => {
    // Save to navigation context with flag indicating we're navigating away
    saveNavigationState({
      from: 'listings',
      scrollPosition,
      loadedPages,
      filters: filters.toString(),
      timestamp: Date.now(),
      isNavigatingAway: true  // Flag to prevent saving during scroll animation
    })
    
    // ALSO save to the listings scroll restoration storage for consistency
    // This ensures scroll position is available in the primary storage system
    const normalizeSearch = (search: string) => {
      const p = new URLSearchParams(search);
      const entries = [...p.entries()].sort(([a],[b]) => a.localeCompare(b));
      return new URLSearchParams(entries).toString();
    };
    
    const searchString = filters.toString();
    const normalizedSearch = normalizeSearch(searchString);
    const key = `listings-scroll:${normalizedSearch}`;
    
    // Save the position with a timestamp to ensure it's fresh
    sessionStorage.setItem(key, String(scrollPosition | 0));
    
    // Also save a backup timestamp to verify freshness
    sessionStorage.setItem(`${key}:timestamp`, String(Date.now()));
  }, [saveNavigationState])
  
  // Get navigation info for current page
  const getNavigationInfo = useCallback(() => {
    const state = getCurrentState()
    
    if (!state) {
      // No stored state - detect based on referrer
      const referrer = document.referrer
      const isFromListings = referrer.includes('/listings')
      
      return {
        from: isFromListings ? 'listings' as const : 'direct' as const,
        hasHistory: isFromListings,
        scrollPosition: 0,
        loadedPages: 1,
        filters: new URLSearchParams()
      }
    }
    
    return {
      from: state.from,
      hasHistory: state.from === 'listings',
      scrollPosition: state.scrollPosition,
      loadedPages: state.loadedPages,
      filters: new URLSearchParams(state.filters)
    }
  }, [getCurrentState])
  
  // Smart back navigation
  const smartBack = useCallback(() => {
    const info = getNavigationInfo()
    
    // If we have history from listings, use browser back for real POP navigation
    // This is more reliable for scroll restoration than programmatic navigation
    if (info.hasHistory && info.from === 'listings') {
      window.history.back();
    } else {
      // No history - do programmatic navigation
      navigate({ to: '/listings' })
    }
  }, [getNavigationInfo, navigate])
  
  // Clear old navigation state on route change (except listings ↔ listing)
  useEffect(() => {
    const isListingRoute = currentPath.startsWith('/listing/')
    const isListingsRoute = currentPath === '/listings'
    
    if (!isListingRoute && !isListingsRoute) {
      // Navigated away from listing flow - clear state
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [currentPath])
  
  return {
    prepareListingNavigation,
    getNavigationInfo,
    smartBack,
    getCurrentState
  }
}
