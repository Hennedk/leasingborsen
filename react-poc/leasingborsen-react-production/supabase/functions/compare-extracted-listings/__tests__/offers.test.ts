import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts"
import { 
  calculateTotalPrice, 
  normalizeOffer, 
  compareOfferArrays,
  offersEqual
} from "../utils/offers.ts"

describe("Offers Utilities", () => {
  describe("calculateTotalPrice", () => {
    it("should calculate total price correctly", () => {
      assertEquals(calculateTotalPrice(3000, 36, 5000), 113000) // (36 * 3000) + 5000
      assertEquals(calculateTotalPrice(2500, 24, 0), 60000) // (24 * 2500) + 0
      assertEquals(calculateTotalPrice(4000, 48, 10000), 202000) // (48 * 4000) + 10000
      assertEquals(calculateTotalPrice(3500, 36), 126000) // No first payment
    })
  })

  describe("normalizeOffer", () => {
    it("should normalize array format correctly", () => {
      const arrayOffer = [2999, 5000, 36, 15000]
      const normalized = normalizeOffer(arrayOffer)
      
      assertEquals(normalized.monthly_price, 2999)
      assertEquals(normalized.first_payment, 5000)
      assertEquals(normalized.period_months, 36)
      assertEquals(normalized.mileage_per_year, 15000)
    })

    it("should normalize object format correctly", () => {
      const objectOffer = {
        monthly_price: 3499,
        first_payment: 7500,
        period_months: 48,
        mileage_per_year: 20000
      }
      const normalized = normalizeOffer(objectOffer)
      
      assertEquals(normalized.monthly_price, 3499)
      assertEquals(normalized.first_payment, 7500)
      assertEquals(normalized.period_months, 48)
      assertEquals(normalized.mileage_per_year, 20000)
    })

    it("should handle missing values with defaults", () => {
      const partialOffer = { monthly_price: 2999 }
      const normalized = normalizeOffer(partialOffer)
      
      assertEquals(normalized.monthly_price, 2999)
      assertEquals(normalized.first_payment, 0)
      assertEquals(normalized.period_months, 36)
      assertEquals(normalized.mileage_per_year, 15000)
    })

    it("should handle empty array", () => {
      const emptyArray = []
      const normalized = normalizeOffer(emptyArray)
      
      assertEquals(normalized.monthly_price, 0)
      assertEquals(normalized.first_payment, 0)
      assertEquals(normalized.period_months, 36)
      assertEquals(normalized.mileage_per_year, 15000)
    })
  })

  describe("compareOfferArrays", () => {
    it("should detect identical offers regardless of order", () => {
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 10000 },
        { monthly_price: 3499, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 3999, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
      ]
      
      const offers2 = [
        { monthly_price: 3999, first_payment: 0, period_months: 36, mileage_per_year: 20000 },
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 10000 },
        { monthly_price: 3499, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, false)
    })

    it("should detect different offer counts", () => {
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offers2 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 3499, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, true)
    })

    it("should detect price changes", () => {
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offers2 = [
        { monthly_price: 3099, first_payment: 0, period_months: 36, mileage_per_year: 15000 } // Price changed
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, true)
    })

    it("should detect mileage changes", () => {
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offers2 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 20000 } // Mileage changed
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, true)
    })

    it("should handle mixed array and object formats", () => {
      const arrayOffers = [
        [2999, 0, 36, 15000],
        [3499, 0, 36, 20000]
      ]
      
      const objectOffers = [
        { monthly_price: 3499, first_payment: 0, period_months: 36, mileage_per_year: 20000 },
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const hasChanged = compareOfferArrays(arrayOffers, objectOffers)
      assertEquals(hasChanged, false) // Same content, different format and order
    })

    it("should handle null/undefined arrays", () => {
      assertEquals(compareOfferArrays(null as any, []), true)
      assertEquals(compareOfferArrays([], null as any), true)
      assertEquals(compareOfferArrays(undefined as any, []), true)
      assertEquals(compareOfferArrays([], undefined as any), true)
    })

    it("should detect changes in period months", () => {
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offers2 = [
        { monthly_price: 2999, first_payment: 0, period_months: 48, mileage_per_year: 15000 } // Period changed
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, true)
    })

    it("should detect changes in first payment", () => {
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offers2 = [
        { monthly_price: 2999, first_payment: 5000, period_months: 36, mileage_per_year: 15000 } // First payment changed
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, true)
    })
  })

  describe("offersEqual", () => {
    it("should compare individual offers correctly", () => {
      const offer1 = { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      const offer2 = { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      const offer3 = { monthly_price: 3499, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      
      assertEquals(offersEqual(offer1, offer2), true)
      assertEquals(offersEqual(offer1, offer3), false)
    })

    it("should handle array format", () => {
      const arrayOffer = [2999, 0, 36, 15000]
      const objectOffer = { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      
      assertEquals(offersEqual(arrayOffer, objectOffer), true)
    })
  })

  describe("Complex offer scenarios", () => {
    it("should handle Ford merpris-style multiple offers", () => {
      const baseOffers = [
        { monthly_price: 2495, first_payment: 0, period_months: 36, mileage_per_year: 10000 }
      ]
      
      const expandedOffers = [
        { monthly_price: 2495, first_payment: 0, period_months: 36, mileage_per_year: 10000 },
        { monthly_price: 2695, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 2895, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
      ]
      
      const hasChanged = compareOfferArrays(baseOffers, expandedOffers)
      assertEquals(hasChanged, true) // Different number of offers
    })

    it("should sort offers consistently for comparison", () => {
      // Offers with same monthly price but different mileage
      const offers1 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 20000 },
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 10000 },
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offers2 = [
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 10000 },
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 2999, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
      ]
      
      const hasChanged = compareOfferArrays(offers1, offers2)
      assertEquals(hasChanged, false) // Same offers, different order
    })
  })
})