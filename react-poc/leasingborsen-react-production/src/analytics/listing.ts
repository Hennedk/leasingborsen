/**
 * Listing Events Tracking (Phase 2)
 * - listing_view: impression of a listing card
 * - listing_click: click on a listing card
 */

import { analytics } from './mp'
import { getCurrentResultsSessionId } from './pageview'
import { 
  validateListingViewOrWarn, 
  validateListingClickOrWarn, 
  type ListingViewEvent, 
  type ListingClickEvent,
  validateLeaseTermsOpenOrWarn,
  validateLeaseTermsApplyOrWarn,
  type LeaseTermsOpenEvent,
  type LeaseTermsApplyEvent,
} from './schema'

// ===== LISTING IMPRESSION DEDUPLICATION =====

// Dedup index: Map<results_session_id, Map<container, Set<listing_id>>>
const seenByResults: Map<string, Map<string, Set<string>>> = new Map()

// Analytics session tracking for clearing dedup on TTL rollover
let lastAnalyticsSessionId: string | null = null

// LRU cache for results session IDs (keep last 3 to prevent unbounded memory)
const lruResultsSessionIds: string[] = []
const MAX_LRU_SIZE = 3

/**
 * Check if a listing impression should be tracked based on deduplication rules
 * @param listingId - The listing ID to check
 * @param container - The container context ('results_grid' | 'similar_grid' | 'carousel')
 * @returns true if impression should be tracked, false if already seen
 */
export function shouldTrackListingView(
  listingId: string, 
  container: 'results_grid' | 'similar_grid' | 'carousel' = 'results_grid'
): boolean {
  // Get current results session ID - required for deduplication
  const resultsSessionId = getCurrentResultsSessionId()
  if (!resultsSessionId) {
    // No results session ID available yet - don't track or mark as seen
    return false
  }

  // Check if analytics session has rolled over (TTL change) - clear all dedup if so
  const currentAnalyticsSession = analytics.getSessionId()
  if (currentAnalyticsSession && currentAnalyticsSession !== lastAnalyticsSessionId) {
    console.log('[Analytics] Analytics session rollover detected, clearing impression dedup')
    seenByResults.clear()
    lastAnalyticsSessionId = currentAnalyticsSession
  }

  // Ensure results session exists in dedup index
  if (!seenByResults.has(resultsSessionId)) {
    seenByResults.set(resultsSessionId, new Map())
    
    // Update LRU cache
    updateLruCache(resultsSessionId)
  }

  const resultsByContainer = seenByResults.get(resultsSessionId)!
  
  // Ensure container exists in results session
  if (!resultsByContainer.has(container)) {
    resultsByContainer.set(container, loadFromSessionStorage(resultsSessionId, container))
  }

  const seenListings = resultsByContainer.get(container)!
  
  // Check if already seen
  if (seenListings.has(listingId)) {
    return false // Already tracked this impression
  }

  // Mark as seen and persist
  seenListings.add(listingId)
  saveToSessionStorage(resultsSessionId, container, seenListings)
  
  return true // Should track this impression
}

/**
 * Update LRU cache and cleanup old results sessions
 */
function updateLruCache(resultsSessionId: string): void {
  // Remove if already exists (move to front)
  const existingIndex = lruResultsSessionIds.indexOf(resultsSessionId)
  if (existingIndex >= 0) {
    lruResultsSessionIds.splice(existingIndex, 1)
  }
  
  // Add to front
  lruResultsSessionIds.unshift(resultsSessionId)
  
  // Cleanup old sessions beyond LRU limit
  while (lruResultsSessionIds.length > MAX_LRU_SIZE) {
    const oldSessionId = lruResultsSessionIds.pop()!
    seenByResults.delete(oldSessionId)
    // Clean up sessionStorage for old session
    clearSessionStorageForSession(oldSessionId)
  }
}

/**
 * Load seen listings from sessionStorage for persistence across page reloads
 */
function loadFromSessionStorage(resultsSessionId: string, container: string): Set<string> {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return new Set()
  }
  
  try {
    const key = `lv_seen_rs_${resultsSessionId}_${container}`
    const stored = window.sessionStorage.getItem(key)
    if (stored) {
      const listingIds: string[] = JSON.parse(stored)
      return new Set(listingIds)
    }
  } catch (error) {
    console.warn('[Analytics] Failed to load impression dedup from sessionStorage:', error)
  }
  
  return new Set()
}

/**
 * Save seen listings to sessionStorage for persistence
 */
