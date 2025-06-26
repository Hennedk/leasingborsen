import { config as dotenvConfig } from 'dotenv'
import type { ExtractionConfig } from './types'

// Load environment variables from .env.local for Node.js testing
dotenvConfig({ path: '.env.local' })

/**
 * Node.js-compatible configuration service for AI extraction testing
 * Uses process.env instead of import.meta.env for Node.js compatibility
 */
export class NodeConfig implements ExtractionConfig {
  // AI Provider Keys
  readonly openaiApiKey = process.env.VITE_OPENAI_API_KEY
  readonly anthropicApiKey = process.env.VITE_ANTHROPIC_API_KEY
  
  // Model Versions
  readonly openaiModel = process.env.VITE_OPENAI_MODEL || 'gpt-4-turbo-preview'
  readonly anthropicModel = process.env.VITE_ANTHROPIC_MODEL || 'claude-3-opus-20240229'
  
  // Feature Flags
  readonly aiExtractionEnabled = process.env.VITE_AI_EXTRACTION_ENABLED === 'true'
  readonly primaryProvider = process.env.VITE_AI_PROVIDER_PRIMARY || 'openai'
  readonly fallbackProvider = process.env.VITE_AI_PROVIDER_FALLBACK || 'anthropic'
  
  // Cost Controls
  readonly maxTokensPerPdf = parseInt(process.env.VITE_MAX_TOKENS_PER_PDF || '8000')
  readonly maxCostPerPdfCents = parseInt(process.env.VITE_MAX_COST_PER_PDF_CENTS || '20')
  readonly dailyCostLimitUsd = parseInt(process.env.VITE_DAILY_COST_LIMIT_USD || '10')
  
  // Extraction Settings
  readonly extractionTimeoutSeconds = parseInt(process.env.VITE_EXTRACTION_TIMEOUT_SECONDS || '60')
  readonly extractionMaxRetries = parseInt(process.env.VITE_EXTRACTION_MAX_RETRIES || '2')
  readonly extractionConfidenceThreshold = parseFloat(process.env.VITE_EXTRACTION_CONFIDENCE_THRESHOLD || '0.8')
  
  // Monitoring & Alerts
  readonly extractionLogLevel = process.env.VITE_EXTRACTION_LOG_LEVEL || 'info'
  readonly alertEmail = process.env.VITE_ALERT_EMAIL
  readonly alertCostThresholdUsd = parseInt(process.env.VITE_ALERT_COST_THRESHOLD_USD || '50')
  
  // Singleton instance
  private static instance: NodeConfig
  
  private constructor() {
    this.validate()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): NodeConfig {
    if (!NodeConfig.instance) {
      NodeConfig.instance = new NodeConfig()
    }
    return NodeConfig.instance
  }
  
  /**
   * Validate configuration values
   */
  private validate(): void {
    // Validate numeric values
    if (this.maxTokensPerPdf <= 0) {
      throw new Error('VITE_MAX_TOKENS_PER_PDF must be a positive number')
    }
    
    if (this.maxCostPerPdfCents <= 0) {
      throw new Error('VITE_MAX_COST_PER_PDF_CENTS must be a positive number')
    }
    
    if (this.dailyCostLimitUsd <= 0) {
      throw new Error('VITE_DAILY_COST_LIMIT_USD must be a positive number')
    }
    
    if (this.extractionTimeoutSeconds <= 0) {
      throw new Error('VITE_EXTRACTION_TIMEOUT_SECONDS must be a positive number')
    }
    
    if (this.extractionMaxRetries < 0) {
      throw new Error('VITE_EXTRACTION_MAX_RETRIES must be non-negative')
    }
    
    if (this.extractionConfidenceThreshold < 0 || this.extractionConfidenceThreshold > 1) {
      throw new Error('VITE_EXTRACTION_CONFIDENCE_THRESHOLD must be between 0 and 1')
    }
    
    // Validate provider configuration
    const validProviders = ['openai', 'anthropic', 'mock']
    if (!validProviders.includes(this.primaryProvider)) {
      throw new Error(`VITE_AI_PROVIDER_PRIMARY must be one of: ${validProviders.join(', ')}`)
    }
    
    if (this.fallbackProvider && !validProviders.includes(this.fallbackProvider) && this.fallbackProvider !== 'none') {
      throw new Error(`VITE_AI_PROVIDER_FALLBACK must be one of: ${validProviders.join(', ')}, none`)
    }
    
    // Validate log level
    const validLogLevels = ['debug', 'info', 'warn', 'error']
    if (!validLogLevels.includes(this.extractionLogLevel)) {
      throw new Error(`VITE_EXTRACTION_LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`)
    }
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
  getFallbackProvider(): string | undefined {
    return this.fallbackProvider === 'none' ? undefined : this.fallbackProvider
  }
  
  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: string): boolean {
    switch (provider) {
      case 'openai':
        return !!this.openaiApiKey && this.openaiApiKey.length > 0
      case 'anthropic':
        return !!this.anthropicApiKey && this.anthropicApiKey.length > 0
      case 'mock':
        return true // Mock provider is always configured
      default:
        return false
    }
  }
  
  /**
   * Get timeout in milliseconds
   */
  getTimeoutMs(): number {
    return this.extractionTimeoutSeconds * 1000
  }
  
  /**
   * Get configuration summary for logging
   */
  getSummary(): string {
    return `AI Extraction Config: enabled=${this.aiExtractionEnabled}, ` +
           `primary=${this.primaryProvider}, fallback=${this.fallbackProvider}, ` +
           `maxCost=${this.maxCostPerPdfCents}¢, timeout=${this.extractionTimeoutSeconds}s`
  }
  
  /**
   * Get available providers based on configuration
   */
  getAvailableProviders(): string[] {
    const providers: string[] = ['mock'] // Mock is always available
    
    if (this.isProviderConfigured('openai')) {
      providers.push('openai')
    }
    
    if (this.isProviderConfigured('anthropic')) {
      providers.push('anthropic')
    }
    
    return providers
  }
  
  /**
   * Estimate daily cost for planning
   */
  estimateDailyCost(extractionsPerDay: number): number {
    const avgCostPerExtraction = Math.ceil(this.maxCostPerPdfCents * 0.7) // Assume 70% of max cost
    return Math.ceil((extractionsPerDay * avgCostPerExtraction) / 100) // Convert to dollars
  }
}

// Export singleton instance for easy access
export const nodeConfig = NodeConfig.getInstance()