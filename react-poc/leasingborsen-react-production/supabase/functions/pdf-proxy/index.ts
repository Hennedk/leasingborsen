import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

// Initialize Supabase client with service role for database queries
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// In-memory cache for domain validation (5-minute TTL)
const domainCache = new Map<string, { valid: boolean, expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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

// Cache management functions
function getCachedDomainValidation(hostname: string): boolean | null {
  const cached = domainCache.get(hostname)
  if (cached && cached.expires > Date.now()) {
    return cached.valid
  }
  // Remove expired entries
  if (cached) {
    domainCache.delete(hostname)
  }
  return null
}

function setCachedDomainValidation(hostname: string, valid: boolean): void {
  domainCache.set(hostname, {
    valid,
    expires: Date.now() + CACHE_TTL
  })
}

// URL matching helper function
function urlMatchesDomain(requestUrl: string, dealerUrl: string): boolean {
  try {
    const requestUrlObj = new URL(requestUrl)
    const dealerUrlObj = new URL(dealerUrl)
    
    const requestHostname = requestUrlObj.hostname.toLowerCase()
    const dealerHostname = dealerUrlObj.hostname.toLowerCase()
    
    // Exact hostname match
    if (requestHostname === dealerHostname) {
      return true
    }
    
    // Subdomain match (request can be from subdomain of dealer domain)
    if (requestHostname.endsWith(`.${dealerHostname}`)) {
      return true
    }
    
    return false
  } catch {
    return false
  }
}

// Dynamic dealer URL validation with database lookup
async function isDealerUrlTrusted(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Check cache first
    const cachedResult = getCachedDomainValidation(hostname)
    if (cachedResult !== null) {
      console.log(`[pdf-proxy] Cache hit for domain: ${hostname} (result: ${cachedResult})`)
      return cachedResult
    }
    
    // Same security checks (HTTPS, IP blocking)
    if (urlObj.protocol !== 'https:') {
      console.warn(`[pdf-proxy] Blocked non-HTTPS URL: ${url}`)
      setCachedDomainValidation(hostname, false)
      return false
    }
    
    if (await isBlockedIP(hostname)) {
      console.warn(`[pdf-proxy] Blocked suspicious IP/hostname: ${hostname}`)
      setCachedDomainValidation(hostname, false)
      return false
    }
    
    // Query database for matching dealer PDF URLs
    console.log(`[pdf-proxy] Querying database for domain: ${hostname}`)
    const { data: dealers, error } = await supabase
      .from('sellers')
      .select('id, name, pdf_url, pdf_urls')
      .or('pdf_url.neq.null,pdf_urls.neq.null')
    
    if (error) {
      console.error(`[pdf-proxy] Database query error:`, error)
      setCachedDomainValidation(hostname, false)
      return false
    }
    
    // Check if requested URL matches any dealer PDF URL
    const isMatch = dealers?.some(dealer => {
      // Check legacy single PDF URL
      if (dealer.pdf_url && urlMatchesDomain(url, dealer.pdf_url)) {
        console.log(`[pdf-proxy] URL matched dealer ${dealer.name} (single PDF URL)`)
        return true
      }
      
      // Check modern multiple PDF URLs array
      if (dealer.pdf_urls && Array.isArray(dealer.pdf_urls)) {
        const matchedUrl = dealer.pdf_urls.find((pdfUrl: any) => 
          pdfUrl.url && urlMatchesDomain(url, pdfUrl.url)
        )
        if (matchedUrl) {
          console.log(`[pdf-proxy] URL matched dealer ${dealer.name} (PDF: ${matchedUrl.name})`)
          return true
        }
      }
      
      return false
    }) || false
    
    // Cache the result
    setCachedDomainValidation(hostname, isMatch)
    
    if (!isMatch) {
      console.warn(`[pdf-proxy] Domain not found in dealer database: ${hostname}`)
    }
    
    return isMatch
  } catch (error) {
    console.error(`[pdf-proxy] Dealer URL validation error:`, error)
    const hostname = new URL(url).hostname.toLowerCase()
    setCachedDomainValidation(hostname, false)
    return false // Fail securely
  }
}

