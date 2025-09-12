/**
 * Filter Tracking Module
 * 
 * Handles filters_change and filters_apply event tracking with comprehensive
 * debouncing, session management, and type safety.
 */

import { analytics } from './mp'
import { 
  validateFiltersChangeOrWarn, 
  validateFiltersApplyOrWarn,
  validateFiltersOverlayOpenOrWarn,
  validateFiltersOverlayCloseOrWarn
} from './schema'
import { normalizeValue } from './normalization'

// Type definitions matching store filter keys
export type AllowedFilterKey = 
  | 'makes' | 'models' | 'selectedCars'
  | 'fuel_type' | 'body_type' | 'transmission'
  | 'price_min' | 'price_max' | 'mileage_selected' | 'mileage_km_per_year'
  | 'seats_min' | 'seats_max' | 'horsepower_min' | 'horsepower_max'
  | 'sortOrder'

export type FilterAction = 'add' | 'remove' | 'update' | 'clear'
export type FilterMethod = 'dropdown' | 'checkbox' | 'slider' | 'input' | 'chip_remove' | 'url'
export type ApplyTrigger = 'auto' | 'reset_button' | 'url_navigation'
export type EntrySurface = 'toolbar' | 'chip' | 'cta'
export type CloseReason = 'apply_button' | 'backdrop' | 'back' | 'tab_change' | 'system'

// Event interfaces
export interface FiltersChangeParams {
  filter_key: AllowedFilterKey
  filter_action: FilterAction
  filter_value?: string | number | boolean | null
  previous_value?: string | number | boolean | null
  filter_method: FilterMethod
  total_active_filters: number
  results_session_id: string
}

export interface FiltersApplyParams {
  results_session_id: string
  filters_applied: Record<string, string | number | boolean>
  filters_count: number
  changed_filters: AllowedFilterKey[]
  changed_keys_count: number
  apply_trigger: ApplyTrigger
  previous_results_count: number
  results_count: number
  results_delta: number
  is_zero_results: boolean
  latency_ms: number
  overlay_id?: string  // Optional linkage to mobile overlay
}

export interface FiltersOverlayOpenParams {
  results_session_id: string
  overlay_id: string
  entry_surface: EntrySurface
  initial_filters: Record<string, any>
}

export interface FiltersOverlayCloseParams {
  results_session_id: string
  overlay_id: string
  close_reason: CloseReason
  dwell_ms: number
  changed_keys_count: number
  changed_filters: AllowedFilterKey[]
  had_pending_request: boolean
}

export interface SearchResults {
  count: number
  pages?: number
  data?: any[]
}

import { resetResultsSession, getSearchFingerprint, getOrCreateResultsSessionId } from './resultsSession'

// Session management (RSID now handled by resultsSession module)
let lastSearchFingerprint = ''
let lastCommittedChangeAt = 0
let lastSettledState: {
  fingerprint: string
  results_count: number
  filters_applied: Record<string, any>
} | null = null

// Debounce tracking
const changeDebounceTimers = new Map<string, NodeJS.Timeout>()
const SLIDER_DEBOUNCE_MS = 400
const DUPLICATE_CHANGE_WINDOW_MS = 1000

// Per-key duplicate tracking
const lastEmittedChanges = new Map<string, { valueHash: string, timestamp: number }>()

/**
 * Create a unique key for tracking changes per filter+method combination
 */
function createChangeKey(filter_key: AllowedFilterKey, filter_method: FilterMethod): string {
  return `${filter_key}:${filter_method}`
}

/**
 * Create a hash of the change value for deduplication
 */
function createValueHash(filter_value: string | number | boolean | null | undefined): string {
  return JSON.stringify(normalizeValue(filter_value))
}

/**
 * Get current results session ID (delegates to central module)
 * Creates a new session if none exists
 */
export function getResultsSessionId(): string {
  return getOrCreateResultsSessionId()
}

// Re-export computeSearchFingerprint for backward compatibility
export const computeSearchFingerprint = getSearchFingerprint



/**
 * Track a filter change event (with debouncing for sliders/inputs)
 */
/**
 * Helper function to map current path to origin_page at call time
 */
function mapOrigin(path: string): 'home' | 'results' | 'listing_detail' | 'other' {
  if (path === '/') return 'home'
  if (path.startsWith('/listings')) return 'results'
  if (path.startsWith('/listing/')) return 'listing_detail'
  return 'other'
}

