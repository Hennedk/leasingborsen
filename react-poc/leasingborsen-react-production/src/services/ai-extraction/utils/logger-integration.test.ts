import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createExtractionLogger } from './logger'

// This test verifies that the logger integrates properly with the main project
describe('ExtractionLogger Integration', () => {
  beforeEach(() => {
    // Mock console methods to avoid spam during tests
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create logger with factory function', () => {
    expect(() => {
      const logger = createExtractionLogger('Toyota', 'https://example.com/test.pdf')
      logger.info('Test message')
    }).not.toThrow()
  })

  it('should handle extraction workflow without errors', async () => {
    const logger = createExtractionLogger('BMW')
    
    await expect(async () => {
      const logId = await logger.logExtractionStart('https://example.com/test.pdf', 'BMW')
      expect(logId).toMatch(/^ext_\d+_[a-z0-9]+$/)
      
      logger.logCost('openai', 1000, 50, 'BMW')
      logger.logPerformance('extraction', 2000)
      logger.logRetry(1, 3, 'timeout')
    }).not.toThrow()
  })

  it('should export all required functions', () => {
    expect(createExtractionLogger).toBeDefined()
    expect(typeof createExtractionLogger).toBe('function')
  })
})