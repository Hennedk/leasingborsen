import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

// Trusted domains for PDF downloads
const TRUSTED_DOMAINS = [
  'volkswagen.dk',
  'vw.dk',
  'audi.dk',
  'bmw.dk',
  'mercedes-benz.dk',
  'mercedes.dk',
  'ford.dk',
  'toyota.dk',
  'nissan.dk',
  'hyundai.dk',
  'kia.dk',
  'kiaonline.dk',
  'skoda.dk',
  'seat.dk',
  'cupra.dk',
  'cupradanmark.dk',
  'renault.dk',
  'peugeot.dk',
  'citroen.dk',
  'opel.dk',
  'volvo.dk',
  'volvocars.dk',
  'tesla.com',
  'polestar.com',
  'privatleasing.dk',
  'prislister.volkswagen.dk',
  'prislister.cupradanmark.dk',
  'katalog.hyundai.dk',
  'privatleasing.renault.dk'
]

function isDomainTrusted(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    return TRUSTED_DOMAINS.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`) ||
      hostname.includes(domain)
    )
  } catch {
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[pdf-proxy] Request received')

  try {
    // Parse request
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL parameter is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[pdf-proxy] Requested URL:', url)

    // Validate URL format
    let targetUrl: URL
    try {
      targetUrl = new URL(url)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if domain is trusted
    if (!isDomainTrusted(url)) {
      console.log('[pdf-proxy] Untrusted domain:', targetUrl.hostname)
      return new Response(
        JSON.stringify({ 
          error: 'Domain not in trusted list',
          domain: targetUrl.hostname 
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('[pdf-proxy] Fetching from trusted domain:', targetUrl.hostname)

    // Fetch the PDF
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*'
      }
    })

    console.log('[pdf-proxy] Response status:', response.status)
    console.log('[pdf-proxy] Content-Type:', response.headers.get('content-type'))
    console.log('[pdf-proxy] Content-Length:', response.headers.get('content-length'))

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch PDF: ${response.status} ${response.statusText}` 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the content
    const buffer = await response.arrayBuffer()

    // Return the PDF with appropriate headers
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/pdf',
        'Content-Length': response.headers.get('content-length') || buffer.byteLength.toString(),
        'Content-Disposition': `inline; filename="${url.split('/').pop()?.split('?')[0] || 'document.pdf'}"`
      }
    })

  } catch (error) {
    console.error('[pdf-proxy] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})