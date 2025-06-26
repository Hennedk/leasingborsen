import { describe, expect, test, beforeEach, vi } from 'vitest'
import { AIExtractionService } from '../extraction/extractor'
import { MockProvider } from '../providers/mock'
import type { ExtractionOptions } from '../types'

// Mock the logger to avoid database dependencies
vi.mock('../utils/logger', () => ({
  createExtractionLogger: () => ({
    logExtractionStart: vi.fn().mockResolvedValue('test-log-id'),
    logExtractionSuccess: vi.fn().mockResolvedValue(undefined),
    logExtractionFailure: vi.fn().mockResolvedValue(undefined),
    logRetry: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

// Mock the cost calculator
vi.mock('../utils/cost-calculator', () => ({
  CostCalculator: vi.fn().mockImplementation(() => ({
    canAffordExtraction: vi.fn().mockResolvedValue({ canAfford: true }),
    recordCost: vi.fn().mockResolvedValue({ recorded: true, newTotals: { dailyTotalCents: 100 } }),
    calculateCostByContent: vi.fn().mockReturnValue(5)
  }))
}))

describe('AIExtractionService', () => {
  let service: AIExtractionService
  let mockProvider: MockProvider
  let mockOptions: ExtractionOptions

  beforeEach(() => {
    mockProvider = new MockProvider({})
    service = new AIExtractionService({
      customProviders: { mock: mockProvider },
      enableLogging: false,
      enableCostTracking: false
    })
    
    mockOptions = {
      dealer: 'Test Dealer',
      language: 'da',
      strategy: 'primary_only'
    }
  })

  test('initializes with custom providers', () => {
    expect(service).toBeDefined()
    
    const status = service.getServiceStatus()
    expect(status.initialized).toBe(true)
    expect(status.availableProviders).toContain('mock')
  })

  test('extracts data successfully with mock provider', async () => {
    const content = `
      Toyota Aygo X
      Månedsydelse: 2.899 kr
      Førstegangsydelse: 8.697 kr
    `

    const result = await service.extract(content, mockOptions)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.providersAttempted).toContain('mock')
    expect(result.totalProcessingTimeMs).toBeGreaterThan(0)
    
    if (result.data) {
      expect(result.data.documentInfo.brand).toBe('Toyota')
      expect(result.data.vehicles).toHaveLength(1)
      expect(result.data.vehicles[0].model).toBe('Aygo X')
    }
  })

  test('returns service status correctly', () => {
    const status = service.getServiceStatus()

    expect(status).toHaveProperty('initialized')
    expect(status).toHaveProperty('availableProviders')
    expect(status).toHaveProperty('primaryProvider')
    expect(status).toHaveProperty('totalExtractions')
    expect(status).toHaveProperty('successfulExtractions')
    expect(status).toHaveProperty('avgProcessingTimeMs')
  })

  test('tests provider availability', async () => {
    const testResult = await service.testProvider('mock')

    expect(testResult.available).toBe(true)
    expect(testResult.authenticated).toBe(true)
    expect(testResult.responseTimeMs).toBeGreaterThan(0)
  })

  test('handles extraction with validation', async () => {
    const optionsWithValidation = {
      ...mockOptions,
      enableValidation: true,
      confidenceThreshold: 0.8
    }

    const result = await service.extract('Test content', optionsWithValidation)

    expect(result.success).toBe(true)
    expect(result.validationResult).toBeDefined()
    expect(result.validationResult?.confidence).toBeGreaterThanOrEqual(0.8)
  })

  test('handles cost checking when enabled', async () => {
    const serviceWithCosts = new AIExtractionService({
      customProviders: { mock: mockProvider },
      enableCostTracking: true
    })

    const optionsWithCostCheck = {
      ...mockOptions,
      enableCostChecking: true
    }

    const result = await serviceWithCosts.extract('Test content', optionsWithCostCheck)

    expect(result.success).toBe(true)
    expect(result.totalCostCents).toBeGreaterThan(0)
  })

  test('handles empty content gracefully', async () => {
    const result = await service.extract('', mockOptions)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('handles very long content', async () => {
    const longContent = 'A'.repeat(10000) + ' Toyota Camry 2024'
    
    const result = await service.extract(longContent, mockOptions)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('returns error for unavailable provider', async () => {
    const optionsWithBadProvider = {
      ...mockOptions,
      strategy: 'primary_only' as const
    }

    // Create service without providers
    const emptyService = new AIExtractionService({
      customProviders: {},
      enableLogging: false
    })

    const result = await emptyService.extract('Test content', optionsWithBadProvider)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.type).toBe('PROVIDER')
  })

  test('tracks processing statistics', async () => {
    await service.extract('Test 1', mockOptions)
    await service.extract('Test 2', mockOptions)
    await service.extract('Test 3', mockOptions)

    const status = service.getServiceStatus()
    expect(status.totalExtractions).toBe(3)
    expect(status.successfulExtractions).toBe(3)
    expect(status.successRate).toBe(1.0)
  })

  test('calculates average processing time', async () => {
    // Process multiple extractions
    for (let i = 0; i < 5; i++) {
      await service.extract(`Test ${i}`, mockOptions)
    }

    const status = service.getServiceStatus()
    expect(status.avgProcessingTimeMs).toBeGreaterThan(0)
  })

  test('handles different extraction strategies', async () => {
    // Test each strategy
    const strategies = ['primary_only', 'primary_with_fallback', 'cost_optimized', 'all_providers'] as const

    for (const strategy of strategies) {
      const options = { ...mockOptions, strategy }
      const result = await service.extract('Test content', options)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    }
  })

  test('respects confidence threshold', async () => {
    const highConfidenceOptions = {
      ...mockOptions,
      enableValidation: true,
      confidenceThreshold: 0.95
    }

    const result = await service.extract('Test content', highConfidenceOptions)

    // Mock provider returns high confidence, so should succeed
    expect(result.success).toBe(true)
    expect(result.validationResult?.confidence).toBeGreaterThanOrEqual(0.95)
  })

  test('provides cost summary when cost tracking enabled', () => {
    const serviceWithCosts = new AIExtractionService({
      customProviders: { mock: mockProvider },
      enableCostTracking: true
    })

    const summary = serviceWithCosts.getCostSummary()
    expect(summary).toBeDefined()
    expect(summary).toHaveProperty('dailyTotalCents')
    expect(summary).toHaveProperty('monthlyTotalCents')
  })

  test('handles multiple languages', async () => {
    const languages = ['da', 'en', 'de'] as const

    for (const language of languages) {
      const options = { ...mockOptions, language }
      const result = await service.extract('Test content', options)
      
      expect(result.success).toBe(true)
      expect(result.data?.documentInfo.language).toBe(language)
    }
  })
})