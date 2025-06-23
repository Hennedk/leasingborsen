/**
 * Performance Optimization Configuration
 * 
 * This file contains configuration options for the PerformanceOptimizer
 * Adjust these settings based on your environment and performance requirements
 */

export interface CacheConfig {
  maxSize: number;
  ttl: number;
  updateAgeOnGet?: boolean;
}

export interface ProcessingConfig {
  maxConcurrent: number;
  chunkSize: number;
  memoryThreshold: number;
  queuePriority: boolean;
}

export interface MonitoringConfig {
  metricsRetention: number;
  alertThresholds: {
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
}

export interface OptimizationConfig {
  caching: {
    textExtraction: CacheConfig;
    aiResults: CacheConfig;
    validation: CacheConfig;
    queryResults: CacheConfig;
  };
  processing: ProcessingConfig;
  monitoring: MonitoringConfig;
}

/**
 * Development configuration - optimized for development with faster feedback
 */
export const developmentConfig: OptimizationConfig = {
  caching: {
    textExtraction: {
      maxSize: 50,        // Smaller cache for development
      ttl: 1800000,       // 30 minutes
      updateAgeOnGet: true
    },
    aiResults: {
      maxSize: 100,       // Smaller cache
      ttl: 900000,        // 15 minutes
      updateAgeOnGet: true
    },
    validation: {
      maxSize: 200,       // Smaller cache
      ttl: 600000         // 10 minutes
    },
    queryResults: {
      maxSize: 100,       // Smaller cache
      ttl: 300000         // 5 minutes
    }
  },
  processing: {
    maxConcurrent: 2,           // Lower concurrency for development
    chunkSize: 512 * 1024,     // 512KB chunks
    memoryThreshold: 0.7,      // 70% memory threshold
    queuePriority: true
  },
  monitoring: {
    metricsRetention: 3600000,  // 1 hour retention
    alertThresholds: {
      responseTime: 10000,      // 10 seconds - more lenient for development
      memoryUsage: 0.8,         // 80%
      errorRate: 0.2            // 20% - more lenient for development
    }
  }
};

/**
 * Production configuration - optimized for high performance and reliability
 */
export const productionConfig: OptimizationConfig = {
  caching: {
    textExtraction: {
      maxSize: 500,           // Larger cache for production
      ttl: 7200000,          // 2 hours
      updateAgeOnGet: true
    },
    aiResults: {
      maxSize: 2000,         // Large cache for AI results
      ttl: 3600000,          // 1 hour
      updateAgeOnGet: true
    },
    validation: {
      maxSize: 3000,         // Large validation cache
      ttl: 1800000           // 30 minutes
    },
    queryResults: {
      maxSize: 1000,         // Large query cache
      ttl: 900000            // 15 minutes
    }
  },
  processing: {
    maxConcurrent: 10,         // Higher concurrency for production
    chunkSize: 2 * 1024 * 1024, // 2MB chunks
    memoryThreshold: 0.8,      // 80% memory threshold
    queuePriority: true
  },
  monitoring: {
    metricsRetention: 172800000, // 48 hours retention
    alertThresholds: {
      responseTime: 5000,        // 5 seconds
      memoryUsage: 0.85,         // 85%
      errorRate: 0.05            // 5%
    }
  }
};

/**
 * High-volume configuration - optimized for processing large volumes of PDFs
 */
export const highVolumeConfig: OptimizationConfig = {
  caching: {
    textExtraction: {
      maxSize: 1000,         // Very large cache
      ttl: 14400000,         // 4 hours
      updateAgeOnGet: true
    },
    aiResults: {
      maxSize: 5000,         // Very large AI cache
      ttl: 7200000,          // 2 hours
      updateAgeOnGet: true
    },
    validation: {
      maxSize: 8000,         // Very large validation cache
      ttl: 3600000           // 1 hour
    },
    queryResults: {
      maxSize: 2000,         // Large query cache
      ttl: 1800000           // 30 minutes
    }
  },
  processing: {
    maxConcurrent: 20,         // Very high concurrency
    chunkSize: 4 * 1024 * 1024, // 4MB chunks
    memoryThreshold: 0.75,     // Lower threshold for high volume
    queuePriority: true
  },
  monitoring: {
    metricsRetention: 259200000, // 72 hours retention
    alertThresholds: {
      responseTime: 3000,        // 3 seconds - strict for high volume
      memoryUsage: 0.8,          // 80%
      errorRate: 0.02            // 2% - very strict
    }
  }
};

/**
 * Memory-constrained configuration - optimized for environments with limited memory
 */
export const memoryConstrainedConfig: OptimizationConfig = {
  caching: {
    textExtraction: {
      maxSize: 25,           // Very small cache
      ttl: 1800000,          // 30 minutes
      updateAgeOnGet: false  // Don't update age to allow faster eviction
    },
    aiResults: {
      maxSize: 50,           // Small cache
      ttl: 900000,           // 15 minutes
      updateAgeOnGet: false
    },
    validation: {
      maxSize: 100,          // Small cache
      ttl: 600000            // 10 minutes
    },
    queryResults: {
      maxSize: 50,           // Small cache
      ttl: 300000            // 5 minutes
    }
  },
  processing: {
    maxConcurrent: 2,          // Very low concurrency
    chunkSize: 256 * 1024,     // 256KB chunks
    memoryThreshold: 0.6,      // Lower memory threshold
    queuePriority: true
  },
  monitoring: {
    metricsRetention: 1800000,  // 30 minutes retention
    alertThresholds: {
      responseTime: 15000,      // 15 seconds - more lenient
      memoryUsage: 0.7,         // 70% - stricter memory monitoring
      errorRate: 0.15           // 15%
    }
  }
};

/**
 * Testing configuration - optimized for testing environments
 */
export const testingConfig: OptimizationConfig = {
  caching: {
    textExtraction: {
      maxSize: 10,           // Very small cache for testing
      ttl: 60000,            // 1 minute
      updateAgeOnGet: false
    },
    aiResults: {
      maxSize: 20,           // Small cache
      ttl: 60000,            // 1 minute
      updateAgeOnGet: false
    },
    validation: {
      maxSize: 30,           // Small cache
      ttl: 60000             // 1 minute
    },
    queryResults: {
      maxSize: 20,           // Small cache
      ttl: 30000             // 30 seconds
    }
  },
  processing: {
    maxConcurrent: 1,          // Single threaded for testing
    chunkSize: 64 * 1024,      // 64KB chunks
    memoryThreshold: 0.9,      // High threshold for testing
    queuePriority: false       // No priority for testing
  },
  monitoring: {
    metricsRetention: 300000,   // 5 minutes retention
    alertThresholds: {
      responseTime: 30000,      // 30 seconds - very lenient for testing
      memoryUsage: 0.95,        // 95%
      errorRate: 0.5            // 50% - very lenient for testing
    }
  }
};

/**
 * Environment-based configuration selector
 */
export function getConfigForEnvironment(environment?: string): OptimizationConfig {
  const env = environment || process.env.NODE_ENV || 'development';
  
  switch (env.toLowerCase()) {
    case 'production':
      return productionConfig;
    case 'staging':
      return productionConfig; // Use production config for staging
    case 'test':
    case 'testing':
      return testingConfig;
    case 'development':
    case 'dev':
      return developmentConfig;
    case 'high-volume':
      return highVolumeConfig;
    case 'memory-constrained':
      return memoryConstrainedConfig;
    default:
      console.warn(`Unknown environment: ${env}, using development config`);
      return developmentConfig;
  }
}

/**
 * Custom configuration builder for specific use cases
 */
export class ConfigurationBuilder {
  private config: OptimizationConfig;

