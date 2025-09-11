import { describe, it, expectTypeOf } from 'vitest'

// Guardrail stubs: type-level checks for key contracts

import type { PageViewEvent } from '@/analytics/pageview'
import type { LeaseScoreBreakdown } from '@/lib/leaseScore'

describe('contracts', () => {
  it('PageViewEvent matches documented base fields', () => {
    const sample: PageViewEvent = {
      schema_version: '1',
      session_id: 's_123',
      device_type: 'desktop',
      page_type: 'results',
      path: '/listings',
      page_load_type: 'spa',
      // optional: page_name, query, referrer_host, feature_flags, utm_*
      results_session_id: 'rs_123',
      filters_active: { make: 'BMW', price_max: 5000 },
    }
    expectTypeOf(sample.schema_version).toEqualTypeOf<'1'>()
    expectTypeOf(sample.device_type).toBeString()
    expectTypeOf(sample.page_type).toMatchTypeOf<'home' | 'results' | 'listing_detail' | 'other'>()
  })

  it('LeaseScoreBreakdown aligns with v2.1 EML fields', () => {
    const breakdown: LeaseScoreBreakdown = {
      totalScore: 80,
      monthlyRateScore: 75,
      monthlyRatePercent: 1.2,
      mileageScore: 75,
      mileageNormalized: 15000,
      upfrontScore: 90,
      firstPaymentPercent: 5,
      calculation_version: '2.1',
      eml12Percent: 1.3,
      emlTermPercent: 1.1,
      emlBlendPercent: 1.22,
      baseline: { method: 'anchors' },
    }
    expectTypeOf(breakdown.calculation_version).toEqualTypeOf<'2.1'>()
  })
})

