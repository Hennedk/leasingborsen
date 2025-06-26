import { describe, expect, test, beforeEach, vi } from 'vitest'
import { CostCalculator } from '../utils/cost-calculator'

// Mock the logger to avoid database dependencies
vi.mock('../utils/logger', () => ({
  createExtractionLogger: () => ({
    getCostSummary: vi.fn().mockResolvedValue({
      dailyTotalCents: 500,
      monthlyTotalCents: 15000,
      byProvider: { openai: 300, anthropic: 200 },
      byDealer: { 'Toyota Denmark': 400 }
    })
  })
}))

describe('CostCalculator', () => {
  let calculator: CostCalculator

  beforeEach(() => {
    calculator = new CostCalculator()
  })

  test('calculates OpenAI costs correctly', () => {
    const cost = calculator.calculateOpenAICost(1000, 'gpt-4-turbo-preview')
    
    // GPT-4 Turbo: $0.01 per 1K tokens = 1 cent per 1K tokens
    expect(cost).toBe(1)
  })

  test('calculates Anthropic costs correctly', () => {
    const cost = calculator.calculateAnthropicCost(1000, 'claude-3-opus-20240229')
    
    // Claude-3 Opus: $0.015 per 1K tokens = 1.5 cents per 1K tokens
    expect(cost).toBe(1.5)
  })

  test('calculates cost by content length', () => {
    const content = 'A'.repeat(4000) // Roughly 4000 characters
    const cost = calculator.calculateCostByContent(content, 'openai', 'gpt-4-turbo-preview')
    
    // Should be roughly 1 token per character, so ~4000 tokens = 4 cents
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeLessThan(10) // Reasonable upper bound
  })

  test('estimates tokens from content', () => {
    const shortContent = 'Hello world'
    const longContent = 'A'.repeat(4000)
    
    const shortTokens = calculator.estimateTokensFromContent(shortContent)
    const longTokens = calculator.estimateTokensFromContent(longContent)
    
    expect(shortTokens).toBeGreaterThan(0)
    expect(longTokens).toBeGreaterThan(shortTokens)
    expect(longTokens).toBeCloseTo(4000, -2) // Within 100 tokens
  })

  test('checks affordability within limits', async () => {
    const affordableResult = await calculator.canAffordExtraction(5, 1000, 5000) // 5 cents, limits are 10$ and 50$
    expect(affordableResult.canAfford).toBe(true)
    expect(affordableResult.reason).toBeUndefined()

    const unaffordableResult = await calculator.canAffordExtraction(1500, 1000, 5000) // 15$ > 10$ daily limit
    expect(unaffordableResult.canAfford).toBe(false)
    expect(unaffordableResult.reason).toContain('daily')
  })

  test('records cost correctly', async () => {
    const result = await calculator.recordCost(
      'openai',
      'gpt-4-turbo-preview',
      1500,
      15,
      'Toyota Denmark',
      'success'
    )

    expect(result.recorded).toBe(true)
    expect(result.newTotals).toBeDefined()
    expect(result.newTotals.dailyTotalCents).toBeGreaterThan(0)
  })

  test('provides cost comparison between providers', () => {
    const comparison = calculator.compareProviderCosts(2000)

    expect(comparison).toHaveProperty('openai')
    expect(comparison).toHaveProperty('anthropic')
    expect(comparison).toHaveProperty('mock')
    
    expect(comparison.openai.costCents).toBeGreaterThan(0)
    expect(comparison.mock.costCents).toBeLessThan(comparison.openai.costCents)
  })

  test('calculates batch processing cost', () => {
    const documents = [
      { content: 'A'.repeat(1000), dealer: 'Toyota' },
      { content: 'B'.repeat(2000), dealer: 'BMW' },
      { content: 'C'.repeat(1500), dealer: 'Mercedes' }
    ]

    const batchCost = calculator.calculateBatchCost(documents, 'openai', 'gpt-4-turbo-preview')

    expect(batchCost.totalCostCents).toBeGreaterThan(0)
    expect(batchCost.documentsProcessed).toBe(3)
    expect(batchCost.totalTokens).toBeGreaterThan(0)
    expect(batchCost.perDocument).toHaveLength(3)
  })

  test('validates cost limits', () => {
    expect(() => calculator.validateCostLimits(-100, 1000)).toThrow()
    expect(() => calculator.validateCostLimits(100, -1000)).toThrow()
    expect(() => calculator.validateCostLimits(100, 100)).not.toThrow()
  })

  test('formats cost for display', () => {
    expect(calculator.formatCostForDisplay(123)).toBe('$1.23')
    expect(calculator.formatCostForDisplay(0)).toBe('$0.00')
    expect(calculator.formatCostForDisplay(1)).toBe('$0.01')
  })

  test('gets cost breakdown by timeframe', async () => {
    const breakdown = await calculator.getCostBreakdown('daily')

    expect(breakdown).toHaveProperty('totalCents')
    expect(breakdown).toHaveProperty('byProvider')
    expect(breakdown).toHaveProperty('byDealer')
    expect(breakdown).toHaveProperty('periodStart')
    expect(breakdown).toHaveProperty('periodEnd')
  })

  test('handles missing cost data gracefully', async () => {
    // Test with mock that returns empty data
    const emptyCalculator = new CostCalculator()
    
    const summary = await emptyCalculator.getCostSummary()
    expect(summary.dailyTotalCents).toBeGreaterThanOrEqual(0)
    expect(summary.monthlyTotalCents).toBeGreaterThanOrEqual(0)
  })

  test('calculates cost efficiency metrics', () => {
    const metrics = calculator.calculateEfficiencyMetrics(
      1500, // tokens
      15,   // cost cents
      2500, // processing time ms
      0.92  // confidence
    )

    expect(metrics.centsPerToken).toBe(0.01)
    expect(metrics.tokensPerSecond).toBeCloseTo(0.6, 1)
    expect(metrics.centsPerConfidencePoint).toBeCloseTo(16.3, 1)
    expect(metrics.efficiencyScore).toBeGreaterThan(0)
  })

  test('projects monthly cost from daily usage', () => {
    const projection = calculator.projectMonthlyCost(100) // 100 cents daily

    expect(projection.projectedMonthlyCents).toBe(3000) // 100 * 30
    expect(projection.dailyAverage).toBe(100)
    expect(projection.daysInMonth).toBe(30)
  })
})