  constructor(baseConfig?: OptimizationConfig) {
    this.config = baseConfig || developmentConfig;
  }

  /**
   * Set cache configuration
   */
  setCacheConfig(cacheType: keyof OptimizationConfig['caching'], config: Partial<CacheConfig>): ConfigurationBuilder {
    this.config.caching[cacheType] = { ...this.config.caching[cacheType], ...config };
    return this;
  }

  /**
   * Set processing configuration
   */
  setProcessingConfig(config: Partial<ProcessingConfig>): ConfigurationBuilder {
    this.config.processing = { ...this.config.processing, ...config };
    return this;
  }

  /**
   * Set monitoring configuration
   */
  setMonitoringConfig(config: Partial<MonitoringConfig>): ConfigurationBuilder {
    this.config.monitoring = { ...this.config.monitoring, ...config };
    return this;
  }

  /**
   * Optimize for specific characteristics
   */
  optimizeForHighThroughput(): ConfigurationBuilder {
    return this
      .setProcessingConfig({ maxConcurrent: 15, chunkSize: 3 * 1024 * 1024 })
      .setCacheConfig('aiResults', { maxSize: 3000, ttl: 5400000 }) // 1.5 hours
      .setCacheConfig('textExtraction', { maxSize: 800, ttl: 10800000 }); // 3 hours
  }

