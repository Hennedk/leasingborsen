import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

interface LeaseScoreInput {
  retailPrice: number
  monthlyPrice: number
  mileagePerYear: number
  contractMonths: number
}

interface LeaseScoreBreakdown {
  totalScore: number
  monthlyRateScore: number
  monthlyRatePercent: number
  mileageScore: number
  mileageNormalized: number
  flexibilityScore: number
}

export function calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown {
  // Validate inputs
  if (!input.retailPrice || input.retailPrice <= 0) {
    throw new Error('Invalid retail price')
  }
  if (!input.monthlyPrice || input.monthlyPrice <= 0) {
    throw new Error('Invalid monthly price')
  }
  if (!input.mileagePerYear || input.mileagePerYear < 0) {
    throw new Error('Invalid mileage per year')
  }
  if (!input.contractMonths || input.contractMonths <= 0) {
    throw new Error('Invalid contract months')
  }

  // 1. Monthly Rate Score (45% weight)
  const monthlyRatePercent = (input.monthlyPrice / input.retailPrice) * 100
  let monthlyRateScore: number
  
  if (monthlyRatePercent < 0.9) monthlyRateScore = 100
  else if (monthlyRatePercent < 1.1) monthlyRateScore = 90
  else if (monthlyRatePercent < 1.3) monthlyRateScore = 80
  else if (monthlyRatePercent < 1.5) monthlyRateScore = 70
  else if (monthlyRatePercent < 1.7) monthlyRateScore = 60
  else if (monthlyRatePercent < 1.9) monthlyRateScore = 50
  else if (monthlyRatePercent < 2.1) monthlyRateScore = 40
  else monthlyRateScore = 25

  // 2. Mileage Score (35% weight) - Normalized to 15,000 km baseline
  const mileageNormalized = input.mileagePerYear / 15000
  let mileageScore: number
  
  if (mileageNormalized >= 1.67) mileageScore = 100      // 25,000+ km
  else if (mileageNormalized >= 1.33) mileageScore = 90  // 20,000 km
  else if (mileageNormalized >= 1.0) mileageScore = 75   // 15,000 km
  else if (mileageNormalized >= 0.8) mileageScore = 55   // 12,000 km
  else if (mileageNormalized >= 0.67) mileageScore = 35  // 10,000 km
  else mileageScore = 20

  // 3. Flexibility Score (20% weight)
  let flexibilityScore: number
  
  if (input.contractMonths <= 12) flexibilityScore = 100
  else if (input.contractMonths <= 24) flexibilityScore = 90
  else if (input.contractMonths <= 36) flexibilityScore = 75
  else if (input.contractMonths <= 48) flexibilityScore = 55
  else flexibilityScore = 30

  // Calculate weighted total
  const totalScore = Math.round(
    (monthlyRateScore * 0.45) +
    (mileageScore * 0.35) +
    (flexibilityScore * 0.20)
  )

  return {
    totalScore,
    monthlyRateScore,
    monthlyRatePercent: Math.round(monthlyRatePercent * 100) / 100,
    mileageScore,
    mileageNormalized: Math.round(mileageNormalized * 100) / 100,
    flexibilityScore
  }
}

serve(async (req) => {
  // Apply rate limiting for general operations
  return rateLimiters.general(req, async (req) => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const input = await req.json() as LeaseScoreInput

    // Calculate score
    const scoreBreakdown = calculateLeaseScore(input)

    return new Response(
      JSON.stringify(scoreBreakdown),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error calculating lease score:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  }) // End of rate limiting wrapper
})