/**
 * ExtractionLogger Demo
 * 
 * This file demonstrates the usage of the ExtractionLogger utility.
 * Run this file to see the logger in action with different configurations.
 */

import { 
  createExtractionLogger, 
  createDebugLogger, 
  createProductionLogger,
  ExtractionLogger
} from './logger'
import type { ExtractionResult, ExtractedCarData, ExtractionError } from '../types'

async function demoBasicLogging() {
  console.log('=== Basic Logging Demo ===')
  
  const logger = createExtractionLogger('Toyota Denmark', 'https://example.com/toyota-prices.pdf')
  
  logger.debug('Starting PDF processing', { fileSize: '2.4MB', pages: 15 })
  logger.info('Document loaded successfully', { documentType: 'price_list', language: 'da' })
  logger.warn('Minor validation issue found', { field: 'fuel_type', issue: 'deprecated_value' })
  logger.error('Extraction failed', { reason: 'API timeout' }, new Error('Request timeout'))
  
  console.log('\n')
}

async function demoExtractionWorkflow() {
  console.log('=== Extraction Workflow Demo ===')
  
  const logger = createExtractionLogger('BMW Munich')
  
  // Start extraction
  const logId = await logger.logExtractionStart(
    'https://example.com/bmw-prices.pdf',
    'BMW Munich',
    { documentType: 'price_list', maxRetries: 3 }
  )
  
  console.log(`Started extraction with log ID: ${logId}`)
  
  // Simulate extraction process
  logger.info('Parsing PDF structure', { pageCount: 12, extractionMethod: 'ai' })
  logger.logPerformance('pdf-parsing', 1500, { pagesPerSecond: 8 })
  
  // Simulate successful extraction
  const mockResult: ExtractionResult = {
    success: true,
    data: {
      documentInfo: {
        brand: 'BMW',
        documentDate: '2024-06-01',
        currency: 'EUR',
        language: 'de',
        documentType: 'private_leasing'
      },
      vehicles: [{
        model: 'X3',
        leasePeriodMonths: 36,
        powertrainType: 'hybrid',
        variants: [
          {
            variantName: 'xDrive30e',
            engineSpecification: '2.0L PHEV',
            transmission: 'automatic',
            pricing: {
              monthlyPayment: 650,
              firstPayment: 1950
            }
          },
          {
            variantName: 'xDrive20d',
            engineSpecification: '2.0L Diesel',
            transmission: 'automatic',
            pricing: {
              monthlyPayment: 580,
              firstPayment: 1740
            }
          }
        ]
      }]
    } as ExtractedCarData,
    metadata: {
      provider: 'openai',
      modelVersion: 'gpt-4',
      tokensUsed: 2400,
      costCents: 120,
      extractionTimeMs: 4500,
      confidence: 0.92
    }
  }
  
  await logger.logExtractionSuccess(logId, mockResult, mockResult.data!, 4500)
  logger.logCost('openai', 2400, 120, 'BMW Munich')
  
  console.log('\n')
}

async function demoErrorHandling() {
  console.log('=== Error Handling Demo ===')
  
  const logger = createExtractionLogger('Audi Copenhagen')
  
  const logId = await logger.logExtractionStart('https://example.com/audi-prices.pdf', 'Audi Copenhagen')
  
  // Simulate retry scenario
  logger.logRetry(1, 3, 'API rate limit', 2000)
  logger.logRetry(2, 3, 'Server error 500', 4000)
  
  // Simulate final failure
  const mockError: ExtractionError = {
    type: 'api',
    message: 'Maximum retries exceeded: API consistently returning 500 errors',
    retryable: false,
    details: {
      lastStatusCode: 500,
      attempts: 3,
      totalTimeMs: 15000
    }
  }
  
  await logger.logExtractionFailure(logId, mockError, 15000, 'openai', 3)
  
  console.log('\n')
}

