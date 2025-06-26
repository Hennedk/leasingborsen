/**
 * Custom error classes for AI extraction service
 * 
 * These error classes provide structured error handling with:
 * - Proper error categorization
 * - Detailed error context
 * - Retry logic indicators
 * - Danish error messages for user-facing scenarios
 */

export const ErrorType = {
  EXTRACTION: 'EXTRACTION',
  VALIDATION: 'VALIDATION', 
  PROVIDER: 'PROVIDER',
  COST_LIMIT: 'COST_LIMIT',
  TIMEOUT: 'TIMEOUT'
} as const

export type ErrorType = typeof ErrorType[keyof typeof ErrorType]

export interface ErrorDetails {
  [key: string]: unknown
}

/**
 * Base error class for all AI extraction errors
 */
export class ExtractionError extends Error {
  public readonly type: ErrorType
  public readonly details: ErrorDetails
  public readonly retryable: boolean
  public readonly timestamp: Date
  public readonly userMessage: string

  constructor(
    type: ErrorType,
    message: string,
    details: ErrorDetails = {},
    retryable: boolean = false,
    userMessage?: string
  ) {
    super(message)
    this.name = 'ExtractionError'
    this.type = type
    this.details = details
    this.retryable = retryable
    this.timestamp = new Date()
    this.userMessage = userMessage || this.getDefaultUserMessage()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExtractionError)
    }
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case ErrorType.EXTRACTION:
        return 'Der opstod en fejl ved behandling af dokumentet'
      case ErrorType.VALIDATION:
        return 'Dokumentet kunne ikke valideres korrekt'
      case ErrorType.PROVIDER:
        return 'Tjenesten er midlertidigt utilgængelig'
      case ErrorType.COST_LIMIT:
        return 'Omkostningsgrænsen er nået'
      case ErrorType.TIMEOUT:
        return 'Behandlingen tog for lang tid'
      default:
        return 'Der opstod en uventet fejl'
    }
  }

  /**
   * Returns a JSON representation of the error for logging
   */
  toJSON(): object {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    }
  }

  /**
   * Creates a sanitized version of the error for client-side logging
   */
  toClientSafe(): object {
    return {
      type: this.type,
      userMessage: this.userMessage,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString()
    }
  }
}

/**
 * Error for data validation failures
 */
export class ValidationError extends ExtractionError {
  public readonly field?: string
  public readonly expectedType?: string
  public readonly receivedValue?: unknown

  constructor(
    message: string,
    field?: string,
    expectedType?: string,
    receivedValue?: unknown,
    details: ErrorDetails = {}
  ) {
    const enhancedDetails = {
      ...details,
      field,
      expectedType,
      receivedValue
    }

    super(
      ErrorType.VALIDATION,
      message,
      enhancedDetails,
      false, // Validation errors are typically not retryable
      'Dokumentet indeholder ugyldige data'
    )
    
    this.name = 'ValidationError'
    this.field = field
    this.expectedType = expectedType
    this.receivedValue = receivedValue
  }

  static requiredField(field: string): ValidationError {
    return new ValidationError(
      `Required field '${field}' is missing`,
      field,
      'required',
      undefined
    )
  }

  static invalidType(field: string, expectedType: string, receivedValue: unknown): ValidationError {
    return new ValidationError(
      `Field '${field}' expected ${expectedType} but received ${typeof receivedValue}`,
      field,
      expectedType,
      receivedValue
    )
  }

  static invalidFormat(field: string, expectedFormat: string, receivedValue: unknown): ValidationError {
    return new ValidationError(
      `Field '${field}' has invalid format. Expected: ${expectedFormat}`,
      field,
      expectedFormat,
      receivedValue
    )
  }
}

/**
 * Error for AI provider API failures
 */
export class ProviderError extends ExtractionError {
  public readonly provider: string
  public readonly statusCode?: number
  public readonly providerErrorCode?: string
  public readonly rateLimited: boolean

  constructor(
    provider: string,
    message: string,
    statusCode?: number,
    providerErrorCode?: string,
    details: ErrorDetails = {}
  ) {
    const rateLimited = statusCode === 429
    const retryable = rateLimited || (statusCode && statusCode >= 500)

    const enhancedDetails = {
      ...details,
      provider,
      statusCode,
      providerErrorCode,
      rateLimited
    }

    super(
      ErrorType.PROVIDER,
      message,
      enhancedDetails,
      !!retryable,
      !!rateLimited ? 'Tjenesten er overbelastet. Prøv igen om lidt' : undefined
    )

    this.name = 'ProviderError'
    this.provider = provider
    this.statusCode = statusCode
    this.providerErrorCode = providerErrorCode
    this.rateLimited = rateLimited
  }