function saveToSessionStorage(resultsSessionId: string, container: string, seenListings: Set<string>): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }
  
  try {
    // Don't persist if set is too large to avoid quota issues
    if (seenListings.size > 1000) {
      return
    }
    
    const key = `lv_seen_rs_${resultsSessionId}_${container}`
    const listingIds = Array.from(seenListings)
    window.sessionStorage.setItem(key, JSON.stringify(listingIds))
  } catch (error) {
    console.warn('[Analytics] Failed to save impression dedup to sessionStorage:', error)
  }
}

/**
 * Clear sessionStorage for a specific results session
 */
function clearSessionStorageForSession(resultsSessionId: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }
  
  try {
    const containers = ['results_grid', 'similar_grid', 'carousel']
    containers.forEach(container => {
      const key = `lv_seen_rs_${resultsSessionId}_${container}`
      window.sessionStorage.removeItem(key)
    })
  } catch (error) {
    console.warn('[Analytics] Failed to clear sessionStorage for old session:', error)
  }
}

/**
 * Reset listing impression deduplication (for testing)
 */
export function resetListingImpressionDedup(): void {
  seenByResults.clear()
  lastAnalyticsSessionId = null
  lruResultsSessionIds.length = 0
  
  // Clear sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i)
        if (key && key.startsWith('lv_seen_rs_')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => window.sessionStorage.removeItem(key))
    } catch (error) {
      console.warn('[Analytics] Failed to clear sessionStorage during reset:', error)
    }
  }
}

// ===== END DEDUPLICATION LOGIC =====

type LeaseScoreBand = 'excellent' | 'good' | 'fair' | 'weak'

function getLeaseScoreBand(score: number): LeaseScoreBand {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'weak'
}

