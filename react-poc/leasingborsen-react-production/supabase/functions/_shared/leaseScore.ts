/**
 * Lease Score Calculation Module (v2.0)
 * 
 * Centralized lease score calculation with deposit-based flexibility scoring.
 * This replaces the previous contract-term based scoring with upfront payment flexibility.
 * 
 * @version 2.0
 * @author System Architecture Team
 * @created 2025-01-08
 */

/**
 * Input parameters for lease score calculation
 */
export interface LeaseScoreInput {
  /** Retail price of the vehicle (in DKK) */
  retailPrice: number
  /** Monthly lease payment (in DKK) */
  monthlyPrice: number
  /** Allowed mileage per year (in km) */
  mileagePerYear: number
  /** First payment/deposit amount (in DKK) - already exists in DB */
  firstPayment: number
  /** Contract length in months - kept for compatibility, ignored in v2 */
  contractMonths?: number
}

/**
 * Detailed breakdown of lease score calculation
 */
export interface LeaseScoreBreakdown {
  /** Final calculated score (0-100) */
  totalScore: number
  /** Score for monthly payment rate (0-100) */
  monthlyRateScore: number
  /** Monthly payment as percentage of retail price */
  monthlyRatePercent: number
  /** Score for mileage allowance (0-100) */
  mileageScore: number
  /** Normalized mileage value */
  mileageNormalized: number
  /** Score for upfront payment flexibility (0-100) */
  upfrontScore: number
  /** First payment as percentage of retail price */
  firstPaymentPercent: number
  /** Calculation version for tracking */
  calculation_version: '2.0'
  /** Backwards compatibility field - maps to upfrontScore */
  flexibilityScore?: number
}

/**
 * Calculate monthly rate score based on payment as percentage of retail price
 * Weight: 45% of total score
 */
function calculateMonthlyRateScore(monthlyPrice: number, retailPrice: number): { score: number; percent: number } {
  if (retailPrice <= 0) return { score: 0, percent: 0 }
  
  const monthlyPercent = (monthlyPrice / retailPrice) * 100

  if (monthlyPercent < 0.9) return { score: 100, percent: monthlyPercent }
  if (monthlyPercent < 1.1) return { score: 90, percent: monthlyPercent }
  if (monthlyPercent < 1.3) return { score: 80, percent: monthlyPercent }
  if (monthlyPercent < 1.5) return { score: 70, percent: monthlyPercent }
  if (monthlyPercent < 1.7) return { score: 60, percent: monthlyPercent }
  if (monthlyPercent < 1.9) return { score: 50, percent: monthlyPercent }
  if (monthlyPercent < 2.1) return { score: 40, percent: monthlyPercent }
  
  return { score: 25, percent: monthlyPercent }
}

/**
 * Calculate mileage score based on annual allowance
 * Weight: 35% of total score
 */
function calculateMileageScore(mileagePerYear: number): { score: number; normalized: number } {
  const normalized = Math.max(0, mileagePerYear)

  if (normalized >= 25000) return { score: 100, normalized }
  if (normalized >= 20000) return { score: 90, normalized }
  if (normalized >= 15000) return { score: 75, normalized }
  if (normalized >= 12000) return { score: 55, normalized }
  if (normalized >= 10000) return { score: 35, normalized }
  
  return { score: 20, normalized }
}

/**
 * Calculate upfront payment score based on deposit as percentage of retail price
 * Lower upfront payment = better flexibility = higher score
 * Weight: 20% of total score
 */
function calculateUpfrontScore(firstPayment: number, retailPrice: number): { score: number; percent: number } {
  if (retailPrice <= 0) return { score: 0, percent: 0 }
  
  const firstPaymentPercent = (firstPayment / retailPrice) * 100

  if (firstPaymentPercent <= 0) return { score: 100, percent: firstPaymentPercent }
  if (firstPaymentPercent <= 3) return { score: 95, percent: firstPaymentPercent }
  if (firstPaymentPercent <= 5) return { score: 90, percent: firstPaymentPercent }
  if (firstPaymentPercent <= 7) return { score: 80, percent: firstPaymentPercent }
  if (firstPaymentPercent <= 10) return { score: 70, percent: firstPaymentPercent }
  if (firstPaymentPercent <= 15) return { score: 55, percent: firstPaymentPercent }
  if (firstPaymentPercent <= 20) return { score: 40, percent: firstPaymentPercent }
  
  return { score: 25, percent: firstPaymentPercent }
}

/**
 * Calculate comprehensive lease score with detailed breakdown
 * 
 * Formula v2.0:
 * - Monthly Rate Score (45% weight): Based on monthly payment as % of retail price
 * - Mileage Score (35% weight): Based on annual mileage allowance
 * - Upfront Score (20% weight): Based on deposit as % of retail price (lower = better)
 * 
 * @param input Lease parameters
 * @returns Detailed score breakdown
 */
export function calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown {
  // Input validation
  const retailPrice = Math.max(0, input.retailPrice || 0)
  const monthlyPrice = Math.max(0, input.monthlyPrice || 0)
  const mileagePerYear = Math.max(0, input.mileagePerYear || 0)
  const firstPayment = Math.max(0, input.firstPayment || 0)

  // Calculate component scores
  const monthlyRate = calculateMonthlyRateScore(monthlyPrice, retailPrice)
  const mileage = calculateMileageScore(mileagePerYear)
  const upfront = calculateUpfrontScore(firstPayment, retailPrice)

  // Calculate weighted total score
  const totalScore = Math.round(
    monthlyRate.score * 0.45 +
    mileage.score * 0.35 +
    upfront.score * 0.20
  )

  // Ensure score is within valid range
  const clampedScore = Math.max(0, Math.min(100, totalScore))

  return {
    totalScore: clampedScore,
    monthlyRateScore: monthlyRate.score,
    monthlyRatePercent: monthlyRate.percent,
    mileageScore: mileage.score,
    mileageNormalized: mileage.normalized,
    upfrontScore: upfront.score,
    firstPaymentPercent: upfront.percent,
    calculation_version: '2.0',
    // Backwards compatibility
    flexibilityScore: upfront.score
  }
}

/**
 * Simple wrapper that returns only the total score
 * Used for backwards compatibility and simple use cases
 * 
 * @param input Lease parameters
 * @returns Total score (0-100)
 */
export function calculateLeaseScoreSimple(input: LeaseScoreInput): number {
  return calculateLeaseScore(input).totalScore
}

/**
 * Legacy function signature for backwards compatibility
 * Converts individual parameters to LeaseScoreInput
 * 
 * @deprecated Use calculateLeaseScore with LeaseScoreInput instead
 */
export function calculateLeaseScoreLegacy(
  monthlyPrice: number,
  retailPrice: number,
  mileagePerYear: number,
  contractMonths: number,
  firstPayment: number = 0
): number {
  return calculateLeaseScoreSimple({
    monthlyPrice,
    retailPrice,
    mileagePerYear,
    firstPayment,
    contractMonths
  })
}