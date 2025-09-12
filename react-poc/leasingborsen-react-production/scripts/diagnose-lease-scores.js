#!/usr/bin/env node

/**
 * Diagnose Lease Scores for specific listings (v2.1 logic)
 * - Fetches listings from Supabase `full_listing_view`
 * - Selects the same offer as the UI (target deposit 35k, mileage 15k default, term preference 36/24/48)
 * - Computes EML-based lease score breakdown
 * - Prints a concise comparison to explain score differences
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function selectBestOffer(leasePricing, targetMileage = 15000, targetDeposit = 35000, targetTerm, strictMode = true) {
  if (!Array.isArray(leasePricing) || leasePricing.length === 0) return null

  let matchingOffers
  if (strictMode) {
    if (targetMileage === 35000) {
      const acceptable = [35000, 40000, 45000, 50000]
      matchingOffers = leasePricing.filter(o => acceptable.includes(o.mileage_per_year))
    } else {
      matchingOffers = leasePricing.filter(o => o.mileage_per_year === targetMileage)
    }
    if (matchingOffers.length === 0) return null
  } else {
    const mileages = [...new Set(leasePricing.map(o => o.mileage_per_year))]
    if (mileages.length === 0) return null
    const closestDist = Math.min(...mileages.map(m => Math.abs(m - targetMileage)))
    const closest = Math.min(...mileages.filter(m => Math.abs(m - targetMileage) === closestDist))
    matchingOffers = leasePricing.filter(o => o.mileage_per_year === closest)
  }

  const termPreference = Array.from(new Set(targetTerm ? [targetTerm, 36, 24, 48] : [36, 24, 48]))
  for (const term of termPreference) {
    const termOffers = matchingOffers.filter(o => o.period_months === term)
    if (termOffers.length === 0) continue
    let selected = termOffers.find(o => o.first_payment === targetDeposit)
    if (!selected) {
      const sorted = termOffers
        .map(o => ({ o, dist: Math.abs(o.first_payment - targetDeposit) }))
        .sort((a, b) => (a.dist - b.dist) || (a.o.monthly_price - b.o.monthly_price))
      selected = sorted[0].o
    }
    return selected
  }
  return null
}

// v2.1 Lease Score implementation (matching src/lib/leaseScore.ts)
function calculateLeaseScore({ retailPrice, monthlyPrice, mileagePerYear, firstPayment, contractMonths = 36 }) {
  const validated = {
    retailPrice: Math.max(0, retailPrice || 0),
    monthlyPrice: Math.max(0, monthlyPrice || 0),
    mileagePerYear: Math.max(0, mileagePerYear || 0),
    firstPayment: Math.max(0, firstPayment || 0),
    contractMonths: contractMonths || 36,
  }
  if (validated.retailPrice <= 0 || validated.monthlyPrice <= 0) {
    return { totalScore: 0, monthlyRateScore: 0, monthlyRatePercent: 0, mileageScore: 0, mileageNormalized: 0, upfrontScore: 0, firstPaymentPercent: 0, eml12Percent: 0, emlTermPercent: 0, emlBlendPercent: 0, calculation_version: '2.1', baseline: { method: 'not_scorable' } }
  }

  // Monthly (EML)
  if (validated.retailPrice < 75000 || validated.retailPrice > 2500000) {
    return { totalScore: 0, monthlyRateScore: 0, monthlyRatePercent: 0, mileageScore: 0, mileageNormalized: 0, upfrontScore: 0, firstPaymentPercent: 0, eml12Percent: 0, emlTermPercent: 0, emlBlendPercent: 0, calculation_version: '2.1', baseline: { method: 'implausible_retail', retailPrice: validated.retailPrice } }
  }
  const eml12 = validated.monthlyPrice + (validated.firstPayment / 12)
  const emlTerm = validated.monthlyPrice + (validated.firstPayment / validated.contractMonths)
  const eml12Percent = (eml12 / validated.retailPrice) * 100
  const emlTermPercent = (emlTerm / validated.retailPrice) * 100
  const emlBlendPercent = (0.7 * eml12Percent) + (0.3 * emlTermPercent)
  const BEST_EML = 0.85
  const WORST_EML = 2.25
  const rawMonthly = 100 * (WORST_EML - emlBlendPercent) / (WORST_EML - BEST_EML)
  const monthlyRateScore = Math.max(0, Math.min(100, Math.round(rawMonthly)))

  // Mileage
  let mileageScore = 20
  if (validated.mileagePerYear >= 25000) mileageScore = 100
  else if (validated.mileagePerYear >= 20000) mileageScore = 90
  else if (validated.mileagePerYear >= 15000) mileageScore = 75
  else if (validated.mileagePerYear >= 12000) mileageScore = 55
  else if (validated.mileagePerYear >= 10000) mileageScore = 35

  // Upfront
  const firstPaymentPercent = (validated.firstPayment / validated.retailPrice) * 100
  let upfrontScore = 25
  if (firstPaymentPercent <= 0) upfrontScore = 100
  else if (firstPaymentPercent <= 3) upfrontScore = 95
  else if (firstPaymentPercent <= 5) upfrontScore = 90
  else if (firstPaymentPercent <= 7) upfrontScore = 80
  else if (firstPaymentPercent <= 10) upfrontScore = 70
  else if (firstPaymentPercent <= 15) upfrontScore = 55
  else if (firstPaymentPercent <= 20) upfrontScore = 40

  const totalScore = Math.round(monthlyRateScore * 0.45 + mileageScore * 0.35 + upfrontScore * 0.20)
  return {
    totalScore: Math.max(0, Math.min(100, totalScore)),
    monthlyRateScore,
    monthlyRatePercent: emlBlendPercent,
    mileageScore,
    mileageNormalized: validated.mileagePerYear,
    upfrontScore,
    firstPaymentPercent,
    eml12Percent,
    emlTermPercent,
    emlBlendPercent,
    calculation_version: '2.1',
    baseline: { method: 'anchors' },
  }
}

async function fetchListing(id) {
  const { data, error } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('id', id)
    .not('monthly_price', 'is', null)

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Listing not found')
  const listing = data[0]
  return listing
}

function summarize(id, listing, selectedOffer, score) {
  return {
    id,
    make: listing.make,
    model: listing.model,
    retail_price: listing.retail_price,
    offer: {
      monthly_price: selectedOffer?.monthly_price,
      mileage_per_year: selectedOffer?.mileage_per_year,
      period_months: selectedOffer?.period_months,
      first_payment: selectedOffer?.first_payment,
    },
    scores: score,
  }
}

function formatSummary(s) {
  const { id, make, model, retail_price, offer, scores } = s
  return [
    `ID: ${id}  ${make} ${model}  Retail: ${retail_price?.toLocaleString('da-DK')} kr`,
    `Offer => ${offer?.period_months} mdr, ${offer?.mileage_per_year?.toLocaleString('da-DK')} km/år, ${offer?.first_payment?.toLocaleString('da-DK')} kr upfront, ${offer?.monthly_price?.toLocaleString('da-DK')} kr/md`,
    `EML%: blend=${scores.emlBlendPercent.toFixed(2)}% (12m=${scores.eml12Percent.toFixed(2)}%, term=${scores.emlTermPercent.toFixed(2)}%)`,
    `Component scores => monthly=${scores.monthlyRateScore}, mileage=${scores.mileageScore}, upfront=${scores.upfrontScore}`,
    `Total LeaseScore: ${scores.totalScore}`,
  ].join('\n')
}

async function main() {
  const ids = process.argv.slice(2).filter(Boolean)
  if (ids.length < 2) {
    console.error('Usage: node scripts/diagnose-lease-scores.js <listing_id1> <listing_id2> [targetMileage] [targetDeposit] [targetTerm]')
    process.exit(1)
  }
  const [id1, id2, mileageArg, depositArg, termArg] = ids
  const targetMileage = mileageArg ? parseInt(mileageArg) : 15000
  const targetDeposit = depositArg ? parseInt(depositArg) : 35000
  const targetTerm = termArg ? parseInt(termArg) : undefined

  console.log(`Using staging at ${SUPABASE_URL}`)
  console.log(`Selection: mileage=${targetMileage}, deposit=${targetDeposit}, term=${targetTerm ?? 'auto (36/24/48)'}`)

  const [l1, l2] = await Promise.all([fetchListing(id1), fetchListing(id2)])

  const offers1 = Array.isArray(l1.lease_pricing) ? l1.lease_pricing : []
  const offers2 = Array.isArray(l2.lease_pricing) ? l2.lease_pricing : []

  const s1 = selectBestOffer(offers1, targetMileage, targetDeposit, targetTerm, true)
  const s2 = selectBestOffer(offers2, targetMileage, targetDeposit, targetTerm, true)

  if (!s1) throw new Error(`No matching offer for listing ${id1}`)
  if (!s2) throw new Error(`No matching offer for listing ${id2}`)

  const b1 = calculateLeaseScore({
    retailPrice: l1.retail_price,
    monthlyPrice: s1.monthly_price,
    mileagePerYear: s1.mileage_per_year,
    firstPayment: s1.first_payment || 0,
    contractMonths: s1.period_months,
  })
  const b2 = calculateLeaseScore({
    retailPrice: l2.retail_price,
    monthlyPrice: s2.monthly_price,
    mileagePerYear: s2.mileage_per_year,
    firstPayment: s2.first_payment || 0,
    contractMonths: s2.period_months,
  })

  const summary1 = summarize(id1, l1, s1, b1)
  const summary2 = summarize(id2, l2, s2, b2)

  console.log('\n=== Listing A ===')
  console.log(formatSummary(summary1))
  console.log('\n=== Listing B ===')
  console.log(formatSummary(summary2))

  const diff = {
    total: summary1.scores.totalScore - summary2.scores.totalScore,
    monthly: summary1.scores.monthlyRateScore - summary2.scores.monthlyRateScore,
    mileage: summary1.scores.mileageScore - summary2.scores.mileageScore,
    upfront: summary1.scores.upfrontScore - summary2.scores.upfrontScore,
    emlBlend: summary1.scores.emlBlendPercent - summary2.scores.emlBlendPercent,
  }

  console.log('\n=== Differences (A - B) ===')
  console.log(`Total: ${diff.total}`)
  console.log(`Monthly component: ${diff.monthly}`)
  console.log(`Mileage component: ${diff.mileage}`)
  console.log(`Upfront component: ${diff.upfront}`)
  console.log(`EML% blend delta: ${diff.emlBlend.toFixed(2)}%`)
}

main().catch(err => {
  console.error('Failed to diagnose:', err.message)
  process.exit(1)
})

