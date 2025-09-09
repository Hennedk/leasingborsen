/**
 * Session-based tracking utilities
 * 
 * Uses sessionStorage to ensure idempotent tracking across React Strict Mode,
 * HMR, and future SSR scenarios while maintaining per-tab isolation.
 */

const INITIAL_PV_KEY = 'analytics.initialPageviewSent'

/**
 * Check if the initial pageview has been sent for this tab session
 * Returns false in server environments or when sessionStorage is unavailable
 */
export const hasSentInitialPV = (): boolean => {
  try {
    return typeof window !== 'undefined' &&
           sessionStorage.getItem(INITIAL_PV_KEY) === '1'
  } catch (error) {
    // Handle cases where sessionStorage is not available (incognito, etc.)
    return false
  }
}

/**
 * Mark that the initial pageview has been sent for this tab session
 * Fails silently if sessionStorage is not available
 */
export const markInitialPV = (): void => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(INITIAL_PV_KEY, '1')
    }
  } catch (error) {
    // Ignore errors (e.g., storage quota exceeded, incognito mode restrictions)
    console.warn('[Analytics] Failed to mark initial pageview in session storage:', error)
  }
}

/**
 * Reset the initial pageview marker (useful for testing)
 * Fails silently if sessionStorage is not available
 */
export const resetInitialPV = (): void => {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(INITIAL_PV_KEY)
    }
  } catch (error) {
    // Ignore errors
    console.warn('[Analytics] Failed to reset initial pageview marker:', error)
  }
}