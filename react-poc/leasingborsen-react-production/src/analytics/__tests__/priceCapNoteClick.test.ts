import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackPriceCapNoteClick } from '../listing'
import type { TrackPriceCapNoteClickParams } from '../listing'

// Mock the analytics module
vi.mock('../mp', () => ({
  analytics: {
    hasConsent: vi.fn(),
    track: vi.fn(),
    getSessionId: vi.fn(),
    getDeviceType: vi.fn(),
    getReferrerHost: vi.fn()
  }
}))

vi.mock('../pageview', () => ({
  getCurrentResultsSessionId: vi.fn(() => 'rs_1234567890_abc123')
}))

// Import the mocked analytics after mocking
import { analytics } from '../mp'
const mockAnalytics = analytics as any

describe('Price Cap Note Click Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAnalytics.hasConsent.mockReturnValue(true)
    mockAnalytics.getSessionId.mockReturnValue('s_1234567890_abc123')
    mockAnalytics.getDeviceType.mockReturnValue('desktop')
    mockAnalytics.getReferrerHost.mockReturnValue('example.com')
  })

  it('should track price cap note click with all required fields', () => {
    const params: TrackPriceCapNoteClickParams = {
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_best_fit',
      ideal_price: 3800,
      ideal_deposit: 35000,
      display_price: 4200,
      price_cap_delta: 400
    }

    trackPriceCapNoteClick(params)

    expect(mockAnalytics.track).toHaveBeenCalledWith('price_cap_note_click', expect.objectContaining({
      schema_version: '1',
      session_id: 's_1234567890_abc123',
      device_type: 'desktop',
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_best_fit',
      ideal_price: 3800,
      ideal_deposit: 35000,
      display_price: 4200,
      price_cap_delta: 400,
      results_session_id: 'rs_1234567890_abc123'
    }))
  })

  it('should handle optional price_cap_delta', () => {
    const params: TrackPriceCapNoteClickParams = {
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_cheapest',
      ideal_price: 3800,
      ideal_deposit: 35000,
      display_price: 3600
      // price_cap_delta omitted
    }

    trackPriceCapNoteClick(params)

    expect(mockAnalytics.track).toHaveBeenCalledWith('price_cap_note_click', expect.objectContaining({
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_cheapest',
      ideal_price: 3800,
      ideal_deposit: 35000,
      display_price: 3600,
      price_cap_delta: undefined
    }))
  })

  it('should round float values to integers', () => {
    const params: TrackPriceCapNoteClickParams = {
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_best_fit',
      ideal_price: 3800.7,
      ideal_deposit: 35000.3,
      display_price: 4200.9,
      price_cap_delta: 400.2
    }

    trackPriceCapNoteClick(params)

    expect(mockAnalytics.track).toHaveBeenCalledWith('price_cap_note_click', expect.objectContaining({
      ideal_price: 3801,
      ideal_deposit: 35000,
      display_price: 4201,
      price_cap_delta: 400
    }))
  })

  it('should not track when consent is not given', () => {
    mockAnalytics.hasConsent.mockReturnValue(false)

    const params: TrackPriceCapNoteClickParams = {
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_best_fit',
      ideal_price: 3800,
      ideal_deposit: 35000,
      display_price: 4200
    }

    trackPriceCapNoteClick(params)

    expect(mockAnalytics.track).not.toHaveBeenCalled()
  })

  it('should handle tracking errors gracefully', () => {
    mockAnalytics.track.mockImplementation(() => {
      throw new Error('Network error')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const params: TrackPriceCapNoteClickParams = {
      listing_id: 'test-listing-123',
      display_reason: 'price_cap_best_fit',
      ideal_price: 3800,
      ideal_deposit: 35000,
      display_price: 4200
    }

    expect(() => trackPriceCapNoteClick(params)).not.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith('[Analytics] price_cap_note_click failed:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})