import type { ExtractionResult } from '../types'
import { extractionLogger as logger } from '../utils/logger'

export interface ProviderPerformanceMetrics {
  provider: string
  totalExtractions: number
  successfulExtractions: number
  failedExtractions: number
  successRate: number
  averageResponseTimeMs: number
  averageCostCents: number
  averageTokensUsed: number
  averageConfidence: number
  totalCostCents: number
  lastUpdated: string
}

export interface PerformanceComparison {
  providers: ProviderPerformanceMetrics[]
  bestProvider: {
    bySuccessRate: string
    bySpeed: string
    byCost: string
    byConfidence: string
    overall: string
  }
  recommendations: string[]
  lastAnalysis: string
}

interface ExtractionRecord {
  provider: string
  success: boolean
  responseTimeMs: number
  costCents: number
  tokensUsed: number
  confidence?: number
  timestamp: string
  errorType?: string
}

/**
 * Performance monitoring and provider comparison service
 * Tracks and analyzes AI provider performance metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private extractionRecords: ExtractionRecord[] = []
  private maxRecords = 1000 // Keep last 1000 extractions

  private constructor() {
    this.loadPersistedRecords()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Track extraction performance
   */
  trackExtraction(result: ExtractionResult): void {
    const record: ExtractionRecord = {
      provider: result.metadata?.provider || 'unknown',
      success: result.success,
      responseTimeMs: result.metadata?.extractionTimeMs || 0,
      costCents: result.metadata?.costCents || 0,
      tokensUsed: result.metadata?.tokensUsed || 0,
      confidence: result.metadata?.confidence,
      timestamp: new Date().toISOString(),
      errorType: result.error?.type
    }

    this.extractionRecords.push(record)

    // Keep only the most recent records
    if (this.extractionRecords.length > this.maxRecords) {
      this.extractionRecords = this.extractionRecords.slice(-this.maxRecords)
    }

    this.persistRecords()

    logger.info(`Performance tracked for ${record.provider}`, {
      success: record.success,
      responseTime: record.responseTimeMs,
      cost: record.costCents,
      tokens: record.tokensUsed,
      confidence: record.confidence
    })
  }

  /**
   * Get performance metrics for a specific provider
   */
  getProviderMetrics(providerName: string, hours: number = 24): ProviderPerformanceMetrics {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)

    const records = this.extractionRecords.filter(record => 
      record.provider === providerName && 
      new Date(record.timestamp) > cutoff
    )

    const totalExtractions = records.length
    const successfulExtractions = records.filter(r => r.success).length
    const failedExtractions = totalExtractions - successfulExtractions
    const successRate = totalExtractions > 0 ? (successfulExtractions / totalExtractions) * 100 : 0

    const totalResponseTime = records.reduce((sum, r) => sum + r.responseTimeMs, 0)
    const totalCost = records.reduce((sum, r) => sum + r.costCents, 0)
    const totalTokens = records.reduce((sum, r) => sum + r.tokensUsed, 0)
    const confidenceScores = records.filter(r => r.confidence !== undefined).map(r => r.confidence!)

    return {
      provider: providerName,
      totalExtractions,
      successfulExtractions,
      failedExtractions,
      successRate,
      averageResponseTimeMs: totalExtractions > 0 ? Math.round(totalResponseTime / totalExtractions) : 0,
      averageCostCents: totalExtractions > 0 ? Math.round(totalCost / totalExtractions) : 0,
      averageTokensUsed: totalExtractions > 0 ? Math.round(totalTokens / totalExtractions) : 0,
      averageConfidence: confidenceScores.length > 0 
        ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length 
        : 0,
      totalCostCents: totalCost,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get comprehensive performance comparison
   */
  getPerformanceComparison(hours: number = 24): PerformanceComparison {
    const providers = this.getActiveProviders(hours)
    const providerMetrics = providers.map(provider => this.getProviderMetrics(provider, hours))

    // Filter out providers with no data
    const validMetrics = providerMetrics.filter(m => m.totalExtractions > 0)

    if (validMetrics.length === 0) {
      return {
        providers: [],
        bestProvider: {
          bySuccessRate: 'none',
          bySpeed: 'none',
          byCost: 'none',
          byConfidence: 'none',
          overall: 'none'
        },
        recommendations: ['No extraction data available for comparison'],
        lastAnalysis: new Date().toISOString()
      }
    }

    // Find best providers by different metrics
    const bestBySuccessRate = validMetrics.reduce((best, current) => 
      current.successRate > best.successRate ? current : best
    )
    
    const bestBySpeed = validMetrics.reduce((best, current) => 
      current.averageResponseTimeMs < best.averageResponseTimeMs ? current : best
    )
    
    const bestByCost = validMetrics.reduce((best, current) => 
      current.averageCostCents < best.averageCostCents ? current : best
    )
    
    const bestByConfidence = validMetrics.reduce((best, current) => 
      current.averageConfidence > best.averageConfidence ? current : best
    )

    // Calculate overall best provider (weighted score)
    const overallBest = this.calculateOverallBest(validMetrics)

    // Generate recommendations
    const recommendations = this.generateRecommendations(validMetrics)

    return {
      providers: validMetrics,
      bestProvider: {
        bySuccessRate: bestBySuccessRate.provider,
        bySpeed: bestBySpeed.provider,
        byCost: bestByCost.provider,
        byConfidence: bestByConfidence.provider,
        overall: overallBest.provider
      },
      recommendations,
      lastAnalysis: new Date().toISOString()
    }
  }

  /**
   * Get error analysis for troubleshooting
   */
  getErrorAnalysis(hours: number = 24): Record<string, any> {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)

    const failedRecords = this.extractionRecords.filter(record => 
      !record.success && 
      new Date(record.timestamp) > cutoff
    )

    const errorsByProvider: Record<string, Record<string, number>> = {}
    const errorsByType: Record<string, number> = {}

    failedRecords.forEach(record => {
      // Count by provider
      if (!errorsByProvider[record.provider]) {
        errorsByProvider[record.provider] = {}
      }
      
      const errorType = record.errorType || 'unknown'
      errorsByProvider[record.provider][errorType] = (errorsByProvider[record.provider][errorType] || 0) + 1
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
    })

    return {
      totalErrors: failedRecords.length,
      errorsByProvider,
      errorsByType,
      errorRate: this.extractionRecords.length > 0 
        ? (failedRecords.length / this.extractionRecords.length) * 100 
        : 0,
      analysisTimeframe: `${hours} hours`,
      lastAnalysis: new Date().toISOString()
    }
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): any {
    return {
      extractionRecords: this.extractionRecords,
      summary: this.getPerformanceComparison(),
      errorAnalysis: this.getErrorAnalysis(),
      exportTimestamp: new Date().toISOString()
    }
  }

  /**
   * Clear old performance records
   */
  clearOldRecords(hours: number = 168): void { // Default: 1 week
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)

    const originalCount = this.extractionRecords.length
    this.extractionRecords = this.extractionRecords.filter(record => 
      new Date(record.timestamp) > cutoff
    )

    const removedCount = originalCount - this.extractionRecords.length
    if (removedCount > 0) {
      this.persistRecords()
      logger.info(`Cleared ${removedCount} old performance records`, { 
        cutoffHours: hours,
        remainingRecords: this.extractionRecords.length 
      })
    }
  }

  /**
   * Get list of active providers in the timeframe
   */
  private getActiveProviders(hours: number): string[] {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)

    const providers = new Set<string>()
    
    this.extractionRecords
      .filter(record => new Date(record.timestamp) > cutoff)
      .forEach(record => providers.add(record.provider))

    return Array.from(providers)
  }

  /**
   * Calculate overall best provider using weighted scoring
   */
  private calculateOverallBest(metrics: ProviderPerformanceMetrics[]): ProviderPerformanceMetrics {
    const scoredMetrics = metrics.map(metric => {
      // Normalize metrics to 0-100 scale
      const maxResponseTime = Math.max(...metrics.map(m => m.averageResponseTimeMs))
      const maxCost = Math.max(...metrics.map(m => m.averageCostCents))
      
      const speedScore = maxResponseTime > 0 ? (1 - (metric.averageResponseTimeMs / maxResponseTime)) * 100 : 100
      const costScore = maxCost > 0 ? (1 - (metric.averageCostCents / maxCost)) * 100 : 100
      const confidenceScore = metric.averageConfidence * 100
      const successRateScore = metric.successRate

      // Weighted overall score
      const overallScore = (
        successRateScore * 0.4 +     // 40% weight on success rate
        speedScore * 0.25 +          // 25% weight on speed
        costScore * 0.20 +           // 20% weight on cost
        confidenceScore * 0.15       // 15% weight on confidence
      )

      return { ...metric, overallScore }
    })

    return scoredMetrics.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    )
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: ProviderPerformanceMetrics[]): string[] {
    const recommendations: string[] = []

    if (metrics.length === 0) {
      return ['No performance data available for recommendations']
    }

    // Success rate recommendations
    const lowSuccessRate = metrics.filter(m => m.successRate < 85)
    if (lowSuccessRate.length > 0) {
      recommendations.push(
        `Consider investigating ${lowSuccessRate.map(m => m.provider).join(', ')} - success rate below 85%`
      )
    }

    // Speed recommendations
    const slowProviders = metrics.filter(m => m.averageResponseTimeMs > 10000) // > 10 seconds
    if (slowProviders.length > 0) {
      recommendations.push(
        `${slowProviders.map(m => m.provider).join(', ')} showing slow response times (>10s)`
      )
    }

    // Cost recommendations
    const avgCost = metrics.reduce((sum, m) => sum + m.averageCostCents, 0) / metrics.length
    const expensiveProviders = metrics.filter(m => m.averageCostCents > avgCost * 1.5)
    if (expensiveProviders.length > 0) {
      recommendations.push(
        `${expensiveProviders.map(m => m.provider).join(', ')} significantly above average cost`
      )
    }

    // Confidence recommendations
    const lowConfidence = metrics.filter(m => m.averageConfidence < 0.7)
    if (lowConfidence.length > 0) {
      recommendations.push(
        `${lowConfidence.map(m => m.provider).join(', ')} showing low confidence scores (<70%)`
      )
    }

    // Overall recommendations
    if (metrics.length > 1) {
      const bestOverall = this.calculateOverallBest(metrics)
      recommendations.push(
        `Best overall performer: ${bestOverall.provider} (${bestOverall.successRate.toFixed(1)}% success, ${bestOverall.averageResponseTimeMs}ms avg response)`
      )
    }

    return recommendations.length > 0 ? recommendations : ['All providers performing within acceptable ranges']
  }

  /**
   * Load persisted performance records
   */
  private loadPersistedRecords(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const recordsData = localStorage.getItem('ai-extraction-performance')
        if (recordsData) {
          this.extractionRecords = JSON.parse(recordsData)
        }
      }
    } catch (error) {
      logger.error('Failed to load persisted performance records', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }

  /**
   * Persist performance records
   */
  private persistRecords(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ai-extraction-performance', JSON.stringify(this.extractionRecords))
      }
    } catch (error) {
      logger.error('Failed to persist performance records', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()