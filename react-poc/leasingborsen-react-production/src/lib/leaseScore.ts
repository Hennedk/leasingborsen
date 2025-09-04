/**
 * Lease Score Calculation Module (v2.1) - MASTER SOURCE
 * 
 * Centralized lease score calculation with Effective Monthly (EML) scoring.
 * v2.1: Replaces raw monthly rates with Denmark-aware effective monthly costs
 * that amortize upfront payments over realistic exit horizons.
 * 
 * SINGLE SOURCE OF TRUTH: This file is the authoritative implementation
 * - Used directly by Edge Functions (Deno environment)
 * - Automatically synced to supabase/functions/_shared/leaseScore.ts
 * - Changes here propagate to all implementations via sync script
 * - Run `npm run sync:leaseScore` after making changes
 * 
 * Key v2.1 Changes:
 * - Effective Monthly calculation with 70/30 Danish market weighting
 * - Retail price bounds (75K-2.5M DKK) for data quality
 * - Anchor-based scoring replacing step-based thresholds
 * - Enhanced breakdown with EML component tracking
 * 
 * @version 2.1
 * @author System Architecture Team
 * @updated 2025-01-05
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
  /** Monthly payment as percentage of retail price (v2.1: contains emlBlendPercent) */
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
  calculation_version: '2.1'
  /** Backwards compatibility field - maps to upfrontScore */
  flexibilityScore?: number
  
  // New v2.1 EML fields
  /** Effective Monthly for 12-month exit as percentage of retail */
  eml12Percent: number
  /** Effective Monthly for full term as percentage of retail */
  emlTermPercent: number
  /** Blended Effective Monthly (70% 12-month, 30% full-term) */
  emlBlendPercent: number
  /** Baseline method used for calculation */
  baseline: { method: string, [key: string]: any }
  /** Optional pricing ID for tracking */
  pricingId?: string
}

/**
 * Calculate monthly rate score using Effective Monthly (EML) calculation
 * Weight: 45% of total score
 * 
 * v2.1: Replaces simple monthly/retail ratio with EML that accounts for
 * upfront payments amortized over Danish market exit horizons.
 */
