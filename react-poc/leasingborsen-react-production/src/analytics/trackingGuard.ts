/**
 * Pageview Tracking Guard
 * 
 * Pathname-based deduplication to prevent duplicate pageview events from
 * React StrictMode, router subscription issues, or any other source.
 */

import { trackPageView, type PageViewContext } from './pageview'

// Guard state
let lastTrackedPathname: string | null = null
let lastTrackedTime: number = 0

// Time window to prevent rapid-fire duplicates for the same pathname
const DUPLICATE_WINDOW_MS = 500

/**
 * Normalize pathname for consistent comparison
 */
function normalizePath(pathname: string): string {
  return pathname
    .toLowerCase() // Case-insensitive comparison
    .replace(/\/+$/, '') // Remove trailing slashes
    .replace(/^\/+/, '/') // Ensure single leading slash
}

/**
 * Track a pageview only if the pathname has changed or enough time has passed
 * This is the main guard function that prevents all duplicate pageviews
 * 
 * @param pathname - URL pathname for deduplication
 * @param context - Pageview context to track
 * @returns true if pageview was tracked, false if skipped as duplicate
 */
export function trackPVIfNew(pathname: string, context: PageViewContext): boolean {
  const now = Date.now()
  const normalizedPath = normalizePath(pathname)
  
  // Check if this is a duplicate (same pathname within time window)
  if (lastTrackedPathname === normalizedPath && (now - lastTrackedTime) < DUPLICATE_WINDOW_MS) {
    return false
  }
  
  // Track the pageview
  trackPageView(context)
  
  // Update guard state
  lastTrackedPathname = normalizedPath
  lastTrackedTime = now
  return true
}

/**
 * Reset the tracking guard state (useful for testing or manual reset)
 */
export function resetTrackingGuard(): void {
  lastTrackedPathname = null
  lastTrackedTime = 0
}

/**
 * Get current guard state (for debugging)
 */
export function getGuardState(): { lastPathname: string | null, lastTime: number } {
  return {
    lastPathname: lastTrackedPathname,
    lastTime: lastTrackedTime
  }
}