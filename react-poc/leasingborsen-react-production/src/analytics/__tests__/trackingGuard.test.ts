/**
 * Tests for URL-based pageview tracking guard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { trackPVIfNew, resetTrackingGuard, getGuardState } from '../trackingGuard'
import type { PageViewContext } from '../pageview'

// Mock the pageview module
vi.mock('../pageview', () => ({
  trackPageView: vi.fn()
}))

const mockTrackPageView = vi.mocked(await import('../pageview')).trackPageView

describe('URL-based tracking guard', () => {
  const mockContext: PageViewContext = {
    path: '/listings',
    query: { page: '1' },
    pageType: 'results'
  }

  beforeEach(() => {
    resetTrackingGuard()
    mockTrackPageView.mockClear()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('trackPVIfNew', () => {
    it('should track first pageview for a URL', () => {
      const result = trackPVIfNew('/listings?page=1', mockContext)
      
      expect(result).toBe(true)
      expect(mockTrackPageView).toHaveBeenCalledTimes(1)
      expect(mockTrackPageView).toHaveBeenCalledWith(mockContext)
    })

    it('should skip duplicate pageview for same URL within time window', () => {
      // First pageview
      trackPVIfNew('/listings?page=1', mockContext)
      
      // Duplicate within time window (< 500ms)
      vi.advanceTimersByTime(200)
      const result = trackPVIfNew('/listings?page=1', mockContext)
      
      expect(result).toBe(false)
      expect(mockTrackPageView).toHaveBeenCalledTimes(1) // Still only once
    })

    it('should track pageview for same URL after time window expires', () => {
      // First pageview
      trackPVIfNew('/listings?page=1', mockContext)
      
      // Same URL after time window expires (> 500ms)
      vi.advanceTimersByTime(600)
      const result = trackPVIfNew('/listings?page=1', mockContext)
      
      expect(result).toBe(true)
      expect(mockTrackPageView).toHaveBeenCalledTimes(2) // Tracked twice
    })

    it('should track pageview for different URLs immediately', () => {
      // First pageview
      trackPVIfNew('/listings?page=1', mockContext)
      
      // Different URL immediately
      const newContext = { ...mockContext, path: '/listings', query: { page: '2' } }
      const result = trackPVIfNew('/listings?page=2', newContext)
      
      expect(result).toBe(true)
      expect(mockTrackPageView).toHaveBeenCalledTimes(2) // Both tracked
    })

    it('should handle empty or undefined URLs', () => {
      const result1 = trackPVIfNew('', mockContext)
      const result2 = trackPVIfNew('', mockContext)
      
      expect(result1).toBe(true)
      expect(result2).toBe(false) // Second one is duplicate
      expect(mockTrackPageView).toHaveBeenCalledTimes(1)
    })

    it('should track complex URLs with query parameters correctly', () => {
      const url1 = '/listings?page=1&mdr=36&sort=lease_score_desc'
      const url2 = '/listings?page=1&mdr=24&sort=lease_score_desc'
      
      trackPVIfNew(url1, mockContext)
      const result = trackPVIfNew(url2, mockContext)
      
      expect(result).toBe(true)
      expect(mockTrackPageView).toHaveBeenCalledTimes(2) // Different URLs
    })
  })

  describe('resetTrackingGuard', () => {
    it('should reset guard state and allow tracking again', () => {
      // Track a pageview
      trackPVIfNew('/listings', mockContext)
      
      // Reset guard
      resetTrackingGuard()
      
      // Same URL should now track again
      const result = trackPVIfNew('/listings', mockContext)
      
      expect(result).toBe(true)
      expect(mockTrackPageView).toHaveBeenCalledTimes(2)
    })
  })

  describe('getGuardState', () => {
    it('should return initial state before any tracking', () => {
      const state = getGuardState()
      
      expect(state.lastHref).toBe(null)
      expect(state.lastTime).toBe(0)
    })

    it('should return current state after tracking', () => {
      const url = '/listings?page=1'
      const startTime = Date.now()
      
      trackPVIfNew(url, mockContext)
      const state = getGuardState()
      
      expect(state.lastHref).toBe(url)
      expect(state.lastTime).toBeGreaterThanOrEqual(startTime)
    })
  })

  describe('React StrictMode simulation', () => {
    it('should prevent duplicates from double mounting', () => {
      const url = '/listings?page=1'
      
      // Simulate first mount
      trackPVIfNew(url, mockContext)
      
      // Simulate second mount (StrictMode) - immediate
      trackPVIfNew(url, mockContext)
      
      // Only first one should track
      expect(mockTrackPageView).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple router subscriptions firing', () => {
      const url = '/listings?page=1'
      
      // Simulate multiple router onLoad events
      trackPVIfNew(url, mockContext)
      trackPVIfNew(url, mockContext) // Immediate duplicate
      
      vi.advanceTimersByTime(50)
      trackPVIfNew(url, mockContext) // Another duplicate within window
      
      // Only first one should track
      expect(mockTrackPageView).toHaveBeenCalledTimes(1)
    })
  })

  describe('Real-world navigation scenarios', () => {
    it('should handle navigation between different pages', () => {
      const homeContext = { ...mockContext, path: '/', pageType: 'home' as const }
      const listingsContext = { ...mockContext, path: '/listings', pageType: 'results' as const }
      
      // Navigate to home
      trackPVIfNew('/', homeContext)
      
      // Navigate to listings
      trackPVIfNew('/listings', listingsContext)
      
      // Navigate back to home
      trackPVIfNew('/', homeContext)
      
      // All should be tracked (different URLs)
      expect(mockTrackPageView).toHaveBeenCalledTimes(3)
    })

    it('should handle filter changes (different query params)', () => {
      // Initial load
      trackPVIfNew('/listings?page=1', mockContext)
      
      // Filter change
      trackPVIfNew('/listings?page=1&make=Toyota', mockContext)
      
      // Another filter change  
      trackPVIfNew('/listings?page=1&make=Toyota&model=Corolla', mockContext)
      
      // All should be tracked (different URLs)
      expect(mockTrackPageView).toHaveBeenCalledTimes(3)
    })
  })
})