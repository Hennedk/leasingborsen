import type { ExtractionResult } from '../types'
import { config } from '../config'
import { extractionLogger as logger } from '../utils/logger'

export interface DailyCostSummary {
  date: string
  totalCostCents: number
  extractionCount: number
  averageCostCents: number
  limitCents: number
  utilizationPercent: number
  isOverLimit: boolean
}

export interface CostAlert {
  type: 'warning' | 'critical' | 'budget_exceeded'
  message: string
  currentCostCents: number
  limitCents: number
  utilizationPercent: number
  timestamp: string
}

/**
 * Cost monitoring and budget management service
 * Tracks AI provider costs and sends alerts when approaching limits
 */
export class CostMonitor {
  private static instance: CostMonitor
  private dailyCosts: Map<string, number> = new Map()
  private dailyExtractions: Map<string, number> = new Map()
  private costAlerts: CostAlert[] = []

  private constructor() {
    // Load persisted costs from localStorage if available
    this.loadPersistedCosts()
  }

  static getInstance(): CostMonitor {
    if (!CostMonitor.instance) {
      CostMonitor.instance = new CostMonitor()
    }
    return CostMonitor.instance
  }

  /**
   * Track cost from an extraction result
   */
  trackExtraction(result: ExtractionResult): void {
    const today = this.getTodayKey()
    const costCents = result.metadata?.costCents || 0

    // Update daily totals
    const currentCost = this.dailyCosts.get(today) || 0
    const currentCount = this.dailyExtractions.get(today) || 0

    this.dailyCosts.set(today, currentCost + costCents)
    this.dailyExtractions.set(today, currentCount + 1)

    // Persist to localStorage
    this.persistCosts()

    // Check for budget alerts
    this.checkBudgetAlerts(today)

    // Log cost tracking
    logger.info(`Cost tracked: ${costCents}¢ (Daily total: ${this.dailyCosts.get(today)}¢)`, {
      provider: result.metadata?.provider,
      tokensUsed: result.metadata?.tokensUsed,
      extractionSuccess: result.success,
      dailyTotal: this.dailyCosts.get(today)
    })
  }

  /**
   * Get today's cost summary
   */
  getTodayCostSummary(): DailyCostSummary {
    const today = this.getTodayKey()
    const totalCostCents = this.dailyCosts.get(today) || 0
    const extractionCount = this.dailyExtractions.get(today) || 0
    const limitCents = config.dailyCostLimitUsd * 100
    const utilizationPercent = (totalCostCents / limitCents) * 100
    const averageCostCents = extractionCount > 0 ? Math.round(totalCostCents / extractionCount) : 0

    return {
      date: today,
      totalCostCents,
      extractionCount,
      averageCostCents,
      limitCents,
      utilizationPercent,
      isOverLimit: totalCostCents > limitCents
    }
  }

  /**
   * Get cost summary for a specific date
   */
  getCostSummaryForDate(date: string): DailyCostSummary {
    const totalCostCents = this.dailyCosts.get(date) || 0
    const extractionCount = this.dailyExtractions.get(date) || 0
    const limitCents = config.dailyCostLimitUsd * 100
    const utilizationPercent = (totalCostCents / limitCents) * 100
    const averageCostCents = extractionCount > 0 ? Math.round(totalCostCents / extractionCount) : 0

    return {
      date,
      totalCostCents,
      extractionCount,
      averageCostCents,
      limitCents,
      utilizationPercent,
      isOverLimit: totalCostCents > limitCents
    }
  }

  /**
   * Get cost history for the last N days
   */
  getCostHistory(days: number = 7): DailyCostSummary[] {
    const history: DailyCostSummary[] = []
    const today = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = this.formatDateKey(date)
      history.push(this.getCostSummaryForDate(dateKey))
    }

