import type { 
  AIProvider, 
  ExtractionResult, 
  ExtractionError, 
  ExtractOptions,
  ExtractedCarData,
  ValidationResult,
  ValidationError
} from '../types'
import { config } from '../config'

/**
 * Abstract base class for AI providers
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly modelVersion: string

  // Abstract methods that must be implemented by concrete providers
  abstract extract(content: string, options?: ExtractOptions): Promise<ExtractionResult>
  abstract calculateCost(tokens: number): number
  abstract validateApiKey(): Promise<boolean>
  abstract isAvailable(): Promise<boolean>

  /**
   * Validate content before processing
   * Checks length and token limits to prevent excessive costs
   */
  protected validateContent(content: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    // Check minimum content length
    if (!content || content.trim().length < 100) {
      errors.push({
        field: 'content',
        message: 'Content is too short for meaningful extraction',
        value: content?.length || 0,
        rule: 'min_length'
      })
    }

    // Check maximum content length (rough character limit)
    const maxCharacters = config.maxTokensPerPdf * 4 // ~4 characters per token
    if (content.length > maxCharacters) {
      errors.push({
        field: 'content',
        message: `Content exceeds maximum allowed length of ${maxCharacters} characters`,
        value: content.length,
        rule: 'max_length'
      })
    }

    // Check estimated token count
    const estimatedTokens = this.estimateTokens(content)
    if (estimatedTokens > config.maxTokensPerPdf) {
      errors.push({
        field: 'tokens',
        message: `Estimated token count (${estimatedTokens}) exceeds maximum allowed (${config.maxTokensPerPdf})`,
        value: estimatedTokens,
        rule: 'max_tokens'
      })
    }

    // Warning for large content that might be expensive
    if (estimatedTokens > config.maxTokensPerPdf * 0.8) {
      warnings.push(`Content is large (${estimatedTokens} tokens). This may result in higher costs.`)
    }

    // Check for potential PDF extraction artifacts
    const suspiciousPatterns = [
      /\s{10,}/g, // Excessive whitespace
      /(.)\1{20,}/g, // Repeated characters
      /[^\w\s]{50,}/g // Long sequences of special characters
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        warnings.push('Content contains patterns that might indicate poor PDF extraction quality')
        break
      }
    }

    const confidence = this.calculateContentConfidence(content, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    }
  }

  /**
   * Estimate token count for content
   * Uses rough approximation: ~4 characters per token
   */
  protected estimateTokens(content: string): number {
    if (!content) return 0
    
    // Basic estimation: 4 characters per token on average
    // This is conservative for GPT models which typically use 3-4 chars/token
    const baseEstimate = Math.ceil(content.length / 4)
    
    // Add buffer for prompt overhead (instructions, JSON structure, etc.)
    const promptOverhead = 500 // Estimated tokens for system prompt and structure
    
    return baseEstimate + promptOverhead
  }

  /**
   * Calculate confidence score for content quality
   */
  private calculateContentConfidence(content: string, errors: ValidationError[], warnings: string[]): number {
    let confidence = 1.0

    // Reduce confidence for validation errors
    confidence -= errors.length * 0.3

    // Reduce confidence for warnings
    confidence -= warnings.length * 0.1

    // Analyze content structure for leasing document patterns
    const positivePatterns = [
      /\b(kr|dkk|euro|eur)\b/gi, // Currency indicators
      /\b(måned|month|månedlig|monthly)\b/gi, // Time periods
      /\b(leasing|lease|leje)\b/gi, // Leasing terms
      /\b(bil|car|vehicle|køretøj)\b/gi, // Vehicle terms
      /\b(pris|price|cost|omkostning)\b/gi, // Pricing terms
      /\b\d+\s*(km|kilometer)\b/gi, // Distance/mileage
      /\b\d+\s*(hk|hp|kw)\b/gi, // Power specifications
    ]

    let patternMatches = 0
    for (const pattern of positivePatterns) {
      if (pattern.test(content)) {
        patternMatches++
      }
    }

    // Boost confidence based on relevant pattern matches
    const patternBonus = Math.min(patternMatches * 0.05, 0.2)
    confidence += patternBonus

    // Check for structured data indicators
    if (/\b(model|variant|version)\b/gi.test(content)) {
      confidence += 0.05
    }

    if (/\d+[.,]\d+/.test(content)) { // Decimal numbers (prices)
      confidence += 0.05
    }

    // Ensure confidence stays within bounds
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Map common error types to standardized format
   */
  protected mapError(error: any, context: string = ''): ExtractionError {
    // API rate limiting
    if (error?.status === 429 || error?.message?.includes('rate limit')) {
      return {
        type: 'api',
        message: 'API rate limit exceeded. Please try again later.',
        details: { originalError: error.message, context },
        retryable: true
      }
    }

    // Authentication errors
    if (error?.status === 401 || error?.message?.includes('authentication') || error?.message?.includes('api key')) {
      return {
        type: 'api',
        message: 'Authentication failed. Please check your API key.',
        details: { originalError: error.message, context },
        retryable: false
      }
    }

    // Timeout errors
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. The document may be too large or the service is slow.',
        details: { originalError: error.message, context },
        retryable: true
      }
    }

    // Token/content length errors
    if (error?.message?.includes('token') || error?.message?.includes('length') || error?.message?.includes('too long')) {
      return {
        type: 'validation',
        message: 'Content is too long for processing. Please reduce the document size.',
        details: { originalError: error.message, context },
        retryable: false
      }
    }

    // Cost limit errors
    if (error?.message?.includes('cost') || error?.message?.includes('budget')) {
      return {
        type: 'cost_limit',
        message: 'Processing would exceed cost limits.',
        details: { originalError: error.message, context },
        retryable: false
      }
    }

    // JSON parsing errors
    if (error?.message?.includes('JSON') || error?.message?.includes('parse')) {
      return {
        type: 'parsing',
        message: 'Failed to parse AI response. The service may be experiencing issues.',
        details: { originalError: error.message, context },
        retryable: true
      }
    }

    // Network/connection errors
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.message?.includes('network')) {
      return {
        type: 'api',
        message: 'Network connection failed. Please check your internet connection.',
        details: { originalError: error.message, context },
        retryable: true
      }
    }

    // Default fallback
    return {
      type: 'unknown',
      message: error?.message || 'An unexpected error occurred during extraction.',
      details: { originalError: error, context },
      retryable: true
    }
  }

  /**
   * Calculate confidence score for extracted data
   */
  protected calculateExtractionConfidence(data: ExtractedCarData): number {
    let confidence = 0.5 // Base confidence

    // Document info completeness
    if (data.documentInfo?.brand) confidence += 0.1
    if (data.documentInfo?.documentDate) confidence += 0.05
    if (data.documentInfo?.currency) confidence += 0.05

    // Vehicle data quality
    if (data.vehicles && data.vehicles.length > 0) {
      confidence += 0.2

      const vehicle = data.vehicles[0]
      if (vehicle.model) confidence += 0.1
      if (vehicle.powertrainType) confidence += 0.05
      if (vehicle.leasePeriodMonths > 0) confidence += 0.05

      // Variant data quality
      if (vehicle.variants && vehicle.variants.length > 0) {
        confidence += 0.1

        const validVariants = vehicle.variants.filter(v => 
          v.variantName && 
          v.engineSpecification && 
          v.pricing?.monthlyPayment > 0
        )

        const variantCompleteness = validVariants.length / vehicle.variants.length
        confidence += variantCompleteness * 0.1
      }
    }

    // Penalize for warnings or missing critical data
    if (data.metadata?.extractionWarnings && data.metadata.extractionWarnings.length > 0) {
      confidence -= data.metadata.extractionWarnings.length * 0.05
    }

    // Ensure confidence stays within bounds
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Validate extracted data structure
   */
  protected validateExtractedData(data: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    // Check top-level structure
    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'root',
        message: 'Invalid data structure - expected object',
        value: typeof data,
        rule: 'type'
      })
      return { isValid: false, errors, warnings, confidence: 0 }
    }

    // Validate document info
    if (!data.documentInfo) {
      errors.push({
        field: 'documentInfo',
        message: 'Document information is required',
        rule: 'required'
      })
    } else {
      if (!data.documentInfo.brand) {
        warnings.push('Document brand is missing')
      }
      if (!data.documentInfo.currency) {
        warnings.push('Currency information is missing')
      }
    }

    // Validate vehicles array
    if (!data.vehicles || !Array.isArray(data.vehicles)) {
      errors.push({
        field: 'vehicles',
        message: 'Vehicles array is required',
        rule: 'required'
      })
    } else if (data.vehicles.length === 0) {
      errors.push({
        field: 'vehicles',
        message: 'At least one vehicle is required',
        rule: 'min_length'
      })
    } else {
      // Validate each vehicle
      data.vehicles.forEach((vehicle: any, index: number) => {
        if (!vehicle.model) {
          errors.push({
            field: `vehicles[${index}].model`,
            message: 'Vehicle model is required',
            rule: 'required'
          })
        }

        if (!vehicle.variants || !Array.isArray(vehicle.variants) || vehicle.variants.length === 0) {
          errors.push({
            field: `vehicles[${index}].variants`,
            message: 'At least one variant is required per vehicle',
            rule: 'required'
          })
        } else {
          // Validate variants
          vehicle.variants.forEach((variant: any, variantIndex: number) => {
            if (!variant.variantName) {
              warnings.push(`Vehicle ${index} variant ${variantIndex} is missing variant name`)
            }
            if (!variant.pricing || typeof variant.pricing.monthlyPayment !== 'number') {
              errors.push({
                field: `vehicles[${index}].variants[${variantIndex}].pricing.monthlyPayment`,
                message: 'Monthly payment is required and must be a number',
                rule: 'required'
              })
            }
          })
        }
      })
    }

    const confidence = errors.length === 0 ? 
      Math.max(0.7, 1 - (warnings.length * 0.1)) : 
      Math.max(0.1, 0.5 - (errors.length * 0.2))

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    }
  }

  /**
   * Create standardized extraction result
   */
  protected createResult(
    success: boolean,
    data?: ExtractedCarData,
    error?: ExtractionError,
    tokensUsed: number = 0,
    costCents: number = 0,
    extractionTimeMs: number = 0,
    retryCount: number = 0
  ): ExtractionResult {
    return {
      success,
      data,
      error,
      metadata: {
        provider: this.name,
        modelVersion: this.modelVersion,
        tokensUsed,
        costCents,
        extractionTimeMs,
        confidence: data ? this.calculateExtractionConfidence(data) : 0,
        retryCount
      }
    }
  }
}