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
  trackPriceCapNoteClick,
} from './listing'
export type { TrackPriceCapNoteClickParams } from './listing'

// Filter tracking events (Phase 3)
export { 
  trackFiltersChange, 
  trackFiltersApply, 
  getResultsSessionId,
  resetFilterTracking,
  computeSearchFingerprint,
  getAccurateLatency,
  trackOverlayOpen,
  trackOverlayClose,
  createOverlaySession
} from './filters'
export type { 
  FiltersChangeParams, 
  FiltersApplyParams, 
  FiltersOverlayOpenParams,
  FiltersOverlayCloseParams,
  FilterMethod, 
  FilterAction, 
  ApplyTrigger, 
  EntrySurface,
  CloseReason,
  AllowedFilterKey,
  SearchResults
} from './filters'

// Schema validation and types
export { 
  validateFiltersChangeOrWarn, 
  validateFiltersApplyOrWarn 
} from './schema'
export type { 
  FiltersChangeEvent, 
  FiltersApplyEvent 
} from './schema'
