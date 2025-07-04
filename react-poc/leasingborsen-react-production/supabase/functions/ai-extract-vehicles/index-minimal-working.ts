import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight immediately
  if (req.method === 'OPTIONS') {
    console.log('[ai-extract-vehicles] CORS preflight request received')
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  console.log(`[ai-extract-vehicles] ${req.method} request received`)

  try {
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Function is working',
      vehicles: [],
      itemsProcessed: 0,
      summary: {
        totalExtracted: 0,
        totalNew: 0,
        totalUpdated: 0,
        totalDeleted: 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('[ai-extract-vehicles] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})