import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExtractionLogger, createExtractionLogger, createDebugLogger } from './logger'
import type { ExtractionResult, ExtractedCarData, ExtractionError } from '../types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ 
        eq: vi.fn(() => ({ error: null }))
      })),
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ data: [], error: null }))
        })),
        eq: vi.fn(() => ({ data: [], error: null })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({ data: [], error: null }))
        })),
        not: vi.fn(() => ({ data: [], error: null }))
      }))
    }))
  }
}))

describe('ExtractionLogger', () => {
  let logger: ExtractionLogger
  let consoleSpy: any

  beforeEach(() => {
    logger = new ExtractionLogger({
      enableConsoleLogging: true,
      enableDatabaseLogging: false,
      minLogLevel: 'debug'
    })
    
    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { key: 'value' })
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG: Debug message'),
        { key: 'value' }
      )
    })

    it('should log info messages', () => {
      logger.info('Info message', { status: 'ok' })
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO: Info message'),
        { status: 'ok' }
      )
    })

    it('should log warning messages', () => {
      const error = new Error('Test error')
      logger.warn('Warning message', { issue: 'minor' }, error)
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN: Warning message'),
        { issue: 'minor' },
        error
      )
    })

    it('should log error messages', () => {
      const error = new Error('Test error')
      logger.error('Error message', { severity: 'high' }, error)
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: Error message'),
        { severity: 'high' },
        error
      )
    })
  })

  describe('Log Level Filtering', () => {
    it('should respect minimum log level', () => {
      const logger = new ExtractionLogger({
        enableConsoleLogging: true,
        minLogLevel: 'warn'
      })

      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(consoleSpy.debug).not.toHaveBeenCalled()
      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.warn).toHaveBeenCalled()
      expect(consoleSpy.error).toHaveBeenCalled()
    })
  })

  describe('Context Handling', () => {
    it('should include context in log messages', () => {
      const contextLogger = new ExtractionLogger({
        enableConsoleLogging: true,
        minLogLevel: 'debug'
      }, { dealer: 'Toyota', source: 'pdf' })

      contextLogger.info('Test message')
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[dealer=Toyota, source=pdf]'),
        expect.objectContaining({
          dealer: 'Toyota',
          source: 'pdf'
        })
      )
    })

    it('should create child loggers with additional context', () => {
      const childLogger = logger.child({ operation: 'extract' })
      childLogger.info('Child message')
      
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[operation=extract]'),
        expect.objectContaining({
          operation: 'extract'
        })
      )
    })
  })

  describe('Metadata Sanitization', () => {
    it('should sanitize sensitive data', () => {
      logger.info('Test message', {
        apiKey: 'secret-key',
        data: 'normal-data',
        password: 'hidden'
      })

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.any(String),
        {
          apiKey: '[REDACTED]',
          data: 'normal-data',
          password: '[REDACTED]'
        }
      )
    })

    it('should truncate large metadata', () => {
      const largeData = 'x'.repeat(15000)
      logger.info('Test message', { largeField: largeData })

      const loggedMetadata = consoleSpy.info.mock.calls[0][1]
      expect(loggedMetadata._truncated).toBe(true)
      expect(loggedMetadata._originalSize).toBeGreaterThan(15000)
      expect(loggedMetadata._note).toBe('Metadata truncated due to size limit')
    })
  })

  describe('Extraction Logging', () => {
    it('should generate unique log IDs', async () => {
      const logId1 = await logger.logExtractionStart('https://example.com/pdf1.pdf')
      const logId2 = await logger.logExtractionStart('https://example.com/pdf2.pdf')
      
      expect(logId1).toMatch(/^ext_\d+_[a-z0-9]+$/)
      expect(logId2).toMatch(/^ext_\d+_[a-z0-9]+$/)
      expect(logId1).not.toBe(logId2)
    })

    it('should log extraction success with proper metrics', async () => {
      const logId = 'test-log-id'
      const mockResult: ExtractionResult = {
        success: true,
        data: {
          documentInfo: {
            brand: 'Toyota',
            documentDate: '2024-01-01',
            currency: 'DKK',
            language: 'da',
            documentType: 'private_leasing'
          },
          vehicles: [{
            model: 'Camry',
            leasePeriodMonths: 36,
            powertrainType: 'hybrid',
            variants: [{
              variantName: 'Hybrid',
              engineSpecification: '2.5L Hybrid',
              transmission: 'automatic',
              pricing: {
                monthlyPayment: 5000,
                firstPayment: 15000
              }
            }]
          }]
        } as ExtractedCarData,
        metadata: {
          provider: 'openai',
          modelVersion: 'gpt-4',
          tokensUsed: 1500,
          costCents: 75,
          extractionTimeMs: 3000,
          confidence: 0.95
        }
      }

      await logger.logExtractionSuccess(logId, mockResult, mockResult.data!, 3000)

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Extraction completed successfully'),
        expect.objectContaining({
          logId,
          aiProvider: 'openai',
          vehicleCount: 1,
          totalVariants: 1,
          costCents: 75
        })
      )
    })

    it('should log extraction failures', async () => {
      const logId = 'test-log-id'
      const mockError: ExtractionError = {
        type: 'api',
        message: 'API timeout',
        retryable: true
      }

      await logger.logExtractionFailure(logId, mockError, 5000, 'openai', 2)

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Extraction failed'),
        expect.objectContaining({
          logId,
          errorType: 'api',
          errorMessage: 'API timeout',
          retryable: true,
          retryCount: 2
        }),
        ''
      )
    })
  })

  describe('Performance and Cost Logging', () => {
    it('should log cost information', () => {
      logger.logCost('openai', 1000, 50, 'Toyota')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Cost tracked'),
        expect.objectContaining({
          provider: 'openai',
          tokensUsed: 1000,
          costCents: 50,
          costUsd: '0.5000',
          dealerName: 'Toyota'
        })
      )
    })

    it('should log performance metrics', () => {
      logger.logPerformance('pdf-parsing', 2500, { pageCount: 10 })

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('Performance: pdf-parsing'),
        expect.objectContaining({
          operation: 'pdf-parsing',
          durationMs: 2500,
          durationSeconds: '2.50',
          pageCount: 10
        })
      )
    })

    it('should log retry attempts', () => {
      logger.logRetry(2, 3, 'API timeout', 1000)

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt 2/3'),
        expect.objectContaining({
          attempt: 2,
          maxRetries: 3,
          reason: 'API timeout',
          delayMs: 1000
        }),
        ''
      )
    })
  })

  describe('Factory Functions', () => {
    it('should create extraction logger with context', () => {
      const extractionLogger = createExtractionLogger('BMW', 'https://example.com/pdf')
      extractionLogger.info('Test message')

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[dealerName=BMW, pdfUrl=https://example.com/pdf]'),
        expect.objectContaining({
          dealerName: 'BMW',
          pdfUrl: 'https://example.com/pdf'
        })
      )
    })

    it('should create debug logger with verbose settings', () => {
      const debugLogger = createDebugLogger()
      debugLogger.debug('Debug message')

      expect(consoleSpy.debug).toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    it('should update configuration dynamically', () => {
      logger.configure({
        minLogLevel: 'error',
        enableConsoleLogging: false
      })

      logger.info('Info message')
      logger.error('Error message')

      expect(consoleSpy.info).not.toHaveBeenCalled()
      expect(consoleSpy.error).not.toHaveBeenCalled() // disabled console logging
    })
  })
})