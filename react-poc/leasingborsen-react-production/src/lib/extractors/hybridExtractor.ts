import { VWPDFExtractor, type VWExtractionResult } from './vwPatternMatcher'
import { aiVehicleExtractor } from '@/lib/ai/aiExtractor'
import { textPatternAnalyzer } from '@/lib/text/patternAnalyzer'
import { smartTextChunker } from '@/lib/text/textChunker'
import { aiCostTracker } from '@/lib/ai/costTracker'
import type { AIExtractedVehicle, AIExtractionResult } from '@/lib/ai/types'

export interface HybridExtractionResult {
  results: VWExtractionResult[]
  extraction_method: 'pattern' | 'ai' | 'hybrid'
  confidence_score: number
  processing_time_ms: number
  ai_cost?: number
  ai_tokens_used?: number
  vehicles_found: number
  analysis: any
}

export class HybridVehicleExtractor {
  private patternExtractor = new VWPDFExtractor()
  
  async extractVehicles(
    pdfText: string,
    dealerHint?: string,
    batchId?: string
  ): Promise<HybridExtractionResult> {
    const startTime = Date.now()
    
    console.log('🔄 Starting hybrid vehicle extraction')
    console.log(`📄 Text length: ${pdfText.length} characters`)
    console.log(`🏪 Dealer hint: ${dealerHint || 'None'}`)
    
    // Step 1: Analyze text structure
    const analysis = textPatternAnalyzer.analyzeText(pdfText)
    console.log(`📊 Text analysis complete - Strategy: ${analysis.recommendedStrategy}`)
    
    // Step 2: Try pattern matching first (always free)
    let patternResults: VWExtractionResult[] = []
    let patternConfidence = 0
    
    try {
      console.log('🔍 Attempting pattern extraction...')
      patternResults = this.patternExtractor.extractVWModels(pdfText)
      patternConfidence = this.calculatePatternConfidence(patternResults, analysis)
      
      console.log(`✅ Pattern extraction: ${patternResults.length} vehicles, confidence: ${patternConfidence.toFixed(2)}`)
    } catch (error) {
      console.warn('⚠️ Pattern extraction failed:', error)
      patternConfidence = 0
    }
    
    // Step 3: Decide on extraction strategy
    const strategy = await this.chooseExtractionStrategy(
      analysis,
      patternResults,
      patternConfidence,
      pdfText.length
    )
    
    console.log(`🎯 Chosen strategy: ${strategy}`)
    
    // Step 4: Execute extraction based on strategy
    let finalResults: VWExtractionResult[] = []
    let extractionMethod: 'pattern' | 'ai' | 'hybrid' = 'pattern'
    let aiCost = 0
    let aiTokens = 0
    
    switch (strategy) {
      case 'pattern':
        finalResults = patternResults
        extractionMethod = 'pattern'
        break
        
      case 'ai':
        const aiResult = await this.performAIExtraction(pdfText, dealerHint, batchId)
        finalResults = this.convertAIToVWResults(aiResult.vehicles)
        extractionMethod = 'ai'
        aiCost = aiResult.cost_estimate || 0
        aiTokens = aiResult.tokens_used || 0
        break
        
      case 'hybrid':
        // Use AI to supplement weak pattern results
        if (patternResults.length > 0) {
          const aiResult = await this.performAIExtraction(pdfText, dealerHint, batchId)
          const aiResults = this.convertAIToVWResults(aiResult.vehicles)
          finalResults = this.mergeResults(patternResults, aiResults)
          extractionMethod = 'hybrid'
          aiCost = aiResult.cost_estimate || 0
          aiTokens = aiResult.tokens_used || 0
        } else {
          // Fallback to AI only
          const aiResult = await this.performAIExtraction(pdfText, dealerHint, batchId)
          finalResults = this.convertAIToVWResults(aiResult.vehicles)
          extractionMethod = 'ai'
          aiCost = aiResult.cost_estimate || 0
          aiTokens = aiResult.tokens_used || 0
        }
        break
    }
    
    // Step 5: Calculate final confidence and metrics
    const finalConfidence = this.calculateFinalConfidence(finalResults, extractionMethod, analysis)
    const processingTime = Date.now() - startTime
    
    console.log(`🎉 Hybrid extraction complete:`)
    console.log(`  - Method: ${extractionMethod}`)
    console.log(`  - Vehicles: ${finalResults.length}`)
    console.log(`  - Confidence: ${finalConfidence.toFixed(2)}`)
    console.log(`  - Time: ${processingTime}ms`)
    if (aiCost > 0) console.log(`  - AI Cost: $${aiCost.toFixed(4)}`)
    
    return {
      results: finalResults,
      extraction_method: extractionMethod,
      confidence_score: finalConfidence,
      processing_time_ms: processingTime,
      ai_cost: aiCost || undefined,
      ai_tokens_used: aiTokens || undefined,
      vehicles_found: finalResults.length,
      analysis
    }
  }
  
  private async chooseExtractionStrategy(
    analysis: any,
    patternResults: VWExtractionResult[],
    patternConfidence: number,
    textLength: number
  ): Promise<'pattern' | 'ai' | 'hybrid'> {
    
    // If patterns worked well, use them
    if (patternConfidence > 0.8 && patternResults.length > 0) {
      return 'pattern'
    }
    
    // Check AI budget and decision
    const aiDecision = await aiCostTracker.shouldUseAI(textLength, patternConfidence)
    if (!aiDecision.use_ai) {
      console.log(`💰 AI denied: ${aiDecision.reason}`)
      return 'pattern' // Use patterns even if weak
    }
    
    // Use analysis recommendation with budget considerations
    if (analysis.recommendedStrategy === 'ai') {
      return 'ai'
    }
    
    if (analysis.recommendedStrategy === 'hybrid' || patternConfidence > 0.3) {
      return 'hybrid'
    }
    
    return 'ai'
  }
  