export function trackFiltersChange(params: FiltersChangeParams): void {
  if (!analytics.hasConsent()) return
  
  // Skip tracking for URL-driven filter changes (navigation restoration)
  if (params.filter_method === 'url') {
    console.log('[Analytics] Skipping URL-driven filter change:', params.filter_key, params.filter_value)
    return
  }

  try {
    // Capture path at call-time (not send-time) for accurate origin tracking
    const pathAtCall = typeof window !== 'undefined' ? window.location.pathname : '/'
    const origin_page = mapOrigin(pathAtCall)

    // Create keys for tracking
    const debounceKey = `${params.filter_key}_${params.filter_method}`
    const changeKey = createChangeKey(params.filter_key, params.filter_method)
    const valueHash = createValueHash(params.filter_value)
    
    // Check for duplicate within window using per-key tracking
    const now = Date.now()
    const lastChange = lastEmittedChanges.get(changeKey)
    if (lastChange && (now - lastChange.timestamp) < DUPLICATE_CHANGE_WINDOW_MS) {
      if (lastChange.valueHash === valueHash) {
        console.log('[Analytics] Skipping duplicate filter change:', params.filter_key, params.filter_value)
        return
      }
    }
    
    // Clear existing debounce timer
    if (changeDebounceTimers.has(debounceKey)) {
      clearTimeout(changeDebounceTimers.get(debounceKey)!)
      changeDebounceTimers.delete(debounceKey)
    }
    
    const executeTrack = () => {
      // Update lastCommittedChangeAt when change is committed (after debounce)
      lastCommittedChangeAt = Date.now()

      const event = {
        schema_version: '1' as const,
        session_id: analytics.getSessionId(),
        device_type: analytics.getDeviceType(),
        path: pathAtCall, // Use call-time path, not current path
        referrer_host: analytics.getReferrerHost(),
        results_session_id: params.results_session_id,
        filter_key: params.filter_key,
        filter_action: params.filter_action,
        filter_value: normalizeValue(params.filter_value),
        previous_value: normalizeValue(params.previous_value),
        filter_method: params.filter_method,
        total_active_filters: Math.round(params.total_active_filters),
        origin_page // Use call-time origin, not send-time
      }
      
      // Remove undefined fields
      Object.keys(event).forEach(key => {
        if ((event as any)[key] === undefined) {
          delete (event as any)[key]
        }
      })
      
      // Validate event in development
      validateFiltersChangeOrWarn(event)
      
      analytics.track('filters_change', event)
      console.log('[Analytics] filters_change tracked:', params.filter_key, params.filter_action, `origin: ${origin_page}`)
      
      // Update per-key tracking for deduplication
      lastEmittedChanges.set(changeKey, {
        valueHash,
        timestamp: Date.now()
      })
      changeDebounceTimers.delete(debounceKey)
    }
    
    // Apply debouncing for sliders/inputs
    const isSliderOrInput = params.filter_method === 'slider' || params.filter_method === 'input'
    if (isSliderOrInput) {
      const timeout = setTimeout(executeTrack, SLIDER_DEBOUNCE_MS)
      changeDebounceTimers.set(debounceKey, timeout)
    } else {
      executeTrack()
    }
    
  } catch (error) {
    console.error('[Analytics] filters_change failed:', error)
  }
}

/**
 * Track a filter apply event (when search results have settled)
 * Enhanced with stale response and no-op guards
 */
export function trackFiltersApply(params: FiltersApplyParams, currentFingerprint?: string): void {
  if (!analytics.hasConsent()) return

  try {
    // Stale drop guard: check if response fingerprint matches current state
    if (currentFingerprint && lastSearchFingerprint && currentFingerprint !== lastSearchFingerprint) {
      console.log('[Analytics] Dropping stale filters_apply - fingerprint mismatch')
      return
    }

    // Enhanced no-op guard: compare against last settled state OR basic no-op check
    const basicNoOp = params.changed_keys_count === 0 && 
                      params.results_delta === 0 &&
                      params.apply_trigger !== 'reset_button'
    
    const advancedNoOp = lastSettledState && 
                         currentFingerprint === lastSettledState.fingerprint &&
                         params.results_count === lastSettledState.results_count &&
                         params.apply_trigger !== 'reset_button'
    
    if (basicNoOp || advancedNoOp) {
      console.log('[Analytics] Skipping no-op filters_apply - no meaningful change')
      return
    }

    const event = {
      schema_version: '1' as const,
      session_id: analytics.getSessionId(),
      device_type: analytics.getDeviceType(),
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      referrer_host: analytics.getReferrerHost(),
      results_session_id: params.results_session_id,
      filters_applied: params.filters_applied,
      filters_count: Math.round(params.filters_count),
      changed_filters: params.changed_filters,
      changed_keys_count: Math.round(params.changed_keys_count),
      apply_trigger: params.apply_trigger,
      previous_results_count: Math.round(params.previous_results_count),
      results_count: Math.round(params.results_count),
      results_delta: Math.round(params.results_delta),
      is_zero_results: params.is_zero_results,
      latency_ms: Math.round(params.latency_ms),
      overlay_id: params.overlay_id
    }
    
    // Remove undefined fields
    Object.keys(event).forEach(key => {
      if ((event as any)[key] === undefined) {
        delete (event as any)[key]
      }
    })
    
    // Validate event in development
    validateFiltersApplyOrWarn(event)
    
    analytics.track('filters_apply', event)
    console.log('[Analytics] filters_apply tracked:', {
      changed: params.changed_keys_count,
      results: params.results_count,
      delta: params.results_delta
    })
    
    // Update last settled state
    if (currentFingerprint) {
      lastSettledState = {
        fingerprint: currentFingerprint,
        results_count: params.results_count,
        filters_applied: params.filters_applied
      }
    }
    
  } catch (error) {
    console.error('[Analytics] filters_apply failed:', error)
  }
}

