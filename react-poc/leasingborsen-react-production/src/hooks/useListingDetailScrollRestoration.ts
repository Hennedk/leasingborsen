import { useLayoutEffect, useRef, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'

const KEY_PREFIX = 'detail-scroll:'
const NAV_KEY = 'leasingborsen-detail-navigation'
const POP_TS_KEY = 'leasingborsen-history-pop-ts'
const MAX_AGE = 30 * 60 * 1000 // 30 minutes
const BACK_LIKE_TTL_MS = 5 * 60 * 1000 // 5 minutes – tolerate longer time between clicks

type DetailNavState = {
  from?: 'detail' | 'listings' | 'direct'
  currentId?: string
  scrollPosition?: number
  isNavigatingAway?: boolean
  isNavigatingBack?: boolean
  timestamp?: number
  version?: number
}

export function useListingDetailScrollRestoration(id: string | undefined, ready = true) {
  const location = useLocation()
  const lastRestoredRef = useRef<string>('')
  const hasRestoredRef = useRef(false)
  const isRestoringRef = useRef(false)

  const getKey = useCallback((listingId?: string) => `${KEY_PREFIX}${listingId || ''}` , [])

  // Detect browser back navigation using popstate marker and Performance API fallbacks
  const isBrowserBack = useCallback((): boolean => {
    // 0) Check recent global popstate marker (set in routes/__root)
    try {
      const tsRaw = sessionStorage.getItem(POP_TS_KEY)
      if (tsRaw) {
        const ts = Number(tsRaw)
        if (!Number.isNaN(ts) && (Date.now() - ts) <= 1200) return true
      }
    } catch {
      // sessionStorage not available or parse error
    }
    // 1) Check NavigationTiming API for back_forward
    try {
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (entry?.type === 'back_forward') return true
    } catch {
      // NavigationTiming API not available
    }
    
    // 2) Legacy performance.navigation fallback
    if ((performance as { navigation?: { type: number } })?.navigation?.type === 2) return true
    
    return false
  }, [])

  // Detect back-like navigation using session marker from prepareDetailNavigation (fallback)
  const isBackLikeForId = useCallback((targetId: string): boolean => {
    try {
      const raw = sessionStorage.getItem(NAV_KEY)
      if (!raw) return false
      const st = JSON.parse(raw) as DetailNavState & { navigationType?: string; currentId?: string; timestamp?: number }
      // Consider it back-like if we previously prepared navigation away from this id
      // and we returned within a short window (prevents stale restores on fresh visits)
      const recent = !!st.timestamp && (Date.now() - st.timestamp) < BACK_LIKE_TTL_MS
      return st.currentId === targetId && recent
    } catch {
      // Session storage parsing failed
      return false
    }
  }, [])

  useLayoutEffect(() => {
    if (!id || !ready) return
    if (!location.pathname.startsWith('/listing/')) return

    // Guard: ensure the hook's id matches the id in the current path to avoid
    // restoring a previous listing's scroll on the new listing route.
    const pathId = location.pathname.split('/listing/')[1]
    if (pathId && id !== pathId) {
      return
    }

    const effectMountTime = Date.now()
    isRestoringRef.current = true

    const key = getKey(id)
    let savedPos: number | null = null
    const raw = sessionStorage.getItem(key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed.position != null) {
          const pos = Number(parsed.position) || 0
          const ts = Number(parsed.timestamp) || 0
          if (!Number.isNaN(pos) && !Number.isNaN(ts) && ts > 0 && (Date.now() - ts) <= MAX_AGE) {
            savedPos = pos
          }
        } else {
          // Legacy numeric value without timestamp – treat as valid but clear after use
          savedPos = parseInt(raw, 10) || 0
        }
      } catch {
        // Legacy numeric value
        savedPos = parseInt(raw, 10) || 0
      }
    }

    // Clear navigating flags on arrival but do not overwrite the prepared id
    try {
      const current = sessionStorage.getItem(NAV_KEY)
      if (current) {
        const st: DetailNavState = JSON.parse(current)
        delete (st as { [key: string]: unknown }).isNavigatingAway
        delete (st as { [key: string]: unknown }).isNavigatingBack
        sessionStorage.setItem(NAV_KEY, JSON.stringify({ ...st }))
      }
    } catch {}

    const restoreInstant = (y: number) => {
      isRestoringRef.current = true
      hasRestoredRef.current = true
      const html = document.documentElement
      html.classList.add('instant-nav')

      let prevH = 0, stable = 0, tries = 0
      const loop = () => {
        const se = document.scrollingElement || document.documentElement
        const maxY = Math.max(0, se.scrollHeight - window.innerHeight)
        const target = Math.min(y, maxY)
        window.scrollTo(0, target)

        const h = se.scrollHeight
        stable = (h === prevH) ? stable + 1 : 0
        prevH = h
        const notAtTarget = Math.abs(window.scrollY - target) > 1
        const unstable = stable < 2
        if ((notAtTarget || unstable) && tries++ < 40) {
          requestAnimationFrame(loop)
        } else {
          requestAnimationFrame(() => {
            html.classList.remove('instant-nav')
            setTimeout(() => {
              isRestoringRef.current = false
              
            }, 800)
          })
        }
      }
      requestAnimationFrame(loop)
    }

    const doForwardTop = () => {
      // Clear stale value if any - useListingPositioning handles scroll-to-top
      sessionStorage.removeItem(key)
      // Don't scroll here - useListingPositioning already handles scroll-to-top
      // for forward navigation without visible animation
    }

  // Detect explicit forward target set by ListingCard click (detail → detail)
  const forwardMarker = (() => {
    try {
      const rawF = sessionStorage.getItem('leasingborsen-detail-forward')
      if (!rawF) return null
      const marker = JSON.parse(rawF) as { fromId?: string; toId?: string; t?: number }
      return marker || null
    } catch {
      return null
    }
  })()
  const isForwardTarget = !!(forwardMarker && forwardMarker.toId === id)

    if (isForwardTarget) {
      // Clear marker and treat as forward; never restore on explicit forward
      try {
        sessionStorage.removeItem('leasingborsen-detail-forward')
      } catch {
        // Session storage removal failed
      }
      doForwardTop()
      // proceed to attach save listeners below
    } else {
      const browserBack = isBrowserBack()
      const isBackLike = isBackLikeForId(id)

      // Priority 1: Browser back navigation - restore if we have saved position
      if (browserBack && savedPos != null) {
        if (lastRestoredRef.current === `${key}-${savedPos}`) {
          setTimeout(() => { isRestoringRef.current = false }, 800)
        } else {
          lastRestoredRef.current = `${key}-${savedPos}`
          restoreInstant(savedPos)
        }
      // Priority 2: Fallback back-like detection - restore if we have saved position
      } else if (savedPos != null && isBackLike) {
        if (lastRestoredRef.current === `${key}-${savedPos}`) {
          setTimeout(() => { isRestoringRef.current = false }, 800)
        } else {
          lastRestoredRef.current = `${key}-${savedPos}`
          restoreInstant(savedPos)
        }
      // Priority 3: Default - scroll to top
      } else {
        doForwardTop()
      }
    }

    // Save logic
    const saveNow = () => {
      if (isRestoringRef.current) return

      // Avoid overwriting within first 800ms of mount
      if (Date.now() - effectMountTime < 800) return

      // Avoid saving while navigating away
      try {
        const rawState = sessionStorage.getItem(NAV_KEY)
        if (rawState) {
          const st = JSON.parse(rawState) as DetailNavState
          if (st.isNavigatingAway && st.timestamp && (Date.now() - st.timestamp) < 2000) return
        }
      } catch {
        // Session storage parsing failed
      }

      const y = window.scrollY || 0
      const payload = {
        position: y | 0,
        timestamp: Date.now(),
        version: 1,
      }
      sessionStorage.setItem(key, JSON.stringify(payload))
    }

    let t: NodeJS.Timeout | undefined
    const debouncedSave = () => { clearTimeout(t); t = setTimeout(saveNow, 200) }
    window.addEventListener('scroll', debouncedSave, { passive: true })
    window.addEventListener('pagehide', saveNow)

    // Prune expired entries for this id
    try {
      const rawSaved = sessionStorage.getItem(key)
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved)
        if (parsed?.timestamp && (Date.now() - parsed.timestamp) > MAX_AGE) {
          sessionStorage.removeItem(key)
        }
      }
    } catch {
      // Session storage operations failed
    }

    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', debouncedSave)
      window.removeEventListener('pagehide', saveNow)
      saveNow()
    }
  }, [id, ready, location.pathname, location.state, getKey, isBrowserBack, isBackLikeForId])
}

