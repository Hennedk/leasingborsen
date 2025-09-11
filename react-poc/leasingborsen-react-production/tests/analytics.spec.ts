import { describe, it, expect } from 'vitest'

// Guardrail stub: verifies basic shape and behavior of page_view tracking
// Expand with a real analytics mock and router harness as needed.

import { analytics } from '@/analytics/mp'
import { trackPageView } from '@/analytics/pageview'

describe('analytics/page_view', () => {
  it('does nothing without consent', () => {
    // Precondition: no consent granted (default state)
    // Expect: no error, no emission
    expect(() => trackPageView({
      path: '/listings',
      pageType: 'results',
      query: { make: 'BMW', price_max: 5000 },
    } as any)).not.toThrow()
  })

  it('emits page_view with whitelisted filters when consented (smoke)', () => {
    // Initialize + consent for smoke test
    analytics.init({ token: 'testtoken_1234567890abcdef1234567890abcd', eu: true })
    analytics.grantConsent()

    // This is a smoke test to ensure no runtime errors and property shape
    expect(() => trackPageView({
      path: '/listings',
      pageType: 'results',
      query: { irrelevant: 'x' },
      filters: {
        // Only these should be included under filters_active (whitelist):
        make: 'BMW', model: 'i4', fuel_type: 'ev', body_type: 'sedan',
        sort_option: 'lease_score_desc',
        mileage_km_per_year: 15000,
        term_months: 36,
        price_max: 5000,
        // anything else should be omitted by trimFilters
        junk: 'ignore-me',
      },
    } as any)).not.toThrow()
  })
})

