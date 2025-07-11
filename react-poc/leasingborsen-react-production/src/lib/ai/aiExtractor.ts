import type { AIExtractionResult } from './types'
import { estimateTokens, estimateCost } from './utils'
import { aiCostTracker } from './costTracker'
import { supabase } from '@/lib/supabase'

export class AIVehicleExtractor {
  private model = 'gpt-3.5-turbo'
  private lastRequestTime = 0
  private requestCount = 0
  private readonly rateLimitInterval = 60000 // 1 minute in ms
  private readonly rateLimitRequests = 3 // 3 requests per minute
  
  constructor() {
    // AI extraction now happens via secure Edge Function
    // No API keys needed in frontend
  }
  
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    
    // Reset counter if interval has passed
    if (now - this.lastRequestTime >= this.rateLimitInterval) {
      this.requestCount = 0
      this.lastRequestTime = now
    }
    
    // If we've hit the rate limit, wait for the next interval
    if (this.requestCount >= this.rateLimitRequests) {
      const timeToWait = this.rateLimitInterval - (now - this.lastRequestTime)
      if (timeToWait > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(timeToWait / 1000)}s before next request...`)
        await new Promise(resolve => setTimeout(resolve, timeToWait))
        // Reset after waiting
        this.requestCount = 0
        this.lastRequestTime = Date.now()
      }
    }
    
    this.requestCount++
  }

  async extractVehicles(
    text: string,
    dealerHint?: string,
    batchId?: string,
    sellerId?: string,
    includeExistingListings: boolean = false,
    referenceData?: any,
    existingListings?: any
  ): Promise<AIExtractionResult> {
    const startTime = Date.now()
    
    // Check if we should use AI based on budget
    const aiDecision = await aiCostTracker.shouldUseAI(text.length, 0)
    if (!aiDecision.use_ai) {
      throw new Error(`AI extraction denied: ${aiDecision.reason}`)
    }
    
    // Wait for rate limit if needed
    await this.waitForRateLimit()
    
    console.log(`🤖 Starting AI extraction with ${this.model} via Edge Function`)
    console.log(`📄 Text length: ${text.length} characters`)
    console.log(`🏪 Dealer hint: ${dealerHint || 'None'}`)
    
    try {
      // Get current user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Authentication required for AI extraction')
      }
      
      // Estimate cost for logging
      const inputTokens = estimateTokens(text)
      const estimatedCost = estimateCost(inputTokens, 500, this.model)
      
      console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} (${inputTokens} input tokens)`)
      
      // Call secure Edge Function
      const response = await fetch('/functions/v1/ai-extract-vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          dealerHint,
          batchId,
          sellerId,
          referenceData,      // Pass through
          existingListings,   // Pass through
          includeExistingListings // Keep for backward compatibility
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again')
        } else if (response.status === 429) {
          throw new Error(`Budget limit exceeded: ${errorData.details || 'Rate limit hit'}`)
        } else {
          throw new Error(`AI extraction failed: ${errorData.error || 'Unknown error'}`)
        }
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(`AI extraction failed: ${result.error}`)
      }
      
      console.log(`✅ AI extraction complete: ${result.vehicles.length} vehicles found`)
      console.log(`📊 Tokens used: ${result.tokens_used}, Actual cost: $${result.cost_estimate?.toFixed(4)}`)
      
      // Return the result with calculated processing time
      return {
        vehicles: result.vehicles || [],
        extraction_method: 'ai',
        tokens_used: result.tokens_used,
        cost_estimate: result.cost_estimate,
        processing_time_ms: Date.now() - startTime,
        confidence_score: result.confidence_score || 0
      }
      
    } catch (error) {
      console.error('AI extraction failed:', error)
      
      // Log failed usage locally for tracking
      await aiCostTracker.trackUsage({
        batch_id: batchId,
        model: this.model,
        tokens_used: 0,
        cost: 0,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }
  
  
  async testConnection(): Promise<boolean> {
    try {
      // Test connection to Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false
      
      const response = await fetch('/functions/v1/ai-extract-vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test connection',
          dealerHint: 'test'
        })
      })
      
      // We expect this to work or fail with a specific error, not network error
      return response.status !== 0 && response.status < 500
    } catch {
      return false
    }
  }
}

export const aiVehicleExtractor = new AIVehicleExtractor()