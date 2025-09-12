import { useEffect, useMemo } from 'react'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Import analytics
import { analytics } from './analytics/mp'
import { type PageViewContext, type PageType } from './analytics/pageview'
import { trackPVIfNew } from './analytics/trackingGuard'
import { newConfigSession, trackLeaseTermsApply } from './analytics'

// Register router type for TanStack Router type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

function App() {
  // Create router instance inside component to ensure fresh instance per mount
  // This prevents duplicate subscriptions in React StrictMode during development
  const router = useMemo(() => createRouter({ 
    routeTree,
    defaultPreload: 'intent',
    defaultPreloadDelay: 100,
  }), [])
  useEffect(() => {
    // Initialize analytics on app startup
    const token = import.meta.env.VITE_MIXPANEL_TOKEN
    if (token) {
      if (!analytics.isInitialized()) {
        analytics.init({
          token,
          eu: true // Always use EU endpoint for GDPR compliance
        })
      }

      // Grant consent for now (in production, this should be behind a consent UI)
      // TODO: Implement proper consent management UI
      if (!analytics.hasConsent()) {
        analytics.grantConsent()
        console.log('[Analytics] Initialized and consent granted')
      }
    } else {
      console.warn('[Analytics] No VITE_MIXPANEL_TOKEN found, analytics disabled')
    }
    
    // Track initial page load using pathname-based deduplication guard
    const currentPath = window.location.pathname
    const context = buildPageViewContext(currentPath, parseSearchParams(window.location.search), false)
    trackPVIfNew(currentPath, context)
    
    // Subscribe to router navigation events (use onResolved to avoid multiple onLoad firings per navigation)
    // Skip the first resolved event since we already tracked the initial load above
    let skipFirstResolved = true
    const unsubscribe = router.subscribe('onResolved', (event) => {
      if (skipFirstResolved) {
        skipFirstResolved = false
        return
      }

      // Skip hash-only changes (same path + search, different hash)
      if (
        event.hashChanged &&
        !event.pathChanged &&
        (event.fromLocation?.searchStr === event.toLocation.searchStr)
      ) {
        return
      }

      // If on listing detail and only terms changed (km/mdr/udb or selected*), track lease_terms_apply instead of page_view
      const isDetail = event.toLocation.pathname.startsWith('/listing/')
      if (isDetail && !event.pathChanged) {
        const parse = (s?: string) => {
          const params: Record<string, string> = {}
          if (s) {
            const usp = new URLSearchParams(s)
            for (const [k, v] of usp.entries()) params[k] = v
          }
          return params
        }
        const prev = parse(event.fromLocation?.searchStr)
        const next = parse(event.toLocation.searchStr)
        const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
        const changedKeys: string[] = []
        keys.forEach(k => {
          if ((prev[k] || '') !== (next[k] || '')) changedKeys.push(k)
        })
        const leaseKeys = ['km', 'mdr', 'udb', 'selectedMileage', 'selectedTerm', 'selectedDeposit']
        const onlyLeaseChanged = changedKeys.length > 0 && changedKeys.every(k => leaseKeys.includes(k))
        if (onlyLeaseChanged) {
          const idMatch = event.toLocation.pathname.match(/\/listing\/([^/]+)/)
          const listingId = idMatch ? idMatch[1] : ''
          const to = {
            mileage_km_per_year: next.selectedMileage ? Number(next.selectedMileage) : (next.km ? Number(next.km) : undefined),
            term_months: next.selectedTerm ? Number(next.selectedTerm) : (next.mdr ? Number(next.mdr) : undefined),
            first_payment_dkk: next.selectedDeposit ? Number(next.selectedDeposit) : (next.udb ? Number(next.udb) : undefined),
          }
          const from = {
            mileage_km_per_year: prev.selectedMileage ? Number(prev.selectedMileage) : (prev.km ? Number(prev.km) : undefined),
            term_months: prev.selectedTerm ? Number(prev.selectedTerm) : (prev.mdr ? Number(prev.mdr) : undefined),
            first_payment_dkk: prev.selectedDeposit ? Number(prev.selectedDeposit) : (prev.udb ? Number(prev.udb) : undefined),
          }
          const changed: (keyof typeof to)[] = []
          ;(['mileage_km_per_year','term_months','first_payment_dkk'] as const).forEach(k => {
            if ((from as any)[k] !== (to as any)[k]) changed.push(k)
          })
          const sessionId = newConfigSession()
          if (to.mileage_km_per_year != null && to.term_months != null && to.first_payment_dkk != null) {
            trackLeaseTermsApply({
              listing_id: listingId,
              mileage_km_per_year: to.mileage_km_per_year,
              term_months: to.term_months,
              first_payment_dkk: to.first_payment_dkk,
              previous: from,
              changed_keys: changed as any,
              changed_keys_count: changed.length,
              selection_method: 'dropdown',
              ui_surface: 'inline',
              config_session_id: sessionId,
            })
          }
          return
        }
      }

      // Recompute RSID on any filter/sort changes, even if pathname didn't change
      if (!event.pathChanged) {
        // Query-only change - recompute RSID but don't emit page_view
        const nextSearchStr = event.toLocation.searchStr || ''
        const query = parseSearchParams(nextSearchStr)

        // Only recompute RSID for results pages to avoid unnecessary churn
        const currentPath = event.fromLocation?.pathname
        if (currentPath === '/listings') {
          // Map URL query to canonical filters shape used by page_view
          const filters: Record<string, any> = {}
          if (query.make) filters.make = query.make
          if (query.model) filters.model = query.model
          if (query.fuel_type) filters.fuel_type = query.fuel_type
          if (query.body_type) filters.body_type = query.body_type
          if (query.sort) filters.sort_option = query.sort
          if (query.km) filters.mileage_km_per_year = parseInt(query.km) || undefined
          if (query.mdr) filters.term_months = parseInt(query.mdr) || undefined
          if (query.price_max) filters.price_max = parseInt(query.price_max) || undefined
          if (query.max_price) filters.price_max = parseInt(query.max_price) || undefined

          // Import recomputeResultsSessionId dynamically to avoid circular imports
          import('./analytics/resultsSession').then(({ recomputeResultsSessionId }) => {
            recomputeResultsSessionId(filters)
          })
        }
        return
      }

      // Mark as SPA navigation for accurate page load type detection
      analytics.markAsSpaNavigation()

      // Use the resolved toLocation for accuracy
      const nextPath = event.toLocation.pathname
      const nextSearchStr = event.toLocation.searchStr || ''

      const context = buildPageViewContext(nextPath, parseSearchParams(nextSearchStr), true)
      trackPVIfNew(nextPath, context)
    })
    
    return unsubscribe
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <TanStackRouterDevtools router={router} />
    </>
  )
}

/**
 * Parse URL search parameters into a record
 */
function parseSearchParams(search: string): Record<string, string> {
  const query: Record<string, string> = {}
  if (search) {
    const searchParams = new URLSearchParams(search)
    for (const [key, value] of searchParams.entries()) {
      query[key] = value
    }
  }
  return query
}

/**
 * Build page view context from route information
 */
function buildPageViewContext(pathname: string, query: Record<string, string>, isSpaNavigation: boolean): PageViewContext {
  const baseContext: PageViewContext = {
    path: pathname,
    query,
    pageType: getPageType(pathname),
    pageLoadType: isSpaNavigation ? 'spa' : 'cold'
  }
  
  // Add page-specific context
  if (baseContext.pageType === 'home') {
    baseContext.pageName = 'Homepage'
  } else if (baseContext.pageType === 'results') {
    baseContext.pageName = 'Results'
    
    // Add results context if we have filter information
    const filters: Record<string, any> = {}
    
    // Map common query params to filters
    if (query.make) filters.make = query.make
    if (query.model) filters.model = query.model  
    if (query.fuel_type) filters.fuel_type = query.fuel_type
    if (query.body_type) filters.body_type = query.body_type
    if (query.sort) filters.sort_option = query.sort
    if (query.km) filters.mileage_km_per_year = parseInt(query.km) || undefined
    if (query.mdr) filters.term_months = parseInt(query.mdr) || undefined
    // Support both price_max (standard) and max_price (legacy) for backward compatibility
    if (query.price_max) filters.price_max = parseInt(query.price_max) || undefined
    if (query.max_price) filters.price_max = parseInt(query.max_price) || undefined
    
    if (Object.keys(filters).length > 0) {
      baseContext.filters = filters
    }
  } else if (baseContext.pageType === 'listing_detail') {
    baseContext.pageName = 'Listing Detail'
    
    // Extract listing ID from path
    const listingIdMatch = pathname.match(/\/listing\/([^\/]+)/)
    if (listingIdMatch) {
      baseContext.listingId = listingIdMatch[1]
    }
    
    // Determine entry method based on referrer and navigation
    if (isSpaNavigation) {
      // For SPA navigation, assume internal navigation
      baseContext.entryMethod = 'internal_grid_click'
    } else {
      // For direct loads, check referrer
      const referrerHost = analytics.getReferrerHost()
      if (!referrerHost || referrerHost === window.location.hostname) {
        baseContext.entryMethod = 'direct'
      } else {
        baseContext.entryMethod = 'ad' // External referrer
      }
    }

    // Capture click source event id if provided via search params
    if (query.source_event_id) {
      baseContext.sourceEventId = query.source_event_id
    }
  }
  
  return baseContext
}

/**
 * Determine page type from pathname
 */
function getPageType(pathname: string): PageType {
  if (pathname === '/') return 'home'
  if (pathname === '/listings') return 'results'
  if (pathname.startsWith('/listing/')) return 'listing_detail'
  return 'other'
}

export default App
