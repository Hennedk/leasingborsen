/**
 * Analytics Module - Public API
 * 
 * Main exports for the analytics system
 */

// Core analytics instance
export { analytics } from './mp'

// Page view tracking
export { trackPageView, resetResultsSession } from './pageview'
export type { PageViewEvent, PageViewContext, PageType, PageLoad } from './pageview'

// Types from core module
export type { Device } from './mp'

// Listing events (Phase 2)
export { 
  trackListingView, 
  trackListingClick, 
  trackLeaseTermsOpen,
  trackLeaseTermsApply,
  newConfigSession,
} from './listing'
