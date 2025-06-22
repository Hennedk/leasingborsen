// Dealer Configuration Types for Server-Side PDF Processing
// Enables configuration-driven extraction patterns and rules

export type DealerType = 'vw_group' | 'toyota' | 'unknown'

export interface RegexPattern {
  pattern: string
  flags?: string
  description?: string
  examples?: string[]
}

export interface ExtractionPatterns {
  // Model identification patterns
  modelHeader: RegexPattern[]
  modelVariantLine: RegexPattern[]
  variantLine: RegexPattern[]
  
  // Technical specifications patterns
  powerSpec: RegexPattern[]      // Horsepower/kW patterns
  co2Specs: RegexPattern[]       // CO2 emissions and fuel consumption
  electricSpecs: RegexPattern[]  // Electric range and consumption
  transmissionSpec: RegexPattern[]
  
  // Pricing patterns
  pricingLine: RegexPattern[]
  pricingLineAlt: RegexPattern[]
  
  // Structural patterns
  tableHeader: RegexPattern[]
  sectionBreak: RegexPattern[]
}

export interface AIPromptConfig {
  systemRole: string
  userPromptTemplate: string
  examples: AIExample[]
  temperature: number
  maxTokens: number
  model: string // 'gpt-3.5-turbo', 'gpt-4', etc.
}

export interface AIExample {
  input: string
  output: any
  description?: string
}

export interface ConfidenceThresholds {
  usePatternOnly: number      // 0.85 - Skip AI if pattern confidence is high
  requireReview: number       // 0.6 - Flag for manual review if below
  minimumAcceptable: number   // 0.4 - Reject extraction if below
  cacheResults: number        // 0.7 - Only cache results above this threshold
}

export interface ValidationRules {
  priceRange: {
    min: number
    max: number
  }
  requiredFields: string[]
  modelWhitelist?: string[]
  modelBlacklist?: string[]
  maxItemsPerPDF?: number
  minItemsPerPDF?: number
}

export interface OptimizationSettings {
  cacheEnabled: boolean
  learningEnabled: boolean         // Enable pattern learning from AI results
  maxAICostPerPDF: number         // Maximum AI cost per PDF (USD)
  patternLearningThreshold: number // Min confidence to learn patterns from AI
  cacheExpiryHours: number        // How long to keep cached results
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  transformation?: 'lowercase' | 'uppercase' | 'trim' | 'parseNumber' | 'parseBoolean'
  defaultValue?: any
  required?: boolean
}

export interface DealerConfig {
  // Basic information
  id: string
  name: string
  version: string
  description?: string
  
  // Extraction configuration
  extraction: {
    patterns: ExtractionPatterns
    aiPrompt: AIPromptConfig
    confidence: ConfidenceThresholds
    fieldMappings: FieldMapping[]
  }
  
  // Validation rules
  validation: ValidationRules
  
  // Optimization settings
  optimization: OptimizationSettings
  
  // Metadata
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    isActive: boolean
    notes?: string
  }
}

export interface ExtractionResult {
  vehicles: ExtractedVehicle[]
  method: 'cache' | 'pattern' | 'ai' | 'hybrid'
  confidence: number
  processingTimeMs: number
  aiCost?: number
  aiTokens?: number
  patternsUsed?: string[]
  itemsProcessed: number
  errors?: string[]
  warnings?: string[]
  // Cross-dealer validation results
  standardizedVehicles?: any[] // StandardizedVehicle[] - avoiding circular import
  validationSummary?: any // ValidationSummary - avoiding circular import
  overallQualityScore?: number
}

export interface ExtractedVehicle {
  // Basic information
  model: string
  variant: string
  
  // Technical specifications
  horsepower?: number
  transmission?: string
  fuelType?: string
  bodyType?: string
  
  // Environmental data
  co2Emission?: number
  fuelConsumption?: string
  co2TaxHalfYear?: number
  isElectric?: boolean
  rangeKm?: number
  consumptionKwh100km?: number
  wltpRange?: number
  
  // Pricing options
  pricingOptions: PricingOption[]
  
  // Metadata
  sourceLineNumbers: number[]
  confidenceScore: number
  extractionMethod: string
  sourceSection?: string
}

export interface PricingOption {
  mileagePerYear: number
  periodMonths: number
  monthlyPrice: number
  totalCost?: number
  deposit?: number
  firstPayment?: number
  documentation?: string
}

// Configuration validation functions
export class ConfigValidator {
  static validateConfig(config: DealerConfig): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate basic fields
    if (!config.id || config.id.trim() === '') {
      errors.push('Dealer ID is required')
    }

    if (!config.name || config.name.trim() === '') {
      errors.push('Dealer name is required')
    }

    if (!config.version || !config.version.match(/^v\d+\.\d+$/)) {
      errors.push('Version must be in format vX.Y (e.g., v1.0)')
    }

    // Validate extraction patterns
    if (!config.extraction.patterns.modelHeader.length) {
      errors.push('At least one model header pattern is required')
    }

    if (!config.extraction.patterns.pricingLine.length) {
      errors.push('At least one pricing line pattern is required')
    }

    // Validate confidence thresholds
    const { confidence } = config.extraction
    if (confidence.usePatternOnly < confidence.requireReview) {
      errors.push('usePatternOnly threshold must be >= requireReview threshold')
    }

    if (confidence.requireReview < confidence.minimumAcceptable) {
      errors.push('requireReview threshold must be >= minimumAcceptable threshold')
    }

    // Validate AI configuration
    if (!config.extraction.aiPrompt.systemRole) {
      warnings.push('AI system role is empty - AI extraction may not work well')
    }

    if (config.extraction.aiPrompt.temperature < 0 || config.extraction.aiPrompt.temperature > 1) {
      errors.push('AI temperature must be between 0 and 1')
    }

    // Validate optimization settings
    if (config.optimization.maxAICostPerPDF <= 0) {
      errors.push('maxAICostPerPDF must be positive')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateRegexPattern(pattern: RegexPattern): boolean {
    try {
      new RegExp(pattern.pattern, pattern.flags)
      return true
    } catch {
      return false
    }
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/*
 * DealerConfig Types
 * 
 * Comprehensive type definitions for configuration-driven PDF processing.
 * 
 * Key Features:
 * - Externalized regex patterns with descriptions and examples
 * - Configurable AI prompts and parameters per dealer
 * - Flexible confidence thresholds for decision making
 * - Validation rules for data quality
 * - Optimization settings for cost and performance control
 * - Field mapping for database schema compatibility
 * - Built-in validation with error and warning reporting
 * 
 * Usage:
 * const config: DealerConfig = { ... }
 * const validation = ConfigValidator.validateConfig(config)
 * if (!validation.isValid) {
 *   console.error('Config errors:', validation.errors)
 * }
 */