// Enhanced domain validation with dynamic database lookup and static fallback
async function isDomainTrusted(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Only allow HTTPS URLs for security
    if (urlObj.protocol !== 'https:') {
      console.warn(`[pdf-proxy] Blocked non-HTTPS URL: ${url}`)
      return false
    }
    
    // Enhanced IP address blocking for SSRF prevention (with DNS resolution)
    if (await isBlockedIP(hostname)) {
      console.warn(`[pdf-proxy] Blocked suspicious IP/hostname: ${hostname}`)
      return false
    }
    
    // Try dynamic dealer URL validation first
    const isDealerTrusted = await isDealerUrlTrusted(url)
    if (isDealerTrusted) {
      console.log(`[pdf-proxy] URL validated via dealer database: ${hostname}`)
      return true
    }
    
    // Fallback to static trusted domains for backward compatibility
    const isStaticTrusted = TRUSTED_DOMAINS.some(domain => 
      hostname === domain || 
      hostname.endsWith(`.${domain}`)
    )
    
    if (isStaticTrusted) {
      console.log(`[pdf-proxy] URL validated via static domains: ${hostname}`)
      return true
    }
    
    console.warn(`[pdf-proxy] Domain not trusted by any method: ${hostname}`)
    return false
    
  } catch (error) {
    console.error(`[pdf-proxy] URL validation error: ${error.message}`)
    return false
  }
}

// Enhanced IP blocking function with comprehensive CIDR ranges and DNS resolution
async function isBlockedIP(hostname: string): Promise<boolean> {
  // Block localhost variations
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '0000:0000:0000:0000:0000:0000:0000:0001'].includes(hostname)) {
    return true
  }
  
  // Check if hostname is an IP address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i
  
  if (ipv4Regex.test(hostname)) {
    return isBlockedIPv4(hostname)
  }
  
  if (ipv6Regex.test(hostname)) {
    return isBlockedIPv6(hostname)
  }
  
  // For domain names, resolve to IP and validate (DNS rebinding protection)
  try {
    const resolvedIPs = await Deno.resolveDns(hostname, "A")
    for (const ip of resolvedIPs) {
      if (isBlockedIPv4(ip)) {
        console.warn(`[pdf-proxy] Domain ${hostname} resolves to blocked IP: ${ip}`)
        return true
      }
    }
  } catch (error) {
    console.warn(`[pdf-proxy] DNS resolution failed for ${hostname}: ${error.message}`)
    return true // Fail secure - block if we can't resolve
  }
  
  return false
}

// Comprehensive IPv4 CIDR range blocking
function isBlockedIPv4(ip: string): boolean {
  const blockedRanges = [
    // Private IP ranges (RFC 1918)
    { network: '10.0.0.0', prefix: 8 },
    { network: '172.16.0.0', prefix: 12 },
    { network: '192.168.0.0', prefix: 16 },
    
    // Loopback range (RFC 3330)
    { network: '127.0.0.0', prefix: 8 },
    
    // Link-local range (RFC 3927)
    { network: '169.254.0.0', prefix: 16 },
    
    // Cloud metadata services (CRITICAL for AWS, GCP, Azure)
    { network: '169.254.169.254', prefix: 32 }, // AWS/GCP metadata
    { network: '100.100.100.200', prefix: 32 }, // Azure metadata
    
    // Multicast range (RFC 3171)
    { network: '224.0.0.0', prefix: 4 },
    
    // Reserved/broadcast ranges
    { network: '0.0.0.0', prefix: 8 },        // "This" network
    { network: '240.0.0.0', prefix: 4 },      // Reserved for future use
    { network: '255.255.255.255', prefix: 32 } // Broadcast
  ]
  
  const ipInt = ipToInt(ip)
  
  return blockedRanges.some(range => {
    const networkInt = ipToInt(range.network)
    const mask = (0xFFFFFFFF << (32 - range.prefix)) >>> 0
    return (ipInt & mask) === (networkInt & mask)
  })
}

// IPv6 blocking (basic implementation)
function isBlockedIPv6(ip: string): boolean {
  const blockedPrefixes = [
    '::1',     // Loopback
    'fe80:',   // Link-local
    'fc00:',   // Unique local
    'fd00:',   // Unique local
    '::ffff:', // IPv4-mapped IPv6
  ]
  
  const normalizedIP = ip.toLowerCase()
  return blockedPrefixes.some(prefix => normalizedIP.startsWith(prefix))
}

// Convert IPv4 to integer for CIDR calculations
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
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
    if (!(await isDomainTrusted(url))) {
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