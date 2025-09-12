/**
 * Analytics Schema Validation
 * 
 * Provides Zod schemas for PageView events with compile-time type safety
 * and runtime validation in development environments.
 */

import { z } from 'zod'

// Base properties included in all page_view events
const BasePageViewSchema = z.object({
  schema_version: z.literal('1'),
  session_id: z.string().regex(/^s_\d+_[a-z0-9]+$/, 'Invalid session ID format'),
  device_type: z.enum(['desktop', 'mobile', 'tablet']),
  page_type: z.enum(['home', 'results', 'listing_detail', 'other']),
  page_name: z.string().optional(),
  path: z.string().min(1),
  query: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  referrer_host: z.string().optional(),
  page_load_type: z.enum(['cold', 'warm', 'bfcache', 'spa']),
  feature_flags: z.array(z.string()).optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
})

// Results page context schema  
const ResultsContextSchema = z.object({
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format').optional(),
  results_count: z.number().int().min(0).max(10000).optional(),
  filters_active: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  latency_ms: z.number().int().min(0).max(30000).optional(),
})

// Listing detail page context schema
const ListingContextSchema = z.object({
  listing_id: z.string().min(1).optional(),
  lease_score: z.number().int().min(0).max(100).optional(),
  lease_score_band: z.enum(['excellent', 'good', 'fair', 'weak']).optional(),
  price_dkk: z.number().int().min(0).max(1000000).optional(),
  mileage_km_per_year: z.number().int().min(0).max(100000).optional(),
  term_months: z.number().int().min(1).max(120).optional(),
  fuel_type: z.enum(['ev', 'phev', 'ice']).optional(),
  entry_method: z.enum(['direct', 'internal_grid_click', 'internal_similar', 'ad', 'email', 'push']).optional(),
  source_event_id: z.string().uuid().optional(),
})

// Discriminated union for different page types
export const PageViewSchema = z.discriminatedUnion('page_type', [
  // Home page
  BasePageViewSchema.extend({
    page_type: z.literal('home')
  }),
  
  // Results page (includes results context)
  BasePageViewSchema.extend({
    page_type: z.literal('results')
  }).merge(ResultsContextSchema),
  
  // Listing detail page (includes listing context)
  BasePageViewSchema.extend({
    page_type: z.literal('listing_detail')
  }).merge(ListingContextSchema),
  
  // Other pages
  BasePageViewSchema.extend({
    page_type: z.literal('other')
  })
])

// Type extraction for compile-time safety
export type PageViewEvent = z.infer<typeof PageViewSchema>
export type BasePageViewEvent = z.infer<typeof BasePageViewSchema>
export type ResultsContext = z.infer<typeof ResultsContextSchema>
export type ListingContext = z.infer<typeof ListingContextSchema>

// Enum exports for consistency
export const PageTypes = {
  HOME: 'home',
  RESULTS: 'results', 
  LISTING_DETAIL: 'listing_detail',
  OTHER: 'other'
} as const

export const PageLoadTypes = {
  COLD: 'cold',
  WARM: 'warm',
  BFCACHE: 'bfcache',
  SPA: 'spa'
} as const

export const DeviceTypes = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet'
} as const

export const FuelTypes = {
  EV: 'ev',
  PHEV: 'phev',
  ICE: 'ice'
} as const

export const LeaseScoreBands = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  WEAK: 'weak'
} as const

export const EntryMethods = {
  DIRECT: 'direct',
  INTERNAL_GRID_CLICK: 'internal_grid_click',
  INTERNAL_SIMILAR: 'internal_similar',
  AD: 'ad',
  EMAIL: 'email',
  PUSH: 'push'
} as const

/**
 * Validate a PageView event payload and warn about issues in development
 * This function is a no-op in production to avoid runtime overhead
 */
