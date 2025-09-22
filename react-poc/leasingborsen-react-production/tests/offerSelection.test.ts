import { describe, expect, it } from 'vitest'

import {
  selectBestOffer,
  selectOfferWithFallback,
} from '@/lib/offerSelection'

const baseOffer = {
  first_payment: 35000,
  monthly_price: 4500,
  period_months: 36,
  mileage_per_year: 15000,
}

describe('selectBestOffer', () => {
  it('respects zero-deposit selections in strict mode', () => {
    const offers = [
      {
        ...baseOffer,
        first_payment: 0,
        monthly_price: 4800,
      },
      {
        ...baseOffer,
        first_payment: 35000,
        monthly_price: 4200,
      },
    ]

    const result = selectBestOffer(offers, 15000, 0, 36, true, true)

    expect(result?.first_payment).toBe(0)
    expect(result?.selection_method).toBe('exact')
  })
})

describe('selectOfferWithFallback', () => {
  it('falls back to flexible mileage when strict selection fails', () => {
    const offers = [
      {
        ...baseOffer,
        mileage_per_year: 16000,
        monthly_price: 4400,
      },
      {
        ...baseOffer,
        mileage_per_year: 20000,
        monthly_price: 4600,
      },
    ]

    const { offer, stage } = selectOfferWithFallback({
      leasePricing: offers,
      targetMileage: 17000,
      targetDeposit: 35000,
      targetTerm: 36,
      isUserSpecified: true,
    })

    expect(stage).toBe('flexible')
    expect(offer?.mileage_per_year).toBe(16000)
    expect(offer?.selection_method).toBe('closest')
  })

  it('gracefully falls back when no preferred terms exist', () => {
    const offers = [
      {
        ...baseOffer,
        period_months: 12,
        monthly_price: 4100,
      },
      {
        ...baseOffer,
        period_months: 12,
        monthly_price: 3900,
      },
    ]

    const { offer, stage } = selectOfferWithFallback({
      leasePricing: offers,
      targetMileage: 15000,
      targetDeposit: 35000,
      targetTerm: 36,
      isUserSpecified: true,
    })

    expect(stage).toBe('flexible')
    expect(offer?.monthly_price).toBe(3900)
    expect(offer?.selection_method).toBe('exact')
  })

  it('marks fallback selections as defaults when user config is absent', () => {
    const offers = [
      {
        ...baseOffer,
        mileage_per_year: 12000,
        monthly_price: 4300,
      },
      {
        ...baseOffer,
        mileage_per_year: 18000,
        monthly_price: 4100,
      },
    ]

    const { offer, stage } = selectOfferWithFallback({
      leasePricing: offers,
      targetMileage: 17000,
      targetDeposit: 35000,
      targetTerm: 36,
      isUserSpecified: false,
    })

    expect(stage).toBe('flexible')
    expect(offer?.mileage_per_year).toBe(18000)
    expect(offer?.selection_method).toBe('default')
  })
})
