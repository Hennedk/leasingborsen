import { describe, expect, it } from 'vitest'
import { selectBestOfferWithPriceCap } from '../supabase/functions/_shared/offerSelection'
import type { LeasePricingOffer } from '../supabase/functions/_shared/offerSelection'

describe('Price Cap Integration Tests', () => {
  // Real test data to drive actual logic
  const testOffers: LeasePricingOffer[] = [
    {
      mileage_per_year: 15000,
      period_months: 36,
      first_payment: 35000,
      monthly_price: 3800, // Ideal offer
    },
    {
      mileage_per_year: 15000,
      period_months: 36,
      first_payment: 0,
      monthly_price: 4200, // Zero deposit alternative
    },
    {
      mileage_per_year: 20000, // Different mileage - should be filtered in strict mode
      period_months: 36,
      first_payment: 35000,
      monthly_price: 3600, // Cheaper but wrong mileage
    },
    {
      mileage_per_year: 15000,
      period_months: 24,
      first_payment: 35000,
      monthly_price: 4800, // 24-month option
    }
  ]

  describe('strict mode mileage constraint regression test', () => {
    it('CRITICAL: excludes listings when no offers match mileage constraints within price cap', () => {
      // Test the regression fix: strict mode should exclude listings that can't match constraints
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000, // Target mileage
        35000,
        36,
        true, // strict mode
        true,
        { maxPrice: 3700, enforcePriceCap: true } // Only 3600 offer (wrong mileage) is under cap
      )

      // Should return null because the cheaper 3600 offer has wrong mileage (20k vs 15k)
      expect(result.displayOffer).toBeNull()
      expect(result.displayReason).toBe('cheapest')
      expect(result.idealOffer?.monthly_price).toBe(3800)
    })

    it('allows offers when mileage matches within price cap', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000, // Target mileage
        35000,
        36,
        true, // strict mode
        true,
        { maxPrice: 4000, enforcePriceCap: true } // Allows 3800 offer
      )

      // Should return the 3800 offer since it matches constraints and is within cap
      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayOffer?.mileage_per_year).toBe(15000)
      expect(result.displayReason).toBe('best_fit')
    })

    it('selects alternate deposit when ideal exceeds price cap', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true, // strict mode
        true,
        { maxPrice: 4100, enforcePriceCap: true } // Excludes ideal 3800, includes 4200 zero-deposit
      )

      // Should select the zero-deposit 4200 offer since ideal 3800 is within cap
      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayOffer?.first_payment).toBe(35000)
      expect(result.displayReason).toBe('best_fit')
      expect(result.idealOffer?.monthly_price).toBe(3800)
    })
  })

  describe('flexible mode fallback behavior', () => {
    it('falls back to cheapest offer within cap in flexible mode', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        false, // flexible mode
        true,
        { maxPrice: 3700, enforcePriceCap: true } // Only 3600 offer is under cap
      )

      // In flexible mode, should fall back to the 3600 offer even with wrong mileage
      expect(result.displayOffer?.monthly_price).toBe(3600)
      expect(result.displayOffer?.mileage_per_year).toBe(20000)
      expect(result.displayReason).toBe('price_cap_best_fit') // It found the best fit within cap
      expect(result.idealOffer?.monthly_price).toBe(3800)
    })
  })

  describe('boundary conditions', () => {
    it('includes offers at exact price cap boundary', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3800, enforcePriceCap: true } // Exactly at ideal price
      )

      expect(result.displayOffer?.monthly_price).toBe(3800)
      expect(result.displayReason).toBe('best_fit')
      expect(result.deltaToIdeal).toBe(0)
    })

    it('excludes all offers when price cap is too low', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 3000, enforcePriceCap: true } // Below all offers
      )

      expect(result.displayOffer).toBeNull()
      expect(result.displayReason).toBe('cheapest')
      expect(result.idealOffer?.monthly_price).toBe(3800)
      expect(result.deltaToIdeal).toBe(800) // 3800 - 3000
    })

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

      expect(result.displayOffer).toBeNull()
      expect(result.idealOffer).toBeUndefined()
      expect(result.deltaToIdeal).toBeUndefined()
    })
  })

  describe('metadata accuracy', () => {
    it('calculates correct delta when display differs from ideal', () => {
      const result = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        0, // Target zero deposit
        36,
        true,
        true,
        { maxPrice: 4300, enforcePriceCap: true }
      )

      // Should select zero-deposit option (4200) as display and ideal (both targeting 0 deposit)
      expect(result.displayOffer?.monthly_price).toBe(4200)
      expect(result.displayOffer?.first_payment).toBe(0)
      expect(result.idealOffer?.monthly_price).toBe(4200) // Ideal for 0 deposit target
      expect(result.deltaToIdeal).toBe(0) // Display and ideal are the same when targeting 0 deposit
    })

    it('provides structured reason codes', () => {
      const withinCapResult = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 4000, enforcePriceCap: true }
      )

      expect(withinCapResult.displayReason).toBe('best_fit')

      const forcedCheaperResult = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        false, // flexible to allow fallback
        true,
        { maxPrice: 3700, enforcePriceCap: true }
      )

      expect(forcedCheaperResult.displayReason).toBe('price_cap_best_fit')
    })
  })

  describe('backwards compatibility', () => {
    it('behaves identically to original when no price cap', () => {
      const withoutCap = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true
        // No options = no price cap
      )

      const withDisabledCap = selectBestOfferWithPriceCap(
        testOffers,
        15000,
        35000,
        36,
        true,
        true,
        { maxPrice: 4000, enforcePriceCap: false }
      )

      expect(withoutCap.displayOffer?.monthly_price).toBe(withDisabledCap.displayOffer?.monthly_price)
      expect(withoutCap.displayReason).toBe('best_fit')
      expect(withDisabledCap.displayReason).toBe('best_fit')
    })
  })
})