export function uuidv4(): string {
  // Simple RFC4122 v4 generator
  // eslint-disable-next-line no-bitwise
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface ListingContextBase {
  listingId: string
  priceMonthly?: number
  leaseScore?: number
  position?: number
}

interface TrackViewOptions extends ListingContextBase {
  container?: 'results_grid' | 'similar_grid' | 'carousel'
}

export function trackListingView(options: TrackViewOptions): void {
  if (!analytics.hasConsent()) return

  try {
    const props: ListingViewEvent = {
      schema_version: '1',
      session_id: analytics.getSessionId() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      device_type: analytics.getDeviceType() || 'desktop',
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer_host: analytics.getReferrerHost(),
      listing_id: options.listingId,
      results_session_id: getCurrentResultsSessionId() || undefined,
      position: options.position,
      price_dkk: options.priceMonthly != null ? Math.round(options.priceMonthly) : undefined,
      lease_score: options.leaseScore != null ? Math.round(options.leaseScore) : undefined,
      lease_score_band: options.leaseScore != null ? getLeaseScoreBand(options.leaseScore) : undefined,
      container: options.container,
    }

    validateListingViewOrWarn(props)
    analytics.track('listing_view', props)
  } catch (error) {
    console.error('[Analytics] Listing view tracking failed:', error)
  }
}

interface TrackClickOptions extends ListingContextBase {
  entryMethod?: 'internal_grid_click' | 'internal_similar'
  sourceEventId?: string
}

export function trackListingClick(options: TrackClickOptions): string {
  if (!analytics.hasConsent()) return ''

  try {
    const sourceEventId = options.sourceEventId || uuidv4()
    const props: ListingClickEvent = {
      schema_version: '1',
      session_id: analytics.getSessionId() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      device_type: analytics.getDeviceType() || 'desktop',
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer_host: analytics.getReferrerHost(),
      listing_id: options.listingId,
      entry_method: options.entryMethod || 'internal_grid_click',
      results_session_id: getCurrentResultsSessionId() || undefined,
      position: options.position,
      price_dkk: options.priceMonthly != null ? Math.round(options.priceMonthly) : undefined,
      lease_score: options.leaseScore != null ? Math.round(options.leaseScore) : undefined,
      lease_score_band: options.leaseScore != null ? getLeaseScoreBand(options.leaseScore) : undefined,
      source_event_id: sourceEventId,
    }
    validateListingClickOrWarn(props)
    analytics.track('listing_click', props)
    return sourceEventId
  } catch (error) {
    console.error('[Analytics] Listing click tracking failed:', error)
    return ''
  }
}

// Lease config change tracking (detail page)
// ========== Lease Terms helpers and trackers ==========

export type UiSurface = 'dropdown' | 'drawer' | 'modal' | 'inline'
export type SelectionMethod = 'dropdown' | 'matrix' | 'chip'
export type TriggerSource = 'chip' | 'button' | 'control' | 'auto' | 'other'

export interface CurrentSelection {
  pricing_id?: string
  mileage_km_per_year?: number
  term_months?: number
  first_payment_dkk?: number
}

export interface LeaseTermsOpenPayload {
  listing_id: string
  ui_surface: UiSurface
  trigger_source: TriggerSource
  config_session_id: string
  current_selection?: CurrentSelection
  editable_fields?: Array<'mileage_km_per_year'|'term_months'|'first_payment_dkk'>
  options_count?: number
  initial_field_open?: 'mileage_km_per_year' | 'term_months' | 'first_payment_dkk'
}

export interface LeaseTermsApplyPayload {
  listing_id: string
  mileage_km_per_year: number
  term_months: number
  first_payment_dkk: number
  previous?: CurrentSelection
  changed_keys: Array<'mileage_km_per_year'|'term_months'|'first_payment_dkk'>
  changed_keys_count: number
  selection_method: SelectionMethod
  ui_surface: UiSurface
  config_session_id: string
  pricing_id?: string
  monthly_price_dkk?: number
}

// Internal reopen throttle by listing
const lastOpenByListing = new Map<string, number>()

// Debounce store per config session
const applyDebouncers = new Map<string, ReturnType<typeof setTimeout>>()

export function newConfigSession(): string {
  return uuidv4()
}

export function trackLeaseTermsOpen(p: LeaseTermsOpenPayload): void {
  if (!analytics.hasConsent()) return
  try {
    const now = Date.now()
    const last = lastOpenByListing.get(p.listing_id) || 0
    if (now - last < 2000) return // throttle reopen within 2s
    lastOpenByListing.set(p.listing_id, now)

    const event: LeaseTermsOpenEvent = {
      schema_version: '1',
      session_id: analytics.getSessionId() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      device_type: analytics.getDeviceType() || 'desktop',
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer_host: analytics.getReferrerHost(),
      ...p,
    }
    validateLeaseTermsOpenOrWarn(event)
    analytics.track('lease_terms_open', event)
  } catch (error) {
    console.error('[Analytics] lease_terms_open failed:', error)
  }
}

export function trackLeaseTermsApply(p: LeaseTermsApplyPayload): void {
  if (!analytics.hasConsent()) return
  try {
    // No-op guard: compute changes if needed
    let changedKeys = p.changed_keys
    if (!changedKeys || changedKeys.length === 0) {
      changedKeys = []
      if (p.previous) {
        if (p.previous.mileage_km_per_year !== undefined && p.previous.mileage_km_per_year !== p.mileage_km_per_year) changedKeys.push('mileage_km_per_year')
        if (p.previous.term_months !== undefined && p.previous.term_months !== p.term_months) changedKeys.push('term_months')
        if (p.previous.first_payment_dkk !== undefined && p.previous.first_payment_dkk !== p.first_payment_dkk) changedKeys.push('first_payment_dkk')
      } else {
        // If no previous provided, assume all provided fields have changed
        changedKeys = ['mileage_km_per_year','term_months','first_payment_dkk']
      }
    }
    const changedCount = p.changed_keys_count ?? changedKeys.length
    if (changedCount === 0) return // nothing changed

    const event: LeaseTermsApplyEvent = {
      schema_version: '1',
      session_id: analytics.getSessionId() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      device_type: analytics.getDeviceType() || 'desktop',
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer_host: analytics.getReferrerHost(),
      listing_id: p.listing_id,
      mileage_km_per_year: Math.round(p.mileage_km_per_year),
      term_months: Math.round(p.term_months),
      first_payment_dkk: Math.round(p.first_payment_dkk),
      previous: p.previous,
      changed_keys: changedKeys,
      changed_keys_count: changedCount,
      selection_method: p.selection_method,
      ui_surface: p.ui_surface,
      config_session_id: p.config_session_id,
      pricing_id: p.pricing_id,
      monthly_price_dkk: p.monthly_price_dkk != null ? Math.round(p.monthly_price_dkk) : undefined,
    }

    // Debounce by config_session_id (300-500ms)
    const key = p.config_session_id
    if (applyDebouncers.has(key)) {
      clearTimeout(applyDebouncers.get(key)!)
    }
    const timeout = setTimeout(() => {
      try {
        validateLeaseTermsApplyOrWarn(event)
        analytics.track('lease_terms_apply', event)
      } catch (err) {
        console.error('[Analytics] lease_terms_apply failed:', err)
      } finally {
        applyDebouncers.delete(key)
      }
    }, 350)
    applyDebouncers.set(key, timeout)
  } catch (error) {
    console.error('[Analytics] lease_terms_apply schedule failed:', error)
  }
}