function calculateMonthlyRateScore(input: LeaseScoreInput): { 
  score: number
  percent: number
  eml12Percent: number
  emlTermPercent: number
  baseline: { method: string, [key: string]: any }
} {
  const {
    retailPrice,
    monthlyPrice,
    firstPayment = 0,
    contractMonths = 36
  } = input

  // Guard: Invalid or negative prices
  if (retailPrice <= 0 || monthlyPrice <= 0) {
    return { 
      score: 0, 
      percent: 0,
      eml12Percent: 0,
      emlTermPercent: 0,
      baseline: { method: 'invalid_price' }
    }
  }
  
  // Guard: Implausible retail price (prevents anchor distortion)
  const RETAIL_PRICE_BOUNDS = {
    MIN_PLAUSIBLE: 75_000,    // 75K DKK - cheapest leaseable cars
    MAX_PLAUSIBLE: 2_500_000  // 2.5M DKK - luxury ceiling
  }
  
  if (retailPrice < RETAIL_PRICE_BOUNDS.MIN_PLAUSIBLE || 
      retailPrice > RETAIL_PRICE_BOUNDS.MAX_PLAUSIBLE) {
    return {
      score: 0,
      percent: 0, 
      eml12Percent: 0,
      emlTermPercent: 0,
      baseline: { 
        method: 'implausible_retail',
        retailPrice,
        bounds: RETAIL_PRICE_BOUNDS
      }
    }
  }

  // EML calculations
  const eml12 = monthlyPrice + (firstPayment / 12)        // 12-month exit scenario
  const emlTerm = monthlyPrice + (firstPayment / contractMonths)  // Full contract scenario
  
  // IMPORTANT: These are percentages (0.85 = 0.85%, not fractions)
  const eml12Percent = (eml12 / retailPrice) * 100
  const emlTermPercent = (emlTerm / retailPrice) * 100
  
  // Danish market blend (70% 12-month weight, 30% full-term weight)
  const emlBlendPercent = (0.7 * eml12Percent) + (0.3 * emlTermPercent)
  
  // Anchor-based scoring (from configuration)
  const BEST_EML = 0.85   // ≤0.85% of retail = 100 score
  const WORST_EML = 2.25  // ≥2.25% of retail = 0 score
  
  const rawScore = 100 * (WORST_EML - emlBlendPercent) / (WORST_EML - BEST_EML)
  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  return {
    score,
    percent: emlBlendPercent,  // This becomes monthlyRatePercent in breakdown
    eml12Percent,
    emlTermPercent,
    baseline: { method: 'anchors' }
  }
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
 * Formula v2.1:
 * - Monthly Rate Score (45% weight): Based on Effective Monthly Load (EML) with Danish market weighting
 * - Mileage Score (35% weight): Based on annual mileage allowance
 * - Upfront Score (20% weight): Based on deposit as % of retail price (lower = better)
 * 
 * @param input Lease parameters
 * @returns Detailed score breakdown
 */
export function calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown {
  // Input validation with defaults
  const validatedInput = {
    retailPrice: Math.max(0, input.retailPrice || 0),
    monthlyPrice: Math.max(0, input.monthlyPrice || 0),
    mileagePerYear: Math.max(0, input.mileagePerYear || 0),
    firstPayment: Math.max(0, input.firstPayment || 0),
    contractMonths: input.contractMonths || 36  // NOW USED in EML calculation
  }

  // Check if scorable
  if (validatedInput.retailPrice <= 0 || validatedInput.monthlyPrice <= 0) {
    return {
      totalScore: 0,
      monthlyRateScore: 0,
      monthlyRatePercent: 0,
      mileageScore: 0,
      mileageNormalized: 0,
      upfrontScore: 0,
      firstPaymentPercent: 0,
      flexibilityScore: 0,
      eml12Percent: 0,
      emlTermPercent: 0,
      emlBlendPercent: 0,
      calculation_version: '2.1',
      baseline: { method: 'not_scorable' }
    }
  }

  // Calculate component scores
  const monthlyRate = calculateMonthlyRateScore(validatedInput)
  
  // Handle special cases (implausible retail price, invalid data)
  if (monthlyRate.baseline.method !== 'anchors') {
    return {
      totalScore: 0,
      monthlyRateScore: 0,
      monthlyRatePercent: 0,
      mileageScore: 0,
      mileageNormalized: 0,
      upfrontScore: 0,
      firstPaymentPercent: 0,
      flexibilityScore: 0,
      eml12Percent: monthlyRate.eml12Percent,
      emlTermPercent: monthlyRate.emlTermPercent,
      emlBlendPercent: monthlyRate.percent,
      calculation_version: '2.1',
      baseline: monthlyRate.baseline
    }
  }
  
  const mileage = calculateMileageScore(validatedInput.mileagePerYear)
  const upfront = calculateUpfrontScore(validatedInput.firstPayment, validatedInput.retailPrice)

  // Calculate weighted total score
  // TODO(v2.2): Consider reducing upfront weight from 20% to 15% to minimize double-counting
  // Double-counting issue: Deposits impact both EML calculation AND upfront flexibility score
  const totalScore = Math.round(
    monthlyRate.score * 0.45 +
    mileage.score * 0.35 +
    upfront.score * 0.20  // Known limitation: Double-counts deposit impact
  )

  // Ensure score is within valid range
  const clampedScore = Math.max(0, Math.min(100, totalScore))

  return {
    totalScore: clampedScore,
    monthlyRateScore: monthlyRate.score,
    monthlyRatePercent: monthlyRate.percent,  // Now contains EML blend
    mileageScore: mileage.score,
    mileageNormalized: mileage.normalized,
    upfrontScore: upfront.score,
    firstPaymentPercent: upfront.percent,
    // New v2.1 fields
    eml12Percent: monthlyRate.eml12Percent,
    emlTermPercent: monthlyRate.emlTermPercent,
    emlBlendPercent: monthlyRate.percent,
    calculation_version: '2.1',
    baseline: monthlyRate.baseline,
    // Backward compatibility
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