    return history.reverse() // Most recent first
  }

  /**
   * Check if extraction would exceed budget
   */
  wouldExceedBudget(estimatedCostCents: number): boolean {
    const today = this.getTodayKey()
    const currentCost = this.dailyCosts.get(today) || 0
    const limitCents = config.dailyCostLimitUsd * 100
    
    return (currentCost + estimatedCostCents) > limitCents
  }

  /**
   * Get remaining budget for today
   */
  getRemainingBudgetCents(): number {
    const today = this.getTodayKey()
    const currentCost = this.dailyCosts.get(today) || 0
    const limitCents = config.dailyCostLimitUsd * 100
    
    return Math.max(0, limitCents - currentCost)
  }

  /**
   * Get recent cost alerts
   */
  getRecentAlerts(hours: number = 24): CostAlert[] {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)
    
    return this.costAlerts.filter(alert => 
      new Date(alert.timestamp) > cutoff
    )
  }

  /**
   * Clear cost alerts older than specified hours
   */
  clearOldAlerts(hours: number = 24): void {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)
    
    this.costAlerts = this.costAlerts.filter(alert => 
      new Date(alert.timestamp) > cutoff
    )
  }

  /**
   * Reset daily costs (for testing or new day)
   */
  resetDailyCosts(): void {
    const today = this.getTodayKey()
    this.dailyCosts.set(today, 0)
    this.dailyExtractions.set(today, 0)
    this.persistCosts()
    
    logger.info('Daily costs reset', { date: today })
  }

  /**
   * Export cost data for analysis
   */
  exportCostData(): any {
    const costs: Record<string, any> = {}
    
    for (const [date, cost] of this.dailyCosts.entries()) {
      costs[date] = {
        totalCostCents: cost,
        extractionCount: this.dailyExtractions.get(date) || 0,
        averageCostCents: this.dailyExtractions.get(date) 
          ? Math.round(cost / this.dailyExtractions.get(date)!)
          : 0
      }
    }
    
    return {
      costs,
      alerts: this.costAlerts,
      config: {
        dailyLimitUsd: config.dailyCostLimitUsd,
        maxCostPerPdfCents: config.maxCostPerPdfCents,
        alertThresholdUsd: config.alertCostThresholdUsd
      },
      exportTimestamp: new Date().toISOString()
    }
  }

  /**
   * Check for budget alerts and create notifications
   */
  private checkBudgetAlerts(date: string): void {
    const summary = this.getCostSummaryForDate(date)
    const alertThresholdCents = config.alertCostThresholdUsd * 100

    // Check for critical alert (exceeded limit)
    if (summary.isOverLimit && !this.hasRecentAlert('budget_exceeded')) {
      const alert: CostAlert = {
        type: 'budget_exceeded',
        message: `Daily budget exceeded! Spent ${summary.totalCostCents}¢ of ${summary.limitCents}¢ limit.`,
        currentCostCents: summary.totalCostCents,
        limitCents: summary.limitCents,
        utilizationPercent: summary.utilizationPercent,
        timestamp: new Date().toISOString()
      }
      
      this.costAlerts.push(alert)
      this.sendAlert(alert)
    }
    
    // Check for warning alert (80% of limit)
    else if (summary.utilizationPercent >= 80 && !this.hasRecentAlert('warning')) {
      const alert: CostAlert = {
        type: 'warning',
        message: `Daily budget at ${Math.round(summary.utilizationPercent)}% utilization (${summary.totalCostCents}¢ of ${summary.limitCents}¢).`,
        currentCostCents: summary.totalCostCents,
        limitCents: summary.limitCents,
        utilizationPercent: summary.utilizationPercent,
        timestamp: new Date().toISOString()
      }
      
      this.costAlerts.push(alert)
      this.sendAlert(alert)
    }
    
    // Check for critical alert based on absolute threshold
    else if (summary.totalCostCents >= alertThresholdCents && !this.hasRecentAlert('critical')) {
      const alert: CostAlert = {
        type: 'critical',
        message: `Daily costs reached ${summary.totalCostCents}¢ (alert threshold: ${alertThresholdCents}¢).`,
        currentCostCents: summary.totalCostCents,
        limitCents: summary.limitCents,
        utilizationPercent: summary.utilizationPercent,
        timestamp: new Date().toISOString()
      }
      
      this.costAlerts.push(alert)
      this.sendAlert(alert)
    }
  }

  /**
   * Check if there's a recent alert of the same type
   */
  private hasRecentAlert(type: CostAlert['type'], hours: number = 1): boolean {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - hours)
    
    return this.costAlerts.some(alert => 
      alert.type === type && new Date(alert.timestamp) > cutoff
    )
  }

  /**
   * Send alert notification
   */
  private sendAlert(alert: CostAlert): void {
    logger.warn(`Cost Alert: ${alert.message}`, {
      alertType: alert.type,
      currentCost: alert.currentCostCents,
      limit: alert.limitCents,
      utilization: alert.utilizationPercent
    })

    // In a real implementation, you would send email/Slack notifications here
    // For now, we'll just log the alert
    console.warn(`🚨 COST ALERT: ${alert.message}`)
    
    // Could integrate with email service, Slack, or other notification systems:
    // if (config.alertEmail) {
    //   await this.sendEmailAlert(alert)
    // }
  }

  /**
   * Get today's date key for tracking
   */
  private getTodayKey(): string {
    return this.formatDateKey(new Date())
  }

  /**
   * Format date as YYYY-MM-DD key
   */
  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Load persisted costs from localStorage
   */
  private loadPersistedCosts(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const costData = localStorage.getItem('ai-extraction-costs')
        const extractionData = localStorage.getItem('ai-extraction-counts')
        
        if (costData) {
          const costs = JSON.parse(costData)
          this.dailyCosts = new Map(Object.entries(costs))
        }
        
        if (extractionData) {
          const counts = JSON.parse(extractionData)
          this.dailyExtractions = new Map(Object.entries(counts))
        }
      }
    } catch (error) {
      logger.error('Failed to load persisted costs', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  /**
   * Persist costs to localStorage
   */
  private persistCosts(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const costObject = Object.fromEntries(this.dailyCosts)
        const countObject = Object.fromEntries(this.dailyExtractions)
        
        localStorage.setItem('ai-extraction-costs', JSON.stringify(costObject))
        localStorage.setItem('ai-extraction-counts', JSON.stringify(countObject))
      }
    } catch (error) {
      logger.error('Failed to persist costs', { error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}

// Export singleton instance
export const costMonitor = CostMonitor.getInstance()