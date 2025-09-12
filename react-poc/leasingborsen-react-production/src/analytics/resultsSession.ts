/**
 * Results Session Management
 * 
 * Single source of truth for results_session_id management across all analytics events.
 * Ensures consistent session IDs between listing views, clicks, filter events, etc.
 */

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
  if (!filters || Object.keys(filters).length === 0) {
    return ''
  }

  // Define which filters are significant enough to trigger a new search session
  const significantFilters = [
    'make', 'model', 'fuel_type', 'body_type', 
    'price_min', 'price_max', 'mileage_km_per_year', 'term_months',
    'sort_option'
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