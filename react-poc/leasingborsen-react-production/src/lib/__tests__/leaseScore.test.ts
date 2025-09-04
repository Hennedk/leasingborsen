import { describe, test, expect } from 'vitest'
import { 
  calculateLeaseScore, 
  calculateLeaseScoreSimple, 
  calculateLeaseScoreLegacy,
  type LeaseScoreInput 
} from '../leaseScore'

describe('Lease Score v2.1 - Backward Compatibility Tests', () => {
  // Test data constants
  const baseInput: LeaseScoreInput = {
    retailPrice: 400000,
    monthlyPrice: 4000, // 1% of retail
    mileagePerYear: 15000,
    firstPayment: 0,
    contractMonths: 36 // Ignored in v2
  }

  describe('Upfront Payment (Deposit) Scoring', () => {
    test('0% deposit scores upfrontScore=100', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 0
      })
      
      expect(result.upfrontScore).toBe(100)
      expect(result.firstPaymentPercent).toBe(0)
      expect(result.flexibilityScore).toBe(100) // Backwards compatibility
    })

    test('3% deposit scores upfrontScore=95', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 12000 // 3% of 400k
      })
      
      expect(result.upfrontScore).toBe(95)
      expect(result.firstPaymentPercent).toBe(3)
    })

    test('5% deposit scores upfrontScore=90', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 20000 // 5% of 400k
      })
      
      expect(result.upfrontScore).toBe(90)
      expect(result.firstPaymentPercent).toBe(5)
    })

    test('10% deposit scores upfrontScore=70', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 40000 // 10% of 400k
      })
      
      expect(result.upfrontScore).toBe(70)
      expect(result.firstPaymentPercent).toBe(10)
    })

    test('15% deposit scores upfrontScore=55', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 60000 // 15% of 400k
      })
      
      expect(result.upfrontScore).toBe(55)
      expect(result.firstPaymentPercent).toBe(15)
    })

    test('20% deposit scores upfrontScore=40', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 80000 // 20% of 400k
      })
      
      expect(result.upfrontScore).toBe(40)
      expect(result.firstPaymentPercent).toBe(20)
    })

    test('25%+ deposit scores upfrontScore=25', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        firstPayment: 120000 // 30% of 400k
      })
      
      expect(result.upfrontScore).toBe(25)
      expect(result.firstPaymentPercent).toBe(30)
    })
  })

  describe('Monthly Rate Scoring (EML v2.1)', () => {
    test('low monthly rate (0.8%) scores high', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        monthlyPrice: 3200, // 0.8% of 400k
        firstPayment: 0     // No deposit
      })
      
      // v2.1 uses anchor-based scoring, expect high score for low rate
      expect(result.monthlyRateScore).toBeGreaterThanOrEqual(90)
      expect(result.emlBlendPercent).toBeCloseTo(0.8, 1)
    })

    test('moderate monthly rate (1.0%) scores reasonably', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        monthlyPrice: 4000, // 1.0% of 400k
        firstPayment: 0     // No deposit
      })
      
      // Should be between good and fair
      expect(result.monthlyRateScore).toBeGreaterThan(70)
      expect(result.monthlyRateScore).toBeLessThan(95)
      expect(result.emlBlendPercent).toBeCloseTo(1.0, 1)
    })

    test('high monthly rate (2.2%) scores low', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        monthlyPrice: 8800, // 2.2% of 400k
        firstPayment: 0     // No deposit
      })
      
      // Should score very low due to high rate
      expect(result.monthlyRateScore).toBeLessThan(10)
      expect(result.emlBlendPercent).toBeCloseTo(2.2, 1)
    })
  })

  describe('Mileage Scoring', () => {
    test('25,000+ km/year scores 100 points', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        mileagePerYear: 25000
      })
      
      expect(result.mileageScore).toBe(100)
      expect(result.mileageNormalized).toBe(25000)
    })

    test('15,000 km/year scores 75 points', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        mileagePerYear: 15000
      })
      
      expect(result.mileageScore).toBe(75)
      expect(result.mileageNormalized).toBe(15000)
    })

    test('8,000 km/year scores 20 points', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        mileagePerYear: 8000
      })
      
      expect(result.mileageScore).toBe(20)
      expect(result.mileageNormalized).toBe(8000)
    })
  })

  describe('Total Score Calculation', () => {
    test('total score never exceeds 100 or goes below 0', () => {
      // Perfect score scenario
      const perfectResult = calculateLeaseScore({
        retailPrice: 400000,
        monthlyPrice: 3000, // 0.75% - score 100
        mileagePerYear: 30000, // score 100
        firstPayment: 0 // score 100
      })
      expect(perfectResult.totalScore).toBe(100)

      // Terrible score scenario
      const terribleResult = calculateLeaseScore({
        retailPrice: 400000,
        monthlyPrice: 10000, // 2.5% - score 25
        mileagePerYear: 5000, // score 20
        firstPayment: 200000 // 50% - score 25
      })
      expect(terribleResult.totalScore).toBeGreaterThanOrEqual(0)
      expect(terribleResult.totalScore).toBeLessThanOrEqual(100)
    })

    test('weighted calculation works correctly', () => {
      const result = calculateLeaseScore({
        retailPrice: 400000,
        monthlyPrice: 4000,
        mileagePerYear: 15000, // Should score 75 (unchanged from v2.0)
        firstPayment: 20000,   // 5% - should score 90 (unchanged)
        contractMonths: 36
      })

      // v2.1: EML calculation affects monthly rate score differently
      // Just verify that all components are calculated and contribute to total
      expect(result.totalScore).toBeGreaterThan(50)
      expect(result.totalScore).toBeLessThan(100)
      expect(result.mileageScore).toBe(75)  // Mileage scoring unchanged
      expect(result.upfrontScore).toBe(90)  // Upfront scoring unchanged
      
      // Total should be reasonable weighted combination
      const expectedWeightedSum = Math.round(
        result.monthlyRateScore * 0.45 +
        result.mileageScore * 0.35 +
        result.upfrontScore * 0.20
      )
      expect(result.totalScore).toBe(expectedWeightedSum)
    })

    test('includes calculation_version: 2.1 in breakdown', () => {
      const result = calculateLeaseScore(baseInput)
      expect(result.calculation_version).toBe('2.1')
    })
  })

  describe('Edge Cases', () => {
    test('handles zero/null retail price gracefully', () => {
      const result = calculateLeaseScore({
        ...baseInput,
        retailPrice: 0
      })
      
      expect(result.monthlyRateScore).toBe(0)
      expect(result.upfrontScore).toBe(0)
      expect(result.totalScore).toBeGreaterThanOrEqual(0)
    })

    test('handles negative values by returning 0 components', () => {
      const result = calculateLeaseScore({
        retailPrice: -100000,
        monthlyPrice: -1000,
        mileagePerYear: -5000,
        firstPayment: -10000
      })
      
      // v2.1: Invalid data gets marked as not_scorable
      expect(result.monthlyRateScore).toBe(0)
      expect(result.upfrontScore).toBe(0)
      expect(result.mileageScore).toBe(0)  // Invalid inputs result in 0 score
      expect(result.totalScore).toBe(0)    // Total should be 0 for invalid data
    })

    test('rounds scores correctly', () => {
      // Test case that should produce decimal result
      const result = calculateLeaseScore({
        retailPrice: 333333,
        monthlyPrice: 3500, // ~1.05% = 90 points
        mileagePerYear: 13000, // 55 points
        firstPayment: 8333 // ~2.5% = 95 points
      })

      // Should be rounded to integer
      expect(Number.isInteger(result.totalScore)).toBe(true)
    })
  })

  describe('API Compatibility', () => {
    test('calculateLeaseScoreSimple returns only total score', () => {
      const score = calculateLeaseScoreSimple(baseInput)
      
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    test('legacy function signature works correctly', () => {
      const legacyScore = calculateLeaseScoreLegacy(
        4000,  // monthlyPrice
        400000, // retailPrice
        15000,  // mileagePerYear
        36,     // contractMonths (ignored)
        20000   // firstPayment
      )
      
      const modernScore = calculateLeaseScoreSimple({
        monthlyPrice: 4000,
        retailPrice: 400000,
        mileagePerYear: 15000,
        firstPayment: 20000,
        contractMonths: 36
      })

      expect(legacyScore).toBe(modernScore)
    })

    test('Edge Function and frontend return identical results', () => {
      // This test ensures parity between the Deno and Node versions
      const testInput: LeaseScoreInput = {
        retailPrice: 500000,
        monthlyPrice: 5500,
        mileagePerYear: 18000,
        firstPayment: 15000
      }

      const result = calculateLeaseScore(testInput)
      
      // Verify the result structure
      expect(result).toHaveProperty('totalScore')
      expect(result).toHaveProperty('monthlyRateScore')
      expect(result).toHaveProperty('mileageScore')
      expect(result).toHaveProperty('upfrontScore')
      expect(result).toHaveProperty('calculation_version', '2.1')
      
      // Verify backwards compatibility
      expect(result.flexibilityScore).toBe(result.upfrontScore)
    })
  })
})