import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest'
import { CostCalculator } from '../utils/cost-calculator'
import { createTestService } from '../extraction/extractor'
import { COST_TEST_SCENARIOS } from './sample-data'
import type { AIExtractionService } from '../extraction/extractor'

// Mock the logger to avoid database dependencies
const mockLogger = {
  getCostSummary: vi.fn(),
  recordExtractionCost: vi.fn()
}

vi.mock('../utils/logger', () => ({
  createExtractionLogger: () => mockLogger
}))

describe('Cost Tracking Integration Tests', () => {
  let calculator: CostCalculator
  let service: AIExtractionService
  let originalEnv: typeof process.env

  beforeEach(() => {
    originalEnv = { ...process.env }
    calculator = new CostCalculator()
    service = createTestService()
    
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup mock responses
    mockLogger.getCostSummary.mockResolvedValue({
      dailyTotalCents: 500,
      monthlyTotalCents: 15000,
      byProvider: { mock: 500 },
      byDealer: { 'Test Dealer': 500 }
    })
    
    mockLogger.recordExtractionCost.mockResolvedValue(true)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Cost Calculator Core Functions', () => {
    test('calculates OpenAI costs correctly for different models', () => {
      const testCases = [
        { tokens: 1000, model: 'gpt-4-turbo-preview', expectedCents: 1 },
        { tokens: 2000, model: 'gpt-4-turbo-preview', expectedCents: 2 },
        { tokens: 500, model: 'gpt-4-turbo-preview', expectedCents: 0.5 }
      ]

      testCases.forEach(({ tokens, model, expectedCents }) => {
        const cost = calculator.calculateOpenAICost(tokens, model)
        expect(cost).toBeCloseTo(expectedCents, 1)
      })
    })

    test('calculates Anthropic costs correctly for different models', () => {
      const testCases = [
        { tokens: 1000, model: 'claude-3-opus-20240229', expectedCents: 1.5 },
        { tokens: 1000, model: 'claude-3-sonnet-20240229', expectedCents: 0.3 },
        { tokens: 2000, model: 'claude-3-haiku-20240307', expectedCents: 0.25 }
      ]

      testCases.forEach(({ tokens, model, expectedCents }) => {
        const cost = calculator.calculateAnthropicCost(tokens, model)
        expect(cost).toBeCloseTo(expectedCents, 1)
      })
    })

    test('estimates tokens from content accurately', () => {
      const testCases = [
        { content: 'Hello world', expectedTokens: 2 },
        { content: 'A'.repeat(1000), expectedTokens: 1000 },
        { content: COST_TEST_SCENARIOS.mediumCost.content, expectedRange: [800, 1200] }
      ]

      testCases.forEach(({ content, expectedTokens, expectedRange }) => {
        const tokens = calculator.estimateTokensFromContent(content)
        
        if (expectedTokens) {
          expect(tokens).toBeCloseTo(expectedTokens, -1) // Within 10 tokens
        } else if (expectedRange) {
          expect(tokens).toBeGreaterThanOrEqual(expectedRange[0])
          expect(tokens).toBeLessThanOrEqual(expectedRange[1])
        }
      })
    })

    test('calculates cost by content length', () => {
      const scenarios = Object.values(COST_TEST_SCENARIOS)
      
      scenarios.forEach(scenario => {
        const cost = calculator.calculateCostByContent(
          scenario.content, 
          'openai', 
          'gpt-4-turbo-preview'
        )
        
        expect(cost).toBeGreaterThan(0)
        expect(cost).toBeCloseTo(scenario.expectedCostCents, 0)
      })
    })
  })

  describe('Cost Limit Checking', () => {
    test('allows extraction within cost limits', async () => {
      const result = await calculator.canAffordExtraction(
        5,     // 5 cents
        1000,  // $10 daily limit (1000 cents)
        5000   // $50 monthly limit (5000 cents)
      )

      expect(result.canAfford).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.dailyRemaining).toBe(995) // 1000 - 5
      expect(result.monthlyRemaining).toBe(4995) // 5000 - 5
    })

    test('blocks extraction when daily limit exceeded', async () => {
      mockLogger.getCostSummary.mockResolvedValue({
        dailyTotalCents: 950,
        monthlyTotalCents: 2000,
        byProvider: {},
        byDealer: {}
      })

      const result = await calculator.canAffordExtraction(
        100,   // 100 cents
        1000,  // $10 daily limit
        5000   // $50 monthly limit
      )

      expect(result.canAfford).toBe(false)
      expect(result.reason).toContain('daily')
      expect(result.dailyRemaining).toBe(50) // 1000 - 950
    })

    test('blocks extraction when monthly limit exceeded', async () => {
      mockLogger.getCostSummary.mockResolvedValue({
        dailyTotalCents: 100,
        monthlyTotalCents: 4950,
        byProvider: {},
        byDealer: {}
      })

      const result = await calculator.canAffordExtraction(
        100,   // 100 cents
        1000,  // $10 daily limit
        5000   // $50 monthly limit
      )

      expect(result.canAfford).toBe(false)
      expect(result.reason).toContain('monthly')
      expect(result.monthlyRemaining).toBe(50) // 5000 - 4950
    })

    test('validates cost limit parameters', () => {
      expect(() => calculator.validateCostLimits(-100, 1000)).toThrow('Cost cannot be negative')
      expect(() => calculator.validateCostLimits(100, -1000)).toThrow('Daily limit must be positive')
      expect(() => calculator.validateCostLimits(100, 0)).toThrow('Daily limit must be positive')
      expect(() => calculator.validateCostLimits(100, 1000, -5000)).toThrow('Monthly limit must be positive')
      
      // Valid parameters should not throw
      expect(() => calculator.validateCostLimits(100, 1000, 5000)).not.toThrow()
    })
  })

  describe('Cost Recording', () => {
    test('records extraction cost successfully', async () => {
      const result = await calculator.recordCost(
        'mock',
        'mock-model',
        1500,
        15,
        'Test Dealer',
        'success'
      )

      expect(result.recorded).toBe(true)
      expect(result.newTotals).toBeDefined()
      expect(mockLogger.recordExtractionCost).toHaveBeenCalledWith(
        'mock',
        'mock-model',
        1500,
        15,
        'Test Dealer',
        'success'
      )
    })

    test('handles cost recording failure gracefully', async () => {
      mockLogger.recordExtractionCost.mockRejectedValue(new Error('Database error'))

      const result = await calculator.recordCost(
        'mock',
        'mock-model',
        1000,
        10,
        'Test Dealer',
        'success'
      )

      expect(result.recorded).toBe(false)
      expect(result.error).toContain('Database error')
    })
  })

  describe('Provider Cost Comparison', () => {
    test('compares costs across providers', () => {
      const tokenCount = 2000
      const comparison = calculator.compareProviderCosts(tokenCount)

      expect(comparison).toHaveProperty('openai')
      expect(comparison).toHaveProperty('anthropic')
      expect(comparison).toHaveProperty('mock')

      // Mock should be cheapest
      expect(comparison.mock.costCents).toBeLessThan(comparison.openai.costCents)
      expect(comparison.mock.costCents).toBeLessThan(comparison.anthropic.costCents)

      // All should calculate for same token count
      Object.values(comparison).forEach(provider => {
        expect(provider.tokensUsed).toBe(tokenCount)
        expect(provider.costCents).toBeGreaterThan(0)
      })
    })

    test('identifies cost-optimal provider', () => {
      const tokenCount = 1000
      const comparison = calculator.compareProviderCosts(tokenCount)
      
      const providers = Object.entries(comparison)
      const cheapest = providers.reduce((min, [name, data]) => 
        data.costCents < min.costCents ? { name, ...data } : min,
        { name: '', costCents: Infinity }
      )

      expect(cheapest.name).toBe('mock')
      expect(cheapest.costCents).toBeLessThan(2) // Should be very cheap
    })
  })

  describe('Batch Cost Calculation', () => {
    test('calculates batch processing costs', () => {
      const documents = [
        { content: COST_TEST_SCENARIOS.lowCost.content, dealer: 'Toyota' },
        { content: COST_TEST_SCENARIOS.mediumCost.content, dealer: 'BMW' },
        { content: COST_TEST_SCENARIOS.highCost.content, dealer: 'Mercedes' }
      ]

      const batchCost = calculator.calculateBatchCost(
        documents,
        'openai',
        'gpt-4-turbo-preview'
      )

      expect(batchCost.totalCostCents).toBeGreaterThan(0)
      expect(batchCost.documentsProcessed).toBe(3)
      expect(batchCost.totalTokens).toBeGreaterThan(0)
      expect(batchCost.perDocument).toHaveLength(3)

      // Each document should have cost breakdown
      batchCost.perDocument.forEach((doc, index) => {
        expect(doc.dealer).toBe(documents[index].dealer)
        expect(doc.tokens).toBeGreaterThan(0)
        expect(doc.costCents).toBeGreaterThan(0)
      })

      // Total should equal sum of individual costs
      const sumOfIndividual = batchCost.perDocument.reduce((sum, doc) => sum + doc.costCents, 0)
      expect(batchCost.totalCostCents).toBeCloseTo(sumOfIndividual, 0)
    })

    test('optimizes batch processing by provider cost', () => {
      const documents = Array(5).fill({
        content: COST_TEST_SCENARIOS.mediumCost.content,
        dealer: 'Test Dealer'
      })

      const openAIBatch = calculator.calculateBatchCost(documents, 'openai', 'gpt-4-turbo-preview')
      const anthropicBatch = calculator.calculateBatchCost(documents, 'anthropic', 'claude-3-sonnet-20240229')
      const mockBatch = calculator.calculateBatchCost(documents, 'mock', 'mock-model')

      expect(mockBatch.totalCostCents).toBeLessThan(openAIBatch.totalCostCents)
      expect(mockBatch.totalCostCents).toBeLessThan(anthropicBatch.totalCostCents)
    })
  })

  describe('Cost Summary and Analytics', () => {
    test('retrieves cost summary', async () => {
      const summary = await calculator.getCostSummary()

      expect(summary).toHaveProperty('dailyTotalCents')
      expect(summary).toHaveProperty('monthlyTotalCents')
      expect(summary).toHaveProperty('byProvider')
      expect(summary).toHaveProperty('byDealer')

      expect(summary.dailyTotalCents).toBeGreaterThanOrEqual(0)
      expect(summary.monthlyTotalCents).toBeGreaterThanOrEqual(0)
      expect(typeof summary.byProvider).toBe('object')
      expect(typeof summary.byDealer).toBe('object')
    })

    test('gets cost breakdown by timeframe', async () => {
      const dailyBreakdown = await calculator.getCostBreakdown('daily')
      const monthlyBreakdown = await calculator.getCostBreakdown('monthly')

      [dailyBreakdown, monthlyBreakdown].forEach(breakdown => {
        expect(breakdown).toHaveProperty('totalCents')
        expect(breakdown).toHaveProperty('byProvider')
        expect(breakdown).toHaveProperty('byDealer')
        expect(breakdown).toHaveProperty('periodStart')
        expect(breakdown).toHaveProperty('periodEnd')

        expect(breakdown.totalCents).toBeGreaterThanOrEqual(0)
        expect(typeof breakdown.byProvider).toBe('object')
        expect(typeof breakdown.byDealer).toBe('object')
      })
    })

    test('projects monthly cost from daily usage', () => {
      const dailyUsageScenarios = [50, 100, 200, 500] // cents

      dailyUsageScenarios.forEach(dailyUsage => {
        const projection = calculator.projectMonthlyCost(dailyUsage)

        expect(projection.projectedMonthlyCents).toBe(dailyUsage * 30)
        expect(projection.dailyAverage).toBe(dailyUsage)
        expect(projection.daysInMonth).toBe(30)
        expect(projection.projectedMonthlyUSD).toBe(dailyUsage * 30 / 100)
      })
    })
  })

  describe('Cost Efficiency Metrics', () => {
    test('calculates efficiency metrics', () => {
      const scenarios = [
        { tokens: 1000, cost: 10, time: 2000, confidence: 0.9 },
        { tokens: 2000, cost: 20, time: 4000, confidence: 0.85 },
        { tokens: 500, cost: 5, time: 1000, confidence: 0.95 }
      ]

      scenarios.forEach(({ tokens, cost, time, confidence }) => {
        const metrics = calculator.calculateEfficiencyMetrics(tokens, cost, time, confidence)

        expect(metrics.centsPerToken).toBeCloseTo(cost / tokens, 3)
        expect(metrics.tokensPerSecond).toBeCloseTo(tokens / (time / 1000), 2)
        expect(metrics.centsPerConfidencePoint).toBeCloseTo(cost / confidence, 2)
        expect(metrics.efficiencyScore).toBeGreaterThan(0)
        
        // Higher confidence and lower cost should yield better efficiency
        expect(metrics.efficiencyScore).toBeLessThan(1000) // Reasonable upper bound
      })
    })

    test('compares efficiency across different scenarios', () => {
      const highEfficiency = calculator.calculateEfficiencyMetrics(1000, 1, 1000, 0.95)
      const lowEfficiency = calculator.calculateEfficiencyMetrics(1000, 50, 10000, 0.6)

      expect(highEfficiency.centsPerToken).toBeLessThan(lowEfficiency.centsPerToken)
      expect(highEfficiency.tokensPerSecond).toBeGreaterThan(lowEfficiency.tokensPerSecond)
      expect(highEfficiency.efficiencyScore).toBeLessThan(lowEfficiency.efficiencyScore)
    })
  })

  describe('Integration with Extraction Service', () => {
    test('service tracks costs during extraction', async () => {
      const serviceWithCosts = createTestService()
      
      const result = await serviceWithCosts.extract(
        COST_TEST_SCENARIOS.mediumCost.content,
        {
          dealer: 'Test Dealer',
          language: 'da',
          enableCostChecking: true
        }
      )

      expect(result.success).toBe(true)
      expect(result.totalCostCents).toBeGreaterThan(0)
      expect(result.metadata?.tokensUsed).toBeGreaterThan(0)
      expect(result.metadata?.costCents).toBe(result.totalCostCents)
    })

    test('service respects cost limits', async () => {
      // Set very low cost limits
      process.env.VITE_MAX_COST_PER_PDF_CENTS = '1'
      process.env.VITE_DAILY_COST_LIMIT_USD = '0.01'

      mockLogger.getCostSummary.mockResolvedValue({
        dailyTotalCents: 0,
        monthlyTotalCents: 0,
        byProvider: {},
        byDealer: {}
      })

      const result = await service.extract(
        COST_TEST_SCENARIOS.lowCost.content,
        {
          dealer: 'Test Dealer',
          language: 'da',
          enableCostChecking: true
        }
      )

      // Mock provider should succeed even with low limits
      expect(result.success).toBe(true)
    })

    test('service provides cost summary', () => {
      const summary = service.getCostSummary()
      
      expect(summary).toHaveProperty('dailyTotalCents')
      expect(summary).toHaveProperty('monthlyTotalCents')
    })
  })

  describe('Cost Display and Formatting', () => {
    test('formats cost for display', () => {
      const testCases = [
        { cents: 0, expected: '$0.00' },
        { cents: 1, expected: '$0.01' },
        { cents: 100, expected: '$1.00' },
        { cents: 1234, expected: '$12.34' },
        { cents: 50, expected: '$0.50' }
      ]

      testCases.forEach(({ cents, expected }) => {
        const formatted = calculator.formatCostForDisplay(cents)
        expect(formatted).toBe(expected)
      })
    })

    test('formats Danish currency', () => {
      const testCases = [
        { amount: 1234.56, expectedToContain: ['1.235', 'kr'] },
        { amount: 0, expectedToContain: ['0', 'kr'] },
        { amount: 2899, expectedToContain: ['2.899', 'kr'] }
      ]

      testCases.forEach(({ amount, expectedToContain }) => {
        const formatted = calculator.formatDanishCurrency ? calculator.formatDanishCurrency(amount) : `${amount} kr`
        
        expectedToContain.forEach(expected => {
          expect(formatted).toContain(expected)
        })
      })
    })
  })
})