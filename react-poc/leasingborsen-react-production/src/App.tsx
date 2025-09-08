import { useEffect } from 'react'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Import analytics
import { analytics } from './analytics/mp'
import { trackPageView, type PageViewContext, type PageType } from './analytics/pageview'

// Create a new router instance
const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadDelay: 100,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  useEffect(() => {
    // Initialize analytics on app startup
    const token = import.meta.env.VITE_MIXPANEL_TOKEN
    if (token) {
      analytics.init({
        token,
        eu: true // Always use EU endpoint for GDPR compliance
      })
      
      // Grant consent for now (in production, this should be behind a consent UI)
      // TODO: Implement proper consent management UI
      analytics.grantConsent()
      
      console.log('[Analytics] Initialized and consent granted')
    } else {
      console.warn('[Analytics] No VITE_MIXPANEL_TOKEN found, analytics disabled')
    }
    
    // Track initial page load
    trackInitialPageView()
    
    // Subscribe to router navigation events
    const unsubscribe = router.subscribe('onLoad', () => {
      // Track SPA navigation (not initial load)
      // Use window location as it's more reliable for getting the actual URL
      trackRouteNavigation(window.location.pathname, window.location.search)
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
 * Track initial page view on app startup
 */
function trackInitialPageView() {
  const currentPath = window.location.pathname
  const currentSearch = window.location.search
  
  trackRouteNavigation(currentPath, currentSearch, false)
}

/**
 * Track route navigation (both initial and SPA)
 */
function trackRouteNavigation(pathname: string, search: string, isSpaNavigation = true) {
  try {
    // Parse query parameters
    const query: Record<string, string> = {}
    if (search) {
      const searchParams = new URLSearchParams(search)
      for (const [key, value] of searchParams.entries()) {
        query[key] = value
      }
    }
    
    // Detect page type and build context
    const context = buildPageViewContext(pathname, query, isSpaNavigation)
    
    // Track the page view
    trackPageView(context)
  } catch (error) {
    console.error('[Analytics] Route tracking failed:', error)
  }
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
