import { describe, expect, it } from 'vitest'

import {
  selectBestOffer,
  selectOfferWithFallback,
  selectBestOfferWithPriceCap,
} from '../supabase/functions/_shared/offerSelection'

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

describe('selectBestOfferWithPriceCap', () => {
  const testOffers = [
    {
      ...baseOffer,
      monthly_price: 3800,
      first_payment: 35000,
      period_months: 36,
    },
    {
      ...baseOffer,
      monthly_price: 4200,
      first_payment: 0,
      period_months: 36,
    },
    {
      ...baseOffer,
      monthly_price: 4800,
      first_payment: 35000,
      period_months: 24,
    },
    {
      ...baseOffer,
      monthly_price: 5200,
      first_payment: 35000,
      period_months: 36,
    }
  ]

  describe('without price cap', () => {
    it('returns ideal offer as display offer when no price cap is set', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true
      )

      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayReason).toBe('best_fit')
      expect(result.idealOffer?.monthly_price).toBe(3800)
      expect(result.deltaToIdeal).toBe(0)
    })

    it('returns ideal offer when enforcePriceCap is false', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 4000, enforcePriceCap: false }
      )

      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayReason).toBe('best_fit')
      expect(result.deltaToIdeal).toBe(0)
    })
  })

  describe('with price cap enforcement', () => {
    it('selects ideal offer when it is within price cap', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 4000, enforcePriceCap: true }
      )

      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayReason).toBe('best_fit')
      expect(result.idealOffer?.monthly_price).toBe(3800)
      expect(result.deltaToIdeal).toBe(0)
    })

    it('selects best available offer within price cap when ideal exceeds cap', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3600, enforcePriceCap: true }
      )

      expect(result.displayOffer).toBe(null) // No offers within cap for 35k deposit + 36 months
      expect(result.displayReason).toBe('cheapest')
      expect(result.idealOffer?.monthly_price).toBe(3800)
    })

    it('selects best fit offer within cap when available', () => {
      const offersWithinCap = [
        {
          ...baseOffer,
          monthly_price: 3500,
          first_payment: 0,
          period_months: 24,
        },
        {
          ...baseOffer,
          monthly_price: 3600,
          first_payment: 50000,
          period_months: 36,
        }
      ]

      const result = selectBestOfferWithPriceCap(
        offersWithinCap,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3700, enforcePriceCap: true }
      )

      // Should prefer 36-month term (3600) over 24-month term (3500) despite higher price
      expect(result.displayOffer?.monthly_price).toBe(3600)
      expect(result.displayOffer?.period_months).toBe(36)
      expect(result.displayReason).toBe('best_fit') // This is also the ideal offer, so it's 'best_fit'
      expect(result.selection_method).toBe('exact')
    })

    it('returns null when no offers are within price cap', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3000, enforcePriceCap: true }
      )

      expect(result.displayOffer).toBe(null)
      expect(result.displayReason).toBe('cheapest')
      expect(result.idealOffer?.monthly_price).toBe(3800)
      expect(result.deltaToIdeal).toBe(800) // 3800 - 3000
    })

    it('calculates correct delta when using price-capped offer', () => {
      const mixedOffers = [
        {
          ...baseOffer,
          monthly_price: 3200,
          first_payment: 0,
          period_months: 36,
        },
        {
          ...baseOffer,
          monthly_price: 3800,
          first_payment: 35000,
          period_months: 36,
        }
      ]

      const result = selectBestOfferWithPriceCap(
        mixedOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3500, enforcePriceCap: true }
      )

      expect(result.displayOffer?.monthly_price).toBe(3200)
      expect(result.displayOffer?.first_payment).toBe(0)
      expect(result.displayReason).toBe('price_cap_best_fit')
      expect(result.idealOffer?.monthly_price).toBe(3800)
      expect(result.deltaToIdeal).toBe(600) // 3800 - 3200
    })

    it('handles boundary case where monthly_price equals maxPrice', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3800, enforcePriceCap: true }
      )

      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayReason).toBe('best_fit')
      expect(result.deltaToIdeal).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty offers array', () => {
      const result = selectBestOfferWithPriceCap(
        [],
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 4000, enforcePriceCap: true }
      )

      expect(result.displayOffer).toBe(null)
      expect(result.displayReason).toBe('cheapest')
      expect(result.idealOffer).toBe(undefined)
    })

    it('handles null offers array', () => {
      const result = selectBestOfferWithPriceCap(
        null,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 4000, enforcePriceCap: true }
      )

      expect(result.displayOffer).toBe(null)
      expect(result.displayReason).toBe('cheapest')
      expect(result.idealOffer).toBe(undefined)
    })

    it('preserves selection_method from capped offer', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        24,
        true,
        true,
        { maxPrice: 5000, enforcePriceCap: true }
      )

      expect(result.displayOffer?.period_months).toBe(24)
      expect(result.selection_method).toBe('exact') // 24 months was explicitly requested as targetTerm
    })
  })
})