async function demoPartialExtraction() {
  console.log('=== Partial Extraction Demo ===')
  
  const logger = createExtractionLogger('Mercedes Stuttgart')
  
  const logId = await logger.logExtractionStart('https://example.com/mercedes-prices.pdf', 'Mercedes Stuttgart')
  
  const mockResult: ExtractionResult = {
    success: true,
    data: {
      documentInfo: {
        brand: 'Mercedes-Benz',
        documentDate: '2024-05-15',
        currency: 'EUR',
        language: 'de',
        documentType: 'private_leasing'
      },
      vehicles: [{
        model: 'C-Class',
        leasePeriodMonths: 48,
        powertrainType: 'gasoline',
        variants: [{
          variantName: 'C200',
          engineSpecification: '1.5L Turbo',
          transmission: 'automatic',
          pricing: {
            monthlyPayment: 520
            // Missing firstPayment - validation error
          }
        }]
      }]
    } as ExtractedCarData,
    metadata: {
      provider: 'anthropic',
      modelVersion: 'claude-3-sonnet',
      tokensUsed: 1800,
      costCents: 90,
      extractionTimeMs: 3200,
      confidence: 0.75
    }
  }
  
  const validationErrors = [
    {
      field: 'vehicles[0].variants[0].pricing.firstPayment',
      message: 'Required field is missing',
      value: undefined,
      rule: 'required'
    }
  ]
  
  await logger.logExtractionPartial(logId, mockResult, mockResult.data!, validationErrors, 3200)
  
  console.log('\n')
}

async function demoLoggerConfigurations() {
  console.log('=== Logger Configurations Demo ===')
  
  // Debug logger - verbose output
  console.log('Debug Logger (verbose):')
  const debugLogger = createDebugLogger()
  debugLogger.debug('Detailed parsing info', { tokenCount: 1500, confidence: 0.88 })
  debugLogger.info('Processing page 5 of 12')
  
  // Production logger - minimal output
  console.log('\nProduction Logger (minimal):')
  const prodLogger = createProductionLogger()
  prodLogger.debug('This won\'t appear') // Below threshold
  prodLogger.info('This won\'t appear')  // Below threshold
  prodLogger.warn('This will appear in logs')
  prodLogger.error('This will appear in logs')
  
  // Custom logger
  console.log('\nCustom Logger:')
  const customLogger = new ExtractionLogger({
    enableConsoleLogging: true,
    enableDatabaseLogging: false,
    minLogLevel: 'info',
    includeStackTrace: false,
    maxMetadataSize: 1000
  }, { service: 'batch-processor', version: '2.1.0' })
  
  customLogger.info('Custom logger with specific config', { batchSize: 50 })
  
  console.log('\n')
}

async function demoQueryOperations() {
  console.log('=== Query Operations Demo ===')
  
  const logger = createExtractionLogger()
  
  try {
    // Get recent extractions
    const recentExtractions = await logger.getRecentExtractions(5, 'Toyota Denmark')
    console.log(`Found ${recentExtractions.length} recent extractions for Toyota Denmark`)
    
    // Get extraction statistics
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const stats = await logger.getExtractionStats(last7Days, now)
    console.log('7-day extraction stats:', {
      total: stats.totalExtractions,
      successful: stats.successfulExtractions,
      successRate: stats.totalExtractions > 0 
        ? Math.round((stats.successfulExtractions / stats.totalExtractions) * 100) 
        : 0,
      totalCost: `$${(stats.totalCostCents / 100).toFixed(2)}`,
      avgProcessingTime: `${Math.round(stats.avgProcessingTimeMs)}ms`
    })
    
    // Get cost summary
    const costSummary = await logger.getCostSummary()
    console.log('Cost summary:', {
      dailyTotal: `$${(costSummary.dailyTotalCents / 100).toFixed(2)}`,
      monthlyTotal: `$${(costSummary.monthlyTotalCents / 100).toFixed(2)}`,
      topProvider: Object.keys(costSummary.byProvider)[0] || 'none',
      topDealer: Object.keys(costSummary.byDealer)[0] || 'none'
    })
    
  } catch (error) {
    console.error('Query demo failed (this is expected without database):', error instanceof Error ? error.message : 'Unknown error')
  }
  
  console.log('\n')
}

async function runDemo() {
  console.log('🚗 ExtractionLogger Demo Starting...\n')
  
  await demoBasicLogging()
  await demoExtractionWorkflow()
  await demoErrorHandling()
  await demoPartialExtraction()
  await demoLoggerConfigurations()
  await demoQueryOperations()
  
  console.log('✅ ExtractionLogger Demo Complete!')
}

// Export for use in other files or run directly
export { runDemo }

// Uncomment to run demo directly
// runDemo().catch(console.error)