  optimizeForLowLatency(): ConfigurationBuilder {
    return this
      .setProcessingConfig({ maxConcurrent: 8, chunkSize: 1024 * 1024 })
      .setCacheConfig('queryResults', { maxSize: 1500, ttl: 1800000 }) // 30 minutes
      .setMonitoringConfig({ alertThresholds: { responseTime: 2000, memoryUsage: 0.8, errorRate: 0.03 } });
  }

  optimizeForMemoryEfficiency(): ConfigurationBuilder {
    return this
      .setProcessingConfig({ maxConcurrent: 3, memoryThreshold: 0.6 })
      .setCacheConfig('textExtraction', { maxSize: 30, ttl: 900000, updateAgeOnGet: false })
      .setCacheConfig('aiResults', { maxSize: 60, ttl: 600000, updateAgeOnGet: false })
      .setCacheConfig('validation', { maxSize: 80, ttl: 300000 })
      .setCacheConfig('queryResults', { maxSize: 40, ttl: 180000 });
  }

  /**
   * Build the final configuration
   */
  build(): OptimizationConfig {
    return { ...this.config };
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: OptimizationConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate cache configurations
  Object.entries(config.caching).forEach(([cacheType, cacheConfig]) => {
    if (cacheConfig.maxSize <= 0) {
      errors.push(`${cacheType} cache maxSize must be positive`);
    }
    if (cacheConfig.ttl <= 0) {
      errors.push(`${cacheType} cache TTL must be positive`);
    }
  });

  // Validate processing configuration
  if (config.processing.maxConcurrent <= 0) {
    errors.push('maxConcurrent must be positive');
  }
  if (config.processing.chunkSize <= 0) {
    errors.push('chunkSize must be positive');
  }
  if (config.processing.memoryThreshold <= 0 || config.processing.memoryThreshold > 1) {
    errors.push('memoryThreshold must be between 0 and 1');
  }

  // Validate monitoring configuration
  if (config.monitoring.metricsRetention <= 0) {
    errors.push('metricsRetention must be positive');
  }
  if (config.monitoring.alertThresholds.responseTime <= 0) {
    errors.push('responseTime threshold must be positive');
  }
  if (config.monitoring.alertThresholds.memoryUsage <= 0 || config.monitoring.alertThresholds.memoryUsage > 1) {
    errors.push('memoryUsage threshold must be between 0 and 1');
  }
  if (config.monitoring.alertThresholds.errorRate < 0 || config.monitoring.alertThresholds.errorRate > 1) {
    errors.push('errorRate threshold must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Configuration presets for common scenarios
 */
export const configPresets = {
  development: developmentConfig,
  production: productionConfig,
  highVolume: highVolumeConfig,
  memoryConstrained: memoryConstrainedConfig,
  testing: testingConfig,

  // Specialized presets
  rapidPrototyping: new ConfigurationBuilder(developmentConfig)
    .setCacheConfig('textExtraction', { maxSize: 20, ttl: 300000 }) // 5 minutes
    .setCacheConfig('aiResults', { maxSize: 30, ttl: 180000 }) // 3 minutes
    .setProcessingConfig({ maxConcurrent: 1 })
    .build(),

  heavyProcessing: new ConfigurationBuilder(productionConfig)
    .optimizeForHighThroughput()
    .setProcessingConfig({ maxConcurrent: 25 })
    .build(),

  realTimeProcessing: new ConfigurationBuilder(productionConfig)
    .optimizeForLowLatency()
    .setMonitoringConfig({ alertThresholds: { responseTime: 1000, memoryUsage: 0.75, errorRate: 0.01 } })
    .build(),

  batchProcessing: new ConfigurationBuilder(highVolumeConfig)
    .setProcessingConfig({ maxConcurrent: 50, chunkSize: 8 * 1024 * 1024 })
    .setCacheConfig('textExtraction', { maxSize: 2000, ttl: 21600000 }) // 6 hours
    .build()
};

/**
 * Export commonly used configurations
 */
export default {
  getConfigForEnvironment,
  ConfigurationBuilder,
  validateConfig,
  presets: configPresets,
  configs: {
    development: developmentConfig,
    production: productionConfig,
    highVolume: highVolumeConfig,
    memoryConstrained: memoryConstrainedConfig,
    testing: testingConfig
  }
};