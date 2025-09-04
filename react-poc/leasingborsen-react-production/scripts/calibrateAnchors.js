#!/usr/bin/env node

/**
 * Lease Score Anchor Calibration Script with CI Gates
 * 
 * This script validates that the EML score distribution is within acceptable ranges
 * and fails CI if the distribution is outside production readiness criteria.
 * 
 * MUST-FIX GATE: This is a mandatory CI gate that blocks deployment if failed.
 * 
 * Success Criteria:
 * - Median EML percentage: 55-70% range
 * - High scores (80+): 10-25% of listings
 * 
 * Usage:
 * - npm run calibrate:validate  (CI mode - exits 1 on failure)
 * - node scripts/calibrateAnchors.js  (Info mode - shows suggestions)
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Calculate percentile from sorted array
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0
  const index = (p / 100) * (arr.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1
  
  if (upper >= arr.length) return arr[arr.length - 1]
  return arr[lower] * (1 - weight) + arr[upper] * weight
}

/**
 * Calculate Effective Monthly percentage for a listing
 */
function calculateEMLPercent(listing) {
  const { monthly_price, first_payment = 0, period_months = 36, retail_price } = listing
  
  if (!retail_price || !monthly_price || retail_price <= 0 || monthly_price <= 0) {
    return null // Skip invalid listings
  }
  
  // EML calculations
  const eml12 = monthly_price + (first_payment / 12)
  const emlTerm = monthly_price + (first_payment / period_months)
  
  // Convert to percentages
  const eml12Percent = (eml12 / retail_price) * 100
  const emlTermPercent = (emlTerm / retail_price) * 100
  
  // Danish market blend (70% 12-month, 30% full-term)
  const emlBlendPercent = 0.7 * eml12Percent + 0.3 * emlTermPercent
  
  return emlBlendPercent
}

/**
 * Calculate score from EML percentage using proposed anchors
 */
function calculateScore(emlPercent, bestAnchor = 0.85, worstAnchor = 2.25) {
  if (emlPercent <= bestAnchor) return 100
  if (emlPercent >= worstAnchor) return 0
  
  const rawScore = 100 * (worstAnchor - emlPercent) / (worstAnchor - bestAnchor)
  return Math.max(0, Math.min(100, Math.round(rawScore)))
}

/**
 * Main calibration function with CI gates
 */
