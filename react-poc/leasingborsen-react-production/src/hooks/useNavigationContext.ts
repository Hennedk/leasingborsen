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
  firstId?: string
  lastId?: string
  signature?: string
}

interface ListingsSnapshotMetadata {
  loadedPageCount: number
  firstId?: string | null
  lastId?: string | null
}

interface ParsedSnapshot {
  searchKey: string
  position: number
  timestamp: number
  loadedPageCount?: number
  firstId?: string
  lastId?: string
  signature?: string
}

const STORAGE_KEY = 'leasingborsen-navigation'
const SCROLL_KEY_PREFIX = 'listings-scroll:'
const MAX_AGE = 45 * 60 * 1000 // 45 minutes matches scroll restoration resume window

const buildSignature = (meta?: ListingsSnapshotMetadata | null) => {
  if (!meta) return ''
  return `${meta.firstId ?? ''}|${meta.lastId ?? ''}|${meta.loadedPageCount ?? 0}`
}

const normalizeSearch = (search: string) => {
  try {
    const p = new URLSearchParams(search)

    if (p.get('udb') === String(LEASE_DEFAULTS.deposit)) {
      p.delete('udb')
    }
    if (p.get('selectedDeposit') === String(LEASE_DEFAULTS.deposit)) {
      p.delete('selectedDeposit')
    }

    if (p.get('mdr') === String(LEASE_DEFAULTS.term)) {
      p.delete('mdr')
    }
    if (p.get('selectedTerm') === String(LEASE_DEFAULTS.term)) {
      p.delete('selectedTerm')
    }

    if (p.get('km') === String(LEASE_DEFAULTS.mileage)) {
      p.delete('km')
    }
    if (p.get('selectedMileage') === String(LEASE_DEFAULTS.mileage)) {
      p.delete('selectedMileage')
    }

    const entries = [...p.entries()].sort(([a], [b]) => a.localeCompare(b))
    return new URLSearchParams(entries).toString()
  } catch (error) {
    console.error('Error normalizing search params:', error)
    return ''
  }
}

const parseSnapshotFromRaw = (raw: string | null, normalizedSearch: string): ParsedSnapshot | null => {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)

    if (typeof parsed === 'number') {
      return {
        searchKey: normalizedSearch,
        position: parsed | 0,
        timestamp: Date.now()
      }
    }

    if (typeof parsed === 'object' && parsed) {
      const searchKey = typeof parsed.searchKey === 'string' && parsed.searchKey.length > 0
        ? parsed.searchKey
        : (typeof parsed.filters === 'string' ? parsed.filters : normalizedSearch)

      const numericPosition = typeof parsed.position === 'number'
        ? parsed.position
        : parseInt(parsed.position ?? '0', 10)

      const timestamp = typeof parsed.timestamp === 'number'
        ? parsed.timestamp
        : Date.now()

      return {
        searchKey,
        position: Number.isFinite(numericPosition) ? numericPosition : 0,
        timestamp,
        loadedPageCount: typeof parsed.loadedPageCount === 'number'
          ? parsed.loadedPageCount
          : (typeof parsed.loadedPages === 'number' ? parsed.loadedPages : undefined),
        firstId: typeof parsed.firstId === 'string' ? parsed.firstId : undefined,
        lastId: typeof parsed.lastId === 'string' ? parsed.lastId : undefined,
        signature: typeof parsed.signature === 'string' ? parsed.signature : undefined
      }
    }
  } catch (error) {
    // Legacy format falls through
  }

  const legacyPosition = parseInt(raw, 10)
  if (!Number.isNaN(legacyPosition)) {
    return {
      searchKey: normalizedSearch,
      position: legacyPosition,
      timestamp: Date.now()
    }
  }

  return null
}

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
    const timestamp = Date.now()
    const searchString = filters?.toString() || ''
    const normalizedSearchValue = normalizeSearch(searchString)
    const scrollKey = `${SCROLL_KEY_PREFIX}${normalizedSearchValue}`

    const existingSnapshot = parseSnapshotFromRaw(sessionStorage.getItem(scrollKey), normalizedSearchValue)
    const mergedMetadata: ListingsSnapshotMetadata | null = existingSnapshot
      ? {
          loadedPageCount: existingSnapshot.loadedPageCount ?? loadedPages,
          firstId: existingSnapshot.firstId ?? null,
          lastId: existingSnapshot.lastId ?? null
        }
      : null

    const effectiveLoadedPages = mergedMetadata?.loadedPageCount ?? loadedPages
    const signature = existingSnapshot?.signature ?? buildSignature(mergedMetadata)

    const snapshotPayload = {
      version: 3,
      navigationType: 'prepare' as const,
      position: scrollPosition | 0,
      timestamp,
      searchKey: normalizedSearchValue,
      filters: normalizedSearchValue,
      loadedPageCount: effectiveLoadedPages,
      loadedPages: effectiveLoadedPages,
      firstId: mergedMetadata?.firstId ?? undefined,
      lastId: mergedMetadata?.lastId ?? undefined,
      signature: signature || undefined
    }

    sessionStorage.setItem(scrollKey, JSON.stringify(snapshotPayload))

    saveNavigationState({
      from: 'listings',
      scrollPosition,
      loadedPages: effectiveLoadedPages,
      filters: searchString,
      timestamp,
      isNavigatingAway: true,
      version: 2,
      firstId: snapshotPayload.firstId,
      lastId: snapshotPayload.lastId,
      signature: snapshotPayload.signature
    })

    console.log('[NavigationContext] Prepared navigation - position:', scrollPosition, 'key:', scrollKey, 'metadata:', snapshotPayload)
  }, [saveNavigationState])

  const updateListingSnapshotMetadata = useCallback((metadata: ListingsSnapshotMetadata, filters: URLSearchParams | null) => {
    if (!metadata) return

    const searchString = filters?.toString() || ''
    const normalizedSearchValue = normalizeSearch(searchString)
    const scrollKey = `${SCROLL_KEY_PREFIX}${normalizedSearchValue}`

    const existingSnapshot = parseSnapshotFromRaw(sessionStorage.getItem(scrollKey), normalizedSearchValue)
    const timestamp = existingSnapshot?.timestamp ?? Date.now()

    const payload = {
      version: 3,
      navigationType: existingSnapshot ? 'update' : 'initial',
      position: existingSnapshot?.position ?? 0,
      timestamp,
      searchKey: normalizedSearchValue,
      filters: normalizedSearchValue,
      loadedPageCount: metadata.loadedPageCount,
      loadedPages: metadata.loadedPageCount,
      firstId: metadata.firstId ?? undefined,
      lastId: metadata.lastId ?? undefined,
      signature: buildSignature(metadata)
    }

    sessionStorage.setItem(scrollKey, JSON.stringify(payload))

    saveNavigationState({
      from: 'listings',
      scrollPosition: payload.position,
      loadedPages: metadata.loadedPageCount,
      filters: searchString,
      timestamp,
      firstId: payload.firstId,
      lastId: payload.lastId,
      signature: payload.signature
    })

    console.log('[NavigationContext] Updated listing snapshot metadata', { scrollKey, metadata: payload })
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
    updateListingSnapshotMetadata,
    prepareDetailNavigation,
    getNavigationInfo,
    smartBack,
    getCurrentState
  }
}
