import type { CostSummary, ExtractionLog } from '../types'
import { config } from '../config'

/**
 * AI Provider Cost Models
 * Based on current pricing (December 2024)
 */
export interface ProviderCostModel {
  name: string
  inputCostPer1kTokens: number  // USD cents
  outputCostPer1kTokens: number // USD cents
  maxTokensPerRequest: number
}

export const PROVIDER_COSTS: Record<string, ProviderCostModel> = {
  'openai': {
    name: 'OpenAI GPT-4 Turbo',
    inputCostPer1kTokens: 1.0,   // $0.01 per 1K input tokens
    outputCostPer1kTokens: 3.0,  // $0.03 per 1K output tokens
    maxTokensPerRequest: 128000
  },
  'anthropic': {
    name: 'Anthropic Claude 3 Opus',
    inputCostPer1kTokens: 1.5,   // $0.015 per 1K input tokens
    outputCostPer1kTokens: 7.5,  // $0.075 per 1K output tokens
    maxTokensPerRequest: 200000
  }
}

/**
 * Cost tracking entry for internal calculations
 */
interface CostEntry {
  provider: string
  dealer?: string
  costCents: number
  tokensInput: number
  tokensOutput: number
  timestamp: Date
}

/**
 * Daily/Monthly aggregation keys
 */
// interface TimeBasedKey {
//   daily: string    // Format: YYYY-MM-DD
//   monthly: string  // Format: YYYY-MM
// }

/**
 * Cost Calculator for AI Extraction Service
 * 
 * Tracks costs per provider, per dealer, and enforces daily/monthly limits.
 * Maintains running totals and provides cost summaries.
 */
export class CostCalculator {
  private costEntries: CostEntry[] = []
  
  constructor() {
    // Load any persisted costs from storage if needed
    this.loadPersistedCosts()
  }

  /**
   * Calculate cost for a specific provider based on token usage
   */
  calculateCost(provider: string, inputTokens: number, outputTokens: number = 0): number {
    const model = PROVIDER_COSTS[provider]
    if (!model) {
      throw new Error(`Unknown provider: ${provider}`)
    }

    const inputCost = (inputTokens / 1000) * model.inputCostPer1kTokens
    const outputCost = (outputTokens / 1000) * model.outputCostPer1kTokens
    
    return Math.round((inputCost + outputCost) * 100) / 100 // Round to cents
  }

  /**
   * Calculate cost in cents for consistent storage
   */
  calculateCostCents(provider: string, inputTokens: number, outputTokens: number = 0): number {
    const costUsd = this.calculateCost(provider, inputTokens, outputTokens)
    return Math.round(costUsd * 100)
  }

  /**
   * Record a cost entry for tracking
   */
  recordCost(provider: string, inputTokens: number, outputTokens: number = 0, dealer?: string): number {
    const costCents = this.calculateCostCents(provider, inputTokens, outputTokens)
    
    const entry: CostEntry = {
      provider,
      dealer,
      costCents,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      timestamp: new Date()
    }

    this.costEntries.push(entry)
    this.persistCosts()
    
    return costCents
  }

  /**
   * Check if a proposed extraction would exceed cost limits
   */
  canAffordExtraction(provider: string, estimatedInputTokens: number, estimatedOutputTokens: number = 0, _dealer?: string): {
    canAfford: boolean
    reason?: string
    estimatedCostCents: number
    remainingDailyBudgetCents: number
    remainingMonthlyBudgetCents: number
  } {
    const estimatedCostCents = this.calculateCostCents(provider, estimatedInputTokens, estimatedOutputTokens)
    
    // Check per-PDF limit
    if (estimatedCostCents > config.maxCostPerPdfCents) {
      return {
        canAfford: false,
        reason: `Estimated cost ${estimatedCostCents}¢ exceeds per-PDF limit of ${config.maxCostPerPdfCents}¢`,
        estimatedCostCents,
        remainingDailyBudgetCents: this.getRemainingDailyBudgetCents(),
        remainingMonthlyBudgetCents: this.getRemainingMonthlyBudgetCents()
      }
    }

    // Check daily limit
    const dailySpentCents = this.getDailyTotalCents()
    const dailyLimitCents = config.getDailyCostLimitCents()
    
    if (dailySpentCents + estimatedCostCents > dailyLimitCents) {
      return {
        canAfford: false,
        reason: `Would exceed daily limit: ${dailySpentCents + estimatedCostCents}¢ > ${dailyLimitCents}¢`,
        estimatedCostCents,
        remainingDailyBudgetCents: Math.max(0, dailyLimitCents - dailySpentCents),
        remainingMonthlyBudgetCents: this.getRemainingMonthlyBudgetCents()
      }
    }

    // Check monthly limit (assume 30x daily limit if not explicitly set)
    const monthlyLimitCents = dailyLimitCents * 30
    const monthlySpentCents = this.getMonthlyTotalCents()
    
    if (monthlySpentCents + estimatedCostCents > monthlyLimitCents) {
      return {
        canAfford: false,
        reason: `Would exceed monthly limit: ${monthlySpentCents + estimatedCostCents}¢ > ${monthlyLimitCents}¢`,
        estimatedCostCents,
        remainingDailyBudgetCents: Math.max(0, dailyLimitCents - dailySpentCents),
        remainingMonthlyBudgetCents: Math.max(0, monthlyLimitCents - monthlySpentCents)
      }
    }

    return {
      canAfford: true,
      estimatedCostCents,
      remainingDailyBudgetCents: Math.max(0, dailyLimitCents - dailySpentCents),
      remainingMonthlyBudgetCents: Math.max(0, monthlyLimitCents - monthlySpentCents)
    }
  }

