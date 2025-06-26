export {
  AIExtractionService,
  createExtractionService,
  createCostOptimizedService,
  createAccuracyOptimizedService,
  createTestService,
  extractionService
} from './extractor'

export type {
  ProviderStrategy,
  ExtractionServiceOptions,
  ExtendedExtractionResult
} from './extractor'

// Re-export types from main types file
export type {
  ExtractOptions,
  ExtractionResult,
  ExtractedCarData,
  ExtractionError,
  ValidationResult,
  AIProvider
} from '../types'