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

  // Token estimation for request validation
  private estimateTokensForRequest(text: string): { 
    pdfTextTokens: number, 
    contextTokens: number, 
    totalTokens: number, 
    exceedsLimit: boolean, 
    recommendedChunks: number 
  } {
    const CHARS_PER_TOKEN = 4
    const TOKEN_LIMIT = 100000 // Updated for GPT-4-1106-preview which supports 128k context
    const CONTEXT_OVERHEAD = 14657 // Estimated tokens for reference data, existing listings, prompt
    
    const pdfTextTokens = Math.ceil(text.length / CHARS_PER_TOKEN)
    const totalTokens = pdfTextTokens + CONTEXT_OVERHEAD
    const exceedsLimit = totalTokens > TOKEN_LIMIT
    
    // Calculate how many chunks needed
    const maxPdfTokensPerChunk = TOKEN_LIMIT - CONTEXT_OVERHEAD
    const recommendedChunks = Math.ceil(pdfTextTokens / maxPdfTokensPerChunk)
    
    return {
      pdfTextTokens,
      contextTokens: CONTEXT_OVERHEAD,
      totalTokens,
      exceedsLimit,
      recommendedChunks
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
    batchId?: string,
    sellerId?: string,
    includeExistingListings: boolean = false,
    referenceData?: any,
    existingListings?: any
  ): Promise<AIExtractionResult> {
    const startTime = Date.now()
    
    // Token estimation for logging purposes only
    const tokenEstimate = this.estimateTokensForRequest(text)
    
    // Log token estimate but don't block - GPT-4-1106-preview can handle 128k tokens
    if (tokenEstimate.totalTokens > 100000) {
      console.log(`📊 Large document: ${tokenEstimate.totalTokens} tokens`)
    }
    
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
    console.log(`🎯 Token estimate: ${tokenEstimate.totalTokens} tokens (PDF: ${tokenEstimate.pdfTextTokens}, Context: ${tokenEstimate.contextTokens})`)
    
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
        } else if (response.status === 413) {
          // Token limit exceeded from Edge Function
          throw new Error(`PDF too large: ${errorData.message || 'Token limit exceeded'}`)
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

  // Phase 2: Chunked extraction support
  async extractVehiclesChunked(
    pdfTexts: string[],
    dealerHint?: string,
    batchId?: string,
    sellerId?: string,
    referenceData?: any,
    existingListings?: any,
    onProgress?: (progress: { 
      chunkIndex: number, 
      totalChunks: number, 
      phase: 'processing' | 'waiting',
      message: string,
      waitTimeMs?: number 
    }) => void
  ): Promise<AIExtractionResult> {
    const startTime = Date.now()
    
    // Get session once at the beginning
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      throw new Error('Authentication required for AI extraction')
    }
    
    // Create chunks from PDF texts
    const chunks = this.createChunks(pdfTexts)
    
    console.log(`📦 Created ${chunks.length} chunks for processing`)
    
    // Process chunks sequentially with rate limiting
    const results: AIExtractionResult[] = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Progress callback
      onProgress?.({
        chunkIndex: i,
        totalChunks: chunks.length,
        phase: 'processing',
        message: `Processing chunk ${i + 1} of ${chunks.length}...`
      })
      
      try {
        // Process chunk
        const response = await fetch('/functions/v1/ai-extract-vehicles', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chunkId: chunk.id,
            chunkIndex: i,
            totalChunks: chunks.length,
            pdfTexts: chunk.pdfTexts,
            dealerHint,
            batchId,
            sellerId,
            referenceData,
            existingListings
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          
          if (response.status === 429) {
            // Rate limit - wait and retry
            const waitTime = 65000 // 65 seconds
            onProgress?.({
              chunkIndex: i,
              totalChunks: chunks.length,
              phase: 'waiting',
              message: `Rate limit reached. Waiting ${Math.ceil(waitTime/1000)}s...`,
              waitTimeMs: waitTime
            })
            
            await new Promise(resolve => setTimeout(resolve, waitTime))
            i-- // Retry this chunk
            continue
          } else {
            throw new Error(`Chunk ${i + 1} failed: ${errorData.error || 'Unknown error'}`)
          }
        }
        
        const result = await response.json()
        
        if (!result.success) {
          throw new Error(`Chunk ${i + 1} failed: ${result.error}`)
        }
        
        results.push({
          vehicles: result.vehicles || [],
          extraction_method: 'ai',
          tokens_used: result.tokens_used,
          cost_estimate: result.cost_estimate,
          processing_time_ms: result.processing_time_ms || 0,
          confidence_score: result.confidence_score || 0
        })
        
        // Rate limiting delay between chunks
        if (i < chunks.length - 1) {
          const delayTime = 65000 // 65 seconds
          onProgress?.({
            chunkIndex: i,
            totalChunks: chunks.length,
            phase: 'waiting',
            message: `Waiting ${Math.ceil(delayTime/1000)}s before next chunk...`,
            waitTimeMs: delayTime
          })
          
          await new Promise(resolve => setTimeout(resolve, delayTime))
        }
        
      } catch (error) {
        console.error(`Chunk ${i + 1} processing failed:`, error)
        throw error
      }
    }
    
    // Combine results
    const combinedResult = this.combineChunkResults(results)
    combinedResult.processing_time_ms = Date.now() - startTime
    
    console.log(`✅ Chunked extraction complete: ${combinedResult.vehicles.length} vehicles from ${chunks.length} chunks`)
    
    return combinedResult
  }

  private createChunks(pdfTexts: string[]): Array<{ id: string, pdfTexts: string[] }> {
    const chunks: Array<{ id: string, pdfTexts: string[] }> = []
    const MAX_CHARS_PER_CHUNK = 40000
    const MAX_PDFS_PER_CHUNK = 3
    
    let currentChunk: string[] = []
    let currentChars = 0
    
    for (const pdfText of pdfTexts) {
      // Check if adding this PDF would exceed limits
      if (currentChunk.length >= MAX_PDFS_PER_CHUNK || 
          (currentChars + pdfText.length > MAX_CHARS_PER_CHUNK && currentChunk.length > 0)) {
        // Create new chunk
        if (currentChunk.length > 0) {
          chunks.push({
            id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            pdfTexts: currentChunk
          })
        }
        currentChunk = []
        currentChars = 0
      }
      
      currentChunk.push(pdfText)
      currentChars += pdfText.length
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        id: `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pdfTexts: currentChunk
      })
    }
    
    return chunks
  }

  private combineChunkResults(results: AIExtractionResult[]): AIExtractionResult {
    const allVehicles = results.flatMap(r => r.vehicles)
    const totalTokens = results.reduce((sum, r) => sum + (r.tokens_used || 0), 0)
    const totalCost = results.reduce((sum, r) => sum + (r.cost_estimate || 0), 0)
    const avgConfidence = results.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / results.length
    
    return {
      vehicles: allVehicles,
      extraction_method: 'ai',
      tokens_used: totalTokens,
      cost_estimate: totalCost,
      processing_time_ms: 0, // Will be set by caller
      confidence_score: avgConfidence
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