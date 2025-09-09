/**
 * Pageview Tracking Guard
 * 
 * URL-based deduplication to prevent duplicate pageview events from
 * React StrictMode, router subscription issues, or any other source.
 */

import { trackPageView, type PageViewContext } from './pageview'

// Guard state
let lastTrackedHref: string | null = null
let lastTrackedTime: number = 0

// Time window to prevent rapid-fire duplicates for the same URL
const DUPLICATE_WINDOW_MS = 500

/**
 * Track a pageview only if the URL has changed or enough time has passed
 * This is the main guard function that prevents all duplicate pageviews
 * 
 * @param href - Full URL (pathname + search) for deduplication
 * @param context - Pageview context to track
 * @returns true if pageview was tracked, false if skipped as duplicate
 */
export function trackPVIfNew(href: string, context: PageViewContext): boolean {
  const now = Date.now()
  
  // Check if this is a duplicate (same URL within time window)
  if (lastTrackedHref === href && (now - lastTrackedTime) < DUPLICATE_WINDOW_MS) {
    return false
  }
  
  // Track the pageview
  trackPageView(context)
  
  // Update guard state
  lastTrackedHref = href
  lastTrackedTime = now
  return true
}

/**
 * Reset the tracking guard state (useful for testing or manual reset)
 */
export function resetTrackingGuard(): void {
  lastTrackedHref = null
  lastTrackedTime = 0
}

/**
 * Get current guard state (for debugging)
 */
export function getGuardState(): { lastHref: string | null, lastTime: number } {
  return {
    lastHref: lastTrackedHref,
    lastTime: lastTrackedTime
  }
}