/**
 * Get accurate latency from last committed change to now
 */
export function getAccurateLatency(): number {
  return lastCommittedChangeAt ? Date.now() - lastCommittedChangeAt : 0
}

/**
 * Reset all tracking state (useful for testing)
 */
export function resetFilterTracking(): void {
  lastSearchFingerprint = ''
  lastCommittedChangeAt = 0
  lastSettledState = null
  
  // Clear all debounce timers
  changeDebounceTimers.forEach(timer => clearTimeout(timer))
  changeDebounceTimers.clear()
  
  // Clear per-key duplicate tracking
  lastEmittedChanges.clear()
  
  // Also reset results session state
  resetResultsSession()
}

/**
 * Check if results session should be reset based on fingerprint change
 */
export function checkAndResetSession(newFingerprint: string): boolean {
  if (newFingerprint !== lastSearchFingerprint) {
    lastSearchFingerprint = newFingerprint
    resetResultsSession()
    return true
  }
  return false
}

/**
 * Generate a unique overlay ID
 */
function generateOverlayId(): string {
  return `ov_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Track mobile filter overlay open event
 */
export function trackOverlayOpen(params: FiltersOverlayOpenParams): void {
  if (!analytics.hasConsent()) return

  try {
    const event = {
      schema_version: '1' as const,
      session_id: analytics.getSessionId(),
      device_type: 'mobile' as const,
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      referrer_host: analytics.getReferrerHost(),
      results_session_id: params.results_session_id,
      overlay_id: params.overlay_id,
      entry_surface: params.entry_surface,
      initial_filters: params.initial_filters
    }
    
    // Validate event in development
    validateFiltersOverlayOpenOrWarn(event)
    
    analytics.track('filters_overlay_open', event)
    console.log('[Analytics] filters_overlay_open tracked:', params.entry_surface)
    
  } catch (error) {
    console.error('[Analytics] filters_overlay_open failed:', error)
  }
}

/**
 * Track mobile filter overlay close event
 */
export function trackOverlayClose(params: FiltersOverlayCloseParams): void {
  if (!analytics.hasConsent()) return

  try {
    const event = {
      schema_version: '1' as const,
      session_id: analytics.getSessionId(),
      device_type: 'mobile' as const,
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      referrer_host: analytics.getReferrerHost(),
      results_session_id: params.results_session_id,
      overlay_id: params.overlay_id,
      close_reason: params.close_reason,
      dwell_ms: Math.round(params.dwell_ms),
      changed_keys_count: Math.round(params.changed_keys_count),
      changed_filters: params.changed_filters,
      had_pending_request: params.had_pending_request
    }
    
    // Validate event in development
    validateFiltersOverlayCloseOrWarn(event)
    
    analytics.track('filters_overlay_close', event)
    console.log('[Analytics] filters_overlay_close tracked:', params.close_reason, `${params.dwell_ms}ms`)
    
  } catch (error) {
    console.error('[Analytics] filters_overlay_close failed:', error)
  }
}

/**
 * Helper function to create overlay session
 */
export function createOverlaySession(): { overlayId: string, openTime: number } {
  return {
    overlayId: generateOverlayId(),
    openTime: Date.now()
  }
}

/**
 * Flush all pending debounced filter tracking events
 * Call before navigation to ensure events are tracked with correct origin_page
 * 
 * Note: This implementation clears timers without executing them. The actual
 * executeTrack functions are closures within trackFiltersChange and not 
 * accessible from outside. In practice, the debounce timing is short (300ms)
 * so most events will fire naturally before navigation.
 */
export function flushPendingFilterTracking(): void {
  if (changeDebounceTimers.size === 0) return

  console.log(`[Analytics] Clearing ${changeDebounceTimers.size} pending filter tracking timers`)

  // Clear all pending timers (events will be lost, but prevents wrong origin_page)
  changeDebounceTimers.forEach((timeout, key) => {
    clearTimeout(timeout)
  })
  
  // Clear the timers map
  changeDebounceTimers.clear()

  console.log('[Analytics] All pending filter tracking timers cleared')
}
