/**
 * Unit Tests for Listing Events (listing.ts)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMockAnalytics, testSetup, testHelpers } from './test-utils'

const mockAnalytics = createMockAnalytics()

// Mock analytics core
vi.mock('../mp', () => ({
  analytics: mockAnalytics,
}))

// Mock schema validators to no-op
vi.mock('../schema', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    validateListingViewOrWarn: vi.fn(),
    validateListingClickOrWarn: vi.fn(),
  }
})

// Mock pageview session getter
const mockGetCurrentResultsSessionId = vi.fn(() => 'rs_1704067300_def456')
vi.mock('../pageview', () => ({
  getCurrentResultsSessionId: mockGetCurrentResultsSessionId,
}))

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0,
  clear: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
})

const { trackListingView, trackListingClick, shouldTrackListingView, resetListingImpressionDedup } = await import('../listing')

describe('Listing Events (listing.ts)', () => {
  beforeEach(() => {
    testSetup.beforeEach()
    vi.clearAllMocks()
    mockAnalytics.hasConsent.mockReturnValue(true)
    
    // Reset dedup state and sessionStorage mock
    resetListingImpressionDedup()
    mockGetCurrentResultsSessionId.mockReturnValue('rs_1704067300_def456')
    mockSessionStorage.getItem.mockReturnValue(null)
    mockSessionStorage.setItem.mockImplementation(() => {})
    mockSessionStorage.removeItem.mockImplementation(() => {})
  })

  afterEach(() => {
    testSetup.afterEach()
  })

  it('should not track without consent', () => {
    mockAnalytics.hasConsent.mockReturnValue(false)
    trackListingView({ listingId: 'abc-123' })
    trackListingClick({ listingId: 'abc-123' })
    expect(mockAnalytics.track).not.toHaveBeenCalled()
  })

  it('should track listing_view with basic props', () => {
    trackListingView({ listingId: 'abc-123', position: 3, priceMonthly: 4200, leaseScore: 85, container: 'results_grid' })

    const call = testHelpers.getLastCall(mockAnalytics.track)
    expect(call[0]).toBe('listing_view')
    expect(call[1]).toMatchObject({
      listing_id: 'abc-123',
      position: 3,
      price_dkk: 4200,
      lease_score: 85,
      lease_score_band: 'excellent',
      results_session_id: 'rs_1704067300_def456',
      container: 'results_grid',
      session_id: expect.stringMatching(/^s_\d+_[a-z0-9]+$/),
      device_type: 'desktop',
    })
  })

  it('should track listing_click and return source_event_id', () => {
    const clickId = trackListingClick({ listingId: 'abc-123', position: 1, priceMonthly: 3999, leaseScore: 70, entryMethod: 'internal_grid_click' })
    expect(clickId).toMatch(/^[0-9a-f\-]{36}$/)

    const call = testHelpers.getLastCall(mockAnalytics.track)
    expect(call[0]).toBe('listing_click')
    expect(call[1]).toMatchObject({
      listing_id: 'abc-123',
      entry_method: 'internal_grid_click',
      position: 1,
      price_dkk: 3999,
      lease_score: 70,
      lease_score_band: 'good',
      source_event_id: clickId,
      results_session_id: 'rs_1704067300_def456',
      session_id: expect.stringMatching(/^s_\d+_[a-z0-9]+$/),
      device_type: 'desktop',
    })
  })
})

describe('Listing View Deduplication', () => {
  beforeEach(() => {
    // Additional reset specifically for deduplication tests
    resetListingImpressionDedup()
    mockGetCurrentResultsSessionId.mockReturnValue('rs_1704067300_def456')
    mockAnalytics.getSessionId.mockReturnValue('analytics_session_1')
    mockSessionStorage.getItem.mockReturnValue(null)
  })

  describe('Basic Deduplication', () => {
    it('should track first impression for a listing', () => {
      const result = shouldTrackListingView('listing_123', 'results_grid')
      
      expect(result).toBe(true)
    })

    it('should not track duplicate impression for same (rsid, listing_id, container)', () => {
      // Reset state to ensure clean test
      resetListingImpressionDedup()
      
      // First impression
      const firstResult = shouldTrackListingView('listing_123', 'results_grid')
      expect(firstResult).toBe(true)
      
      // Duplicate impression - should not track
      const secondResult = shouldTrackListingView('listing_123', 'results_grid')
      expect(secondResult).toBe(false)
    })

    it('should track same listing in different containers independently', () => {
      // Reset state to ensure clean test
      resetListingImpressionDedup()
      
      // Track in results grid
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      
      // Same listing in similar grid should be tracked
      expect(shouldTrackListingView('listing_123', 'similar_grid')).toBe(true)
      
      // Carousel context should also be tracked
      expect(shouldTrackListingView('listing_123', 'carousel')).toBe(true)
      
      // But duplicates in each context should not be tracked
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
      expect(shouldTrackListingView('listing_123', 'similar_grid')).toBe(false)
      expect(shouldTrackListingView('listing_123', 'carousel')).toBe(false)
    })
  })

  describe('Results Session ID Changes', () => {
    it('should allow re-impression when results session ID changes', () => {
      // First impression with initial RSID
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
      
      // Change results session ID (e.g., due to filter/sort change)
      mockGetCurrentResultsSessionId.mockReturnValue('rs_new_session')
      
      // Should allow tracking again with new RSID
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
    })

    it('should not track when RSID is not ready', () => {
      // No RSID available yet
      mockGetCurrentResultsSessionId.mockReturnValue(null)
      
      // Should not track or mark as seen
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
      
      // When RSID becomes available
      mockGetCurrentResultsSessionId.mockReturnValue('rs_1704067300_def456')
      
      // Should now track (wasn't marked as seen before)
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
    })
  })

  describe('Analytics Session TTL Rollover', () => {
    it('should clear all dedup state when analytics session changes', () => {
      // Track with first analytics session
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_456', 'similar_grid')).toBe(true)
      
      // Verify duplicates are blocked
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
      expect(shouldTrackListingView('listing_456', 'similar_grid')).toBe(false)
      
      // Analytics session changes (TTL rollover)
      mockAnalytics.getSessionId.mockReturnValue('new_analytics_session')
      
      // Should clear all dedup state and allow re-tracking
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_456', 'similar_grid')).toBe(true)
    })
  })

  describe('SessionStorage Persistence', () => {
    it('should load existing seen listings from sessionStorage', () => {
      // Mock existing data in sessionStorage
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'lv_seen_rs_rs_1704067300_def456_results_grid') {
          return JSON.stringify(['listing_123', 'listing_456'])
        }
        return null
      })
      
      // Should not track already seen listings
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
      expect(shouldTrackListingView('listing_456', 'results_grid')).toBe(false)
      
      // But should track new listings
      expect(shouldTrackListingView('listing_789', 'results_grid')).toBe(true)
    })

    it('should save seen listings to sessionStorage', () => {
      shouldTrackListingView('listing_123', 'results_grid')
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'lv_seen_rs_rs_1704067300_def456_results_grid',
        JSON.stringify(['listing_123'])
      )
    })

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage error
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded')
      })
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Read error')
      })
      
      // Should still work without sessionStorage
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty listing IDs', () => {
      expect(shouldTrackListingView('', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('', 'results_grid')).toBe(false)
    })

    it('should use default container when not specified', () => {
      expect(shouldTrackListingView('listing_123')).toBe(true)
      expect(shouldTrackListingView('listing_123')).toBe(false)
      
      // Explicit results_grid should be the same as default
      expect(shouldTrackListingView('listing_456', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_456')).toBe(false) // Should be blocked
    })
  })

  describe('Reset Functionality', () => {
    it('should reset all dedup state', () => {
      // Track some impressions
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_456', 'similar_grid')).toBe(true)
      
      // Verify they're blocked
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(false)
      expect(shouldTrackListingView('listing_456', 'similar_grid')).toBe(false)
      
      // Reset
      resetListingImpressionDedup()
      
      // Should allow tracking again
      expect(shouldTrackListingView('listing_123', 'results_grid')).toBe(true)
      expect(shouldTrackListingView('listing_456', 'similar_grid')).toBe(true)
    })
  })
})

