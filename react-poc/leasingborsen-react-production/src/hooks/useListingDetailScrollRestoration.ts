import { useLayoutEffect, useRef, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'

const KEY_PREFIX = 'detail-scroll:'
const NAV_KEY = 'leasingborsen-detail-navigation'
const MAX_AGE = 30 * 60 * 1000 // 30 minutes

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

  // Detect back-like navigation using session marker from prepareDetailNavigation
  const isBackLikeForId = useCallback((targetId: string): boolean => {
    try {
      const raw = sessionStorage.getItem(NAV_KEY)
      if (!raw) return false
      const st = JSON.parse(raw) as DetailNavState & { navigationType?: string; currentId?: string; timestamp?: number }
      // Consider it back-like if we previously prepared navigation away from this id
      // and we returned within a short window (prevents stale restores on fresh visits)
      const recent = !!st.timestamp && (Date.now() - st.timestamp) < 10000
      return st.currentId === targetId && recent
    } catch {
      return false
    }
  }, [])

  useLayoutEffect(() => {
    if (!id || !ready) return
    if (!location.pathname.startsWith('/listing/')) return

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
        delete (st as any).isNavigatingAway
        delete (st as any).isNavigatingBack
        sessionStorage.setItem(NAV_KEY, JSON.stringify({ ...st }))
      }
    } catch {}

    const restoreInstant = (y: number) => {
      console.log('[DetailScroll] Restoring to', y)
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
              console.log('[DetailScroll] Restoration complete')
            }, 800)
          })
        }
      }
      requestAnimationFrame(loop)
    }

    const doForwardTop = () => {
      // Clear stale value if any and ensure we start at top for fresh entries
      sessionStorage.removeItem(key)
      restoreInstant(0)
    }

    // Detect explicit forward target set by ListingCard click (detail → detail)
    const isForwardTarget = (() => {
      try {
        const rawF = sessionStorage.getItem('leasingborsen-detail-forward')
        if (!rawF) return false
        const marker = JSON.parse(rawF) as { id?: string; timestamp?: number }
        const recent = !!marker?.timestamp && (Date.now() - (marker.timestamp || 0)) < 8000
        return marker?.id === id && recent
      } catch {
        return false
      }
    })()

    if (isForwardTarget) {
      // Clear marker and treat as forward; never restore on explicit forward
      try { sessionStorage.removeItem('leasingborsen-detail-forward') } catch {}
      doForwardTop()
      // proceed to attach save listeners below
    } else {
      const isBackLike = isBackLikeForId(id)

      // Only restore when navigating back-like to this id
      if (savedPos != null && isBackLike) {
        if (lastRestoredRef.current === `${key}-${savedPos}`) {
          setTimeout(() => { isRestoringRef.current = false }, 800)
        } else {
          lastRestoredRef.current = `${key}-${savedPos}`
          restoreInstant(savedPos)
        }
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
      } catch {}

      const y = window.scrollY || 0
      const payload = {
        position: y | 0,
        timestamp: Date.now(),
        version: 1,
      }
      sessionStorage.setItem(key, JSON.stringify(payload))
    }

    let t: any
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
    } catch {}

    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', debouncedSave)
      window.removeEventListener('pagehide', saveNow)
      saveNow()
    }
  }, [id, ready, location.pathname, location.state, getKey, isBackLikeForId])
}

// Lightweight detector for back-like navigation usable by components to coordinate behavior
export function useDetailBackLike(id?: string): boolean {
  const location = useLocation()
  // 1) Router explicit state
  const explicitBackLike = (location.state as { backLike?: boolean })?.backLike === true
  if (explicitBackLike) return true
  // 2) NavigationTiming API
  try {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (entry?.type === 'back_forward') return true
  } catch {}
  // 3) Legacy performance.navigation
  if ((performance as any)?.navigation?.type === 2) return true
  // 4) Session flag
  try {
    const raw = sessionStorage.getItem('leasingborsen-detail-navigation')
    if (raw) {
      const st = JSON.parse(raw)
      if (st?.isNavigatingBack && st?.timestamp && (Date.now() - st.timestamp) < 5000) return true
      // Also consider recent prepare for this same id as a back-like signal
      if (id && st?.currentId && st.currentId === id && st?.timestamp && (Date.now() - st.timestamp) < 10000) {
        return true
      }
    }
  } catch {}
  return false
}
