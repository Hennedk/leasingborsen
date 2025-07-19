/**
 * Rate limiting middleware for Supabase Edge Functions
 * Prevents DDoS attacks and cost overruns
 */

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  keyGenerator?: (req: Request) => string  // Custom key generation
  skipSuccessfulRequests?: boolean  // Don't count successful requests
  skipFailedRequests?: boolean      // Don't count failed requests
  message?: string      // Custom error message
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (per function instance)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Default key generator - uses IP address and User-Agent
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  return `${ip}:${userAgent.substring(0, 50)}`
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later'
  } = config

  return async (req: Request, handler: (req: Request) => Promise<Response>): Promise<Response> => {
    const key = keyGenerator(req)
    const now = Date.now()
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs
      }
      rateLimitStore.set(key, entry)
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
      return new Response(
        JSON.stringify({ 
          error: message,
          retryAfter: retryAfter 
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        }
      )
    }

    // Increment counter before processing
    entry.count++
    
    try {
      // Process the request
      const response = await handler(req)
      
      // Optionally decrement counter for successful requests
      if (skipSuccessfulRequests && response.ok) {
        entry.count--
      }
      
      // Add rate limit headers to response while preserving existing headers
      const headers = new Headers(response.headers)
      headers.set('X-RateLimit-Limit', maxRequests.toString())
      headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString())
      headers.set('X-RateLimit-Reset', entry.resetTime.toString())
      
      // Ensure CORS headers are present
      if (!headers.has('Access-Control-Allow-Origin')) {
        headers.set('Access-Control-Allow-Origin', '*')
      }
      if (!headers.has('Access-Control-Allow-Headers')) {
        headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
      }
      if (!headers.has('Access-Control-Allow-Methods')) {
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
      
    } catch (error) {
      // Optionally decrement counter for failed requests
      if (skipFailedRequests) {
        entry.count--
      }
      throw error
    }
  }
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  // Strict rate limiting for AI operations (expensive)
  ai: rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,           // 10 requests per 15 minutes
    message: 'AI request limit exceeded. Please wait before trying again.'
  }),
  
  // Medium rate limiting for PDF proxy (resource intensive)
  pdf: rateLimit({
    windowMs: 5 * 60 * 1000,   // 5 minutes
    maxRequests: 20,           // 20 requests per 5 minutes
    message: 'PDF proxy request limit exceeded. Please wait before trying again.'
  }),
  
  // Generous rate limiting for general API calls
  general: rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 60,           // 60 requests per minute
    message: 'API request limit exceeded. Please wait before trying again.'
  }),
  
  // Strict rate limiting for batch operations
  batch: rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 5,            // 5 requests per hour
    message: 'Batch operation limit exceeded. Please wait before trying again.'
  })
}

/**
 * IP-based rate limiter (more restrictive)
 */
export const ipRateLimit = (config: Omit<RateLimitConfig, 'keyGenerator'>) => 
  rateLimit({
    ...config,
    keyGenerator: (req) => req.headers.get('x-forwarded-for') || 
                          req.headers.get('x-real-ip') || 
                          'unknown'
  })

/**
 * User ID-based rate limiter (for authenticated requests)
 */
export const userRateLimit = (config: Omit<RateLimitConfig, 'keyGenerator'>) => 
  rateLimit({
    ...config,
    keyGenerator: (req) => {
      // Extract user ID from JWT token
      const authHeader = req.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return 'anonymous'
      }
      
      try {
        const token = authHeader.substring(7)
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.sub || 'anonymous'
      } catch {
        return 'anonymous'
      }
    }
  })