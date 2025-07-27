import { supabase } from '@/lib/supabase'
import type { CostLimits } from './types'

export class AICostTracker {
  private static readonly DEFAULT_MONTHLY_BUDGET = 50 // $50 USD
  private static readonly DEFAULT_PER_PDF_LIMIT = 0.25 // $0.25 per PDF
  
  // Usage tracking now handled by api_call_logs via responsesConfigManager
  // This method is kept for backward compatibility but logs a deprecation notice
  async trackUsage(_usage: any): Promise<void> {
    console.warn('[AICostTracker] trackUsage is deprecated - use responsesConfigManager.logAPICall instead')
    // No-op - tracking handled by Edge Functions via api_call_logs
  }
  
  async getMonthlyUsage(): Promise<{
    total_cost: number
    total_tokens: number
    request_count: number
    success_rate: number
  }> {
    try {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('api_call_logs')
        .select('total_tokens, response_status')
        .gte('created_at', startOfMonth.toISOString())
      
      if (error) throw error
      
      const summary = data.reduce(
        (acc, record) => {
          // Estimate cost based on tokens (GPT-3.5-turbo pricing: ~$0.002/1K tokens)
          const estimatedCost = record.total_tokens ? (record.total_tokens / 1000) * 0.002 : 0
          return {
            total_cost: acc.total_cost + estimatedCost,
            total_tokens: acc.total_tokens + (record.total_tokens || 0),
            request_count: acc.request_count + 1,
            success_count: acc.success_count + (record.response_status === 'success' ? 1 : 0)
          }
        },
        { total_cost: 0, total_tokens: 0, request_count: 0, success_count: 0 }
      )
      
      return {
        total_cost: summary.total_cost,
        total_tokens: summary.total_tokens,
        request_count: summary.request_count,
        success_rate: summary.request_count > 0 ? summary.success_count / summary.request_count : 0
      }
    } catch (error) {
      console.error('Failed to get monthly usage:', error)
      return { total_cost: 0, total_tokens: 0, request_count: 0, success_rate: 0 }
    }
  }
  
  async canProcessRequest(estimatedCost: number): Promise<{
    allowed: boolean
    reason?: string
    current_usage: number
    monthly_limit: number
  }> {
    const usage = await this.getMonthlyUsage()
    const monthlyLimit = this.getMonthlyBudget()
    const perPdfLimit = this.getPerPdfLimit()
    
    // Check monthly budget
    if (usage.total_cost + estimatedCost > monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly budget exceeded (${usage.total_cost.toFixed(3)} + ${estimatedCost.toFixed(3)} > ${monthlyLimit})`,
        current_usage: usage.total_cost,
        monthly_limit: monthlyLimit
      }
    }
    
    // Check per-PDF limit
    if (estimatedCost > perPdfLimit) {
      return {
        allowed: false,
        reason: `Per-PDF cost limit exceeded (${estimatedCost.toFixed(3)} > ${perPdfLimit})`,
        current_usage: usage.total_cost,
        monthly_limit: monthlyLimit
      }
    }
    
    return {
      allowed: true,
      current_usage: usage.total_cost,
      monthly_limit: monthlyLimit
    }
  }
  
  async shouldUseAI(textLength: number, patternConfidence: number = 0): Promise<{
    use_ai: boolean
    reason: string
  }> {
    // Use patterns if they're confident enough
    if (patternConfidence > 0.8) {
      return {
        use_ai: false,
        reason: 'Pattern matching confidence is high enough'
      }
    }
    
    // Estimate cost for this request
    const estimatedTokens = Math.ceil(textLength / 4) // Rough token estimation
    const estimatedCost = (estimatedTokens / 1000) * 0.002 // GPT-3.5-turbo pricing
    
    const budget = await this.canProcessRequest(estimatedCost)
    
    if (!budget.allowed) {
      return {
        use_ai: false,
        reason: budget.reason || 'Budget constraints'
      }
    }
    
    // Use AI for complex cases within budget
    return {
      use_ai: true,
      reason: `AI processing approved (cost: $${estimatedCost.toFixed(4)})`
    }
  }
  
  private getMonthlyBudget(): number {
    const envBudget = import.meta.env.VITE_AI_MONTHLY_BUDGET
    return envBudget ? parseFloat(envBudget) : AICostTracker.DEFAULT_MONTHLY_BUDGET
  }
  
  private getPerPdfLimit(): number {
    const envLimit = import.meta.env.VITE_AI_PER_PDF_LIMIT
    return envLimit ? parseFloat(envLimit) : AICostTracker.DEFAULT_PER_PDF_LIMIT
  }
  
  getCostLimits(): CostLimits {
    const monthlyBudget = this.getMonthlyBudget()
    return {
      monthly_budget: monthlyBudget,
      per_pdf_limit: this.getPerPdfLimit(),
      warning_threshold: monthlyBudget * 0.8
    }
  }
}

export const aiCostTracker = new AICostTracker()