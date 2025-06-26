import type { ExtractionConfig } from './types'

/**
 * Configuration service for AI extraction
 * Loads and validates environment variables
 */
export class Config implements ExtractionConfig {
  // AI Provider Keys
  readonly openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY
  readonly anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  
  // Model Versions
  readonly openaiModel = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-turbo-preview'
  readonly anthropicModel = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-opus-20240229'
  
  // Feature Flags
  readonly aiExtractionEnabled = import.meta.env.VITE_AI_EXTRACTION_ENABLED === 'true'
  readonly primaryProvider = import.meta.env.VITE_AI_PROVIDER_PRIMARY || 'openai'
  readonly fallbackProvider = import.meta.env.VITE_AI_PROVIDER_FALLBACK || 'anthropic'
  
  // Cost Controls
  readonly maxTokensPerPdf = parseInt(import.meta.env.VITE_MAX_TOKENS_PER_PDF || '8000')
  readonly maxCostPerPdfCents = parseInt(import.meta.env.VITE_MAX_COST_PER_PDF_CENTS || '20')
  readonly dailyCostLimitUsd = parseInt(import.meta.env.VITE_DAILY_COST_LIMIT_USD || '10')
  
  // Extraction Settings
  readonly extractionTimeoutSeconds = parseInt(import.meta.env.VITE_EXTRACTION_TIMEOUT_SECONDS || '60')
  readonly extractionMaxRetries = parseInt(import.meta.env.VITE_EXTRACTION_MAX_RETRIES || '2')
  readonly extractionConfidenceThreshold = parseFloat(import.meta.env.VITE_EXTRACTION_CONFIDENCE_THRESHOLD || '0.8')
  
  // Monitoring & Alerts
  readonly extractionLogLevel = import.meta.env.VITE_EXTRACTION_LOG_LEVEL || 'info'
  readonly alertEmail = import.meta.env.VITE_ALERT_EMAIL
  readonly alertCostThresholdUsd = parseInt(import.meta.env.VITE_ALERT_COST_THRESHOLD_USD || '50')
  
  // Singleton instance
  private static instance: Config
  
  private constructor() {
    this.validate()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config()
    }
    return Config.instance
  }
  
  /**
   * Validate configuration on startup
   */
  validate(): void {
    // Check if AI extraction is enabled
    if (this.aiExtractionEnabled) {
      // Validate primary provider
      if (this.primaryProvider === 'openai' && !this.openaiApiKey) {
        throw new Error('AI extraction enabled with OpenAI as primary provider, but VITE_OPENAI_API_KEY is not set')
      }
      
      if (this.primaryProvider === 'anthropic' && !this.anthropicApiKey) {
        throw new Error('AI extraction enabled with Anthropic as primary provider, but VITE_ANTHROPIC_API_KEY is not set')
      }
      
      // Validate fallback provider if set
      if (this.fallbackProvider && this.fallbackProvider !== 'none') {
        if (this.fallbackProvider === 'openai' && !this.openaiApiKey) {
          console.warn('OpenAI set as fallback provider but API key is missing')
        }
        
        if (this.fallbackProvider === 'anthropic' && !this.anthropicApiKey) {
          console.warn('Anthropic set as fallback provider but API key is missing')
        }
      }
      
      // Validate cost controls
      if (this.maxCostPerPdfCents <= 0) {
        throw new Error('MAX_COST_PER_PDF_CENTS must be greater than 0')
      }
      
      if (this.dailyCostLimitUsd <= 0) {
        throw new Error('DAILY_COST_LIMIT_USD must be greater than 0')
      }
      
      // Validate extraction settings
      if (this.maxTokensPerPdf <= 0) {
        throw new Error('MAX_TOKENS_PER_PDF must be greater than 0')
      }
      
      if (this.extractionTimeoutSeconds <= 0) {
        throw new Error('EXTRACTION_TIMEOUT_SECONDS must be greater than 0')
      }
      
      if (this.extractionConfidenceThreshold < 0 || this.extractionConfidenceThreshold > 1) {
        throw new Error('EXTRACTION_CONFIDENCE_THRESHOLD must be between 0 and 1')
      }
    }
  }
  
  /**
   * Check if a specific provider is configured
   */
  isProviderConfigured(provider: string): boolean {
    switch (provider) {
      case 'openai':
        return !!this.openaiApiKey
      case 'anthropic':
        return !!this.anthropicApiKey
      default:
        return false
    }
  }
  
  /**
   * Get cost limit in cents for consistency
   */
  getDailyCostLimitCents(): number {
    return this.dailyCostLimitUsd * 100
  }
  
  /**
   * Get timeout in milliseconds
   */
  getTimeoutMs(): number {
    return this.extractionTimeoutSeconds * 1000
  }
  
  /**
   * Check if AI extraction is enabled
   */
  isEnabled(): boolean {
    return this.aiExtractionEnabled
  }

  /**
   * Get primary provider
   */
  getPrimaryProvider(): string {
    return this.primaryProvider
  }

  /**
   * Get fallback provider
   */
  getFallbackProvider(): string {
    return this.fallbackProvider
  }

  /**
   * Get OpenAI model
   */
  getOpenAIModel(): string {
    return this.openaiModel
  }

  /**
   * Get Anthropic model
   */
  getAnthropicModel(): string {
    return this.anthropicModel
  }

  /**
   * Get max cost per PDF in cents
   */
  getMaxCostPerPdfCents(): number {
    return this.maxCostPerPdfCents
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return this.extractionMaxRetries
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    const providers = []
    if (this.isProviderConfigured('openai')) providers.push('openai')
    if (this.isProviderConfigured('anthropic')) providers.push('anthropic')
    providers.push('mock') // Mock provider is always available
    return providers
  }

  /**
   * Check if we should use fallback provider
   */
  shouldUseFallback(): boolean {
    return this.fallbackProvider !== 'none' && 
           this.fallbackProvider !== this.primaryProvider &&
           this.isProviderConfigured(this.fallbackProvider)
  }
}

// Export singleton instance
export const config = Config.getInstance()