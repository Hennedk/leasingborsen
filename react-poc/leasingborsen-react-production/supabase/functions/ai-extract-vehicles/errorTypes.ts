// Error categorization and handling system

export enum ErrorType {
  // OpenAI API Errors
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMITED = 'rate_limited',
  INVALID_API_KEY = 'invalid_api_key',
  TIMEOUT = 'timeout',
  
  // Configuration Errors
  INVALID_CONFIGURATION = 'invalid_configuration',
  MISSING_PROMPT = 'missing_prompt',
  
  // Data Processing Errors
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  INVALID_PDF_CONTENT = 'invalid_pdf_content',
  
  // Network Errors
  NETWORK_ERROR = 'network_error',
  CONNECTION_ERROR = 'connection_error',
  
  // System Errors
  DATABASE_ERROR = 'database_error',
  MEMORY_ERROR = 'memory_error',
  
  // Unknown Errors
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDetails {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  isRetryable: boolean
  retryAfter?: number // seconds to wait before retry
  userMessage?: string // Danish message for users
  technicalDetails?: any
  suggestedActions?: string[]
}

export class ExtractionError extends Error {
  public readonly type: ErrorType
  public readonly severity: ErrorSeverity
  public readonly isRetryable: boolean
  public readonly retryAfter?: number
  public readonly userMessage?: string
  public readonly technicalDetails?: any
  public readonly suggestedActions?: string[]

  constructor(details: ErrorDetails) {
    super(details.message)
    this.type = details.type
    this.severity = details.severity
    this.isRetryable = details.isRetryable
    this.retryAfter = details.retryAfter
    this.userMessage = details.userMessage
    this.technicalDetails = details.technicalDetails
    this.suggestedActions = details.suggestedActions
    this.name = 'ExtractionError'
  }

  toJSON() {
    return {
      type: this.type,
      severity: this.severity,
      message: this.message,
      isRetryable: this.isRetryable,
      retryAfter: this.retryAfter,
      userMessage: this.userMessage,
      technicalDetails: this.technicalDetails,
      suggestedActions: this.suggestedActions
    }
  }
}

/**
 * Categorize errors based on error details
 */
export function categorizeError(error: any): ErrorDetails {
  // OpenAI API errors
  if (error.status === 429) {
    return {
      type: ErrorType.QUOTA_EXCEEDED,
      severity: ErrorSeverity.HIGH,
      message: 'OpenAI API quota exceeded',
      isRetryable: true,
      retryAfter: 60, // Wait 1 minute
      userMessage: 'AI-tjenesten er midlertidigt utilgængelig på grund af kvotebegrænsninger. Prøv igen om lidt.',
      technicalDetails: { status: error.status, headers: error.headers },
      suggestedActions: ['Check API usage', 'Upgrade plan', 'Try again later']
    }
  }

  if (error.status === 401) {
    return {
      type: ErrorType.INVALID_API_KEY,
      severity: ErrorSeverity.CRITICAL,
      message: 'Invalid OpenAI API key',
      isRetryable: false,
      userMessage: 'Der opstod en konfigurationsfejl. Kontakt support.',
      technicalDetails: { status: error.status },
      suggestedActions: ['Check API key configuration', 'Verify environment variables']
    }
  }

  if (error.status === 408 || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    return {
      type: ErrorType.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      message: 'Request timeout',
      isRetryable: true,
      retryAfter: 30,
      userMessage: 'Anmodningen tog for lang tid. Prøv igen.',
      technicalDetails: { timeout: true },
      suggestedActions: ['Reduce PDF size', 'Try again', 'Check network connection']
    }
  }

  if (error.status >= 500) {
    return {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.HIGH,
      message: 'Server error',
      isRetryable: true,
      retryAfter: 120, // Wait 2 minutes for server errors
      userMessage: 'Der opstod en serverfejl. Prøv igen om lidt.',
      technicalDetails: { status: error.status },
      suggestedActions: ['Try again later', 'Check service status']
    }
  }

  // JSON parsing errors
  if (error.message?.includes('JSON') || error.message?.includes('parse')) {
    return {
      type: ErrorType.PARSING_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: 'Failed to parse AI response',
      isRetryable: true,
      retryAfter: 10,
      userMessage: 'AI-svaret kunne ikke fortolkes. Prøv igen.',
      technicalDetails: { parseError: error.message },
      suggestedActions: ['Check prompt template', 'Retry extraction', 'Validate response format']
    }
  }

  // Configuration errors
  if (error.message?.includes('configuration') || error.message?.includes('prompt')) {
    return {
      type: ErrorType.INVALID_CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      message: 'Invalid configuration',
      isRetryable: false,
      userMessage: 'Der opstod en konfigurationsfejl. Kontakt support.',
      technicalDetails: { configError: error.message },
      suggestedActions: ['Check configuration', 'Verify prompt setup', 'Contact support']
    }
  }

  // Database errors
  if (error.message?.includes('database') || error.message?.includes('supabase')) {
    return {
      type: ErrorType.DATABASE_ERROR,
      severity: ErrorSeverity.HIGH,
      message: 'Database error',
      isRetryable: true,
      retryAfter: 60,
      userMessage: 'Der opstod en databasefejl. Prøv igen om lidt.',
      technicalDetails: { dbError: error.message },
      suggestedActions: ['Check database connection', 'Try again', 'Check logs']
    }
  }

  // Network connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
    return {
      type: ErrorType.CONNECTION_ERROR,
      severity: ErrorSeverity.HIGH,
      message: 'Network connection error',
      isRetryable: true,
      retryAfter: 30,
      userMessage: 'Netværksforbindelsesfejl. Prøv igen.',
      technicalDetails: { networkError: error.code },
      suggestedActions: ['Check network connection', 'Try again', 'Check firewall settings']
    }
  }

