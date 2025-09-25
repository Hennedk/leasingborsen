import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { LEASE_DEFAULTS } from '@/lib/leaseConfigMapping'

interface NavigationState {
  from: 'listings' | 'direct' | 'other'
  scrollPosition: number
  loadedPages: number
  filters: string
  timestamp: number
  referrer?: string
  isNavigatingAway?: boolean
  isNavigatingBack?: boolean
  version?: number
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
  const prepareListingNavigation = useCallback((scrollPosition: number, loadedPages: number, filters: URLSearchParams | null) => {
    const timestamp = Date.now();
    
    // Normalize search params for consistent storage key
    const normalizeSearch = (search: string) => {
      try {
        const p = new URLSearchParams(search);

        if (p.get('udb') === String(LEASE_DEFAULTS.deposit)) {
          p.delete('udb');
        }
        if (p.get('selectedDeposit') === String(LEASE_DEFAULTS.deposit)) {
          p.delete('selectedDeposit');
        }

        if (p.get('mdr') === String(LEASE_DEFAULTS.term)) {
          p.delete('mdr');
        }
        if (p.get('selectedTerm') === String(LEASE_DEFAULTS.term)) {
          p.delete('selectedTerm');
        }

        if (p.get('km') === String(LEASE_DEFAULTS.mileage)) {
          p.delete('km');
        }
        if (p.get('selectedMileage') === String(LEASE_DEFAULTS.mileage)) {
          p.delete('selectedMileage');
        }

        const entries = [...p.entries()].sort(([a],[b]) => a.localeCompare(b));
        return new URLSearchParams(entries).toString();
      } catch (error) {
        console.error('Error normalizing search params:', error);
        return '';
      }
    };
    
    const searchString = filters?.toString() || '';
    const normalizedSearch = normalizeSearch(searchString);
    
    // Consolidated storage format with metadata
    const scrollData = {
      position: scrollPosition | 0,
      timestamp,
      filters: normalizedSearch,
      loadedPages,
      version: 2, // For future compatibility
      navigationType: 'prepare' // Indicates this was set during navigation preparation
    };
    
    // Primary storage: filter-specific scroll position with metadata
    const scrollKey = `listings-scroll:${normalizedSearch}`;
    sessionStorage.setItem(scrollKey, JSON.stringify(scrollData));
    
    // Save to navigation context for immediate access and backward compatibility
    saveNavigationState({
      from: 'listings',
      scrollPosition,
      loadedPages,
      filters: searchString,
      timestamp,
      isNavigatingAway: true,  // Flag to prevent saving during scroll animation
      version: 2
    });
    
    console.log('[NavigationContext] Prepared navigation - position:', scrollPosition, 'key:', scrollKey);
  }, [saveNavigationState])

  // Prepare navigation when leaving a detail page (detail -> detail or detail -> listings)
  const prepareDetailNavigation = useCallback((currentId: string | undefined, scrollPosition: number) => {
    try {
      const timestamp = Date.now()
      const detailKey = `detail-scroll:${currentId || ''}`
      const scrollData = {
        position: scrollPosition | 0,
        timestamp,
        version: 1,
        navigationType: 'prepare'
      }
      sessionStorage.setItem(detailKey, JSON.stringify(scrollData))

      // Mark navigating away from detail to suppress saves during transitions
      const st = {
        from: 'detail' as const,
        currentId: currentId,
        scrollPosition,
        isNavigatingAway: true,
        timestamp,
        version: 1
      }
      sessionStorage.setItem('leasingborsen-detail-navigation', JSON.stringify(st))
      console.log('[NavigationContext] Prepared detail navigation', { detailKey, scrollPosition })
    } catch (e) {
      console.error('Failed to prepare detail navigation:', e)
    }
  }, [])
  
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
      // Set a flag to help scroll restoration detect this as back navigation
      try {
        const currentState = getCurrentState()
        if (currentState) {
          saveNavigationState({
            ...currentState,
            isNavigatingBack: true,
            timestamp: Date.now()
          })
        }
      } catch (error) {
        console.error('Failed to set back navigation state:', error)
      }
      
      window.history.back();
    } else {
      // No history - do programmatic navigation with explicit state
      navigate({ 
        to: '/listings',
        state: { backLike: true } as any
      })
    }
  }, [getNavigationInfo, navigate, getCurrentState, saveNavigationState])
  
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
    prepareDetailNavigation,
    getNavigationInfo,
    smartBack,
    getCurrentState
  }
}
