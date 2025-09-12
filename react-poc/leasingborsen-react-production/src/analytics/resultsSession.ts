/**
 * Results Session Management
 * 
 * Single source of truth for results_session_id management across all analytics events.
 * Ensures consistent session IDs between listing views, clicks, filter events, etc.
 */

import { createFingerprint } from './normalization'

// Current results session state
let currentResultsSessionId: string | null = null
let lastFiltersKey = ''

/**
 * Generate a new results session ID
 */
function generateResultsSessionId(): string {
  return `rs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Create a canonical search fingerprint for session management
 * Only includes significant filter changes that warrant a new search session
 * - Normalizes filter values for consistent comparison
 * - Includes sort_option as it affects result ordering and impression context
 * - Returns stable hash for session comparison
 */
export function getSearchFingerprint(filters?: Record<string, any>): string {
  // Define which filters are significant enough to trigger a new search session
  const significantFilters = [
    'make', 'model', 'fuel_type', 'body_type', 
    'price_min', 'price_max', 'mileage_km_per_year', 'term_months',
    'sort_option'
  ]
  
  return createFingerprint(filters, significantFilters)
}

/**
 * Get current results session ID (read-only)
 */
export function getCurrentResultsSessionId(): string | null {
  return currentResultsSessionId
}

/**
 * Recompute results session ID if filters changed significantly
 * Used when filters or sort options change
 */
export function recomputeResultsSessionId(filters?: Record<string, any>): string {
  const searchFingerprint = getSearchFingerprint(filters)
  
  if (searchFingerprint !== lastFiltersKey) {
    const previousId = currentResultsSessionId
    currentResultsSessionId = generateResultsSessionId()
    lastFiltersKey = searchFingerprint
    
    if (previousId !== currentResultsSessionId) {
      console.log('[Analytics] Results session recomputed:', previousId, '→', currentResultsSessionId, 'fingerprint:', searchFingerprint)
    }
  }
  
  return currentResultsSessionId!
}

/**
 * Force reset results session (for testing or manual reset)
 */
export function resetResultsSession(): void {
  currentResultsSessionId = null
  lastFiltersKey = ''
  console.log('[Analytics] Results session reset')
}

/**
 * Initialize or get results session ID
 * Creates a new session if none exists
 */
export function getOrCreateResultsSessionId(): string {
  if (!currentResultsSessionId) {
    currentResultsSessionId = generateResultsSessionId()
    console.log('[Analytics] New results session created:', currentResultsSessionId)
  }
  return currentResultsSessionId
}