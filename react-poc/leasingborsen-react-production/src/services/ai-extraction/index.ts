// AI Extraction Service - Main Exports

export * from './types'
export * from './config'
export * from './extraction'
export * from './providers'
export * from './validation/validator'
export * from './utils/cost-calculator'
export * from './utils/logger'

// Main service facade
export { 
  AIExtractionService,
  createExtractionService,
  createCostOptimizedService,
  createAccuracyOptimizedService,
  createTestService,
  extractionService
} from './extraction'

// Config export
export { config } from './config'

// Provider exports
export { BaseAIProvider } from './providers/base'
export { OpenAIProvider } from './providers/openai'
export { AnthropicProvider } from './providers/anthropic'
export { MockAIProvider } from './providers/mock'

// Validation exports
export { CarDataValidator } from './validation/validator'

// Utility exports
export { costCalculator, CostCalculator } from './utils/cost-calculator'
export { 
  extractionLogger, 
  ExtractionLogger,
  createExtractionLogger,
  createDebugLogger,
  createProductionLogger
} from './utils/logger'