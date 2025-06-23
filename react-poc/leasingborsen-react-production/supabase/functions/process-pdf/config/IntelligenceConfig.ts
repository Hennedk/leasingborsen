/**
 * Configuration for the Pattern Learning Intelligence System
 * 
 * This file contains all configurable parameters for the machine learning
 * pattern discovery and adaptation system.
 */

export interface IntelligenceConfig {
  // Core Learning Settings
  learning: {
    enabled: boolean
    minimumSamples: number // Minimum occurrences before pattern promotion
    confidenceThreshold: number // Minimum confidence for pattern usage
    learningThreshold: number // Success rate threshold for pattern promotion
    adaptiveWindow: number // Number of recent extractions for confidence adjustment
  }

  // Pattern Discovery Settings
  discovery: {
    enabled: boolean
    contextWindow: number // Characters around extracted value for pattern generation
    maxPatternLength: number // Maximum regex pattern length
    excludePatterns: string[] // Patterns to exclude from discovery
    fieldPriority: string[] // Fields to prioritize for pattern discovery
  }

  // A/B Testing Configuration
  abTesting: {
    enabled: boolean
    defaultTestSize: number // Default number of samples for A/B tests
    minImprovementThreshold: number // Minimum improvement to recommend adoption
    testDurationDays: number // Maximum days to run A/B test
    maxConcurrentTests: number // Maximum concurrent A/B tests
  }

  // Format Change Detection
  formatDetection: {
    enabled: boolean
    detectionWindow: number // Number of recent extractions to analyze
    consistencyThreshold: number // Field presence rate for consistency check
    alertThreshold: number // Threshold for triggering format change alerts
  }

  // Performance Optimization
  performance: {
    cachePatterns: boolean
    patternCacheSize: number
    performanceMetricsBatch: number // Batch size for performance updates
    cleanupIntervalDays: number // Days between cleanup operations
  }

  // Field-Specific Settings
  fieldSettings: {
    [fieldName: string]: {
      priority: 'high' | 'medium' | 'low'
      confidenceThreshold: number
      enableLearning: boolean
      customValidation?: string // Custom validation pattern
    }
  }

  // Dealer-Specific Overrides
  dealerOverrides: {
    [dealerId: string]: Partial<IntelligenceConfig>
  }
}

/**
 * Default Intelligence Configuration
 */
export const DEFAULT_INTELLIGENCE_CONFIG: IntelligenceConfig = {
  learning: {
    enabled: true,
    minimumSamples: 10,
    confidenceThreshold: 0.7,
    learningThreshold: 0.85,
    adaptiveWindow: 100
  },

  discovery: {
    enabled: true,
    contextWindow: 100,
    maxPatternLength: 200,
    excludePatterns: [
      // Exclude overly generic patterns
      '.*',
      '.+',
      '[\\s\\S]*',
      // Exclude patterns that might match everything
      '([^\\n]+)',
      '(.*)'
    ],
    fieldPriority: [
      'price',
      'monthly_payment', 
      'make',
      'model',
      'mileage',
      'registration_date',
      'first_registration',
      'fuel_type',
      'transmission'
    ]
  },

  abTesting: {
    enabled: true,
    defaultTestSize: 100,
    minImprovementThreshold: 0.05, // 5% improvement needed
    testDurationDays: 7,
    maxConcurrentTests: 5
  },

  formatDetection: {
    enabled: true,
    detectionWindow: 10,
    consistencyThreshold: 0.8, // 80% field presence
    alertThreshold: 0.5 // 50% change in field presence
  },

  performance: {
    cachePatterns: true,
    patternCacheSize: 1000,
    performanceMetricsBatch: 10,
    cleanupIntervalDays: 30
  },

  fieldSettings: {
    price: {
      priority: 'high',
      confidenceThreshold: 0.85,
      enableLearning: true,
      customValidation: '^[0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?$'
    },
    monthly_payment: {
      priority: 'high',
      confidenceThreshold: 0.85,
      enableLearning: true,
      customValidation: '^[0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]+)?$'
    },
    make: {
      priority: 'high',
      confidenceThreshold: 0.8,
      enableLearning: true
    },
    model: {
      priority: 'high',
      confidenceThreshold: 0.8,
      enableLearning: true
    },
    mileage: {
      priority: 'medium',
      confidenceThreshold: 0.75,
      enableLearning: true,
      customValidation: '^[0-9]{1,3}(?:\\.[0-9]{3})*$'
    },
    registration_date: {
      priority: 'medium',
      confidenceThreshold: 0.75,
      enableLearning: true,
      customValidation: '^[0-9]{1,2}[-\\/\\.][0-9]{1,2}[-\\/\\.][0-9]{4}$'
    },
    first_registration: {
      priority: 'medium',
      confidenceThreshold: 0.75,
      enableLearning: true,
      customValidation: '^[0-9]{1,2}[-\\/\\.][0-9]{1,2}[-\\/\\.][0-9]{4}$'
    },
    fuel_type: {
      priority: 'low',
      confidenceThreshold: 0.7,
      enableLearning: true
    },
    transmission: {
      priority: 'low',
      confidenceThreshold: 0.7,
      enableLearning: true
    },
    engine_size: {
      priority: 'low',
      confidenceThreshold: 0.65,
      enableLearning: true
    },
    horsepower: {
      priority: 'low',
      confidenceThreshold: 0.65,
      enableLearning: true
    }
  },

  dealerOverrides: {
    // Volkswagen Group - higher standards for established patterns
    volkswagen: {
      learning: {
        enabled: true,
        confidenceThreshold: 0.8,
        learningThreshold: 0.9
      },
      fieldSettings: {
        price: {
          priority: 'high',
          confidenceThreshold: 0.9,
          enableLearning: true
        }
      }
    },
    
    // Toyota - more aggressive learning for newer dealer
    toyota: {
      learning: {
        enabled: true,
        minimumSamples: 5, // Lower threshold for learning
        confidenceThreshold: 0.65,
        learningThreshold: 0.8
      },
      discovery: {
        enabled: true
      }
    }
  }
}