async function calibrateWithGates() {
  console.log('🔍 Fetching listings for anchor calibration...')
  
  // Fetch all listings with complete data needed for EML calculation
  const { data: listings, error } = await supabase
    .from('full_listing_view')
    .select('monthly_price, first_payment, period_months, retail_price')
    .not('retail_price', 'is', null)
    .not('monthly_price', 'is', null)
    .gt('retail_price', 0)
    .gt('monthly_price', 0)
  
  if (error) {
    console.error('❌ Failed to fetch listings:', error.message)
    process.exit(1)
  }
  
  if (!listings || listings.length === 0) {
    console.error('❌ No listings found for calibration')
    process.exit(1)
  }
  
  console.log(`📊 Analyzing ${listings.length} listings...`)
  
  // Calculate EML percentages
  const emlPercentages = listings
    .map(calculateEMLPercent)
    .filter(eml => eml !== null)
    .sort((a, b) => a - b)
  
  if (emlPercentages.length === 0) {
    console.error('❌ No valid EML calculations possible')
    process.exit(1)
  }
  
  console.log(`✅ Valid EML calculations: ${emlPercentages.length}`)
  
  // Calculate key percentiles
  const p02 = percentile(emlPercentages, 2)   // Best anchor candidate
  const p25 = percentile(emlPercentages, 25)
  const p50 = percentile(emlPercentages, 50)  // Median
  const p75 = percentile(emlPercentages, 75)
  const p98 = percentile(emlPercentages, 98)  // Worst anchor candidate
  
  // Calculate scores with proposed anchors
  const scoresAbove80 = emlPercentages.filter(eml => 
    calculateScore(eml, 0.85, 2.25) >= 80
  ).length
  const percentAbove80 = (scoresAbove80 / emlPercentages.length) * 100
  
  // Display distribution analysis
  console.log('\n📈 EML Distribution Analysis:')
  console.log(`   2nd percentile: ${p02.toFixed(2)}%`)
  console.log(`  25th percentile: ${p25.toFixed(2)}%`)
  console.log(`  50th percentile: ${p50.toFixed(2)}% (median)`)
  console.log(`  75th percentile: ${p75.toFixed(2)}%`)
  console.log(`  98th percentile: ${p98.toFixed(2)}%`)
  console.log(`  Scores 80+: ${scoresAbove80} (${percentAbove80.toFixed(1)}%)`)
  
  // CRITICAL CI GATES - Must pass for deployment
  const errors = []
  
  // Gate 1: Median range validation
  if (p50 < 55 || p50 > 70) {
    errors.push(`❌ GATE 1 FAILED: Median ${p50.toFixed(1)}% outside required range 55-70%`)
  } else {
    console.log(`✅ Gate 1 passed: Median ${p50.toFixed(1)}% within range 55-70%`)
  }
  
  // Gate 2: High score distribution validation
  if (percentAbove80 < 10 || percentAbove80 > 25) {
    errors.push(`❌ GATE 2 FAILED: ${percentAbove80.toFixed(1)}% score 80+ (required: 10-25%)`)
  } else {
    console.log(`✅ Gate 2 passed: ${percentAbove80.toFixed(1)}% score 80+ within range 10-25%`)
  }
  
  // Check if running in CI mode
  const isCI = process.argv.includes('--ci') || process.env.CI === 'true'
  
  if (errors.length > 0) {
    console.error('\n🚨 CALIBRATION GATE FAILED:')
    errors.forEach(error => console.error(error))
    
    if (isCI) {
      console.error('\n❌ Deployment blocked - fix distribution issues before proceeding')
      process.exit(1)
    } else {
      console.log('\n💡 Suggested fixes:')
      console.log('  1. Check data quality - remove outliers')
      console.log('  2. Adjust anchor values based on distribution')
      console.log('  3. Review EML calculation logic')
    }
  } else {
    console.log('\n✅ ALL CALIBRATION GATES PASSED')
  }
  
  // Suggest anchors based on data
  const suggestedBest = Math.round(p02 * 100) / 100
  const suggestedWorst = Math.round(p98 * 100) / 100
  
  console.log('\n🎯 Suggested anchor configuration:')
  console.log(`  BEST_EML: ${suggestedBest}%`)
  console.log(`  WORST_EML: ${suggestedWorst}%`)
  
  // Write configuration file if gates passed
  if (errors.length === 0) {
    const configPath = join(__dirname, '..', 'src', 'lib', 'leaseScoreConfig.ts')
    const configContent = `/**
 * Lease Score Configuration (v2.1)
 * Generated by calibration script on ${new Date().toISOString()}
 */

export type Percent = number // 0.85 means 0.85% of retail, NOT 85%

export const LEASE_SCORE_CONFIG = {
  // Anchors validated against ${emlPercentages.length} listings
  anchors: {
    BEST_EML: ${suggestedBest} as Percent,   // ${suggestedBest}% of retail price monthly
    WORST_EML: ${suggestedWorst} as Percent   // ${suggestedWorst}% of retail price monthly
  },
  
  // Weight configuration
  weights: {
    monthly: 0.45,
    mileage: 0.35,
    upfront: 0.20  // TODO(v2.2): Reduce to 0.15 to minimize double-counting
  },
  
  // EML blend configuration for Danish market
  emlBlend: {
    weight12Month: 0.70,    // Danish early exit weight
    weightFullTerm: 0.30
  },
  
  // Retail price bounds (DKK)
  retailPriceBounds: {
    MIN_PLAUSIBLE: 75_000,    // 75K DKK - cheapest leaseable cars
    MAX_PLAUSIBLE: 2_500_000  // 2.5M DKK - luxury ceiling
  },
  
  // Version tracking
  version: '2.1',
  calibratedAt: '${new Date().toISOString()}',
  
  // Distribution metrics at calibration
  calibrationMetrics: {
    listingsAnalyzed: ${emlPercentages.length},
    median: ${p50.toFixed(2)},
    percentAbove80: ${percentAbove80.toFixed(1)}
  }
} as const
`
    
    try {
      writeFileSync(configPath, configContent, 'utf8')
      console.log(`✅ Configuration written to ${configPath}`)
    } catch (writeError) {
      console.error('⚠️  Failed to write config file:', writeError.message)
    }
  }
  
  return {
    passed: errors.length === 0,
    errors,
    metrics: {
      listingsAnalyzed: emlPercentages.length,
      median: p50,
      percentAbove80,
      suggestedAnchors: { best: suggestedBest, worst: suggestedWorst }
    }
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  calibrateWithGates()
    .then(result => {
      if (!result.passed) {
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('💥 Calibration failed:', error.message)
      process.exit(1)
    })
}