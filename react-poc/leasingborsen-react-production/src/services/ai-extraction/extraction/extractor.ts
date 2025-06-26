import type { 
  AIProvider, 
  ExtractionResult, 
  ExtractOptions, 
  ExtractedCarData,
  ExtractionError,
  ValidationResult
} from '../types'
import { config } from '../config'
import { OpenAIProvider } from '../providers/openai'
import { AnthropicProvider } from '../providers/anthropic'
import { MockAIProvider } from '../providers/mock'
import { CarDataValidator } from '../validation/validator'
import { costCalculator } from '../utils/cost-calculator'
import { extractionLogger, createExtractionLogger } from '../utils/logger'
import { costMonitor } from '../monitoring/cost-monitor'
import { performanceMonitor } from '../monitoring/performance-monitor'

/**
 * Provider selection strategy
 */
export type ProviderStrategy = 'primary_only' | 'primary_with_fallback' | 'cost_optimized' | 'all_providers'

/**
 * Extraction service options
 */
export interface ExtractionServiceOptions {
  strategy?: ProviderStrategy
  enableCostChecking?: boolean
  enableValidation?: boolean
  enableRetry?: boolean
  enableLogging?: boolean
  customLogger?: any
  timeoutMs?: number
  maxRetries?: number
}

/**
 * Extraction service result with additional metadata
 */
export interface ExtendedExtractionResult extends ExtractionResult {
  providersAttempted: string[]
  totalCostCents: number
  totalProcessingTimeMs: number
  validationResult?: ValidationResult
}

/**
 * AI Extraction Service - Main orchestrator for PDF document extraction
 * 
 * This service manages the complete extraction workflow:
 * 1. Provider selection and availability checking
 * 2. Cost limit validation
 * 3. Content pre-processing and validation
 * 4. AI provider orchestration with fallback support
 * 5. Result validation and quality scoring
 * 6. Comprehensive logging and error handling
 * 7. Retry logic with exponential backoff
 * 8. Cost tracking and budget management
 */
export class AIExtractionService {
  private providers: Map<string, AIProvider> = new Map()
  private logger: any
  private initialized = false

  constructor(options: ExtractionServiceOptions = {}) {
    this.logger = options.customLogger || extractionLogger
    this.initializeProviders()
  }