// Lightweight detector for back-like navigation usable by components to coordinate behavior
export function useDetailBackLike(): boolean {
  const location = useLocation()
  // 1) Router explicit state
  const explicitBackLike = (location.state as { backLike?: boolean })?.backLike === true
  if (explicitBackLike) return true

  const isDetailRoute = location.pathname.includes('/listing/')
  if (isDetailRoute) {
    // Guard against forward: if a forward marker exists for this path id, do NOT treat as back-like
    try {
      const rawF = sessionStorage.getItem('leasingborsen-detail-forward')
      if (rawF) {
        const marker = JSON.parse(rawF) as { toId?: string }
        const pathId = location.pathname.split('/listing/')[1]
        if (marker?.toId && pathId && marker.toId === pathId) return false
      }
    } catch {}

    // Prefer explicit in-app back flag for details
    try {
      const raw = sessionStorage.getItem('leasingborsen-detail-navigation')
      if (raw) {
        const st = JSON.parse(raw)
        if (st?.isNavigatingBack && st?.timestamp && (Date.now() - st.timestamp) < 5000) return true
      }
    } catch {}

    // Check recent popstate marker
    try {
      const tsRaw = sessionStorage.getItem(POP_TS_KEY)
      if (tsRaw) {
        const ts = Number(tsRaw)
        if (!Number.isNaN(ts) && (Date.now() - ts) <= 1200) return true
      }
    } catch {}

    // Fall back to Performance Navigation only if no forward marker matched
    try {
      const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (entry?.type === 'back_forward') return true
    } catch {}
    if ((performance as { navigation?: { type: number } })?.navigation?.type === 2) return true

    return false
  }

  // Non-detail routes: keep normal fallbacks (check popstate first)
  try {
    const tsRaw = sessionStorage.getItem(POP_TS_KEY)
    if (tsRaw) {
      const ts = Number(tsRaw)
      if (!Number.isNaN(ts) && (Date.now() - ts) <= 1200) return true
    }
  } catch {}
  try {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (entry?.type === 'back_forward') return true
  } catch {}
  if ((performance as { navigation?: { type: number } })?.navigation?.type === 2) return true
  try {
    const raw = sessionStorage.getItem('leasingborsen-detail-navigation')
    if (raw) {
      const st = JSON.parse(raw)
      if (st?.isNavigatingBack && st?.timestamp && (Date.now() - st.timestamp) < 5000) return true
    }
  } catch {}
  return false
}
