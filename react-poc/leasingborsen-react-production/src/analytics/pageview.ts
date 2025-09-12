/**
 * Page View Tracking Module
 * 
 * Handles page_view event tracking with de-duplication and context building
 */

import { analytics, type Device } from './mp'
import { validatePageViewOrWarn } from './schema'
import { 
  canonicalizeQuery, 
  sanitizeQuery, 
  normalizeFuelType, 
  normalizeLeaseScoreBand,
  normalizeRecord
} from './normalization'

export type PageType = 'home' | 'results' | 'listing_detail' | 'other'
export type PageLoad = 'cold' | 'warm' | 'bfcache' | 'spa'

// Base properties included in all page_view events
interface BaseProps {
  schema_version: '1'
  session_id: string
  device_type: Device
  feature_flags?: string[]
  page_type: PageType
  page_name?: string
  path: string
  query?: Record<string, string | number | boolean>
  referrer_host?: string
  page_load_type: PageLoad
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

// Results page context (only when page_type === 'results')
interface ResultsContext {
  results_session_id: string
  results_count?: number
  filters_active?: Record<string, string | number | boolean>
  latency_ms?: number
}

// Listing detail page context (only when page_type === 'listing_detail')
interface ListingContext {
  listing_id: string
  lease_score?: number
  lease_score_band?: 'excellent' | 'good' | 'fair' | 'weak'
  price_dkk?: number
  mileage_km_per_year?: number
  term_months?: number
  fuel_type?: 'ev' | 'phev' | 'ice'
  entry_method?: 'direct' | 'internal_grid_click' | 'internal_similar' | 'ad' | 'email' | 'push'
  source_event_id?: string
}

export type PageViewEvent = BaseProps & Partial<ResultsContext> & Partial<ListingContext>

// De-duplication cache to prevent duplicate events
let lastPageViewKey = ''
let lastPageViewTime = 0
const DEDUPE_WINDOW_MS = 200

// Whitelist for filter keys to prevent payload bloat
const ALLOWED_FILTER_KEYS = [
  'price_max',
  'mileage_km_per_year', 
  'term_months',
  'fuel_type',
  'sort_option',
  'make',
  'model',
  'body_type'
] as const

import { recomputeResultsSessionId } from './resultsSession'


/**
 * Track a page view event with context
 */
export function trackPageView(context: PageViewContext): void {
  if (!analytics.hasConsent()) {
    return // No tracking without consent
  }

  try {
    // Build the complete event payload
    const event = buildPageViewEvent(context)
    
    // De-duplication check using canonical query representation
    const canonicalQuery = canonicalizeQuery(event.query)
    const pageKey = `${event.path}${canonicalQuery ? `?${canonicalQuery}` : ''}`
    const now = Date.now()
    
    if (pageKey === lastPageViewKey && (now - lastPageViewTime) < DEDUPE_WINDOW_MS) {
      console.log('[Analytics] Skipping duplicate page_view')
      return
    }
    
    lastPageViewKey = pageKey
    lastPageViewTime = now
    
    // Validate event in development
    validatePageViewOrWarn(event)
    
    // Track the event
    analytics.track('page_view', event)
    
    console.log('[Analytics] page_view tracked:', event.page_type, event.path)
  } catch (error) {
    console.error('[Analytics] Page view tracking failed:', error)
  }
}

/**
 * Context provided when tracking a page view
 */
export interface PageViewContext {
  // Route information
  path: string
  query?: Record<string, any>
  pageType: PageType
  pageName?: string
  
  // Results page context
  resultsCount?: number
  filters?: Record<string, any>
  latency?: number
  
  // Listing page context
  listingId?: string
  leaseScore?: number
  priceMonthly?: number
  mileage?: number
  termMonths?: number
  fuelType?: string
  entryMethod?: 'direct' | 'internal_grid_click' | 'internal_similar' | 'ad' | 'email' | 'push'
  sourceEventId?: string
  