  private async performAIExtraction(
    pdfText: string,
    dealerHint?: string,
    batchId?: string
  ): Promise<AIExtractionResult> {
    // For very large texts, use chunking
    if (pdfText.length > 15000) {
      return await this.performChunkedAIExtraction(pdfText, dealerHint, batchId)
    }
    
    // Direct AI extraction for normal-sized texts
    return await aiVehicleExtractor.extractVehicles(pdfText, dealerHint, batchId)
  }
  
  private async performChunkedAIExtraction(
    pdfText: string,
    dealerHint?: string,
    batchId?: string
  ): Promise<AIExtractionResult> {
    console.log('📄 Text is large, using chunked extraction')
    
    const chunks = smartTextChunker.chunkText(pdfText)
    const relevantChunks = smartTextChunker.filterRelevantChunks(chunks)
    
    console.log(`📋 Processing ${relevantChunks.length} relevant chunks`)
    
    // Process chunks in sequence to respect rate limits
    const chunkResults: AIExtractedVehicle[][] = []
    let totalTokens = 0
    let totalCost = 0
    
    for (const chunk of relevantChunks) {
      try {
        const result = await aiVehicleExtractor.extractVehicles(
          chunk.text,
          dealerHint,
          batchId
        )
        
        chunkResults.push(result.vehicles)
        totalTokens += result.tokens_used || 0
        totalCost += result.cost_estimate || 0
        
        console.log(`  ✅ Chunk ${chunk.index}: ${result.vehicles.length} vehicles`)
        
        // Wait between requests to respect 3 requests per minute rate limit
        // With built-in rate limiting, this is just a safety buffer
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`  ❌ Chunk ${chunk.index} failed:`, error)
        chunkResults.push([])
      }
    }
    
    // Merge results from all chunks
    const mergedVehicles = smartTextChunker.mergeChunkResults(chunkResults)
    
    return {
      vehicles: mergedVehicles,
      extraction_method: 'ai',
      tokens_used: totalTokens,
      cost_estimate: totalCost,
      processing_time_ms: 0, // Will be calculated by parent
      confidence_score: mergedVehicles.length > 0 
        ? mergedVehicles.reduce((sum, v) => sum + (v.confidence || 0), 0) / mergedVehicles.length
        : 0
    }
  }
  
  private calculatePatternConfidence(
    results: VWExtractionResult[],
    analysis: any
  ): number {
    if (results.length === 0) return 0
    
    // Base confidence from individual results
    const avgResultConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length
    
    // Boost confidence if text analysis suggests patterns should work
    let confidence = avgResultConfidence
    
    if (analysis.isStructured) confidence += 0.1
    if (analysis.hasTableFormat) confidence += 0.1
    if (analysis.vehicleCount > 0 && results.length >= analysis.vehicleCount * 0.5) confidence += 0.2
    
    return Math.min(confidence, 1.0)
  }
  
  private convertAIToVWResults(aiVehicles: AIExtractedVehicle[]): VWExtractionResult[] {
    return aiVehicles.map(vehicle => ({
      model: vehicle.model,
      variant: vehicle.variant,
      horsepower: vehicle.horsepower || 150,
      co2_emission: vehicle.specifications.co2_emission,
      fuel_consumption: vehicle.specifications.fuel_consumption,
      is_electric: vehicle.specifications.is_electric,
      range_km: vehicle.specifications.range_km,
      
      pricing_options: vehicle.offers.map(offer => ({
        mileage_per_year: offer.mileage_km,
        period_months: offer.duration_months,
        total_cost: offer.total_cost || offer.monthly_price * offer.duration_months,
        min_price_12_months: offer.min_price_12_months || offer.total_cost || 0,
        deposit: offer.deposit || 0,
        monthly_price: offer.monthly_price
      })),
      
      line_numbers: [0], // AI doesn't track line numbers
      confidence_score: vehicle.confidence,
      source_section: 'AI Extraction'
    }))
  }
  
  private mergeResults(
    patternResults: VWExtractionResult[],
    aiResults: VWExtractionResult[]
  ): VWExtractionResult[] {
    const merged = new Map<string, VWExtractionResult>()
    
    // Add pattern results first
    for (const result of patternResults) {
      const key = `${result.model}-${result.variant}`.toLowerCase()
      merged.set(key, result)
    }
    
    // Add AI results, preferring those with more offers or higher confidence
    for (const result of aiResults) {
      const key = `${result.model}-${result.variant}`.toLowerCase()
      const existing = merged.get(key)
      
      if (!existing || 
          result.pricing_options.length > existing.pricing_options.length ||
          result.confidence_score > existing.confidence_score) {
        merged.set(key, {
          ...result,
          source_section: existing ? 'Pattern + AI' : 'AI Only'
        })
      }
    }
    
    return Array.from(merged.values())
  }
  
  private calculateFinalConfidence(
    results: VWExtractionResult[],
    method: string,
    analysis: any
  ): number {
    if (results.length === 0) return 0
    
    const baseConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0) / results.length
    
    // Adjust based on method and analysis
    let adjustment = 0
    
    if (method === 'ai') adjustment += 0.1 // AI generally more reliable
    if (method === 'hybrid') adjustment += 0.05 // Hybrid combines strengths
    if (analysis.vehicleCount > 0 && results.length >= analysis.vehicleCount * 0.7) adjustment += 0.1
    
    return Math.min(baseConfidence + adjustment, 1.0)
  }
}

export const hybridVehicleExtractor = new HybridVehicleExtractor()