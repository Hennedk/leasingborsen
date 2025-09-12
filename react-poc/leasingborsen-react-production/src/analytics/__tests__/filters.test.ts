/**
 * Filter Tracking Tests
 * 
 * Comprehensive test suite for filters_change and filters_apply events
 * including debouncing, session management, and validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  trackFiltersChange, 
  trackFiltersApply, 
  getResultsSessionId,
  resetFilterTracking,
  computeSearchFingerprint,
  checkAndResetSession,
  getAccurateLatency,
  trackOverlayOpen,
  trackOverlayClose,
  createOverlaySession,
  type FiltersChangeParams,
  type FiltersApplyParams
} from '../filters'

// Mock the analytics module
vi.mock('../mp', () => ({
  analytics: {
    hasConsent: vi.fn(() => true),
    getSessionId: vi.fn(() => 's_1234567890_abc123'),
    getDeviceType: vi.fn(() => 'desktop'),
    getReferrerHost: vi.fn(() => 'google.com'),
    track: vi.fn()
  }
}))

// Mock schema validation
vi.mock('../schema', () => ({
  validateFiltersChangeOrWarn: vi.fn(),
  validateFiltersApplyOrWarn: vi.fn(),
  validateFiltersOverlayOpenOrWarn: vi.fn(),
  validateFiltersOverlayCloseOrWarn: vi.fn()
}))

describe('Filter Tracking', () => {
  let mockAnalytics: any
  
  beforeAll(async () => {
    // Get reference to mocked analytics
    const mpModule = await import('../mp')
    mockAnalytics = vi.mocked(mpModule.analytics)
  })
  
  beforeEach(() => {
    vi.clearAllMocks()
    resetFilterTracking()
    // Mock Date.now for consistent testing
    vi.spyOn(Date, 'now').mockReturnValue(1704067200000)
    // Mock Math.random for consistent session IDs
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
    
    // Reset analytics mock methods to default returns
    mockAnalytics.hasConsent.mockReturnValue(true)
    mockAnalytics.getSessionId.mockReturnValue('s_1234567890_abc123')
    mockAnalytics.getDeviceType.mockReturnValue('desktop')
    mockAnalytics.getReferrerHost.mockReturnValue('google.com')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Session Management', () => {
    it('should generate results session ID', () => {
      const sessionId = getResultsSessionId()
      expect(sessionId).toMatch(/^rs_\d+_[a-z0-9]+$/)
    })

    it('should reuse same results session ID', () => {
      const sessionId1 = getResultsSessionId()
      const sessionId2 = getResultsSessionId()
      expect(sessionId1).toBe(sessionId2)
    })

    it('should reset session when fingerprint changes', () => {
      const sessionId1 = getResultsSessionId()
      
      // Mock Math.random to return a different value for the new session
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.987654321)
      
      const changed = checkAndResetSession('different_fingerprint')
      const sessionId2 = getResultsSessionId()
      
      expect(changed).toBe(true)
      expect(sessionId1).not.toBe(sessionId2)
    })

    it('should not reset session for same fingerprint', () => {
      const sessionId1 = getResultsSessionId()
      const changed1 = checkAndResetSession('fingerprint1')
      const changed2 = checkAndResetSession('fingerprint1')
      const sessionId2 = getResultsSessionId()
      
      expect(changed1).toBe(true) // First time sets it
      expect(changed2).toBe(false) // Same fingerprint
      expect(sessionId1).toBe(sessionId2)
    })
  })

  describe('Search Fingerprint', () => {
    it('should create stable fingerprint for same filters', () => {
      const filters1 = { makes: ['BMW'], fuel_type: ['ev'], price_max: 5000 }
      const filters2 = { makes: ['BMW'], fuel_type: ['ev'], price_max: 5000 }
      
      const fingerprint1 = computeSearchFingerprint(filters1)
      const fingerprint2 = computeSearchFingerprint(filters2)
      
      expect(fingerprint1).toBe(fingerprint2)
    })

    it('should create different fingerprint for different filters', () => {
      const filters1 = { makes: ['BMW'], fuel_type: ['ev'] }
      const filters2 = { makes: ['BMW'], fuel_type: ['ice'] }
      
      const fingerprint1 = computeSearchFingerprint(filters1)
      const fingerprint2 = computeSearchFingerprint(filters2)
      
      expect(fingerprint1).not.toBe(fingerprint2)
    })

    it('should handle array order consistently', () => {
      const filters1 = { makes: ['BMW', 'Audi'], fuel_type: ['ev', 'ice'] }
      const filters2 = { makes: ['Audi', 'BMW'], fuel_type: ['ice', 'ev'] }
      
      const fingerprint1 = computeSearchFingerprint(filters1)
      const fingerprint2 = computeSearchFingerprint(filters2)
      
      expect(fingerprint1).toBe(fingerprint2)
    })

    it('should normalize string values', () => {
      const filters1 = { makes: ['BMW'], fuel_type: ['EV'] }
      const filters2 = { makes: ['bmw'], fuel_type: ['ev'] }
      
      const fingerprint1 = computeSearchFingerprint(filters1)
      const fingerprint2 = computeSearchFingerprint(filters2)
      
      expect(fingerprint1).toBe(fingerprint2)
    })

    it('should ignore null and empty values', () => {
      const filters1 = { makes: ['BMW'], price_min: null, price_max: undefined }
      const filters2 = { makes: ['BMW'] }
      
      const fingerprint1 = computeSearchFingerprint(filters1)
      const fingerprint2 = computeSearchFingerprint(filters2)
      
      expect(fingerprint1).toBe(fingerprint2)
    })
  })

  describe('filters_change Event', () => {
    const baseParams: FiltersChangeParams = {
      filter_key: 'fuel_type',
      filter_action: 'add',
      filter_value: 'ev',
      previous_value: null,
      filter_method: 'checkbox',
      total_active_filters: 1,
      results_session_id: 'rs_test_123'
    }

    it('should track filter change immediately for checkbox', () => {
      trackFiltersChange(baseParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_change', expect.objectContaining({
        filter_key: 'fuel_type',
        filter_action: 'add',
        filter_value: 'ev',
        filter_method: 'checkbox'
      }))
    })

    it('should debounce slider changes', async () => {
      const sliderParams = {
        ...baseParams,
        filter_key: 'price_max' as const,
        filter_method: 'slider' as const,
        filter_value: 5000
      }
      
      // Trigger multiple rapid changes
      trackFiltersChange({ ...sliderParams, filter_value: 3000 })
      trackFiltersChange({ ...sliderParams, filter_value: 4000 })
      trackFiltersChange({ ...sliderParams, filter_value: 5000 })
      
      // Should not track immediately
      expect(mockAnalytics.track).not.toHaveBeenCalled()
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 450))
      
      // Should track only the final value
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_change', expect.objectContaining({
        filter_value: 5000
      }))
    })

    it('should skip tracking without consent', () => {
      mockAnalytics.hasConsent.mockReturnValue(false)
      
      trackFiltersChange(baseParams)
      
      expect(mockAnalytics.track).not.toHaveBeenCalled()
    })

    it('should skip duplicate changes within window', () => {
      // Set up a different mock for Date.now to simulate time passing
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1704067200000) // First call
        .mockReturnValueOnce(1704067200500) // 500ms later (within window)
      
      trackFiltersChange(baseParams)
      trackFiltersChange({ ...baseParams, previous_value: 'ev' }) // Same value
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })

    it('should include all required fields', () => {
      trackFiltersChange(baseParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_change', expect.objectContaining({
        schema_version: '1',
        session_id: 's_1234567890_abc123',
        device_type: 'desktop',
        path: '/',
        referrer_host: 'google.com',
        results_session_id: 'rs_test_123',
        filter_key: 'fuel_type',
        filter_action: 'add',
        filter_value: 'ev',
        previous_value: null,
        filter_method: 'checkbox',
        total_active_filters: 1
      }))
    })

    it('should sanitize filter values', () => {
      const params = {
        ...baseParams,
        filter_value: ['BMW', 'Audi'],
        previous_value: ['bmw']
      }
      
      trackFiltersChange(params)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_change', expect.objectContaining({
        filter_value: 'audi,bmw', // Sorted and lowercased
        previous_value: 'bmw'
      }))
    })
  })

  describe('filters_apply Event', () => {
    const baseParams: FiltersApplyParams = {
      results_session_id: 'rs_test_123',
      filters_applied: { fuel_type: 'ev', price_max: 5000 },
      filters_count: 2,
      changed_filters: ['fuel_type', 'price_max'],
      changed_keys_count: 2,
      apply_trigger: 'auto',
      previous_results_count: 100,
      results_count: 50,
      results_delta: -50,
      is_zero_results: false,
      latency_ms: 420
    }

    it('should track filter apply event', () => {
      trackFiltersApply(baseParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_apply', expect.objectContaining({
        results_session_id: 'rs_test_123',
        filters_count: 2,
        changed_keys_count: 2,
        results_delta: -50,
        is_zero_results: false,
        latency_ms: 420
      }))
    })

    it('should skip no-op applications', () => {
      const noOpParams = {
        ...baseParams,
        changed_keys_count: 0,
        results_delta: 0,
        apply_trigger: 'auto' as const
      }
      
      trackFiltersApply(noOpParams)
      
      expect(mockAnalytics.track).not.toHaveBeenCalled()
    })

    it('should track reset button even with no changes', () => {
      const resetParams = {
        ...baseParams,
        changed_keys_count: 0,
        results_delta: 0,
        apply_trigger: 'reset_button' as const
      }
      
      trackFiltersApply(resetParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })

    it('should track zero results', () => {
      const zeroResultsParams = {
        ...baseParams,
        results_count: 0,
        results_delta: -100,
        is_zero_results: true
      }
      
      trackFiltersApply(zeroResultsParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_apply', expect.objectContaining({
        results_count: 0,
        is_zero_results: true,
        results_delta: -100
      }))
    })

    it('should round numeric values', () => {
      const floatParams = {
        ...baseParams,
        filters_count: 2.7,
        changed_keys_count: 1.9,
        previous_results_count: 99.3,
        results_count: 49.8,
        results_delta: -49.4,
        latency_ms: 419.6
      }
      
      trackFiltersApply(floatParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_apply', expect.objectContaining({
        filters_count: 3,
        changed_keys_count: 2,
        previous_results_count: 99,
        results_count: 50,
        results_delta: -49,
        latency_ms: 420
      }))
    })

    it('should include all required fields', () => {
      trackFiltersApply(baseParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_apply', expect.objectContaining({
        schema_version: '1',
        session_id: 's_1234567890_abc123',
        device_type: 'desktop',
        path: '/',
        referrer_host: 'google.com',
        results_session_id: 'rs_test_123',
        filters_applied: { fuel_type: 'ev', price_max: 5000 },
        filters_count: 2,
        changed_filters: ['fuel_type', 'price_max'],
        changed_keys_count: 2,
        apply_trigger: 'auto',
        previous_results_count: 100,
        results_count: 50,
        results_delta: -50,
        is_zero_results: false,
        latency_ms: 420
      }))
    })
  })

  describe('Error Handling', () => {
    it('should handle analytics errors gracefully in filters_change', () => {
      mockAnalytics.track.mockImplementation(() => {
        throw new Error('Analytics error')
      })
      
      expect(() => {
        trackFiltersChange({
          filter_key: 'fuel_type',
          filter_action: 'add',
          filter_value: 'ev',
          filter_method: 'checkbox',
          total_active_filters: 1,
          results_session_id: 'rs_test_123'
        })
      }).not.toThrow()
    })

    it('should handle analytics errors gracefully in filters_apply', () => {
      mockAnalytics.track.mockImplementation(() => {
        throw new Error('Analytics error')
      })
      
      expect(() => {
        trackFiltersApply({
          results_session_id: 'rs_test_123',
          filters_applied: {},
          filters_count: 0,
          changed_filters: [],
          changed_keys_count: 1, // Force non-no-op
          apply_trigger: 'auto',
          previous_results_count: 0,
          results_count: 0,
          results_delta: 0,
          is_zero_results: true,
          latency_ms: 100
        })
      }).not.toThrow()
    })
  })

  describe('resetFilterTracking', () => {
    it('should clear all tracking state', () => {
      // Set up some state
      getResultsSessionId()
      checkAndResetSession('fingerprint1')
      
      // Reset
      resetFilterTracking()
      
      // Should generate new session
      const newSessionId = getResultsSessionId()
      expect(newSessionId).toMatch(/^rs_\d+_[a-z0-9]+$/)
    })
  })

  describe('Enhanced Filter Apply Guards', () => {
    it('should drop stale filters_apply when fingerprint mismatch', () => {
      // Set up a session with known fingerprint
      checkAndResetSession('current_fingerprint')
      
      const baseParams = {
        results_session_id: getResultsSessionId(),
        filters_applied: { makes: 'BMW' },
        filters_count: 1,
        changed_filters: ['makes'],
        changed_keys_count: 1,
        apply_trigger: 'auto' as const,
        previous_results_count: 0,
        results_count: 5,
        results_delta: 5,
        is_zero_results: false,
        latency_ms: 100
      }
      
      // Call with stale fingerprint (should be dropped)
      trackFiltersApply(baseParams, 'stale_fingerprint')
      
      // Should not have tracked the event
      expect(mockAnalytics.track).not.toHaveBeenCalled()
    })

    it('should allow filters_apply when fingerprint matches', () => {
      // Set up a session with known fingerprint
      checkAndResetSession('current_fingerprint')
      
      const baseParams = {
        results_session_id: getResultsSessionId(),
        filters_applied: { makes: 'BMW' },
        filters_count: 1,
        changed_filters: ['makes'],
        changed_keys_count: 1,
        apply_trigger: 'auto' as const,
        previous_results_count: 0,
        results_count: 5,
        results_delta: 5,
        is_zero_results: false,
        latency_ms: 100
      }
      
      // Call with matching fingerprint (should track)
      trackFiltersApply(baseParams, 'current_fingerprint')
      
      // Should have tracked the event
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_apply', expect.any(Object))
    })

    it('should skip advanced no-op when state matches lastSettledState', () => {
      // First call to establish lastSettledState
      const firstParams = {
        results_session_id: getResultsSessionId(),
        filters_applied: { makes: 'BMW' },
        filters_count: 1,
        changed_filters: ['makes'],
        changed_keys_count: 1,
        apply_trigger: 'auto' as const,
        previous_results_count: 0,
        results_count: 5,
        results_delta: 5,
        is_zero_results: false,
        latency_ms: 100
      }
      
      trackFiltersApply(firstParams, 'test_fingerprint')
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
      
      // Second call with same fingerprint and results (should be no-op)
      const noOpParams = {
        ...firstParams,
        changed_keys_count: 0, // Different change count
        results_delta: 0, // No change in results
        apply_trigger: 'auto' as const
      }
      
      trackFiltersApply(noOpParams, 'test_fingerprint')
      
      // Should not track second event (no-op detected)
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accurate Latency Measurement', () => {
    it('should return accurate latency from lastCommittedChangeAt', () => {
      vi.useFakeTimers()
      
      const startTime = 1704067200000
      vi.setSystemTime(startTime)
      
      // Simulate a filter change being committed
      trackFiltersChange({
        filter_key: 'makes',
        filter_action: 'add',
        filter_value: 'BMW',
        previous_value: null,
        filter_method: 'dropdown',
        total_active_filters: 1,
        results_session_id: getResultsSessionId()
      })
      
      // Wait for debounce (dropdown should track immediately, but let's advance time to be sure)
      vi.advanceTimersByTime(100)
      
      // Move forward in time and get latency
      const latencyCheckTime = startTime + 1200
      vi.setSystemTime(latencyCheckTime)
      
      const latency = getAccurateLatency()
      
      // Should return time from when change was committed to now
      expect(latency).toBeGreaterThan(0)
      expect(latency).toBeLessThanOrEqual(1200)
      
      vi.useRealTimers()
    })

    it('should return 0 when no changes have been committed', () => {
      const latency = getAccurateLatency()
      expect(latency).toBe(0)
    })
  })

  describe('Overlay Session Management', () => {
    it('should create unique overlay session IDs', () => {
      // Mock different random values for unique IDs
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.123456789)
        .mockReturnValueOnce(0.987654321)
      
      const session1 = createOverlaySession()
      const session2 = createOverlaySession()
      
      expect(session1.overlayId).toMatch(/^ov_\d+_[a-z0-9]+$/)
      expect(session2.overlayId).toMatch(/^ov_\d+_[a-z0-9]+$/)
      expect(session1.overlayId).not.toBe(session2.overlayId)
      expect(typeof session1.openTime).toBe('number')
      expect(typeof session2.openTime).toBe('number')
    })

    it('should track overlay open with correct parameters', () => {
      const overlaySession = createOverlaySession()
      const resultsSessionId = getResultsSessionId()
      
      trackOverlayOpen({
        results_session_id: resultsSessionId,
        overlay_id: overlaySession.overlayId,
        entry_surface: 'toolbar',
        initial_filters: { makes: 'BMW', fuel_type: 'ev' }
      })
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_overlay_open', expect.objectContaining({
        results_session_id: resultsSessionId,
        overlay_id: overlaySession.overlayId,
        entry_surface: 'toolbar',
        initial_filters: { makes: 'BMW', fuel_type: 'ev' }
      }))
    })

    it('should track overlay close with dwell time and changes', () => {
      const overlaySession = createOverlaySession()
      const resultsSessionId = getResultsSessionId()
      
      trackOverlayClose({
        results_session_id: resultsSessionId,
        overlay_id: overlaySession.overlayId,
        dwell_ms: 5000,
        changed_keys_count: 2,
        changed_filters: ['makes', 'fuel_type'],
        close_reason: 'apply_button',
        had_pending_request: false
      })
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_overlay_close', expect.objectContaining({
        results_session_id: resultsSessionId,
        overlay_id: overlaySession.overlayId,
        dwell_ms: 5000,
        changed_keys_count: 2,
        changed_filters: ['makes', 'fuel_type'],
        close_reason: 'apply_button'
      }))
    })

    it('should include overlay_id in filters_apply when provided', () => {
      const overlaySession = createOverlaySession()
      
      const applyParams = {
        results_session_id: getResultsSessionId(),
        filters_applied: { makes: 'BMW' },
        filters_count: 1,
        changed_filters: ['makes'],
        changed_keys_count: 1,
        apply_trigger: 'auto' as const,
        previous_results_count: 0,
        results_count: 5,
        results_delta: 5,
        is_zero_results: false,
        latency_ms: 100,
        overlay_id: overlaySession.overlayId
      }
      
      trackFiltersApply(applyParams)
      
      expect(mockAnalytics.track).toHaveBeenCalledWith('filters_apply', expect.objectContaining({
        overlay_id: overlaySession.overlayId
      }))
    })
  })

  describe('Per-Key Deduplication', () => {
    it('should allow different filters with same value', () => {
      const baseParams = {
        filter_action: 'add' as const,
        filter_value: 'BMW',
        previous_value: null,
        total_active_filters: 1,
        results_session_id: getResultsSessionId()
      }
      
      // Track same value on different filters
      trackFiltersChange({ ...baseParams, filter_key: 'makes', filter_method: 'dropdown' })
      trackFiltersChange({ ...baseParams, filter_key: 'models', filter_method: 'dropdown' })
      
      expect(mockAnalytics.track).toHaveBeenCalledTimes(2)
    })

    it('should block duplicate changes on same key within window', () => {
      const baseParams = {
        filter_key: 'makes' as const,
        filter_action: 'add' as const,
        filter_value: 'BMW',
        previous_value: null,
        filter_method: 'dropdown' as const,
        total_active_filters: 1,
        results_session_id: getResultsSessionId()
      }
      
      // First call should track
      trackFiltersChange(baseParams)
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
      
      // Second call with same key+method+value within window should be blocked
      trackFiltersChange(baseParams)
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1) // Still 1, not 2
    })

    it('should allow same filter change after window expires', () => {
      vi.useFakeTimers()
      
      const baseParams = {
        filter_key: 'makes' as const,
        filter_action: 'add' as const,
        filter_value: 'BMW',
        previous_value: null,
        filter_method: 'dropdown' as const,
        total_active_filters: 1,
        results_session_id: getResultsSessionId()
      }
      
      // First call
      trackFiltersChange(baseParams)
      expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
      
      // Advance time beyond duplicate window (1000ms)
      vi.advanceTimersByTime(1100)
      
      // Second call should now be allowed
      trackFiltersChange(baseParams)
      expect(mockAnalytics.track).toHaveBeenCalledTimes(2)
      
      vi.useRealTimers()
    })
  })
})