/**
 * Load intelligence configuration with dealer-specific overrides
 */
export function loadIntelligenceConfig(dealerId?: string): IntelligenceConfig {
  let config = JSON.parse(JSON.stringify(DEFAULT_INTELLIGENCE_CONFIG)) // Deep clone
  
  // Apply dealer-specific overrides
  if (dealerId && config.dealerOverrides[dealerId]) {
    const override = config.dealerOverrides[dealerId]
    config = mergeConfigs(config, override)
  }
  
  return config
}

/**
 * Merge configuration objects recursively
 */
function mergeConfigs(base: any, override: any): any {
  const result = { ...base }
  
  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = mergeConfigs(result[key] || {}, override[key])
    } else {
      result[key] = override[key]
    }
  }
  
  return result
}

/**
 * Validate intelligence configuration
 */
export function validateIntelligenceConfig(config: IntelligenceConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Validate learning settings
  if (config.learning.minimumSamples < 1) {
    errors.push('Learning.minimumSamples must be at least 1')
  }
  
  if (config.learning.confidenceThreshold < 0 || config.learning.confidenceThreshold > 1) {
    errors.push('Learning.confidenceThreshold must be between 0 and 1')
  }
  
  if (config.learning.learningThreshold < 0 || config.learning.learningThreshold > 1) {
    errors.push('Learning.learningThreshold must be between 0 and 1')
  }
  
  // Validate discovery settings
  if (config.discovery.contextWindow < 10) {
    errors.push('Discovery.contextWindow should be at least 10 characters')
  }
  
  if (config.discovery.maxPatternLength < 10) {
    errors.push('Discovery.maxPatternLength should be at least 10 characters')
  }
  
  // Validate A/B testing settings
  if (config.abTesting.defaultTestSize < 10) {
    errors.push('AbTesting.defaultTestSize should be at least 10')
  }
  
  if (config.abTesting.minImprovementThreshold < 0) {
    errors.push('AbTesting.minImprovementThreshold must be non-negative')
  }
  
  // Validate field settings
  for (const [fieldName, settings] of Object.entries(config.fieldSettings)) {
    if (settings.confidenceThreshold < 0 || settings.confidenceThreshold > 1) {
      errors.push(`Field ${fieldName}: confidenceThreshold must be between 0 and 1`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get field-specific configuration
 */
export function getFieldConfig(
  config: IntelligenceConfig, 
  fieldName: string
): IntelligenceConfig['fieldSettings'][string] {
  return config.fieldSettings[fieldName] || {
    priority: 'low',
    confidenceThreshold: config.learning.confidenceThreshold,
    enableLearning: true
  }
}

/**
 * Environment-based configuration
 */
export function getEnvironmentConfig(): Partial<IntelligenceConfig> {
  const env = Deno.env.get('ENVIRONMENT') || 'development'
  
  switch (env) {
    case 'production':
      return {
        learning: {
          enabled: true,
          minimumSamples: 15, // Higher threshold in production
          confidenceThreshold: 0.8,
          learningThreshold: 0.9
        },
        abTesting: {
          enabled: true,
          defaultTestSize: 200, // Larger test size in production
          minImprovementThreshold: 0.1 // Higher improvement threshold
        }
      }
      
    case 'staging':
      return {
        learning: {
          enabled: true,
          minimumSamples: 8,
          confidenceThreshold: 0.75,
          learningThreshold: 0.85
        },
        abTesting: {
          enabled: true,
          defaultTestSize: 100
        }
      }
      
    case 'development':
    default:
      return {
        learning: {
          enabled: true,
          minimumSamples: 3, // Lower threshold for development
          confidenceThreshold: 0.6,
          learningThreshold: 0.7
        },
        abTesting: {
          enabled: true,
          defaultTestSize: 50
        }
      }
  }
}