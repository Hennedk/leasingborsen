/**
 * Unit Tests for Page View Tracking (pageview.ts)
 * 
 * Tests de-duplication, canonicalization, search fingerprinting, and context building
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMockAnalytics, testSetup, testHelpers, testFixtures } from './test-utils'
import type { PageViewContext } from '../pageview'

// Create mock analytics instance
const mockAnalytics = createMockAnalytics()

// Mock the analytics module before importing pageview
vi.mock('../mp', () => ({
  analytics: mockAnalytics,
}))

// Mock validation to avoid Zod in tests
vi.mock('../schema', () => ({
  validatePageViewOrWarn: vi.fn(),
}))

// Import pageview functions after mocking
const { trackPageView, resetResultsSession } = await import('../pageview')

describe('PageView Tracking (pageview.ts)', () => {
  beforeEach(() => {
    testSetup.beforeEach()
    vi.clearAllMocks()
    mockAnalytics.hasConsent.mockReturnValue(true)
    resetResultsSession()
  })

  afterEach(() => {
    testSetup.afterEach()
  })

  describe('Basic Tracking', () => {
    it('should not track when no consent', () => {
      mockAnalytics.hasConsent.mockReturnValue(false)
      
      trackPageView(testFixtures.contexts.home)
      
      expect(mockAnalytics.track).not.toHaveBeenCalled()
    })

    it('should track home page view', () => {
      trackPageView(testFixtures.contexts.home)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('page_view', expect.objectContaining({
        schema_version: '1',
        page_type: 'home',
        path: '/',
        page_name: 'Homepage',
        session_id: expect.stringMatching(/^s_\d+_[a-z0-9]+$/),
        device_type: 'desktop',
        page_load_type: 'cold',
      }))
    })

    it('should track results page with context', () => {
      trackPageView(testFixtures.contexts.results)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      expect(call).toBeTruthy()
      expect(call[0]).toBe('page_view')
      
      const event = call[1]
      expect(event).toMatchObject({
        page_type: 'results',
        path: '/listings',
        results_session_id: expect.stringMatching(/^rs_\d+_[a-z0-9]+$/),
        results_count: 24,
        latency_ms: 450,
        filters_active: expect.objectContaining({
          make: 'bmw', // Should be lowercase normalized
          fuel_type: 'ev',
          price_max: 5000,
        }),
      })
    })

    it('should track listing detail page with context', () => {
      trackPageView(testFixtures.contexts.listingDetail)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      expect(call).toBeTruthy()
      
      const event = call[1]
      expect(event).toMatchObject({
        page_type: 'listing_detail',
        path: '/listing/abc-123-def-456',
        listing_id: 'abc-123-def-456',
        lease_score: 85,
        lease_score_band: 'excellent',
        price_dkk: 4200,
        mileage_km_per_year: 15000,
        term_months: 36,
        fuel_type: 'ev',
        entry_method: 'internal_grid_click',
      })
    })
  })

  describe('De-duplication Logic', () => {
    it('should prevent duplicate events within 200ms', () => {
      const context = testFixtures.contexts.home
      
      trackPageView(context)
      trackPageView(context) // Immediate duplicate
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })

    it('should allow same event after 200ms', () => {
      const context = testFixtures.contexts.home
      
      trackPageView(context)
      testHelpers.advanceTime(250)
      trackPageView(context)
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(2)
    })

    it('should dedupe based on canonical query parameters', () => {
      const context1: PageViewContext = {
        ...testFixtures.contexts.results,
        query: { make: 'BMW', fuel_type: 'ev', price_max: 5000 },
      }
      
      const context2: PageViewContext = {
        ...testFixtures.contexts.results,
        query: { fuel_type: 'EV', price_max: '5000', make: 'bmw' }, // Different order and types
      }
      
      trackPageView(context1)
      trackPageView(context2)
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })

    it('should track different pages separately', () => {
      trackPageView(testFixtures.contexts.home)
      trackPageView(testFixtures.contexts.results)
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(2)
    })
  })

  describe('Query Canonicalization', () => {
    it('should normalize query parameters consistently', () => {
      const testCases = [
        { make: 'BMW', fuel_type: 'ev', price_max: 5000 },
        { fuel_type: 'EV', make: 'bmw', price_max: '5000' },
        { price_max: 5000, make: 'BMW', fuel_type: 'Ev' },
      ]
      
      testCases.forEach((query, index) => {
        const context: PageViewContext = {
          ...testFixtures.contexts.results,
          query,
        }
        
        if (index > 0) testHelpers.advanceTime(50) // Within dedupe window
        trackPageView(context)
      })
      
      // All should be deduplicated to single call
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })

    it('should handle null and undefined query values', () => {
      const context1: PageViewContext = {
        ...testFixtures.contexts.results,
        query: { make: 'BMW', fuel_type: null, price_max: undefined },
      }
      
      const context2: PageViewContext = {
        ...testFixtures.contexts.results,
        query: { make: 'BMW' },
      }
      
      trackPageView(context1)
      testHelpers.advanceTime(50)
      trackPageView(context2)
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })
  })

  describe('Results Session Management', () => {
    it('should create new results session on first results page view', () => {
      trackPageView(testFixtures.contexts.results)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      const event = call[1]
      
      expect(event.results_session_id).toMatch(/^rs_\d+_[a-z0-9]+$/)
    })

    it('should maintain results session for same filters', () => {
      const context = testFixtures.contexts.results
      
      trackPageView(context)
      const firstSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      testHelpers.advanceTime(250)
      trackPageView(context)
      const secondSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      expect(firstSessionId).toBe(secondSessionId)
    })

    it('should create new session when significant filters change', () => {
      const context1 = testFixtures.contexts.results
      const context2: PageViewContext = {
        ...context1,
        filters: { ...context1.filters!, make: 'Audi' }, // Different make
      }
      
      trackPageView(context1)
      const firstSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      testHelpers.advanceTime(250)
      trackPageView(context2)
      const secondSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      expect(firstSessionId).not.toBe(secondSessionId)
    })

    it('should maintain session when only sort changes', () => {
      const context1 = testFixtures.contexts.results
      const context2: PageViewContext = {
        ...context1,
        filters: { ...context1.filters!, sort_option: 'price_asc' },
      }
      
      trackPageView(context1)
      const firstSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      testHelpers.advanceTime(250)
      trackPageView(context2)
      const secondSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      expect(firstSessionId).toBe(secondSessionId)
    })

    it('should handle array filters consistently', () => {
      const context1: PageViewContext = {
        ...testFixtures.contexts.results,
        filters: { make: ['BMW', 'Audi'], fuel_type: 'ev' },
      }
      
      const context2: PageViewContext = {
        ...testFixtures.contexts.results,
        filters: { make: ['Audi', 'BMW'], fuel_type: 'ev' }, // Same but different order
      }
      
      trackPageView(context1)
      const firstSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      testHelpers.advanceTime(250)
      trackPageView(context2)
      const secondSessionId = testHelpers.getLastCall(mockAnalytics.track)[1].results_session_id
      
      expect(firstSessionId).toBe(secondSessionId)
    })
  })

  describe('Filter Processing', () => {
    it('should trim filters to whitelist only', () => {
      const context: PageViewContext = {
        ...testFixtures.contexts.results,
        filters: {
          make: 'BMW',
          fuel_type: 'ev',
          price_max: 5000,
          unknown_filter: 'should_be_removed',
          internal_param: 'also_removed',
        },
      }
      
      trackPageView(context)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      const event = call[1]
      
      expect(event.filters_active).toEqual({
        make: 'bmw',
        fuel_type: 'ev',
        price_max: 5000,
      })
      
      expect(event.filters_active).not.toHaveProperty('unknown_filter')
      expect(event.filters_active).not.toHaveProperty('internal_param')
    })

    it('should normalize filter values', () => {
      const context: PageViewContext = {
        ...testFixtures.contexts.results,
        filters: {
          make: 'BMW ',
          fuel_type: 'EV',
          body_type: ' SUV ',
          price_max: '5000',
        },
      }
      
      trackPageView(context)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      const event = call[1]
      
      expect(event.filters_active).toEqual({
        make: 'bmw',
        fuel_type: 'ev',
        body_type: 'suv',
        price_max: 5000,
      })
    })
  })

  describe('Context Building', () => {
    it('should include optional base properties when available', () => {
      mockAnalytics.getReferrerHost.mockReturnValue('google.com')
      
      const context: PageViewContext = {
        ...testFixtures.contexts.home,
        featureFlags: ['dark_mode', 'new_filters'],
      }
      
      trackPageView(context)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      const event = call[1]
      
      expect(event).toMatchObject({
        referrer_host: 'google.com',
        feature_flags: ['dark_mode', 'new_filters'],
      })
    })

    it('should convert lease score to band correctly', () => {
      const testCases = [
        { score: 85, band: 'excellent' },
        { score: 70, band: 'good' },
        { score: 50, band: 'fair' },
        { score: 30, band: 'weak' },
      ]
      
      testCases.forEach(({ score, band }, index) => {
        const context: PageViewContext = {
          ...testFixtures.contexts.listingDetail,
          listingId: `test-${index}`,
          leaseScore: score,
        }
        
        testHelpers.advanceTime(250)
        trackPageView(context)
        
        const call = testHelpers.getLastCall(mockAnalytics.track)
        const event = call[1]
        
        expect(event.lease_score_band).toBe(band)
      })
    })

    it('should normalize fuel type correctly', () => {
      const testCases = [
        { input: 'Electric', expected: 'ev' },
        { input: 'benzin', expected: 'ice' },
        { input: 'diesel', expected: 'ice' },
        { input: 'hybrid', expected: 'phev' },
        { input: 'unknown', expected: null },
      ]
      
      testCases.forEach(({ input, expected }, index) => {
        const context: PageViewContext = {
          ...testFixtures.contexts.listingDetail,
          listingId: `test-${index}`,
          fuelType: input,
        }
        
        testHelpers.advanceTime(250)
        trackPageView(context)
        
        const call = testHelpers.getLastCall(mockAnalytics.track)
        const event = call[1]
        
        if (expected) {
          expect(event.fuel_type).toBe(expected)
        } else {
          expect(event.fuel_type).toBeUndefined()
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle tracking errors gracefully', () => {
      mockAnalytics.track.mockImplementation(() => {
        throw new Error('Network error')
      })
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => trackPageView(testFixtures.contexts.home)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('[Analytics] Page view tracking failed:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle invalid contexts gracefully', () => {
      const invalidContext = {
        path: '',
        pageType: 'invalid' as any,
      }
      
      expect(() => trackPageView(invalidContext)).not.toThrow()
    })

    it('should handle missing session ID', () => {
      mockAnalytics.getSessionId.mockReturnValue('')
      
      expect(() => trackPageView(testFixtures.contexts.home)).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty query parameters', () => {
      const context: PageViewContext = {
        ...testFixtures.contexts.results,
        query: {},
        filters: {},
      }
      
      trackPageView(context)
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      const event = call[1]
      
      expect(event.query).toBeUndefined()
      expect(event.filters_active).toBeUndefined()
    })

    it('should handle very large filter objects', () => {
      const largeFilters: any = {}
      for (let i = 0; i < 1000; i++) {
        largeFilters[`param_${i}`] = `value_${i}`
      }
      
      const context: PageViewContext = {
        ...testFixtures.contexts.results,
        filters: largeFilters,
      }
      
      expect(() => trackPageView(context)).not.toThrow()
      
      const call = testHelpers.getLastCall(mockAnalytics.track)
      const event = call[1]
      
      // Should only include whitelisted keys
      const filterKeys = Object.keys(event.filters_active || {})
      expect(filterKeys.length).toBeLessThanOrEqual(8) // Max whitelist size
    })

    it('should handle concurrent tracking calls', () => {
      const promises = Array(10).fill(null).map((_, i) => 
        Promise.resolve().then(() => {
          const context = {
            ...testFixtures.contexts.home,
            path: `/page-${i}`,
          }
          trackPageView(context)
        })
      )
      
      expect(() => Promise.all(promises)).not.toThrow()
    })
  })
})