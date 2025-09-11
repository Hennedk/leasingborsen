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
vi.mock('../pageview', () => ({
  getCurrentResultsSessionId: vi.fn(() => 'rs_1704067300_def456'),
}))

const { trackListingView, trackListingClick } = await import('../listing')

describe('Listing Events (listing.ts)', () => {
  beforeEach(() => {
    testSetup.beforeEach()
    vi.clearAllMocks()
    mockAnalytics.hasConsent.mockReturnValue(true)
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

