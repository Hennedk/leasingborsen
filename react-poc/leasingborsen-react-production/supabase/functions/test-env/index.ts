import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check environment variables
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    
    const envCheck = {
      openaiKeyExists: !!openaiKey,
      openaiKeyLength: openaiKey ? openaiKey.length : 0,
      openaiKeyStart: openaiKey ? openaiKey.substring(0, 8) : 'NOT_SET',
      openaiKeyEnd: openaiKey ? openaiKey.substring(openaiKey.length - 4) : 'NOT_SET',
      allEnvVars: Object.keys(Deno.env.toObject()).filter(key => 
        key.includes('OPENAI') || key.includes('API')
      )
    }

    return new Response(
      JSON.stringify(envCheck, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})