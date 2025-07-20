import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

// Import the calculation function from the other Edge Function
// In production, you might want to share this code via a shared module
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

function calculateLeaseScore(input: LeaseScoreInput): LeaseScoreBreakdown {
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
  // Apply rate limiting for batch operations
  return rateLimiters.batch(req, async (req) => {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Parse request parameters
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const forceRecalculate = url.searchParams.get('force') === 'true'

    // Build query for listings that need score calculation
    let query = supabase
      .from('listings')
      .select(`
        id,
        retail_price,
        lease_pricing!inner(
          id,
          monthly_price,
          period_months,
          mileage_per_year
        )
      `)
      .not('retail_price', 'is', null)
      .limit(limit)

    // Only get listings without scores unless force recalculate is set
    if (!forceRecalculate) {
      query = query.is('lease_score', null)
    }

    const { data: listings, error } = await query

    if (error) {
      throw new Error(`Failed to fetch listings: ${error.message}`)
    }

    let processed = 0
    let errors = 0
    const results: any[] = []

    for (const listing of listings || []) {
      try {
        // Calculate score for each pricing option
        const scores = listing.lease_pricing.map((pricing: any) => ({
          pricingId: pricing.id,
          score: calculateLeaseScore({
            retailPrice: listing.retail_price,
            monthlyPrice: pricing.monthly_price,
            contractMonths: pricing.period_months,
            mileagePerYear: pricing.mileage_per_year
          })
        }))

        // Use the best score (highest total)
        const bestScore = scores.reduce((best: any, current: any) => 
          current.score.totalScore > best.score.totalScore ? current : best
        )

        // Update listing with score
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            lease_score: bestScore.score.totalScore,
            lease_score_calculated_at: new Date().toISOString(),
            lease_score_breakdown: {
              ...bestScore.score,
              pricing_id: bestScore.pricingId,
              calculation_version: '1.0'
            }
          })
          .eq('id', listing.id)

        if (updateError) {
          throw updateError
        }

        processed++
        results.push({
          listing_id: listing.id,
          score: bestScore.score.totalScore,
          success: true
        })

      } catch (err) {
        console.error(`Failed to calculate score for listing ${listing.id}:`, err)
        errors++
        results.push({
          listing_id: listing.id,
          error: err instanceof Error ? err.message : 'Unknown error',
          success: false
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        total: listings?.length || 0,
        message: `Processed ${processed} listings with ${errors} errors`,
        results: results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Batch calculation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  }) // End of rate limiting wrapper
})