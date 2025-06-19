import OpenAI from 'openai'
import type { AIExtractedVehicle, AIExtractionResult } from './types'
import { getPromptForDealer, estimateTokens, estimateCost } from './prompts'
import { aiCostTracker } from './costTracker'

export class AIVehicleExtractor {
  private openai: OpenAI | null = null
  private model = 'gpt-3.5-turbo'
  private lastRequestTime = 0
  private requestCount = 0
  private readonly rateLimitInterval = 60000 // 1 minute in ms
  private readonly rateLimitRequests = 3 // 3 requests per minute
  
  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, this should be server-side
      })
    } else {
      console.warn('OpenAI API key not found. AI extraction will be disabled.')
    }
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
    batchId?: string
  ): Promise<AIExtractionResult> {
    const startTime = Date.now()
    
    if (!this.openai) {
      throw new Error('OpenAI not configured. Please add VITE_OPENAI_API_KEY to environment.')
    }
    
    // Check if we should use AI based on budget
    const aiDecision = await aiCostTracker.shouldUseAI(text.length, 0)
    if (!aiDecision.use_ai) {
      throw new Error(`AI extraction denied: ${aiDecision.reason}`)
    }
    
    // Wait for rate limit if needed
    await this.waitForRateLimit()
    
    console.log(`🤖 Starting AI extraction with ${this.model}`)
    console.log(`📄 Text length: ${text.length} characters`)
    console.log(`🏪 Dealer hint: ${dealerHint || 'None'}`)
    
    try {
      // Get appropriate prompt for dealer
      const prompt = getPromptForDealer(dealerHint)
      
      // Prepare messages
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user + text }
      ]
      
      // Estimate tokens and cost
      const inputTokens = estimateTokens(prompt.system + prompt.user + text)
      const estimatedCost = estimateCost(inputTokens, 500, this.model) // Estimate 500 output tokens
      
      console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} (${inputTokens} input tokens)`)
      
      // Make API call with retry logic for rate limits
      let completion: OpenAI.Chat.ChatCompletion
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount <= maxRetries) {
        try {
          completion = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.1, // Low temperature for consistency
            max_tokens: 4000
          })
          break // Success, exit retry loop
          
        } catch (error: any) {
          if (error?.status === 429 && retryCount < maxRetries) {
            console.log(`⏳ Rate limit hit (attempt ${retryCount + 1}/${maxRetries + 1}). Waiting 20s...`)
            await new Promise(resolve => setTimeout(resolve, 20000)) // Wait 20 seconds
            retryCount++
            continue
          }
          throw error // Re-throw if not rate limit or max retries exceeded
        }
      }
      
      if (!completion!) {
        throw new Error('Failed to get completion after retries')
      }
      
      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('Empty response from AI')
      }
      
      // Parse JSON response
      let parsedData: { vehicles: AIExtractedVehicle[] }
      try {
        parsedData = JSON.parse(response)
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON: ${parseError}`)
      }
      
      const vehicles = parsedData.vehicles || []
      const tokensUsed = completion.usage?.total_tokens || inputTokens
      const actualCost = estimateCost(
        completion.usage?.prompt_tokens || inputTokens,
        completion.usage?.completion_tokens || 500,
        this.model
      )
      
      console.log(`✅ AI extraction complete: ${vehicles.length} vehicles found`)
      console.log(`📊 Tokens used: ${tokensUsed}, Actual cost: $${actualCost.toFixed(4)}`)
      
      // Log usage for tracking
      await aiCostTracker.trackUsage({
        batch_id: batchId,
        model: this.model,
        tokens_used: tokensUsed,
        cost: actualCost,
        success: true
      })
      
      // Calculate overall confidence
      const overallConfidence = vehicles.length > 0
        ? vehicles.reduce((sum, v) => sum + (v.confidence || 0), 0) / vehicles.length
        : 0
      
      return {
        vehicles: this.validateAndCleanVehicles(vehicles),
        extraction_method: 'ai',
        tokens_used: tokensUsed,
        cost_estimate: actualCost,
        processing_time_ms: Date.now() - startTime,
        confidence_score: overallConfidence
      }
      
    } catch (error) {
      console.error('AI extraction failed:', error)
      
      // Log failed usage
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
  
  private validateAndCleanVehicles(vehicles: AIExtractedVehicle[]): AIExtractedVehicle[] {
    return vehicles
      .filter(vehicle => {
        // Basic validation
        if (!vehicle.make || !vehicle.model) {
          console.warn('Skipping vehicle without make/model:', vehicle)
          return false
        }
        
        if (!vehicle.offers || vehicle.offers.length === 0) {
          console.warn('Skipping vehicle without offers:', vehicle)
          return false
        }
        
        return true
      })
      .map(vehicle => ({
        ...vehicle,
        // Ensure required fields have defaults
        make: vehicle.make.trim(),
        model: vehicle.model.trim(),
        variant: vehicle.variant?.trim() || '',
        horsepower: vehicle.horsepower || 0,
        specifications: {
          ...vehicle.specifications,
          is_electric: vehicle.specifications?.is_electric || false,
          fuel_type: vehicle.specifications?.fuel_type || 'Unknown',
          transmission: vehicle.specifications?.transmission || 'Unknown'
        },
        offers: vehicle.offers.map(offer => ({
          duration_months: offer.duration_months || 12,
          mileage_km: offer.mileage_km || 10000,
          monthly_price: offer.monthly_price || 0,
          deposit: offer.deposit,
          total_cost: offer.total_cost,
          min_price_12_months: offer.min_price_12_months
        })),
        confidence: Math.max(0, Math.min(1, vehicle.confidence || 0.5)) // Clamp to 0-1
      }))
  }
  
  async testConnection(): Promise<boolean> {
    if (!this.openai) return false
    
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 1
      })
      return true
    } catch {
      return false
    }
  }
}

export const aiVehicleExtractor = new AIVehicleExtractor()