export function validatePageViewOrWarn(payload: unknown): asserts payload is PageViewEvent {
  // Check if we're in development environment
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  
  if (isDev) {
    const result = PageViewSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid page_view payload:', {
        issues: result.error.issues,
        payload: payload
      })
      throw new Error(`Invalid page_view payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

/**
 * Safe validation that returns success/failure without throwing
 * Useful for testing and conditional logic
 */
export function isValidPageViewEvent(payload: unknown): payload is PageViewEvent {
  const result = PageViewSchema.safeParse(payload)
  return result.success
}

/**
 * Get validation errors for a payload (useful for debugging)
 */
export function getValidationErrors(payload: unknown): string[] {
  const result = PageViewSchema.safeParse(payload)
  return result.success ? [] : result.error.issues.map(issue => issue.message)
}

/**
 * Whitelist for filters_active keys to prevent payload bloat
 * Must match the ALLOWED_FILTER_KEYS in pageview.ts
 */
export const ALLOWED_FILTER_KEYS = [
  'price_max',
  'mileage_km_per_year', 
  'term_months',
  'fuel_type',
  'sort_option',
  'make',
  'model',
  'body_type'
] as const

export type AllowedFilterKey = typeof ALLOWED_FILTER_KEYS[number]

/**
 * Schema for validating filter objects
 */
export const FiltersActiveSchema = z.record(
  z.enum(ALLOWED_FILTER_KEYS),
  z.union([z.string(), z.number(), z.boolean()])
)

// ========== Phase 2: Listing Events ==========

// Base schema shared by listing events
const ListingBaseSchema = z.object({
  schema_version: z.literal('1'),
  session_id: z.string().regex(/^s_\d+_[a-z0-9]+$/, 'Invalid session ID format'),
  device_type: z.enum(['desktop', 'mobile', 'tablet']),
  path: z.string().min(1).optional(),
  referrer_host: z.string().optional(),
  feature_flags: z.array(z.string()).optional(),
})

// listing_view: impression of a listing in a grid/carousel
export const ListingViewSchema = ListingBaseSchema.extend({
  listing_id: z.string().min(1),
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format').optional(),
  position: z.number().int().min(1).max(1000).optional(),
  price_dkk: z.number().int().min(0).max(1000000).optional(),
  lease_score: z.number().int().min(0).max(100).optional(),
  lease_score_band: z.enum(['excellent', 'good', 'fair', 'weak']).optional(),
  container: z.enum(['results_grid', 'similar_grid', 'carousel']).optional(),
})

// listing_click: user clicks a listing card
export const ListingClickSchema = ListingBaseSchema.extend({
  listing_id: z.string().min(1),
  entry_method: z.enum(['internal_grid_click', 'internal_similar']).default('internal_grid_click'),
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format').optional(),
  position: z.number().int().min(1).max(1000).optional(),
  price_dkk: z.number().int().min(0).max(1000000).optional(),
  lease_score: z.number().int().min(0).max(100).optional(),
  lease_score_band: z.enum(['excellent', 'good', 'fair', 'weak']).optional(),
  source_event_id: z.string().uuid().optional(),
})

export type ListingViewEvent = z.infer<typeof ListingViewSchema>
export type ListingClickEvent = z.infer<typeof ListingClickSchema>

export function validateListingViewOrWarn(payload: unknown): asserts payload is ListingViewEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = ListingViewSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid listing_view payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid listing_view payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

export function validateListingClickOrWarn(payload: unknown): asserts payload is ListingClickEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = ListingClickSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid listing_click payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid listing_click payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

// ========== Lease Terms Events (Detail Page) ==========
// Shared enums for consistency
export const UiSurfaces = ['dropdown', 'drawer', 'modal', 'inline'] as const
export const SelectionMethods = ['dropdown', 'matrix', 'chip'] as const
export const TriggerSources = ['chip', 'button', 'control', 'auto', 'other'] as const

const CurrentSelectionSchema = z.object({
  pricing_id: z.string().optional(),
  mileage_km_per_year: z.number().int().min(0).max(100000).optional(),
  term_months: z.number().int().min(1).max(120).optional(),
  first_payment_dkk: z.number().int().min(0).max(1000000).optional(),
})

export const LeaseTermsOpenSchema = ListingBaseSchema.extend({
  listing_id: z.string().min(1),
  ui_surface: z.enum(UiSurfaces),
  trigger_source: z.enum(TriggerSources),
  config_session_id: z.string().uuid(),
  current_selection: CurrentSelectionSchema.optional(),
  editable_fields: z.array(z.enum(['mileage_km_per_year','term_months','first_payment_dkk'] as const)).optional(),
  options_count: z.number().int().min(0).max(500).optional(),
  initial_field_open: z.enum(['mileage_km_per_year','term_months','first_payment_dkk'] as const).optional(),
})

export const LeaseTermsApplySchema = ListingBaseSchema.extend({
  listing_id: z.string().min(1),
  mileage_km_per_year: z.number().int().min(0).max(100000),
  term_months: z.number().int().min(1).max(120),
  first_payment_dkk: z.number().int().min(0).max(1000000),
  previous: CurrentSelectionSchema.optional(),
  changed_keys: z.array(z.enum(['mileage_km_per_year','term_months','first_payment_dkk'] as const)).default([]),
  changed_keys_count: z.number().int().min(0).max(3).default(0),
  selection_method: z.enum(SelectionMethods),
  ui_surface: z.enum(UiSurfaces),
  config_session_id: z.string().uuid(),
  pricing_id: z.string().optional(),
  monthly_price_dkk: z.number().int().min(0).max(1000000).optional(),
})

export type LeaseTermsOpenEvent = z.infer<typeof LeaseTermsOpenSchema>
export type LeaseTermsApplyEvent = z.infer<typeof LeaseTermsApplySchema>

export function validateLeaseTermsOpenOrWarn(payload: unknown): asserts payload is LeaseTermsOpenEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = LeaseTermsOpenSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid lease_terms_open payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid lease_terms_open payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

export function validateLeaseTermsApplyOrWarn(payload: unknown): asserts payload is LeaseTermsApplyEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = LeaseTermsApplySchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid lease_terms_apply payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid lease_terms_apply payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

// ========== Filter Events (Results Page) ==========

// Filter-specific enums matching the filter store
export const AllowedFilterKeys = [
  'makes', 'models', 'selectedCars',
  'fuel_type', 'body_type', 'transmission',
  'price_min', 'price_max', 'mileage_selected', 'mileage_km_per_year',
  'seats_min', 'seats_max', 'horsepower_min', 'horsepower_max',
  'sortOrder'
] as const

export const FilterActions = ['add', 'remove', 'update', 'clear'] as const
export const FilterMethods = ['dropdown', 'checkbox', 'slider', 'input', 'chip_remove', 'url'] as const  
export const ApplyTriggers = ['auto', 'reset_button', 'url_navigation'] as const
export const EntrySurfaces = ['toolbar', 'chip', 'cta'] as const
export const CloseReasons = ['apply_button', 'backdrop', 'back', 'tab_change', 'system'] as const

export type AllowedFilterKeyType = typeof AllowedFilterKeys[number]
export type FilterActionType = typeof FilterActions[number]
export type FilterMethodType = typeof FilterMethods[number]
export type ApplyTriggerType = typeof ApplyTriggers[number]
export type EntrySurfaceType = typeof EntrySurfaces[number]
export type CloseReasonType = typeof CloseReasons[number]

// filters_change: individual filter interactions
export const FiltersChangeSchema = ListingBaseSchema.extend({
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format'),
  filter_key: z.enum(AllowedFilterKeys),
  filter_action: z.enum(FilterActions),
  filter_value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  previous_value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  filter_method: z.enum(FilterMethods),
  total_active_filters: z.number().int().min(0).max(50)
})

// filters_apply: search results settled after filter changes
export const FiltersApplySchema = ListingBaseSchema.extend({
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format'),
  filters_applied: z.record(z.enum(AllowedFilterKeys), z.union([z.string(), z.number(), z.boolean()])),
  filters_count: z.number().int().min(0).max(50),
  changed_filters: z.array(z.enum(AllowedFilterKeys)),
  changed_keys_count: z.number().int().min(0).max(20),
  apply_trigger: z.enum(ApplyTriggers),
  previous_results_count: z.number().int().min(0).max(100000),
  results_count: z.number().int().min(0).max(100000),
  results_delta: z.number().int().min(-100000).max(100000),
  is_zero_results: z.boolean(),
  latency_ms: z.number().int().min(0).max(60000), // Max 1 minute latency
  overlay_id: z.string().regex(/^ov_\d+_[a-z0-9]+$/, 'Invalid overlay ID format').optional() // Mobile overlay linkage
})

// filters_overlay_open: mobile filter overlay opened
export const FiltersOverlayOpenSchema = ListingBaseSchema.extend({
  device_type: z.literal('mobile'),
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format'),
  overlay_id: z.string().regex(/^ov_\d+_[a-z0-9]+$/, 'Invalid overlay ID format'),
  entry_surface: z.enum(EntrySurfaces),
  initial_filters: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
})

// filters_overlay_close: mobile filter overlay closed
export const FiltersOverlayCloseSchema = ListingBaseSchema.extend({
  device_type: z.literal('mobile'),
  results_session_id: z.string().regex(/^rs_\d+_[a-z0-9]+$/, 'Invalid results session ID format'),
  overlay_id: z.string().regex(/^ov_\d+_[a-z0-9]+$/, 'Invalid overlay ID format'),
  close_reason: z.enum(CloseReasons),
  dwell_ms: z.number().int().min(0).max(300000), // Max 5 minutes
  changed_keys_count: z.number().int().min(0).max(20),
  changed_filters: z.array(z.enum(AllowedFilterKeys)),
  had_pending_request: z.boolean()
})

export type FiltersChangeEvent = z.infer<typeof FiltersChangeSchema>
export type FiltersApplyEvent = z.infer<typeof FiltersApplySchema>
export type FiltersOverlayOpenEvent = z.infer<typeof FiltersOverlayOpenSchema>
export type FiltersOverlayCloseEvent = z.infer<typeof FiltersOverlayCloseSchema>

export function validateFiltersChangeOrWarn(payload: unknown): asserts payload is FiltersChangeEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = FiltersChangeSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid filters_change payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid filters_change payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

export function validateFiltersApplyOrWarn(payload: unknown): asserts payload is FiltersApplyEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = FiltersApplySchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid filters_apply payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid filters_apply payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

export function validateFiltersOverlayOpenOrWarn(payload: unknown): asserts payload is FiltersOverlayOpenEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = FiltersOverlayOpenSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid filters_overlay_open payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid filters_overlay_open payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}

export function validateFiltersOverlayCloseOrWarn(payload: unknown): asserts payload is FiltersOverlayCloseEvent {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  if (isDev) {
    const result = FiltersOverlayCloseSchema.safeParse(payload)
    if (!result.success) {
      console.warn('[Analytics] Invalid filters_overlay_close payload:', {
        issues: result.error.issues,
        payload
      })
      throw new Error(`Invalid filters_overlay_close payload: ${result.error.issues.map(i => i.message).join(', ')}`)
    }
  }
}
