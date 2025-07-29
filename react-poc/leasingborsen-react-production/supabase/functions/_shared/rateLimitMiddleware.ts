/**
 * Enhanced rate limiting middleware for Supabase Edge Functions
 * Provides global, IP-based, and user-based rate limiting
 * Prevents DDoS attacks and cost overruns
 */

interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests per window
  keyGenerator?: (req: Request) => string  // Custom key generation
  skipSuccessfulRequests?: boolean  // Don't count successful requests
  skipFailedRequests?: boolean      // Don't count failed requests
  message?: string      // Custom error message
  global?: boolean      // Apply global rate limiting
  userBased?: boolean   // Apply user-based rate limiting
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory stores for different rate limiting types
const rateLimitStore = new Map<string, RateLimitEntry>()
const globalRateLimitStore = new Map<string, RateLimitEntry>()
const userRateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const stores = [rateLimitStore, globalRateLimitStore, userRateLimitStore]
  
  for (const store of stores) {
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key)
      }
    }
  }
}, 5 * 60 * 1000)

/**
 * Extract user ID from JWT token
 */
function extractUserId(req: Request): string | null {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || null
  } catch {
    return null
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown'
}

/**
 * Default key generator - uses IP address and User-Agent
 */
function defaultKeyGenerator(req: Request): string {
  const ip = getClientIP(req)
  const userAgent = req.headers.get('user-agent') || 'unknown'
  return `${ip}:${userAgent.substring(0, 50)}`
}

/**
 * Check rate limit for a specific store and key
 */
function checkRateLimit(store: Map<string, RateLimitEntry>, key: string, config: RateLimitConfig): {
  allowed: boolean
  retryAfter?: number
  remaining?: number
} {
  const now = Date.now()
  let entry = store.get(key)
  
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    }
    store.set(key, entry)
    return { allowed: true, remaining: config.maxRequests - 1 }
  }
  
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter, remaining: 0 }
  }
  
  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count }
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
    message = 'Too many requests, please try again later',
    global = false,
    userBased = false
  } = config

  return async (req: Request, handler: (req: Request) => Promise<Response>): Promise<Response> => {
    // Apply multiple layers of rate limiting
    
    // Layer 1: Global rate limiting (if enabled)
    if (global) {
      const globalKey = 'global'
      const globalResult = checkRateLimit(globalRateLimitStore, globalKey, {
        ...config,
        maxRequests: maxRequests * 10 // Global limit is 10x individual limit
      })
      
      if (!globalResult.allowed) {
        console.warn(`[rate-limit] Global rate limit exceeded`)
        return new Response(
          JSON.stringify({ 
            error: 'Global rate limit exceeded. System is under high load.',
            retryAfter: globalResult.retryAfter,
            type: 'global_limit'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Retry-After': globalResult.retryAfter!.toString(),
              'X-RateLimit-Limit': (maxRequests * 10).toString(),
              'X-RateLimit-Remaining': (globalResult.remaining || 0).toString()
            }
          }
        )
      }
    }
    
    // Layer 2: User-based rate limiting (if enabled and user is authenticated)
    if (userBased) {
      const userId = extractUserId(req)
      if (userId) {
        const userKey = `user:${userId}`
        const userResult = checkRateLimit(userRateLimitStore, userKey, config)
        
        if (!userResult.allowed) {
          console.warn(`[rate-limit] User rate limit exceeded for user: ${userId}`)
          return new Response(
            JSON.stringify({ 
              error: 'User rate limit exceeded. Please wait before making more requests.',
              retryAfter: userResult.retryAfter,
              type: 'user_limit'
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Retry-After': userResult.retryAfter!.toString(),
                'X-RateLimit-Limit': maxRequests.toString(),
                'X-RateLimit-Remaining': (userResult.remaining || 0).toString()
              }
            }
          )
        }
      }
    }
    
    // Layer 3: IP/Client-based rate limiting (default)
    const key = keyGenerator(req)
    const ipResult = checkRateLimit(rateLimitStore, key, config)
    
    if (!ipResult.allowed) {
      const clientIP = getClientIP(req)
      console.warn(`[rate-limit] IP rate limit exceeded for: ${clientIP}`)
      return new Response(
        JSON.stringify({ 
          error: message,
          retryAfter: ipResult.retryAfter,
          type: 'ip_limit'
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Retry-After': ipResult.retryAfter!.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': (ipResult.remaining || 0).toString()
          }
        }
      )
    }
    
    try {
      // Process the request
      const response = await handler(req)
      
      // Add rate limit headers to response while preserving existing headers
      const headers = new Headers(response.headers)
      headers.set('X-RateLimit-Limit', maxRequests.toString())
      headers.set('X-RateLimit-Remaining', (ipResult.remaining || 0).toString())
      
      // Add user-specific headers if applicable
      if (userBased) {
        const userId = extractUserId(req)
        if (userId) {
          headers.set('X-RateLimit-User', userId)
        }
      }
      
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
 * Pre-configured rate limiters for different use cases with enhanced controls
 */
export const rateLimiters = {
  // Strict rate limiting for AI operations (expensive) with global and user limits
  ai: rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,           // 10 requests per 15 minutes per IP
    message: 'AI request limit exceeded. Please wait before trying again.',
    global: true,              // Enable global rate limiting
    userBased: true            // Enable user-based rate limiting
  }),
  
  // Medium rate limiting for PDF proxy (resource intensive) with global limits
  pdf: rateLimit({
    windowMs: 5 * 60 * 1000,   // 5 minutes
    maxRequests: 20,           // 20 requests per 5 minutes per IP
    message: 'PDF proxy request limit exceeded. Please wait before trying again.',
    global: true               // Enable global rate limiting
  }),
  
  // Generous rate limiting for general API calls
  general: rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 60,           // 60 requests per minute per IP
    message: 'API request limit exceeded. Please wait before trying again.'
  }),
  
  // Strict rate limiting for batch operations with user tracking
  batch: rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 5,            // 5 requests per hour per IP
    message: 'Batch operation limit exceeded. Please wait before trying again.',
    userBased: true            // Enable user-based rate limiting for batch operations
  }),
  
  // Global emergency rate limiter (very strict)
  emergency: rateLimit({
    windowMs: 10 * 60 * 1000,  // 10 minutes
    maxRequests: 50,           // 50 requests per 10 minutes per IP
    message: 'Emergency rate limit active. System under maintenance.',
    global: true,
    userBased: true
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