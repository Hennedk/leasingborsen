import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

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
  'privatleasing.renault.dk',
  'prisliste.cars4ever.eu',
  'cars4ever.eu'
]

function isDomainTrusted(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Additional security checks
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.startsWith('172.')) {
      return false
    }
    
    // Only allow HTTPS URLs for security
    if (urlObj.protocol !== 'https:') {
      return false
    }
    
    // Check against trusted domains
    return TRUSTED_DOMAINS.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight (before rate limiting)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apply rate limiting for PDF operations
  return rateLimiters.pdf(req, async (req) => {
    // console.log('[pdf-proxy] Request received')

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

    // console.log('[pdf-proxy] Requested URL:', url)

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
      // console.log('[pdf-proxy] Untrusted domain:', targetUrl.hostname)
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

    // console.log('[pdf-proxy] Fetching from trusted domain:', targetUrl.hostname)

    // Fetch the PDF with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/pdf,*/*'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // console.log('[pdf-proxy] Response status:', response.status)
      // console.log('[pdf-proxy] Content-Type:', response.headers.get('content-type'))
      // console.log('[pdf-proxy] Content-Length:', response.headers.get('content-length'))

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

      // Validate content type
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/pdf')) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid content type - expected PDF',
            receivedType: contentType
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check file size limit (50MB)
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ 
            error: 'File too large - maximum 50MB allowed',
            size: contentLength
          }),
          { 
            status: 413,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get the content
      const buffer = await response.arrayBuffer()

      // Double-check buffer size
      if (buffer.byteLength > 50 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ 
            error: 'File too large - maximum 50MB allowed',
            size: buffer.byteLength
          }),
          { 
            status: 413,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

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
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timeout - PDF fetch took too long' }),
          { 
            status: 408,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      throw error
    }

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
  }) // End of rate limiting wrapper
})