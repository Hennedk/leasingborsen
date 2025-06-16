/**
 * Query keys factory for React Query
 * Centralized query key management for consistent caching and invalidation
 */

import type { SortOrder } from '@/types'
import type { FilterOptions } from '@/lib/supabase'

export const queryKeys = {
  // Base keys
  listings: ['listings'] as const,
  listing: ['listing'] as const,
  referenceData: ['reference-data'] as const,
  admin: ['admin'] as const,
  
  // Listings with filters
  listingsAll: () => [...queryKeys.listings] as const,
  listingsWithFilters: (filters: Partial<FilterOptions>, limit: number, sortOrder: SortOrder) =>
    [...queryKeys.listings, filters, limit, sortOrder] as const,
  listingsInfinite: (filters: Partial<FilterOptions>, sortOrder?: SortOrder) =>
    [...queryKeys.listings, 'infinite', filters, sortOrder] as const,
  listingsCount: (filters: Partial<FilterOptions>) =>
    [...queryKeys.listings, 'count', filters] as const,
  
  // Individual listing
  listingDetail: (id: string) => [...queryKeys.listing, id] as const,
  
  // Admin listings
  adminListings: (filters: Partial<FilterOptions> = {}) =>
    [...queryKeys.admin, 'listings', filters] as const,
  adminListingStats: () => [...queryKeys.admin, 'listing-stats'] as const,
  
  // Reference data
  referenceDataAll: () => [...queryKeys.referenceData] as const,
  makes: () => [...queryKeys.referenceData, 'makes'] as const,
  models: (makeId?: string) => 
    makeId 
      ? [...queryKeys.referenceData, 'models', makeId] as const
      : [...queryKeys.referenceData, 'models'] as const,
  bodyTypes: () => [...queryKeys.referenceData, 'body-types'] as const,
  fuelTypes: () => [...queryKeys.referenceData, 'fuel-types'] as const,
  transmissions: () => [...queryKeys.referenceData, 'transmissions'] as const,
  colours: () => [...queryKeys.referenceData, 'colours'] as const,
} as const

/**
 * Helper functions for query invalidation
 */
export const queryInvalidation = {
  // Invalidate all listings queries
  invalidateAllListings: () => queryKeys.listingsAll(),
  
  // Invalidate listings with specific filters
  invalidateListingsWithFilters: (filters: Partial<FilterOptions>, limit: number, sortOrder: SortOrder) =>
    queryKeys.listingsWithFilters(filters, limit, sortOrder),
  
  // Invalidate all reference data
  invalidateAllReferenceData: () => queryKeys.referenceDataAll(),
  
  // Invalidate specific reference data
  invalidateMakes: () => queryKeys.makes(),
  invalidateModels: (makeId?: string) => queryKeys.models(makeId),
} as const