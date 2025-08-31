import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'
import { 
  calculateLeaseScore, 
  type LeaseScoreInput, 
  type LeaseScoreBreakdown 
} from '../_shared/leaseScore.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

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
    const specificIds = url.searchParams.get('ids')?.split(',').filter(id => id.trim())

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
          mileage_per_year,
          first_payment
        )
      `)
      .not('retail_price', 'is', null)

    // If specific listing IDs are provided, filter to those IDs only
    if (specificIds && specificIds.length > 0) {
      query = query.in('id', specificIds)
    } else {
      // Otherwise use limit for general batch processing
      query = query.limit(limit)
    }

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
        // Calculate score for each pricing option using v2.0 formula
        const scores = listing.lease_pricing.map((pricing: any) => ({
          pricingId: pricing.id,
          score: calculateLeaseScore({
            retailPrice: listing.retail_price,
            monthlyPrice: pricing.monthly_price,
            mileagePerYear: pricing.mileage_per_year,
            firstPayment: pricing.first_payment || 0,
            contractMonths: pricing.period_months // Included for compatibility but ignored in v2
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
              pricing_id: bestScore.pricingId
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
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        } 
      }
    )

  } catch (error) {
    console.error('Batch calculation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        } 
      }
    )
  }
  }) // End of rate limiting wrapper
})