  static rateLimited(provider: string, retryAfter?: number): ProviderError {
    return new ProviderError(
      provider,
      `Rate limit exceeded for provider ${provider}${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
      429,
      'rate_limit_exceeded',
      { retryAfter }
    )
  }

  static apiError(provider: string, statusCode: number, message: string, errorCode?: string): ProviderError {
    return new ProviderError(
      provider,
      `API error from ${provider}: ${message}`,
      statusCode,
      errorCode
    )
  }

  static networkError(provider: string, originalError: Error): ProviderError {
    return new ProviderError(
      provider,
      `Network error when calling ${provider}: ${originalError.message}`,
      undefined,
      'network_error',
      { originalError: originalError.message }
    )
  }
}

/**
 * Error when cost limits are exceeded
 */
export class CostLimitError extends ExtractionError {
  public readonly currentCost: number
  public readonly limit: number
  public readonly period: string

  constructor(
    currentCost: number,
    limit: number,
    period: string = 'monthly',
    details: ErrorDetails = {}
  ) {
    const enhancedDetails = {
      ...details,
      currentCost,
      limit,
      period
    }

    super(
      ErrorType.COST_LIMIT,
      `Cost limit exceeded: ${currentCost} kr > ${limit} kr for ${period} period`,
      enhancedDetails,
      false, // Cost limit errors are not retryable until next period
      `Omkostningsgrænsen på ${limit} kr er nået for denne ${period === 'monthly' ? 'måned' : 'periode'}`
    )

    this.name = 'CostLimitError'
    this.currentCost = currentCost
    this.limit = limit
    this.period = period
  }

  static monthly(currentCost: number, monthlyLimit: number): CostLimitError {
    return new CostLimitError(currentCost, monthlyLimit, 'monthly')
  }

  static daily(currentCost: number, dailyLimit: number): CostLimitError {
    return new CostLimitError(currentCost, dailyLimit, 'daily')
  }
}

/**
 * Error for extraction timeouts
 */
export class TimeoutError extends ExtractionError {
  public readonly timeoutMs: number
  public readonly operation: string

  constructor(
    operation: string,
    timeoutMs: number,
    details: ErrorDetails = {}
  ) {
    const enhancedDetails = {
      ...details,
      operation,
      timeoutMs
    }

    super(
      ErrorType.TIMEOUT,
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      enhancedDetails,
      true, // Timeout errors are retryable
      `Behandlingen tog for lang tid (${Math.round(timeoutMs / 1000)}s). Prøv igen`
    )

    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
    this.operation = operation
  }

  static extraction(timeoutMs: number): TimeoutError {
    return new TimeoutError('extraction', timeoutMs)
  }

  static validation(timeoutMs: number): TimeoutError {
    return new TimeoutError('validation', timeoutMs)
  }

  static apiCall(provider: string, timeoutMs: number): TimeoutError {
    return new TimeoutError(`api_call_${provider}`, timeoutMs, { provider })
  }
}

/**
 * Type guard functions for error handling
 */
export const isExtractionError = (error: unknown): error is ExtractionError => {
  return error instanceof ExtractionError
}

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError
}

export const isProviderError = (error: unknown): error is ProviderError => {
  return error instanceof ProviderError
}

export const isCostLimitError = (error: unknown): error is CostLimitError => {
  return error instanceof CostLimitError
}

export const isTimeoutError = (error: unknown): error is TimeoutError => {
  return error instanceof TimeoutError
}

/**
 * Utility function to handle and categorize unknown errors
 */
export const categorizeError = (error: unknown): ExtractionError => {
  if (isExtractionError(error)) {
    return error
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('timeout')) {
      return new TimeoutError('unknown_operation', 30000, { originalError: error.message })
    }
    
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return ProviderError.rateLimited('unknown_provider')
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ValidationError(error.message)
    }

    // Generic extraction error for other Error instances
    return new ExtractionError(
      ErrorType.EXTRACTION,
      error.message,
      { originalError: error.message },
      true
    )
  }

  // Handle non-Error objects
  return new ExtractionError(
    ErrorType.EXTRACTION,
    'Unknown error occurred',
    { originalError: String(error) },
    true
  )
}

/**
 * Utility function to get retry delay based on error type
 */
export const getRetryDelay = (error: ExtractionError, attempt: number): number => {
  if (!error.retryable) {
    return 0
  }

  const baseDelay = 1000 // 1 second

  switch (error.type) {
    case ErrorType.PROVIDER:
      if (error instanceof ProviderError && error.rateLimited) {
        // Exponential backoff for rate limits
        return Math.min(baseDelay * Math.pow(2, attempt), 60000) // Max 1 minute
      }
      return baseDelay * attempt

    case ErrorType.TIMEOUT:
      // Linear backoff for timeouts
      return baseDelay * attempt

    case ErrorType.EXTRACTION:
      // Exponential backoff for extraction errors
      return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Max 30 seconds

    default:
      return baseDelay * attempt
  }
}