import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

  // Apply rate limiting for general operations
  return rateLimiters.general(req, async (req) => {
    try {
      // Only allow POST requests
      if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
          } 
        }
      )
    }

    // Parse request body
    const input = await req.json() as LeaseScoreInput

    // Calculate score using v2.0 formula
    const scoreBreakdown = calculateLeaseScore(input)

    return new Response(
      JSON.stringify(scoreBreakdown),
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
    console.error('Error calculating lease score:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 400, 
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