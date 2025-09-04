/**
 * Lease Score Configuration (v2.1)
 * 
 * Configuration for Effective Monthly (EML) lease scoring system.
 * Values based on Danish market analysis and requirements specification.
 */

// Type safety for percentages - prevents 100x scaling errors
export type Percent = number // 0.85 means 0.85% of retail, NOT 85%
export type Fraction = number // 0.0085 means 0.85% as fraction

/**
 * IMPORTANT: All percentage values in this config are expressed as percentages
 * (e.g., 0.85 = 0.85% of retail price), NOT as fractions.
 */
export const LEASE_SCORE_CONFIG = {
  // Anchors from specification (will be calibrated with real data)
  anchors: {
    BEST_EML: 0.85 as Percent,   // ≤0.85% of retail = 100 score  
    WORST_EML: 2.25 as Percent   // ≥2.25% of retail = 0 score
  },
  
  // Component weights
  weights: {
    monthly: 0.45,    // Monthly rate component (now EML-based)
    mileage: 0.35,    // Mileage allowance component
    upfront: 0.20     // TODO(v2.2): Reduce to 0.15 to minimize double-counting
  },
  
  // EML blend configuration for Danish market
  emlBlend: {
    weight12Month: 0.70,    // Weight for 12-month exit scenario
    weightFullTerm: 0.30    // Weight for full contract completion
  },
  
  // Retail price bounds for Danish market (DKK)
  retailPriceBounds: {
    MIN_PLAUSIBLE: 75_000,    // 75K DKK - cheapest leaseable cars
    MAX_PLAUSIBLE: 2_500_000  // 2.5M DKK - luxury ceiling
  } as const,
  
  // Version tracking
  version: '2.1' as const,
  
  // Known limitations for transparency
  knownLimitations: {
    doubleCountingDeposit: {
      impact: 'Deposits affect both EML calculation and upfront flexibility score',
      severity: 'medium' as const,
      plannedFix: 'v2.2 - Reduce upfront weight to 15% when fees integrated',
      workaround: 'Users understand deposit flexibility vs cost tradeoff'
    }
  } as const
} as const

/**
 * Baseline method tracking for debugging and transparency
 */
export type BaselineMethod = 
  | 'anchors'           // Normal EML calculation with anchors
  | 'not_scorable'      // Invalid data (zero/negative prices)
  | 'implausible_retail' // Retail price outside plausible bounds
  | 'invalid_price'     // Invalid or negative price values