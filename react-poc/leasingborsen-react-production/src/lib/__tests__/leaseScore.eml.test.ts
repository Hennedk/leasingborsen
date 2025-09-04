import { describe, test, expect } from 'vitest'
import { 
  calculateLeaseScore, 
  calculateLeaseScoreSimple, 
  type LeaseScoreInput 
} from '../leaseScore'

describe('Lease Score v2.1 - Effective Monthly (EML) System', () => {
  // Test data constants
  const baseInput: LeaseScoreInput = {
    retailPrice: 300000,
    monthlyPrice: 3000,
    mileagePerYear: 15000,
    firstPayment: 0,
    contractMonths: 36
  }

  describe('MUST-FIX GATE 1: Rounding Stability', () => {
    test('consistent rounding across repeated calculations', () => {
      const input = {
        retailPrice: 299999,  // Edge case near 300K
        monthlyPrice: 3333.33,
        firstPayment: 14999.99,
        contractMonths: 36,
        mileagePerYear: 15000
      }
      
      // Same input should always produce same score
      const score1 = calculateLeaseScore(input)
      const score2 = calculateLeaseScore(input)
      const score3 = calculateLeaseScore(input)
      
      expect(score1.totalScore).toBe(score2.totalScore)
      expect(score2.totalScore).toBe(score3.totalScore)
      
      // All component scores should be stable integers
      expect(Number.isInteger(score1.totalScore)).toBe(true)
      expect(Number.isInteger(score1.monthlyRateScore)).toBe(true)
      expect(Number.isInteger(score1.mileageScore)).toBe(true)
      expect(Number.isInteger(score1.upfrontScore)).toBe(true)
    })

    test('floating point precision does not affect final scores', () => {
      const input1 = {
        retailPrice: 300000.00,
        monthlyPrice: 2550.00,
        firstPayment: 0.00,
        contractMonths: 36,
        mileagePerYear: 15000
      }

      const input2 = {
        retailPrice: 300000,
        monthlyPrice: 2550,
        firstPayment: 0,
        contractMonths: 36,
        mileagePerYear: 15000
      }

      const score1 = calculateLeaseScore(input1)
      const score2 = calculateLeaseScore(input2)

      expect(score1.totalScore).toBe(score2.totalScore)
      expect(score1.monthlyRateScore).toBe(score2.monthlyRateScore)
    })
  })

  describe('MUST-FIX GATE 2: Anchor Boundary Points', () => {
    test('exactly at BEST anchor (0.85%) should score 100', () => {
      // (2550/300000)*100 = 0.85%
      const result = calculateLeaseScore({
        ...baseInput,
        monthlyPrice: 2550,  
        firstPayment: 0
      })
      
      expect(result.monthlyRateScore).toBe(100)
      expect(result.emlBlendPercent).toBeCloseTo(0.85, 2)
    })

    test('exactly at WORST anchor (2.25%) should score 0', () => {
      // (6750/300000)*100 = 2.25%
      const result = calculateLeaseScore({
        ...baseInput,
        monthlyPrice: 6750,
        firstPayment: 0
      })
      
      expect(result.monthlyRateScore).toBe(0)
      expect(result.emlBlendPercent).toBeCloseTo(2.25, 2)
    })

    test('midpoint anchor (1.55%) should score 50', () => {
      // Midpoint between 0.85% and 2.25% = 1.55%
      // (4650/300000)*100 = 1.55%
      const result = calculateLeaseScore({
        ...baseInput,
        monthlyPrice: 4650,
        firstPayment: 0
      })
      
      expect(result.monthlyRateScore).toBe(50)
      expect(result.emlBlendPercent).toBeCloseTo(1.55, 2)
    })
  })

  describe('MUST-FIX GATE 3: Retail Price Guards', () => {
    test('implausible retail prices marked not scorable', () => {
      // Too cheap - below 75K DKK
      const tooChear = calculateLeaseScore({
        retailPrice: 50000,  
        monthlyPrice: 1000,
        firstPayment: 0,
        mileagePerYear: 15000,
        contractMonths: 36
      })
      
      expect(tooChear.totalScore).toBe(0)
      expect(tooChear.baseline?.method).toBe('implausible_retail')
      expect(tooChear.monthlyRateScore).toBe(0)
      
      // Too expensive - above 2.5M DKK
      const tooExpensive = calculateLeaseScore({
        retailPrice: 3000000,
        monthlyPrice: 15000, 
        firstPayment: 0,
        mileagePerYear: 15000,
        contractMonths: 36
      })
      
      expect(tooExpensive.totalScore).toBe(0)
      expect(tooExpensive.baseline?.method).toBe('implausible_retail')
      expect(tooExpensive.monthlyRateScore).toBe(0)
    })

    test('boundary retail prices are accepted', () => {
      // Exactly at minimum boundary
      const atMin = calculateLeaseScore({
        retailPrice: 75000,  // Exactly 75K
        monthlyPrice: 1500,
        firstPayment: 0,
        mileagePerYear: 15000,
        contractMonths: 36
      })
      
      expect(atMin.baseline?.method).not.toBe('implausible_retail')
      
      // Exactly at maximum boundary
      const atMax = calculateLeaseScore({
        retailPrice: 2500000,  // Exactly 2.5M
        monthlyPrice: 15000,
        firstPayment: 0,
        mileagePerYear: 15000,
        contractMonths: 36
      })
      
      expect(atMax.baseline?.method).not.toBe('implausible_retail')
    })
  })

  describe('MUST-FIX GATE 4: Double-Counting Visibility', () => {
    test('baseline tracks known limitations', () => {
      const result = calculateLeaseScore(baseInput)
      
      // Should track the calculation method
      expect(result.baseline).toBeDefined()
      expect(result.baseline.method).toBe('anchors')
    })

    test('calculation version tracks v2.1', () => {
      const result = calculateLeaseScore(baseInput)
      expect(result.calculation_version).toBe('2.1')
    })
  })

  describe('MUST-FIX GATE 5: EML Calculation Verification', () => {
    test('calculates correct EML for high deposit scenario', () => {
      const input = {
        retailPrice: 350000,
        monthlyPrice: 3675,
        firstPayment: 17500,  // 5% deposit
        contractMonths: 36,
        mileagePerYear: 15000
      }
      
      const result = calculateLeaseScore(input)
      
      // EML-12: 3675 + (17500/12) = 5133.33
      // EML-12%: (5133.33/350000)*100 = 1.467%
      expect(result.eml12Percent).toBeCloseTo(1.467, 2)
      
      // EML-Term: 3675 + (17500/36) = 4161.11
      // EML-Term%: (4161.11/350000)*100 = 1.189%
      expect(result.emlTermPercent).toBeCloseTo(1.189, 2)
      
      // Blend: 0.7*1.467 + 0.3*1.189 = 1.384%
      expect(result.emlBlendPercent).toBeCloseTo(1.384, 2)
      
      // Score using anchors: 100 * (2.25-1.384)/(2.25-0.85) = 61.9 → 62
      expect(result.monthlyRateScore).toBe(62)
    })

    test('handles zero deposit correctly', () => {
      const input = {
        retailPrice: 350000,
        monthlyPrice: 4100,
        firstPayment: 0,
        contractMonths: 24,
        mileagePerYear: 15000
      }
      
      const result = calculateLeaseScore(input)
      
      // With no deposit, EML = monthly price for both scenarios
      // (4100/350000)*100 = 1.171%
      expect(result.eml12Percent).toBeCloseTo(1.171, 2)
      expect(result.emlTermPercent).toBeCloseTo(1.171, 2)
      expect(result.emlBlendPercent).toBeCloseTo(1.171, 2)
    })

    test('handles very short contracts correctly', () => {
      const result = calculateLeaseScore({
        retailPrice: 200000,
        monthlyPrice: 4000,
        firstPayment: 10000,
        contractMonths: 6,  // Shorter than 12-month exit
        mileagePerYear: 10000
      })
      
      // EML-12 should still use 12 for amortization
      const expectedEml12 = 4000 + (10000 / 12)
      expect(result.eml12Percent).toBeCloseTo((expectedEml12 / 200000) * 100, 2)
      
      // EML-Term uses actual 6 months
      const expectedEmlTerm = 4000 + (10000 / 6)
      expect(result.emlTermPercent).toBeCloseTo((expectedEmlTerm / 200000) * 100, 2)
    })
  })

  describe('Effective Monthly Logic Verification', () => {
    test('higher deposit results in lower score with same monthly', () => {
      const baseInput = {
        retailPrice: 300000,
        monthlyPrice: 3500,
        mileagePerYear: 15000,
        contractMonths: 36
      }
      
      const noDeposit = calculateLeaseScore({
        ...baseInput,
        firstPayment: 0
      })
      
      const withDeposit = calculateLeaseScore({
        ...baseInput,
        firstPayment: 15000  // 5% deposit
      })
      
      // Same monthly price, but deposit makes EML-12 worse
      expect(withDeposit.eml12Percent).toBeGreaterThan(noDeposit.eml12Percent)
      expect(withDeposit.monthlyRateScore).toBeLessThan(noDeposit.monthlyRateScore)
      
      // Total should be lower due to EML impact (but also upfront component changes)
      expect(withDeposit.totalScore).toBeLessThan(noDeposit.totalScore)
    })

    test('deposit impact varies by contract term', () => {
      const baseInput = {
        retailPrice: 300000,
        monthlyPrice: 3500,
        firstPayment: 18000,  // 6% deposit
        mileagePerYear: 15000
      }
      
      const shortTerm = calculateLeaseScore({
        ...baseInput,
        contractMonths: 12
      })
      
      const longTerm = calculateLeaseScore({
        ...baseInput,
        contractMonths: 48
      })
      
      // Short term should have higher EML-Term (deposit amortized over fewer months)
      expect(shortTerm.emlTermPercent).toBeGreaterThan(longTerm.emlTermPercent)
      
      // But both should have same EML-12 (always 12-month amortization)
      expect(shortTerm.eml12Percent).toBeCloseTo(longTerm.eml12Percent, 3)
    })
  })

  describe('Score Clamping and Edge Cases', () => {
    test('clamps scores to valid range', () => {
      // Test extremely good deal (below BEST anchor)
      const goodDeal = calculateLeaseScore({
        retailPrice: 500000,
        monthlyPrice: 3000,  // 0.6% - below BEST anchor
        firstPayment: 0,
        contractMonths: 36,
        mileagePerYear: 20000
      })
      expect(goodDeal.monthlyRateScore).toBe(100)
      
      // Test extremely bad deal (above WORST anchor)
      const badDeal = calculateLeaseScore({
        retailPrice: 200000,
        monthlyPrice: 6000,  // 3% - above WORST anchor
        firstPayment: 20000,
        contractMonths: 36,
        mileagePerYear: 10000
      })
      expect(badDeal.monthlyRateScore).toBe(0)
    })

    test('returns zero score for invalid data', () => {
      // Invalid retail price
      const invalidRetail = calculateLeaseScore({
        retailPrice: 0,
        monthlyPrice: 3000,
        firstPayment: 0,
        mileagePerYear: 15000,
        contractMonths: 36
      })
      
      expect(invalidRetail.totalScore).toBe(0)
      expect(invalidRetail.baseline.method).toBe('not_scorable')
      
      // Invalid monthly price
      const invalidMonthly = calculateLeaseScore({
        retailPrice: 300000,
        monthlyPrice: 0,
        firstPayment: 0,
        mileagePerYear: 15000,
        contractMonths: 36
      })
      
      expect(invalidMonthly.totalScore).toBe(0)
      expect(invalidMonthly.baseline.method).toBe('not_scorable')
    })
  })

  describe('Backward Compatibility', () => {
    test('maintains flexibilityScore alias', () => {
      const result = calculateLeaseScore(baseInput)
      expect(result.flexibilityScore).toBe(result.upfrontScore)
    })

    test('simple wrapper function works', () => {
      const detailedScore = calculateLeaseScore(baseInput)
      const simpleScore = calculateLeaseScoreSimple(baseInput)
      
      expect(simpleScore).toBe(detailedScore.totalScore)
    })

    test('includes all required v2.1 fields', () => {
      const result = calculateLeaseScore(baseInput)
      
      // Original fields
      expect(result).toHaveProperty('totalScore')
      expect(result).toHaveProperty('monthlyRateScore')
      expect(result).toHaveProperty('monthlyRatePercent')
      expect(result).toHaveProperty('mileageScore')
      expect(result).toHaveProperty('upfrontScore')
      expect(result).toHaveProperty('calculation_version')
      
      // New v2.1 fields
      expect(result).toHaveProperty('eml12Percent')
      expect(result).toHaveProperty('emlTermPercent')
      expect(result).toHaveProperty('emlBlendPercent')
      expect(result).toHaveProperty('baseline')
      
      // Version should be 2.1
      expect(result.calculation_version).toBe('2.1')
    })
  })

  describe('Real-World Scenarios', () => {
    test('premium SUV with high deposit', () => {
      const bmwX3 = calculateLeaseScore({
        retailPrice: 450000,
        monthlyPrice: 4200,
        firstPayment: 22500,  // 5% deposit
        contractMonths: 36,
        mileagePerYear: 15000
      })

      // Should have reasonable scores for premium car
      expect(bmwX3.totalScore).toBeGreaterThan(30)
      expect(bmwX3.totalScore).toBeLessThan(90)
      
      // Deposit should impact both EML and upfront scores
      expect(bmwX3.eml12Percent).toBeGreaterThan(bmwX3.emlTermPercent)
      expect(bmwX3.firstPaymentPercent).toBeCloseTo(5, 1)
    })

    test('economy car with zero deposit', () => {
      const polo = calculateLeaseScore({
        retailPrice: 200000,
        monthlyPrice: 2100,
        firstPayment: 0,
        contractMonths: 24,
        mileagePerYear: 15000
      })

      // Should score well due to no deposit
      expect(polo.upfrontScore).toBe(100)  // No deposit = perfect upfront score
      expect(polo.eml12Percent).toBe(polo.emlTermPercent)  // Same EML
      expect(polo.totalScore).toBeGreaterThan(60)  // Should be good overall
    })
  })
})