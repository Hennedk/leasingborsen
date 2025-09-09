/**
 * Page View Tracking Module
 * 
 * Handles page_view event tracking with de-duplication and context building
 */

import { analytics, type Device } from './mp'
import { validatePageViewOrWarn } from './schema'

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

// Results session management
let currentResultsSessionId: string | null = null
let lastFiltersKey = ''

/**
 * Create a canonical, normalized representation of query parameters for stable comparison
 * - Sorts keys alphabetically to avoid order dependency
 * - Lowercases string values for enum parameters
 * - Removes null/undefined values
 * - Returns a stable string for hashing
 */
function canonicalizeQuery(query?: Record<string, any>): string {
  if (!query || Object.keys(query).length === 0) {
    return ''
  }

  const normalized: Record<string, string | number | boolean> = {}
  
  // Process each key-value pair
  Object.entries(query).forEach(([key, value]) => {
    // Skip null/undefined values
    if (value == null) return
    
    // Normalize based on value type
    if (typeof value === 'string') {
      // Lowercase string values for enum consistency (fuel_type, body_type, etc.)
      normalized[key] = value.toLowerCase()
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value
    } else {
      // Convert other types to string
      normalized[key] = String(value).toLowerCase()
    }
  })
  
  // Sort keys alphabetically and create stable string
  return Object.keys(normalized)
    .sort()
    .map(key => `${key}:${normalized[key]}`)
    .join('|')
}

/**
 * Create a canonical search fingerprint for results session management
 * Only includes significant filter changes that warrant a new search session
 * - Normalizes filter values for consistent comparison
 * - Excludes minor parameters like sort_option
 * - Returns stable hash for session comparison
 */
function getSearchFingerprint(filters?: Record<string, any>): string {
  if (!filters || Object.keys(filters).length === 0) {
    return ''
  }

  // Define which filters are significant enough to trigger a new search session
  const significantFilters = [
    'make', 'model', 'fuel_type', 'body_type', 
    'price_min', 'price_max', 'mileage_km_per_year', 'term_months'
  ]
  
  const normalized: Record<string, string | number> = {}
  
  // Only include significant filters in the fingerprint
  significantFilters.forEach(key => {
    const value = filters[key]
    if (value == null) return
    
    if (typeof value === 'string') {
      // Normalize string values (lowercase, trim)
      normalized[key] = value.toLowerCase().trim()
    } else if (typeof value === 'number') {
      normalized[key] = value
    } else if (Array.isArray(value)) {
      // Handle array filters (makes, models, etc.) - sort for consistency
      const arrayValues = value.filter(v => v != null).map(v => String(v).toLowerCase().trim())
      if (arrayValues.length > 0) {
        normalized[key] = arrayValues.sort().join(',')
      }
    } else {
      // Convert other types to normalized string
      normalized[key] = String(value).toLowerCase().trim()
    }
  })
  
  // Create stable fingerprint
  return Object.keys(normalized)
    .sort()
    .map(key => `${key}:${normalized[key]}`)
    .join('|')
}

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
  // Generate new results session if filters changed significantly
  // Uses canonical fingerprint to detect meaningful search changes
  const searchFingerprint = getSearchFingerprint(context.filters)
  if (searchFingerprint !== lastFiltersKey) {
    currentResultsSessionId = `rs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    lastFiltersKey = searchFingerprint
    console.log('[Analytics] New results session:', currentResultsSessionId, 'fingerprint:', searchFingerprint)
  }
  
  const resultsContext: ResultsContext = {
    results_session_id: currentResultsSessionId || `rs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
  
  // Add optional fields
  if (context.resultsCount !== undefined) {
    resultsContext.results_count = context.resultsCount
  }
  
  if (context.latency !== undefined) {
    resultsContext.latency_ms = Math.round(context.latency)
  }
  
  // Add trimmed filters
  if (context.filters) {
    resultsContext.filters_active = trimFilters(context.filters)
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
    listingContext.lease_score_band = getLeaseScoreBand(context.leaseScore)
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
 * Sanitize query parameters for tracking
 */
function sanitizeQuery(query: Record<string, any>): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {}
  
  Object.entries(query).forEach(([key, value]) => {
    // Only include simple types, convert to appropriate format
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value
    } else if (value != null) {
      sanitized[key] = String(value)
    }
  })
  
  return sanitized
}

/**
 * Trim filters to only allowed keys and ensure reasonable payload size
 */
function trimFilters(filters: Record<string, any>): Record<string, string | number | boolean> {
  const trimmed: Record<string, string | number | boolean> = {}
  
  ALLOWED_FILTER_KEYS.forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null) {
      const value = filters[key]
      
      // Normalize value type
      if (typeof value === 'string') {
        trimmed[key] = value.toLowerCase().trim()
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        trimmed[key] = value
      } else {
        const asStr = String(value)
        const asNum = Number(asStr)
        trimmed[key] = Number.isFinite(asNum) ? asNum : asStr.toLowerCase().trim()
      }
    }
  })
  
  return trimmed
}

/**
 * Convert lease score to band
 */
function getLeaseScoreBand(score: number): 'excellent' | 'good' | 'fair' | 'weak' {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'  
  if (score >= 40) return 'fair'
  return 'weak'
}

/**
 * Normalize fuel type to standard values
 */
function normalizeFuelType(fuelType: string): 'ev' | 'phev' | 'ice' | null {
  const normalized = fuelType.toLowerCase()
  
  if (normalized === 'ev' || normalized === 'bev' || normalized === 'el' || normalized === 'elbil' || normalized.includes('electric')) return 'ev'
  if (normalized.includes('hybrid') || normalized.includes('phev')) return 'phev'
  if (normalized.includes('benzin') || normalized.includes('diesel') || 
      normalized.includes('gasoline') || normalized.includes('petrol')) return 'ice'
  
  return null
}

/**
 * Reset results session (useful for testing or when needed)
 */
export function resetResultsSession(): void {
  currentResultsSessionId = null
  lastFiltersKey = ''
}

/**
 * Get current results session ID for linking related events (impressions/clicks)
 */
export function getCurrentResultsSessionId(): string | null {
  return currentResultsSessionId
}
