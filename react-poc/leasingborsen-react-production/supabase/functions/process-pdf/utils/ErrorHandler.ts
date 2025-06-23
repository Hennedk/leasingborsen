import { corsHeaders } from '../../_shared/cors.ts'

export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
  timestamp: string
}

export class ErrorHandler {
  createErrorResponse(message: string, status: number = 500, code?: string, details?: any): Response {
    const errorResponse: ErrorResponse = {
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString()
    }

    // Log error for debugging
    console.error(`❌ Error ${status}: ${message}`, { code, details })

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  handleValidationError(field: string, value: any): Response {
    return this.createErrorResponse(
      `Invalid ${field}: ${value}`,
      400,
      'VALIDATION_ERROR',
      { field, value }
    )
  }

  handleConfigurationError(dealerId: string, configVersion: string): Response {
    return this.createErrorResponse(
      `Configuration not found for dealer: ${dealerId} (version: ${configVersion})`,
      404,
      'CONFIG_NOT_FOUND',
      { dealerId, configVersion }
    )
  }

  handleFileError(operation: string, filename: string, originalError: any): Response {
    return this.createErrorResponse(
      `File ${operation} failed: ${filename}`,
      500,
      'FILE_ERROR',
      { operation, filename, originalError: originalError.message }
    )
  }

  handleExtractionError(method: string, originalError: any): Response {
    return this.createErrorResponse(
      `${method} extraction failed: ${originalError.message}`,
      500,
      'EXTRACTION_ERROR',
      { method, originalError: originalError.message }
    )
  }

  handleBudgetError(dailySpent: number, dailyLimit: number): Response {
    return this.createErrorResponse(
      `Daily AI budget exceeded: $${dailySpent.toFixed(4)} / $${dailyLimit.toFixed(4)}`,
      429,
      'BUDGET_EXCEEDED',
      { dailySpent, dailyLimit }
    )
  }

  handleDatabaseError(operation: string, originalError: any): Response {
    return this.createErrorResponse(
      `Database ${operation} failed: ${originalError.message}`,
      500,
      'DATABASE_ERROR',
      { operation, originalError: originalError.message }
    )
  }

  static isRetryableError(error: any): boolean {
    // Determine if an error is worth retrying
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'rate limit',
      'service unavailable'
    ]

    const errorMessage = error.message?.toLowerCase() || ''
    return retryableMessages.some(msg => errorMessage.includes(msg))
  }

  static shouldUseAIFallback(patternError: any): boolean {
    // Determine if pattern extraction failure warrants AI fallback
    const fallbackTriggers = [
      'no patterns matched',
      'low confidence',
      'parsing failed',
      'format not recognized'
    ]

    const errorMessage = patternError.message?.toLowerCase() || ''
    return fallbackTriggers.some(trigger => errorMessage.includes(trigger))
  }
}

/*
 * ErrorHandler
 * 
 * Provides standardized error handling for the PDF processing Edge Function.
 * 
 * Features:
 * - Consistent error response format
 * - Specialized error types for different failure modes
 * - Error classification for retry logic
 * - Comprehensive logging for debugging
 * - CORS headers included in all responses
 * 
 * Error Response Format:
 * {
 *   "success": false,
 *   "error": "Human-readable error message",
 *   "code": "ERROR_TYPE_CODE",
 *   "details": { ... },
 *   "timestamp": "2025-01-22T14:30:00Z"
 * }
 * 
 * Usage:
 * const errorHandler = new ErrorHandler()
 * return errorHandler.handleValidationError('dealerId', invalidValue)
 * return errorHandler.createErrorResponse('Custom error', 400)
 */