  // Optional overrides
  deviceType?: Device
  pageLoadType?: PageLoad
  featureFlags?: string[]
}

/**
 * Build a complete page view event from context
 */
function buildPageViewEvent(context: PageViewContext): PageViewEvent {
  // Base properties
  const baseProps: BaseProps = {
    schema_version: '1',
    session_id: analytics.getSessionId() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    device_type: context.deviceType || analytics.getDeviceType() || 'desktop',
    page_type: context.pageType,
    path: context.path,
    page_load_type: context.pageLoadType || analytics.getPageLoadType() || 'cold',
    ...(context.featureFlags && { feature_flags: context.featureFlags }),
    ...(context.pageName && { page_name: context.pageName }),
    ...(context.query && (() => {
      const sanitized = sanitizeQuery(context.query)
      return sanitized && Object.keys(sanitized).length > 0 ? { query: sanitized } : {}
    })()),
    ...(analytics.getReferrerHost() && { referrer_host: analytics.getReferrerHost() })
  }
  
  // Add UTM parameters if available (handled by analytics core)
  
  let event: PageViewEvent = baseProps
  
  // Add results context
  if (context.pageType === 'results') {
    const resultsContext = buildResultsContext(context)
    event = { ...event, ...resultsContext }
  }
  
  // Add listing context  
  if (context.pageType === 'listing_detail' && context.listingId) {
    const listingContext = buildListingContext(context)
    event = { ...event, ...listingContext }
  }
  
  return event
}

/**
 * Build results page context with session management
 */
function buildResultsContext(context: PageViewContext): ResultsContext {
  // Recompute results session if filters changed significantly
  const resultsSessionId = recomputeResultsSessionId(context.filters)
  
  const resultsContext: ResultsContext = {
    results_session_id: resultsSessionId
  }
  
  // Add optional fields
  if (context.resultsCount !== undefined) {
    resultsContext.results_count = context.resultsCount
  }
  
  if (context.latency !== undefined) {
    resultsContext.latency_ms = Math.round(context.latency)
  }
  
  // Add trimmed filters only if there are any
  if (context.filters) {
    const trimmedFilters = trimFilters(context.filters)
    if (trimmedFilters) {
      resultsContext.filters_active = trimmedFilters
    }
  }
  
  return resultsContext
}

/**
 * Build listing detail page context
 */
function buildListingContext(context: PageViewContext): ListingContext {
  const listingContext: ListingContext = {
    listing_id: context.listingId!
  }
  
  // Add optional product fields
  if (context.leaseScore !== undefined) {
    listingContext.lease_score = Math.round(context.leaseScore)
    listingContext.lease_score_band = normalizeLeaseScoreBand(context.leaseScore)
  }
  
  if (context.priceMonthly !== undefined) {
    listingContext.price_dkk = Math.round(context.priceMonthly)
  }
  
  if (context.mileage !== undefined) {
    listingContext.mileage_km_per_year = Math.round(context.mileage)
  }
  
  if (context.termMonths !== undefined) {
    listingContext.term_months = Math.round(context.termMonths)
  }
  
  if (context.fuelType) {
    const normalizedFuelType = normalizeFuelType(context.fuelType)
    if (normalizedFuelType) {
      listingContext.fuel_type = normalizedFuelType
    }
  }
  
  if (context.entryMethod) {
    listingContext.entry_method = context.entryMethod
  }
  
  if (context.sourceEventId) {
    listingContext.source_event_id = context.sourceEventId
  }
  
  return listingContext
}


/**
 * Trim filters to only allowed keys and ensure reasonable payload size
 */
function trimFilters(filters: Record<string, any>): Record<string, string | number | boolean> | undefined {
  return normalizeRecord(filters, ALLOWED_FILTER_KEYS)
}



/**
 * Reset pageview deduplication state (for testing)
 */
export function resetPageViewState(): void {
  lastPageViewKey = ''
  lastPageViewTime = 0
}

// Export from results session module for backward compatibility
export { getCurrentResultsSessionId, resetResultsSession } from './resultsSession'