  /**
   * Get comprehensive cost summary
   */
  getCostSummary(): CostSummary {
    const byProvider: Record<string, number> = {}
    const byDealer: Record<string, number> = {}
    let totalCents = 0

    for (const entry of this.costEntries) {
      totalCents += entry.costCents
      
      // Provider totals
      byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.costCents
      
      // Dealer totals
      if (entry.dealer) {
        byDealer[entry.dealer] = (byDealer[entry.dealer] || 0) + entry.costCents
      }
    }

    return {
      totalCents,
      byProvider,
      byDealer,
      dailyTotal: this.getDailyTotalCents(),
      monthlyTotal: this.getMonthlyTotalCents()
    }
  }

  /**
   * Get daily total in cents
   */
  getDailyTotalCents(date: Date = new Date()): number {
    const dailyKey = this.getDailyKey(date)
    return this.costEntries
      .filter(entry => this.getDailyKey(entry.timestamp) === dailyKey)
      .reduce((sum, entry) => sum + entry.costCents, 0)
  }

  /**
   * Get monthly total in cents
   */
  getMonthlyTotalCents(date: Date = new Date()): number {
    const monthlyKey = this.getMonthlyKey(date)
    return this.costEntries
      .filter(entry => this.getMonthlyKey(entry.timestamp) === monthlyKey)
      .reduce((sum, entry) => sum + entry.costCents, 0)
  }

  /**
   * Get remaining daily budget in cents
   */
  getRemainingDailyBudgetCents(): number {
    const spent = this.getDailyTotalCents()
    const limit = config.getDailyCostLimitCents()
    return Math.max(0, limit - spent)
  }

  /**
   * Get remaining monthly budget in cents
   */
  getRemainingMonthlyBudgetCents(): number {
    const spent = this.getMonthlyTotalCents()
    const limit = config.getDailyCostLimitCents() * 30 // Assume 30x daily limit
    return Math.max(0, limit - spent)
  }

  /**
   * Check if daily limit is exceeded
   */
  isDailyLimitExceeded(): boolean {
    return this.getDailyTotalCents() >= config.getDailyCostLimitCents()
  }

  /**
   * Check if monthly limit is exceeded
   */
  isMonthlyLimitExceeded(): boolean {
    const monthlyLimit = config.getDailyCostLimitCents() * 30
    return this.getMonthlyTotalCents() >= monthlyLimit
  }

  /**
   * Get cost breakdown by provider for a specific time period
   */
  getProviderCosts(startDate?: Date, endDate?: Date): Record<string, {
    totalCents: number
    extractions: number
    avgCostCents: number
    totalInputTokens: number
    totalOutputTokens: number
  }> {
    const filteredEntries = this.costEntries.filter(entry => {
      if (startDate && entry.timestamp < startDate) return false
      if (endDate && entry.timestamp > endDate) return false
      return true
    })

    const providerStats: Record<string, any> = {}

    for (const entry of filteredEntries) {
      if (!providerStats[entry.provider]) {
        providerStats[entry.provider] = {
          totalCents: 0,
          extractions: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0
        }
      }

      const stats = providerStats[entry.provider]
      stats.totalCents += entry.costCents
      stats.extractions += 1
      stats.totalInputTokens += entry.tokensInput
      stats.totalOutputTokens += entry.tokensOutput
    }

    // Calculate averages
    for (const provider of Object.keys(providerStats)) {
      const stats = providerStats[provider]
      stats.avgCostCents = stats.extractions > 0 ? Math.round(stats.totalCents / stats.extractions) : 0
    }

    return providerStats
  }

  /**
   * Create cost entry from extraction log
   */
  recordFromExtractionLog(log: ExtractionLog): number {
    const inputTokens = log.tokensInput || 0
    const outputTokens = log.tokensOutput || 0
    
    return this.recordCost(log.aiProvider, inputTokens, outputTokens, log.dealerName)
  }

  /**
   * Clear old cost entries (for cleanup)
   */
  clearOldEntries(olderThanDays: number = 90): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    
    const initialCount = this.costEntries.length
    this.costEntries = this.costEntries.filter(entry => entry.timestamp >= cutoffDate)
    
    const removedCount = initialCount - this.costEntries.length
    if (removedCount > 0) {
      this.persistCosts()
    }
    
    return removedCount
  }

  /**
   * Reset all cost tracking (for testing/admin purposes)
   */
  reset(): void {
    this.costEntries = []
    this.persistCosts()
  }

  // Private helper methods

  private getDailyKey(date: Date): string {
    return date.toISOString().split('T')[0] // YYYY-MM-DD
  }

  private getMonthlyKey(date: Date): string {
    return date.toISOString().substring(0, 7) // YYYY-MM
  }

  private getStorageKey(): string {
    return 'ai-extraction-costs'
  }

  private loadPersistedCosts(): void {
    try {
      const stored = localStorage.getItem(this.getStorageKey())
      if (stored) {
        const data = JSON.parse(stored)
        this.costEntries = data.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
      }
    } catch (error) {
      console.warn('Failed to load persisted costs:', error)
      this.costEntries = []
    }
  }

  private persistCosts(): void {
    try {
      const data = this.costEntries.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }))
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to persist costs:', error)
    }
  }
}

// Export singleton instance
export const costCalculator = new CostCalculator()

// Export utility functions
export const formatCostCents = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`
}

export const formatCostCentsDanish = (cents: number): string => {
  const usd = cents / 100
  const dkk = usd * 7 // Approximate DKK conversion
  return `${dkk.toFixed(2)} DKK (~${usd.toFixed(2)} USD)`
}