  // Default unknown error
  return {
    type: ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: error.message || 'Unknown error occurred',
    isRetryable: true,
    retryAfter: 60,
    userMessage: 'Der opstod en uventet fejl. Prøv igen om lidt.',
    technicalDetails: { originalError: error },
    suggestedActions: ['Try again', 'Check logs', 'Contact support if issue persists']
  }
}

/**
 * Check if an error should be retried
 */
export function isRetryableError(error: any): boolean {
  const categorized = categorizeError(error)
  return categorized.isRetryable
}

/**
 * Get retry delay for an error
 */
export function getRetryDelay(error: any): number {
  const categorized = categorizeError(error)
  return (categorized.retryAfter || 60) * 1000 // Convert to milliseconds
}

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(error: any): { success: false, error: string, errorType: ErrorType, isRetryable: boolean } {
  const categorized = categorizeError(error)
  
  return {
    success: false,
    error: categorized.userMessage || categorized.message,
    errorType: categorized.type,
    isRetryable: categorized.isRetryable
  }
}

/**
 * Exponential backoff retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1 // 10% jitter
}

/**
 * Calculate exponential backoff delay with jitter
 */
export function calculateBackoffDelay(
  attempt: number, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt)
  
  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  
  // Add jitter to avoid thundering herd
  const jitter = cappedDelay * config.jitterFactor * (Math.random() - 0.5) * 2
  const finalDelay = Math.max(0, cappedDelay + jitter)
  
  return Math.round(finalDelay)
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  errorContext?: string
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation()
      
      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        console.log(`[RetryBackoff] Operation succeeded on attempt ${attempt + 1}/${config.maxRetries + 1}${errorContext ? ` (${errorContext})` : ''}`)
      }
      
      return result
    } catch (error) {
      lastError = error
      
      // Check if error should be retried
      const errorDetails = categorizeError(error)
      if (!errorDetails.isRetryable) {
        console.log(`[RetryBackoff] Non-retryable error - failing immediately: ${errorDetails.type}${errorContext ? ` (${errorContext})` : ''}`)
        throw error
      }
      
      // If this was the last attempt, throw the error
      if (attempt === config.maxRetries) {
        console.error(`[RetryBackoff] All ${config.maxRetries + 1} attempts failed${errorContext ? ` (${errorContext})` : ''}`)
        throw error
      }
      
      // Calculate delay for next attempt
      const delay = calculateBackoffDelay(attempt, config)
      
      console.warn(`[RetryBackoff] Attempt ${attempt + 1}/${config.maxRetries + 1} failed: ${errorDetails.type} - retrying in ${delay}ms${errorContext ? ` (${errorContext})` : ''}`)
      console.warn(`[RetryBackoff] Error details: ${errorDetails.message}`)
      
      // Wait before retrying
      await sleep(delay)
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError
}

/**
 * Request deduplication system
 */
export interface RequestCacheEntry {
  result: any
  timestamp: number
  expiresAt: number
}

export class RequestDeduplicator {
  private cache: Map<string, RequestCacheEntry> = new Map()
  private readonly defaultTTL: number
  
  constructor(defaultTTLMs: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTLMs
  }
  
  /**
   * Generate a cache key from request parameters
   */
  private generateCacheKey(params: {
    text: string
    dealerName?: string
    fileName?: string
    sellerId?: string
  }): string {
    // Create a hash-like key from the most important parameters
    const keyParts = [
      params.text.slice(0, 1000), // First 1000 chars of text for uniqueness
      params.dealerName || '',
      params.fileName || '',
    ]
    
    // Simple hash function for the text content
    const textHash = this.simpleHash(params.text)
    keyParts.push(textHash.toString())
    
    return keyParts.join('|')
  }
  
  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): number {
    let hash = 0
    if (str.length === 0) return hash
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash)
  }
  
  /**
   * Check if a request is already cached
   */
  getCachedResult(params: {
    text: string
    dealerName?: string
    fileName?: string
    sellerId?: string
  }): any | null {
    const key = this.generateCacheKey(params)
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    console.log(`[RequestDeduplicator] Cache hit for key: ${key.slice(0, 50)}...`)
    return entry.result
  }
  
  /**
   * Cache a request result
   */
  cacheResult(
    params: {
      text: string
      dealerName?: string
      fileName?: string
      sellerId?: string
    },
    result: any,
    ttlMs?: number
  ): void {
    const key = this.generateCacheKey(params)
    const ttl = ttlMs || this.defaultTTL
    
    const entry: RequestCacheEntry = {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    }
    
    this.cache.set(key, entry)
    console.log(`[RequestDeduplicator] Cached result for key: ${key.slice(0, 50)}... (TTL: ${ttl}ms)`)
    
    // Clean up expired entries periodically
    this.cleanupExpiredEntries()
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[RequestDeduplicator] Cleaned up ${cleanedCount} expired cache entries`)
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()).map(key => key.slice(0, 50) + '...')
    }
  }
  
  /**
   * Clear all cache entries
   */
  clearCache(): void {
    const previousSize = this.cache.size
    this.cache.clear()
    console.log(`[RequestDeduplicator] Cleared cache (${previousSize} entries)`)
  }
}

// Global request deduplicator instance
const requestDeduplicator = new RequestDeduplicator(10 * 60 * 1000) // 10 minutes TTL

export { requestDeduplicator }