  /**
   * Initialize all available providers
   */
  private initializeProviders(): void {
    try {
      // Initialize OpenAI provider if configured
      if (config.isProviderConfigured('openai')) {
        this.providers.set('openai', new OpenAIProvider())
        this.logger.debug('OpenAI provider initialized')
      }

      // Initialize Anthropic provider if configured
      if (config.isProviderConfigured('anthropic')) {
        try {
          this.providers.set('anthropic', new AnthropicProvider())
          this.logger.debug('Anthropic provider initialized')
        } catch (error) {
          this.logger.warn('Failed to initialize Anthropic provider', { error })
        }
      }

      // Always include mock provider for testing
      this.providers.set('mock', new MockAIProvider())
      this.logger.debug('Mock provider initialized')

      this.initialized = true
      this.logger.info(`Extraction service initialized with ${this.providers.size} providers`, {
        availableProviders: Array.from(this.providers.keys()),
        primaryProvider: config.primaryProvider,
        fallbackProvider: config.fallbackProvider
      })

    } catch (error) {
      this.logger.error('Failed to initialize providers', { error })
      throw new Error(`Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Main extraction method
   */
  async extract(
    content: string, 
    options: ExtractOptions & ExtractionServiceOptions = {}
  ): Promise<ExtendedExtractionResult> {
    if (!this.initialized) {
      throw new Error('Extraction service not initialized')
    }

    if (!config.aiExtractionEnabled) {
      throw new Error('AI extraction is disabled in configuration')
    }

    const startTime = Date.now()
    const logger = createExtractionLogger(options.dealer)
    const logId = await logger.logExtractionStart(options.dealer || 'unknown', options.dealer, options)

    // Set defaults
    const serviceOptions = {
      strategy: 'primary_with_fallback' as ProviderStrategy,
      enableCostChecking: true,
      enableValidation: true,
      enableRetry: true,
      enableLogging: true,
      ...options
    }

    let providersAttempted: string[] = []
    let totalCostCents = 0
    let validationResult: ValidationResult | undefined
    let lastError: ExtractionError | undefined

    try {
      logger.info('Starting extraction process', {
        strategy: serviceOptions.strategy,
        dealer: options.dealer,
        contentLength: content.length,
        options: serviceOptions
      })

      // Step 1: Validate content
      const contentValidation = await this.validateContent(content)
      if (!contentValidation.isValid) {
        const error: ExtractionError = {
          type: 'validation',
          message: 'Content validation failed: ' + contentValidation.errors.map(e => e.message).join('; '),
          details: contentValidation.errors,
          retryable: false
        }

        await logger.logExtractionFailure(logId, error, Date.now() - startTime)
        
        return {
          success: false,
          error,
          metadata: {
            provider: 'none',
            tokensUsed: 0,
            costCents: 0,
            extractionTimeMs: Date.now() - startTime,
            confidence: 0
          },
          providersAttempted: [],
          totalCostCents: 0,
          totalProcessingTimeMs: Date.now() - startTime
        }
      }

      // Step 2: Select providers based on strategy
      const selectedProviders = this.selectProviders(serviceOptions.strategy)
      logger.info('Providers selected', { 
        strategy: serviceOptions.strategy,
        providers: selectedProviders 
      })

      // Step 3: Attempt extraction with selected providers
      for (const providerName of selectedProviders) {
        const provider = this.providers.get(providerName)
        if (!provider) {
          logger.warn(`Provider ${providerName} not available`)
          continue
        }

        providersAttempted.push(providerName)

        try {
          // Check provider availability
          if (!(await this.checkProviderAvailability(provider))) {
            logger.warn(`Provider ${providerName} is not available`)
            continue
          }

          // Check cost limits
          if (serviceOptions.enableCostChecking) {
            const costCheck = await this.checkCostLimits(provider, content, options.dealer)
            if (!costCheck.canAfford) {
              logger.warn('Cost limit exceeded', {
                provider: providerName,
                reason: costCheck.reason,
                estimatedCost: costCheck.estimatedCostCents
              })
              
              lastError = {
                type: 'cost_limit',
                message: costCheck.reason || 'Cost limit exceeded',
                details: costCheck,
                retryable: false
              }
              continue
            }
          }

          // Attempt extraction
          logger.info(`Attempting extraction with ${providerName}`)
          const result = await this.extractWithProvider(provider, content, options, logger)

          if (result.success && result.data) {
            totalCostCents += result.metadata.costCents

            // Validate extracted data
            if (serviceOptions.enableValidation) {
              validationResult = await CarDataValidator.validate(result.data)
              logger.info('Data validation completed', {
                provider: providerName,
                isValid: validationResult.isValid,
                errorCount: validationResult.errors.length,
                warningCount: validationResult.warnings.length,
                confidence: validationResult.confidence
              })

              // Check if validation passes minimum threshold
              if (!validationResult.isValid && validationResult.confidence < config.extractionConfidenceThreshold) {
                logger.warn('Extraction validation failed', {
                  provider: providerName,
                  confidence: validationResult.confidence,
                  threshold: config.extractionConfidenceThreshold,
                  errors: validationResult.errors
                })

                // If this is not the last provider, try the next one
                if (providersAttempted.length < selectedProviders.length) {
                  await logger.logExtractionPartial(
                    logId, 
                    result, 
                    result.data, 
                    validationResult.errors, 
                    Date.now() - startTime
                  )
                  continue
                }
              }
            }

            // Log successful extraction
            await logger.logExtractionSuccess(
              logId, 
              result, 
              result.data, 
              Date.now() - startTime
            )

            // Record cost
            costCalculator.recordCost(
              providerName, 
              Math.floor(result.metadata.tokensUsed * 0.7), 
              Math.floor(result.metadata.tokensUsed * 0.3), 
              options.dealer
            )

            logger.info('Extraction completed successfully', {
              provider: providerName,
              vehicleCount: result.data.vehicles?.length || 0,
              totalVariants: result.data.vehicles?.reduce((sum, v) => sum + v.variants.length, 0) || 0,
              costCents: result.metadata.costCents,
              confidence: result.metadata.confidence
            })

            // Track monitoring metrics
            const extendedResult = {
              ...result,
              providersAttempted,
              totalCostCents,
              totalProcessingTimeMs: Date.now() - startTime,
              validationResult
            }

            // Track cost and performance
            costMonitor.trackExtraction(extendedResult)
            performanceMonitor.trackExtraction(extendedResult)

            return extendedResult
          } else {
            // Provider returned an error
            lastError = result.error
            totalCostCents += result.metadata.costCents
            
            logger.warn(`Provider ${providerName} failed`, {
              error: result.error,
              costCents: result.metadata.costCents
            })

            // If this is not the last provider and the error is retryable, continue
            if (result.error?.retryable && providersAttempted.length < selectedProviders.length) {
              continue
            }
          }

        } catch (error) {
          logger.error(`Exception with provider ${providerName}`, { error })
          lastError = {
            type: 'unknown',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            details: { error },
            retryable: true
          }
        }
      }

      // If we reach here, all providers failed
      const finalError = lastError || {
        type: 'unknown',
        message: 'All providers failed or unavailable',
        details: { providersAttempted },
        retryable: false
      }

      await logger.logExtractionFailure(
        logId, 
        finalError, 
        Date.now() - startTime, 
        providersAttempted[providersAttempted.length - 1]
      )

      const failedResult = {
        success: false,
        error: finalError,
        metadata: {
          provider: providersAttempted[providersAttempted.length - 1] || 'none',
          tokensUsed: 0,
          costCents: totalCostCents,
          extractionTimeMs: Date.now() - startTime,
          confidence: 0
        },
        providersAttempted,
        totalCostCents,
        totalProcessingTimeMs: Date.now() - startTime,
        validationResult
      }

      // Track failed extraction metrics
      if (totalCostCents > 0) {
        costMonitor.trackExtraction(failedResult)
      }
      performanceMonitor.trackExtraction(failedResult)

      return failedResult

    } catch (error) {
      const extractionError: ExtractionError = {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Extraction service error',
        details: { error },
        retryable: false
      }

      await logger.logExtractionFailure(
        logId, 
        extractionError, 
        Date.now() - startTime
      )

      return {
        success: false,
        error: extractionError,
        metadata: {
          provider: 'none',
          tokensUsed: 0,
          costCents: totalCostCents,
          extractionTimeMs: Date.now() - startTime,
          confidence: 0
        },
        providersAttempted,
        totalCostCents,
        totalProcessingTimeMs: Date.now() - startTime
      }
    }
  }

  /**
   * Extract with a specific provider with retry logic
   */
  private async extractWithProvider(
    provider: AIProvider, 
    content: string, 
    options: ExtractOptions, 
    logger: any
  ): Promise<ExtractionResult> {
    const maxRetries = options.maxRetries ?? config.extractionMaxRetries
    let lastError: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          logger.logRetry(attempt, maxRetries, lastError?.message || 'Unknown error', delay)
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        const result = await provider.extract(content, options)
        
        // If successful or non-retryable error, return immediately
        if (result.success || !result.error?.retryable) {
          return result
        }

        lastError = result.error
        
      } catch (error) {
        lastError = error
        logger.warn(`Extraction attempt ${attempt} failed`, { 
          provider: provider.name, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: {
        type: 'unknown',
        message: lastError?.message || 'All retries exhausted',
        details: lastError,
        retryable: false
      },
      metadata: {
        provider: provider.name,
        tokensUsed: 0,
        costCents: 0,
        extractionTimeMs: 0,
        confidence: 0,
        retryCount: maxRetries
      }
    }
  }

  /**
   * Select providers based on strategy
   */
  private selectProviders(strategy: ProviderStrategy): string[] {
    const availableProviders = Array.from(this.providers.keys())
    
    switch (strategy) {
      case 'primary_only':
        return config.isProviderConfigured(config.primaryProvider) 
          ? [config.primaryProvider] 
          : ['mock']

      case 'primary_with_fallback':
        const providers = []
        if (config.isProviderConfigured(config.primaryProvider)) {
          providers.push(config.primaryProvider)
        }
        if (config.shouldUseFallback() && config.isProviderConfigured(config.fallbackProvider)) {
          providers.push(config.fallbackProvider)
        }
        if (providers.length === 0) {
          providers.push('mock')
        }
        return providers

      case 'cost_optimized':
        // Order by cost efficiency (cheapest first)
        return availableProviders.sort((a, b) => {
          const costA = this.getProviderCostEfficiency(a)
          const costB = this.getProviderCostEfficiency(b)
          return costA - costB
        })

      case 'all_providers':
        return availableProviders

      default:
        return [config.primaryProvider]
    }
  }

  /**
   * Get provider cost efficiency score (lower is better)
   */
  private getProviderCostEfficiency(providerName: string): number {
    const provider = this.providers.get(providerName)
    if (!provider) return Infinity

    // Estimate cost for 1000 tokens
    const testCost = provider.calculateCost(1000)
    return testCost
  }

  /**
   * Check provider availability
   */
  private async checkProviderAvailability(provider: AIProvider): Promise<boolean> {
    try {
      const [isAvailable, hasValidKey] = await Promise.all([
        provider.isAvailable(),
        provider.validateApiKey()
      ])
      return isAvailable && hasValidKey
    } catch (error) {
      this.logger.warn(`Provider availability check failed for ${provider.name}`, { error })
      return false
    }
  }

  /**
   * Check cost limits before extraction
   */
  private async checkCostLimits(
    provider: AIProvider, 
    content: string, 
    dealerName?: string
  ): Promise<{
    canAfford: boolean
    reason?: string
    estimatedCostCents: number
    remainingBudgetCents: number
  }> {
    try {
      // Estimate tokens and cost
      const estimatedTokens = (provider as any).estimateTokens ? 
        (provider as any).estimateTokens(content) : 
        Math.ceil(content.length / 4)
      
      const estimatedInputTokens = Math.floor(estimatedTokens * 0.7)
      const estimatedOutputTokens = Math.floor(estimatedTokens * 0.3)
      
      // Check with cost calculator
      const affordabilityCheck = costCalculator.canAffordExtraction(
        provider.name, 
        estimatedInputTokens, 
        estimatedOutputTokens, 
        dealerName
      )
      
      return {
        canAfford: affordabilityCheck.canAfford,
        reason: affordabilityCheck.reason,
        estimatedCostCents: affordabilityCheck.estimatedCostCents,
        remainingBudgetCents: affordabilityCheck.remainingDailyBudgetCents
      }
    } catch (error) {
      this.logger.error('Cost limit check failed', { error })
      return {
        canAfford: false,
        reason: 'Cost calculation failed',
        estimatedCostCents: 0,
        remainingBudgetCents: 0
      }
    }
  }

  /**
   * Validate content before processing
   */
  private async validateContent(content: string): Promise<ValidationResult> {
    const errors: any[] = []
    const warnings: string[] = []

    // Basic content checks
    if (!content || content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Content is empty',
        rule: 'required'
      })
    }

    if (content.length < 100) {
      errors.push({
        field: 'content',
        message: 'Content is too short for meaningful extraction',
        rule: 'min_length'
      })
    }

    if (content.length > config.maxTokensPerPdf * 4) {
      errors.push({
        field: 'content',
        message: 'Content exceeds maximum allowed length',
        rule: 'max_length'
      })
    }

    // Check for leasing document indicators
    const leasingPatterns = [
      /\b(leasing|lease|leje)\b/i,
      /\b(månedlig|monthly|måned)\b/i,
      /\b(bil|car|vehicle|køretøj)\b/i,
      /\b(pris|price|kr|dkk)\b/i
    ]

    const patternMatches = leasingPatterns.filter(pattern => pattern.test(content)).length
    if (patternMatches < 2) {
      warnings.push('Content may not be a car leasing document')
    }

    // Calculate confidence
    let confidence = 1.0
    confidence -= errors.length * 0.3
    confidence -= warnings.length * 0.1
    confidence += Math.min(patternMatches * 0.1, 0.3)
    confidence = Math.max(0, Math.min(1, confidence))

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    }
  }

  /**
   * Get service status and statistics
   */
  async getServiceStatus(): Promise<{
    initialized: boolean
    availableProviders: string[]
    primaryProvider: string
    fallbackProvider: string
    configuredProviders: string[]
    costSummary: any
    extractionStats: any
  }> {
    const configuredProviders = []
    for (const [name] of this.providers) {
      if (name !== 'mock' && config.isProviderConfigured(name)) {
        configuredProviders.push(name)
      }
    }

    const costSummary = await extractionLogger.getCostSummary()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const extractionStats = await extractionLogger.getExtractionStats(yesterday, new Date())

    return {
      initialized: this.initialized,
      availableProviders: Array.from(this.providers.keys()),
      primaryProvider: config.primaryProvider,
      fallbackProvider: config.fallbackProvider,
      configuredProviders,
      costSummary,
      extractionStats
    }
  }

  /**
   * Test a specific provider
   */
  async testProvider(providerName: string, testContent?: string): Promise<{
    available: boolean
    authenticated: boolean
    testResult?: ExtractionResult
    error?: string
  }> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      return {
        available: false,
        authenticated: false,
        error: `Provider ${providerName} not found`
      }
    }

    try {
      const [available, authenticated] = await Promise.all([
        provider.isAvailable(),
        provider.validateApiKey()
      ])

      let testResult: ExtractionResult | undefined
      if (available && authenticated && testContent) {
        testResult = await provider.extract(testContent.substring(0, 1000), {
          debugMode: true
        })
      }

      return {
        available,
        authenticated,
        testResult
      }
    } catch (error) {
      return {
        available: false,
        authenticated: false,
        error: error instanceof Error ? error.message : 'Test failed'
      }
    }
  }

  /**
   * Reset cost tracking (admin function)
   */
  resetCostTracking(): void {
    costCalculator.reset()
    this.logger.info('Cost tracking reset')
  }

  /**
   * Get cost summary
   */
  getCostSummary() {
    return costCalculator.getCostSummary()
  }
}

// ==================== FACTORY FUNCTIONS ====================

/**
 * Create extraction service with default configuration
 */
export function createExtractionService(options: ExtractionServiceOptions = {}): AIExtractionService {
  return new AIExtractionService(options)
}

/**
 * Create extraction service optimized for cost
 */
export function createCostOptimizedService(): AIExtractionService {
  return new AIExtractionService({
    strategy: 'cost_optimized',
    enableCostChecking: true,
    enableValidation: true,
    enableRetry: false, // Disable retries to minimize cost
    maxRetries: 0
  })
}

/**
 * Create extraction service optimized for accuracy
 */
export function createAccuracyOptimizedService(): AIExtractionService {
  return new AIExtractionService({
    strategy: 'all_providers',
    enableCostChecking: false, // Allow higher costs for better accuracy
    enableValidation: true,
    enableRetry: true,
    maxRetries: 3
  })
}

/**
 * Create extraction service for testing
 */
export function createTestService(): AIExtractionService {
  return new AIExtractionService({
    strategy: 'primary_only',
    enableCostChecking: false,
    enableValidation: false,
    enableRetry: false,
    enableLogging: false
  })
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Default extraction service instance
 */
export const extractionService = createExtractionService()

// Re-export types for convenience
export type {
  ExtractOptions,
  ExtractionResult,
  ExtractedCarData,
  ExtractionError,
  ValidationResult
}