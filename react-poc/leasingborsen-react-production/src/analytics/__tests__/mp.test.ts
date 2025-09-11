/**
 * Unit Tests for Core Analytics (mp.ts)
 * 
 * Tests consent management, session handling, device detection, and page load type detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { testSetup, testHelpers, testFixtures } from './test-utils'

// Mock mixpanel-browser before importing analytics
const mockMixpanel = {
  init: vi.fn(),
  track: vi.fn(),
  opt_in_tracking: vi.fn(),
  opt_out_tracking: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  get_config: vi.fn().mockReturnValue('test-token'),
}

vi.mock('mixpanel-browser', () => ({
  default: mockMixpanel,
}))

// Import analytics after mocking
const { analytics } = await import('../mp')

describe('Analytics Core (mp.ts)', () => {
  beforeEach(() => {
    testSetup.beforeEach()
  })

  afterEach(() => {
    testSetup.afterEach()
  })

  describe('Consent Management', () => {
    it('should initialize with opt-out by default', () => {
      analytics.init({ token: 'test-token', eu: true })
      
      expect(mockMixpanel.init).toHaveBeenCalledWith('test-token', expect.objectContaining({
        api_host: 'https://api-eu.mixpanel.com',
      }))
      expect(mockMixpanel.opt_out_tracking).toHaveBeenCalled()
    })

    it('should not track events before consent', () => {
      analytics.init({ token: 'test-token', eu: true })
      analytics.track('test_event', { prop: 'value' })
      
      expect(mockMixpanel.track).not.toHaveBeenCalled()
    })

    it('should track events after granting consent', () => {
      analytics.init({ token: 'test-token', eu: true })
      analytics.grantConsent()
      analytics.track('test_event', { prop: 'value' })
      
      expect(mockMixpanel.opt_in_tracking).toHaveBeenCalled()
      expect(mockMixpanel.track).toHaveBeenCalledWith('test_event', expect.objectContaining({
        prop: 'value',
        session_id: expect.stringMatching(/^s_\d+_[a-z0-9]+$/),
      }))
    })

    it('should stop tracking after revoking consent', () => {
      analytics.init({ token: 'test-token', eu: true })
      analytics.grantConsent()
      analytics.revokeConsent()
      
      mockMixpanel.track.mockClear()
      analytics.track('test_event', { prop: 'value' })
      
      expect(mockMixpanel.opt_out_tracking).toHaveBeenCalledTimes(2) // Once on init, once on revoke
      expect(mockMixpanel.track).not.toHaveBeenCalled()
    })

    it('should identify user when consent granted with ID', () => {
      analytics.init({ token: 'test-token', eu: true })
      analytics.grantConsent('user-123', ['flag1', 'flag2'])
      
      expect(mockMixpanel.identify).toHaveBeenCalledWith('user-123')
      expect(mockMixpanel.register).toHaveBeenCalledWith(expect.objectContaining({
        feature_flags: ['flag1', 'flag2'],
      }))
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      analytics.init({ token: 'test-token', eu: true })
      analytics.grantConsent()
    })

    it('should generate session ID with correct format', () => {
      const sessionId = analytics.getSessionId()
      expect(sessionId).toMatch(/^s_\d+_[a-z0-9]+$/)
    })

    it('should maintain same session ID within TTL', () => {
      const sessionId1 = analytics.getSessionId()
      testHelpers.advanceTime(29 * 60 * 1000) // 29 minutes
      const sessionId2 = analytics.getSessionId()
      
      expect(sessionId1).toBe(sessionId2)
    })

    it('should create new session after TTL expires', () => {
      const sessionId1 = analytics.getSessionId()
      testHelpers.advanceTime(31 * 60 * 1000) // 31 minutes
      const sessionId2 = analytics.getSessionId()
      
      expect(sessionId1).not.toBe(sessionId2)
      expect(sessionId2).toMatch(/^s_\d+_[a-z0-9]+$/)
    })

    it('should update session activity on track', () => {
      const sessionId1 = analytics.getSessionId()
      
      // Advance to near TTL
      testHelpers.advanceTime(25 * 60 * 1000)
      
      // Track event (should update activity)
      analytics.track('test_event', {})
      
      // Advance more time (should still be same session due to activity update)
      testHelpers.advanceTime(10 * 60 * 1000) // Total 35 minutes, but only 10 since last activity
      
      const sessionId2 = analytics.getSessionId()
      expect(sessionId1).toBe(sessionId2)
    })
  })

  describe('Device Detection', () => {
    beforeEach(() => {
      analytics.init({ token: 'test-token', eu: true })
    })

    it('should detect desktop device', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true })
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true 
      })
      
      const deviceType = analytics.getDeviceType()
      expect(deviceType).toBe('desktop')
    })

    it('should detect mobile device by width', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true 
      })
      
      const deviceType = analytics.getDeviceType()
      expect(deviceType).toBe('mobile')
    })

    it('should detect tablet device', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true 
      })
      Object.defineProperty(window, 'ontouchstart', { value: true })
      
      const deviceType = analytics.getDeviceType()
      expect(deviceType).toBe('tablet')
    })
  })

  describe('Page Load Type Detection', () => {
    beforeEach(() => {
      analytics.init({ token: 'test-token', eu: true })
    })

    it('should detect SPA navigation when marked', () => {
      analytics.markAsSpaNavigation()
      const pageLoadType = analytics.getPageLoadType()
      expect(pageLoadType).toBe('spa')
    })

    it('should detect bfcache from pageshow event', () => {
      // Simulate pageshow event with persisted=true
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      
      const pageLoadType = analytics.getPageLoadType()
      expect(pageLoadType).toBe('bfcache')
    })

    it('should detect back_forward from Performance API', () => {
      testHelpers.mockPerformance({
        getEntriesByType: vi.fn((type: string) => {
          if (type === 'navigation') {
            return [{ type: 'back_forward' }]
          }
          return []
        }),
      })
      
      const pageLoadType = analytics.getPageLoadType()
      expect(pageLoadType).toBe('bfcache')
    })

    it('should detect reload from Performance API', () => {
      testHelpers.mockPerformance({
        getEntriesByType: vi.fn((type: string) => {
          if (type === 'navigation') {
            return [{ type: 'reload' }]
          }
          return []
        }),
      })
      
      const pageLoadType = analytics.getPageLoadType()
      expect(pageLoadType).toBe('warm')
    })

    it('should detect warm vs cold navigation based on DNS lookup', () => {
      // Warm load (DNS lookup skipped - cached)
      testHelpers.mockPerformance({
        getEntriesByType: vi.fn((type: string) => {
          if (type === 'navigation') {
            return [{
              type: 'navigate',
              domainLookupStart: 100,
              domainLookupEnd: 100, // Same time = cached DNS
            }]
          }
          return []
        }),
      })
      
      expect(analytics.getPageLoadType()).toBe('warm')
      
      // Cold load (DNS lookup performed)
      testHelpers.mockPerformance({
        getEntriesByType: vi.fn((type: string) => {
          if (type === 'navigation') {
            return [{
              type: 'navigate',
              domainLookupStart: 100,
              domainLookupEnd: 150, // Different times = DNS lookup
            }]
          }
          return []
        }),
      })
      
      expect(analytics.getPageLoadType()).toBe('cold')
    })

    it('should fallback to legacy Performance API', () => {
      // Mock legacy performance.navigation
      Object.defineProperty(window.performance, 'navigation', {
        value: { type: 1 }, // TYPE_RELOAD
        writable: true,
      })
      
      // Make modern API fail
      testHelpers.mockPerformance({
        getEntriesByType: vi.fn(() => { throw new Error('Not supported') }),
      })
      
      const pageLoadType = analytics.getPageLoadType()
      expect(pageLoadType).toBe('warm')
    })

    it('should default to cold when all detection fails', () => {
      // Remove all performance APIs
      Object.defineProperty(window, 'performance', {
        value: undefined,
        writable: true,
      })
      
      const pageLoadType = analytics.getPageLoadType()
      expect(pageLoadType).toBe('cold')
    })
  })

  describe('Referrer Detection', () => {
    beforeEach(() => {
      analytics.init({ token: 'test-token', eu: true })
    })

    it('should extract referrer host', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://google.com/search?q=test',
        writable: true,
      })
      
      const referrerHost = analytics.getReferrerHost()
      expect(referrerHost).toBe('google.com')
    })

    it('should return undefined for empty referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
      })
      
      const referrerHost = analytics.getReferrerHost()
      expect(referrerHost).toBeUndefined()
    })

    it('should handle invalid referrer URLs', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'invalid-url',
        writable: true,
      })
      
      const referrerHost = analytics.getReferrerHost()
      expect(referrerHost).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      analytics.init({ token: 'test-token', eu: true })
      analytics.grantConsent()
    })

    it('should handle tracking errors silently', () => {
      mockMixpanel.track.mockImplementation(() => {
        throw new Error('Network error')
      })
      
      // Should not throw
      expect(() => analytics.track('test_event', {})).not.toThrow()
    })

    it('should enforce payload size limits', () => {
      const largePayload = { data: 'x'.repeat(35000) } // > 32KB
      
      analytics.track('test_event', largePayload)
      
      expect(mockMixpanel.track).not.toHaveBeenCalled()
    })

    it('should handle consent revocation gracefully', () => {
      analytics.revokeConsent()
      
      // Should not throw even without proper initialization
      expect(() => analytics.track('test_event', {})).not.toThrow()
    })
  })

  describe('State Management', () => {
    it('should track initialization state', () => {
      expect(analytics.isInitialized()).toBe(false)
      
      analytics.init({ token: 'test-token', eu: true })
      expect(analytics.isInitialized()).toBe(true)
    })

    it('should track consent state', () => {
      analytics.init({ token: 'test-token', eu: true })
      expect(analytics.hasConsent()).toBe(false)
      
      analytics.grantConsent()
      expect(analytics.hasConsent()).toBe(true)
      
      analytics.revokeConsent()
      expect(analytics.hasConsent()).toBe(false)
    })

    it('should warn about duplicate initialization', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      analytics.init({ token: 'test-token', eu: true })
      analytics.init({ token: 'test-token', eu: true })
      
      expect(consoleSpy).toHaveBeenCalledWith('[Analytics] Already initialized')
      consoleSpy.mockRestore()
    })
  })
})