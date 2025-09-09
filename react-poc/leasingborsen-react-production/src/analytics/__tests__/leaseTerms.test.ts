import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { createMockAnalytics, testSetup } from './test-utils'

const mockAnalytics = createMockAnalytics()

vi.useFakeTimers()

vi.mock('../mp', () => ({
  analytics: mockAnalytics,
}))

// No-op validators in tests
vi.mock('../schema', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    validateLeaseTermsOpenOrWarn: vi.fn(),
    validateLeaseTermsApplyOrWarn: vi.fn(),
  }
})

const { trackLeaseTermsOpen, trackLeaseTermsApply, newConfigSession } = await import('../listing')

describe('Lease terms events', () => {
  beforeEach(() => {
    testSetup.beforeEach()
    vi.clearAllMocks()
    mockAnalytics.hasConsent.mockReturnValue(true)
  })

  afterEach(() => {
    testSetup.afterEach()
  })

  it('throttles lease_terms_open within 2s', () => {
    const sid = newConfigSession()
    trackLeaseTermsOpen({
      listing_id: 'l1', ui_surface: 'dropdown', trigger_source: 'control', config_session_id: sid,
    })
    trackLeaseTermsOpen({
      listing_id: 'l1', ui_surface: 'dropdown', trigger_source: 'control', config_session_id: sid,
    })
    expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    expect(mockAnalytics.track).toHaveBeenCalledWith('lease_terms_open', expect.objectContaining({ listing_id: 'l1' }))
  })

  it('debounces lease_terms_apply within 350ms', () => {
    const sid = newConfigSession()
    trackLeaseTermsApply({
      listing_id: 'l1', ui_surface: 'dropdown', selection_method: 'dropdown', config_session_id: sid,
      mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0,
      previous: { mileage_km_per_year: 10000, term_months: 36, first_payment_dkk: 0 },
      changed_keys: ['mileage_km_per_year'], changed_keys_count: 1,
    })
    trackLeaseTermsApply({
      listing_id: 'l1', ui_surface: 'dropdown', selection_method: 'dropdown', config_session_id: sid,
      mileage_km_per_year: 20000, term_months: 36, first_payment_dkk: 0,
      previous: { mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0 },
      changed_keys: ['mileage_km_per_year'], changed_keys_count: 1,
    })
    // Advance time to flush debounce
    vi.advanceTimersByTime(360)
    expect(mockAnalytics.track).toHaveBeenCalledTimes(1)
    const call = mockAnalytics.track.mock.calls[0]
    expect(call[0]).toBe('lease_terms_apply')
    expect(call[1]).toMatchObject({ mileage_km_per_year: 20000 })
  })

  it('does not emit apply when no changes', () => {
    const sid = newConfigSession()
    trackLeaseTermsApply({
      listing_id: 'l1', ui_surface: 'dropdown', selection_method: 'dropdown', config_session_id: sid,
      mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0,
      previous: { mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0 },
      changed_keys: [], changed_keys_count: 0,
    })
    vi.advanceTimersByTime(400)
    expect(mockAnalytics.track).not.toHaveBeenCalled()
  })

  it('reuses config_session_id from open to apply', () => {
    const sid = newConfigSession()
    trackLeaseTermsOpen({ listing_id: 'l1', ui_surface: 'dropdown', trigger_source: 'control', config_session_id: sid })
    trackLeaseTermsApply({
      listing_id: 'l1', ui_surface: 'dropdown', selection_method: 'dropdown', config_session_id: sid,
      mileage_km_per_year: 15000, term_months: 36, first_payment_dkk: 0,
      previous: { mileage_km_per_year: 10000, term_months: 36, first_payment_dkk: 0 },
      changed_keys: ['mileage_km_per_year'], changed_keys_count: 1,
    })
    vi.advanceTimersByTime(360)
    const call = mockAnalytics.track.mock.calls.find(c => c[0] === 'lease_terms_apply')
    expect(call?.[1].config_session_id).toBe(sid)
  })
})

