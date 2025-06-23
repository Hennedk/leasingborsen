import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DealerConfig, ExtractedVehicle, ExtractionResult, AIExample, PricingOption } from '../types/DealerConfig.ts'

/* Claude Change Summary:
 * Created advanced AI extraction engine with dealer-specific prompts.
 * Implements intelligent fallback strategies, confidence scoring, and cost optimization.
 * Features dynamic prompt generation, multi-shot learning, and result caching.
 * Related to: Enhanced AI extraction system with smart optimization
 */

interface AIExtractionRequest {
  text: string
  dealerConfig: DealerConfig
  patternResults?: ExtractedVehicle[]
  mode: 'full' | 'supplement' | 'verify'
}

interface AIExtractionResponse {
  vehicles: ExtractedVehicle[]
  confidence: number
  cost: number
  tokens: number
  processingTime: number
  model: string
  reasoningSteps?: string[]
  fallbackUsed?: boolean
}

interface CachedAIResult {
  textHash: string
  dealerId: string
  configVersion: string
  result: AIExtractionResponse
  createdAt: string
  hitCount: number
  successRate: number
}

interface AIOptimizationMetrics {
  dealerId: string
  documentType: string
  successRate: number
  averageConfidence: number
  costEfficiency: number
  lastOptimizedAt: string
  promptVersion: string
  performanceHistory: PerformanceDataPoint[]
}

interface PerformanceDataPoint {
  timestamp: string
  confidence: number
  cost: number
  extractionSuccess: boolean
  userFeedback?: 'correct' | 'incorrect' | 'partially_correct'
}

export class AIExtractionEngine {
  private optimizationMetrics: Map<string, AIOptimizationMetrics> = new Map()
  private resultCache: Map<string, CachedAIResult> = new Map()
  private learningData: Map<string, AIExample[]> = new Map()
  private budgetTracker: Map<string, number> = new Map() // Daily budget per dealer

  constructor(
    private supabaseClient: SupabaseClient,
    private aiApiKey: string = Deno.env.get('OPENAI_API_KEY') || ''
  ) {
    this.initializeOptimization()
  }

  /**
   * Main AI extraction method with intelligent optimization
   */
  async extractVehicleData(request: AIExtractionRequest): Promise<AIExtractionResponse> {
    const { text, dealerConfig, patternResults, mode } = request
    const startTime = Date.now()

    try {
      // 1. Check budget constraints
      await this.checkBudgetConstraints(dealerConfig.id)

      // 2. Generate text hash for caching
      const textHash = await this.generateTextHash(text)

      // 3. Check cache first
      if (dealerConfig.optimization.cacheEnabled) {
        const cachedResult = await this.getCachedResult(textHash, dealerConfig.id, dealerConfig.version)
        if (cachedResult) {
          console.log(`🎯 Using cached AI result (age: ${this.getCacheAge(cachedResult.createdAt)}h)`)
          await this.updateCacheHitCount(textHash)
          return cachedResult.result
        }
      }

      // 4. Determine optimal AI model and approach
      const modelConfig = await this.selectOptimalModel(dealerConfig, text.length, mode)

      // 5. Generate dynamic prompt with dealer-specific examples
      const prompt = await this.generateDynamicPrompt(dealerConfig, text, patternResults, mode)

      // 6. Execute AI extraction with fallback strategies
      const response = await this.executeAIExtraction({
        prompt,
        modelConfig,
        dealerConfig,
        text,
        mode
      })

      // 7. Post-process and validate results
      const processedResponse = await this.postProcessResults(response, dealerConfig, patternResults)

      // 8. Cache successful results
      if (processedResponse.confidence >= dealerConfig.extraction.confidence.cacheResults) {
        await this.cacheResult(textHash, dealerConfig.id, dealerConfig.version, processedResponse)
      }

      // 9. Update optimization metrics
      await this.updateOptimizationMetrics(dealerConfig.id, processedResponse, mode)

      // 10. Learn from successful extractions
      if (dealerConfig.optimization.learningEnabled && processedResponse.confidence >= dealerConfig.optimization.patternLearningThreshold) {
        await this.learnFromExtraction(dealerConfig.id, text, processedResponse)
      }

      return processedResponse

    } catch (error) {
      console.error('❌ AI extraction failed:', error)
      
      // Try fallback strategies
      const fallbackResponse = await this.tryFallbackStrategies(request, error)
      if (fallbackResponse) {
        return { ...fallbackResponse, fallbackUsed: true }
      }

      throw error
    }
  }

  /**
   * Generate dynamic prompt based on dealer configuration and context
   */
  private async generateDynamicPrompt(
    config: DealerConfig,
    text: string,
    patternResults?: ExtractedVehicle[],
    mode: 'full' | 'supplement' | 'verify' = 'full'
  ): Promise<string> {
    
    // Base system role with dealer-specific customizations
    let systemRole = config.extraction.aiPrompt.systemRole
    
    // Add dealer-specific context
    if (config.name.includes('Volkswagen') || config.name.includes('VW')) {
      systemRole += `\n\nSpecialization: You are specifically trained on Volkswagen Group vehicle data including VW, Audi, SEAT, and Škoda models. Pay special attention to:
- TSI/TDI/TFSI engine designations
- R-Line, GTI, RS, S-Line trim levels
- Electric ID. series models
- Typical VW Group pricing structures`
    }

    // Generate examples section with learned patterns
    const examples = await this.getRelevantExamples(config.id, config.extraction.aiPrompt.examples)
    const examplesText = this.formatExamplesForPrompt(examples)

    // Build mode-specific instructions
    let modeInstructions = ''
    switch (mode) {
      case 'supplement':
        modeInstructions = `
SUPPLEMENT MODE: You are supplementing pattern-based extraction results. Focus on:
- Filling missing data fields not captured by patterns
- Extracting complex specifications that regex cannot handle
- Finding additional pricing options or variants
- Preserving all existing pattern-extracted data`
        break
      case 'verify':
        modeInstructions = `
VERIFICATION MODE: Verify and correct pattern extraction results. Focus on:
- Checking accuracy of extracted prices and specifications
- Correcting obvious errors in pattern matching
- Validating model names and variants
- Ensuring pricing consistency`
        break
      case 'full':
      default:
        modeInstructions = `
FULL EXTRACTION MODE: Perform complete vehicle data extraction. Focus on:
- Identifying all vehicle models and variants
- Extracting complete specifications and pricing
- Maintaining high accuracy and completeness
- Following the exact output format`
    }

    // Build confidence scoring instructions
    const confidenceInstructions = `
CONFIDENCE SCORING: Assign confidence scores (0.0-1.0) based on:
- Data completeness: All required fields extracted (0.3)
- Price consistency: Multiple pricing options with logical relationships (0.2)
- Specification accuracy: Technical details match known vehicle data (0.2)  
- Source clarity: Clear, unambiguous text extraction (0.2)
- Cross-validation: Data consistency across multiple sources (0.1)

Minimum acceptable confidence: ${config.extraction.confidence.minimumAcceptable}`

    // Pattern results context for hybrid mode
    let patternContext = ''
    if (patternResults && patternResults.length > 0) {
      patternContext = `
EXISTING PATTERN RESULTS (for reference/supplementation):
${JSON.stringify(patternResults.slice(0, 3), null, 2)}
(${patternResults.length} total vehicles extracted by patterns)`
    }

    // Construct full prompt
    const fullPrompt = `${systemRole}

${modeInstructions}

${confidenceInstructions}

${examplesText}

${patternContext}

OUTPUT FORMAT: Return only valid JSON with this exact structure:
{
  "vehicles": [
    {
      "model": "string",
      "variant": "string", 
      "horsepower": number,
      "transmission": "string",
      "fuelType": "string",
      "bodyType": "string",
      "co2Emission": number,
      "fuelConsumption": "string",
      "co2TaxHalfYear": number,
      "isElectric": boolean,
      "rangeKm": number,
      "consumptionKwh100km": number,
      "wltpRange": number,
      "pricingOptions": [
        {
          "mileagePerYear": number,
          "periodMonths": number,
          "monthlyPrice": number,
          "totalCost": number,
          "deposit": number,
          "firstPayment": number
        }
      ],
      "confidenceScore": number,
      "sourceSection": "string"
    }
  ],
  "extractionNotes": "string",
  "overallConfidence": number
}

TEXT TO EXTRACT FROM:
${config.extraction.aiPrompt.userPromptTemplate.replace('{text}', text)}`

    return fullPrompt
  }

  /**
   * Execute AI extraction with the selected model and configuration
   */
  private async executeAIExtraction(params: {
    prompt: string
    modelConfig: any
    dealerConfig: DealerConfig
    text: string
    mode: string
  }): Promise<AIExtractionResponse> {
    const { prompt, modelConfig, dealerConfig } = params
    const startTime = Date.now()

    try {
      console.log(`🤖 Executing AI extraction with ${modelConfig.model}`)

      // Prepare request for OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: dealerConfig.extraction.aiPrompt.temperature,
          max_tokens: dealerConfig.extraction.aiPrompt.maxTokens,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const aiContent = data.choices[0].message.content

      // Parse JSON response
      let parsedResponse: any
      try {
        parsedResponse = JSON.parse(aiContent)
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError)
        throw new Error('AI returned invalid JSON format')
      }

      // Calculate costs
      const cost = this.calculateAICost(data.usage.total_tokens, modelConfig.model)
      const processingTime = Date.now() - startTime

      // Update budget tracking
      this.updateBudgetTracking(dealerConfig.id, cost)

      // Transform response to our format
      const vehicles = this.transformAIVehicles(parsedResponse.vehicles || [])

      return {
        vehicles,
        confidence: parsedResponse.overallConfidence || 0.8,
        cost,
        tokens: data.usage.total_tokens,
        processingTime,
        model: modelConfig.model,
        reasoningSteps: parsedResponse.extractionNotes ? [parsedResponse.extractionNotes] : []
      }

    } catch (error) {
      console.error('❌ AI extraction execution failed:', error)
      throw error
    }
  }

  /**
   * Select optimal AI model based on content and requirements
   */
  private async selectOptimalModel(config: DealerConfig, textLength: number, mode: string): Promise<any> {
    // Simple model selection logic
    // In production, this would be more sophisticated based on performance metrics
    
    if (textLength > 50000 || mode === 'full') {
      // Use more powerful model for complex extractions
      return {
        model: 'gpt-4-turbo-preview',
        costMultiplier: 1.0
      }
    } else if (mode === 'supplement' || mode === 'verify') {
      // Use cheaper model for simpler tasks
      return {
        model: 'gpt-3.5-turbo',
        costMultiplier: 0.1
      }
    }

    // Default to configured model
    return {
      model: config.extraction.aiPrompt.model,
      costMultiplier: 0.5
    }
  }

  /**
   * Get relevant examples for prompt engineering
   */
  private async getRelevantExamples(dealerId: string, configuredExamples: AIExample[]): Promise<AIExample[]> {
    const learnedExamples = this.learningData.get(dealerId) || []
    
    // Combine configured examples with learned examples
    const allExamples = [...configuredExamples, ...learnedExamples]
    
    // Select best examples (limit to 3-5 for prompt efficiency)
    return allExamples
      .sort((a, b) => this.getExampleRelevance(b) - this.getExampleRelevance(a))
      .slice(0, 5)
  }

  /**
   * Format examples for prompt inclusion
   */
  private formatExamplesForPrompt(examples: AIExample[]): string {
    if (examples.length === 0) return 'No specific examples available.'

    return `EXAMPLES OF SUCCESSFUL EXTRACTIONS:

${examples.map((example, index) => `
Example ${index + 1}:
INPUT: "${example.input.substring(0, 200)}..."
OUTPUT: ${JSON.stringify(example.output, null, 2)}
${example.description ? `NOTES: ${example.description}` : ''}
`).join('\n')}`
  }

  /**
   * Post-process and validate AI results
   */
  private async postProcessResults(
    response: AIExtractionResponse,
    config: DealerConfig,
    patternResults?: ExtractedVehicle[]
  ): Promise<AIExtractionResponse> {
    
    // Validate vehicles
    const validatedVehicles = response.vehicles.filter(vehicle => {
      // Basic validation
      if (!vehicle.model || !vehicle.variant) return false
      if (vehicle.pricingOptions.length === 0) return false
      
      // Price range validation
      const validPricing = vehicle.pricingOptions.every(pricing => 
        pricing.monthlyPrice >= config.validation.priceRange.min &&
        pricing.monthlyPrice <= config.validation.priceRange.max
      )
      
      return validPricing
    })

    // Adjust confidence based on validation results
    const validationRatio = validatedVehicles.length / Math.max(response.vehicles.length, 1)
    const adjustedConfidence = response.confidence * validationRatio

    // Cross-check with pattern results if available
    let crossValidationBonus = 0
    if (patternResults && patternResults.length > 0) {
      const matchingVehicles = validatedVehicles.filter(aiVehicle =>
        patternResults.some(patternVehicle =>
          this.vehiclesMatch(aiVehicle, patternVehicle)
        )
      )
      crossValidationBonus = (matchingVehicles.length / validatedVehicles.length) * 0.1
    }

    return {
      ...response,
      vehicles: validatedVehicles,
      confidence: Math.min(adjustedConfidence + crossValidationBonus, 1.0)
    }
  }

  /**
   * Try fallback strategies when primary AI extraction fails
   */
  private async tryFallbackStrategies(
    request: AIExtractionRequest,
    originalError: any
  ): Promise<AIExtractionResponse | null> {
    
    console.log('🔄 Attempting fallback strategies...')

    try {
      // Strategy 1: Use simpler model
      if (request.dealerConfig.extraction.aiPrompt.model !== 'gpt-3.5-turbo') {
        console.log('📉 Trying simpler model (gpt-3.5-turbo)')
        const simplifiedConfig = {
          ...request.dealerConfig,
          extraction: {
            ...request.dealerConfig.extraction,
            aiPrompt: {
              ...request.dealerConfig.extraction.aiPrompt,
              model: 'gpt-3.5-turbo',
              maxTokens: 2000
            }
          }
        }
        
        const fallbackResponse = await this.extractVehicleData({
          ...request,
          dealerConfig: simplifiedConfig
        })
        
        return fallbackResponse
      }

      // Strategy 2: Split text and process in chunks
      if (request.text.length > 20000) {
        console.log('📄 Trying text chunking approach')
        return await this.extractWithChunking(request)
      }

      // Strategy 3: Use basic pattern matching as last resort
      console.log('🎯 Falling back to basic pattern extraction')
      return await this.basicPatternFallback(request.text, request.dealerConfig)

    } catch (fallbackError) {
      console.error('❌ All fallback strategies failed:', fallbackError)
      return null
    }
  }

  /**
   * Extract with text chunking for large documents
   */
  private async extractWithChunking(request: AIExtractionRequest): Promise<AIExtractionResponse> {
    const chunks = this.splitTextIntoChunks(request.text, 15000)
    const allVehicles: ExtractedVehicle[] = []
    let totalCost = 0
    let totalTokens = 0
    let totalTime = 0

    for (let i = 0; i < chunks.length; i++) {
      console.log(`📄 Processing chunk ${i + 1}/${chunks.length}`)
      
      try {
        const chunkResponse = await this.extractVehicleData({
          ...request,
          text: chunks[i]
        })
        
        allVehicles.push(...chunkResponse.vehicles)
        totalCost += chunkResponse.cost
        totalTokens += chunkResponse.tokens
        totalTime += chunkResponse.processingTime
        
      } catch (error) {
        console.error(`❌ Chunk ${i + 1} failed:`, error)
        // Continue with other chunks
      }
    }

    // Remove duplicates
    const uniqueVehicles = this.deduplicateVehicles(allVehicles)

    return {
      vehicles: uniqueVehicles,
      confidence: uniqueVehicles.length > 0 ? 0.7 : 0.3,
      cost: totalCost,
      tokens: totalTokens,
      processingTime: totalTime,
      model: request.dealerConfig.extraction.aiPrompt.model,
      fallbackUsed: true
    }
  }

  /**
   * Basic pattern fallback when AI completely fails
   */
  private async basicPatternFallback(text: string, config: DealerConfig): Promise<AIExtractionResponse> {
    const vehicles: ExtractedVehicle[] = []
    
    // Try to extract at least basic vehicle information using simple patterns
    const lines = text.split('\n')
    
    for (const line of lines) {
      // Look for model patterns
      const modelMatch = line.match(/(\w+(?:\s+\w+)?)\s+(\d+(?:\.\d+)?)\s+(\w+)/i)
      if (modelMatch) {
        const [, model, price, period] = modelMatch
        
        vehicles.push({
          model: model.trim(),
          variant: 'Standard',
          pricingOptions: [{
            mileagePerYear: 10000,
            periodMonths: 12,
            monthlyPrice: parseInt(price) || 0,
            totalCost: 0
          }],
          sourceLineNumbers: [],
          confidenceScore: 0.3,
          extractionMethod: 'basic_fallback',
          sourceSection: 'Fallback extraction'
        })
      }
    }

    return {
      vehicles,
      confidence: vehicles.length > 0 ? 0.3 : 0.1,
      cost: 0,
      tokens: 0,
      processingTime: 100,
      model: 'basic_patterns',
      fallbackUsed: true
    }
  }

  /**
   * Transform AI response vehicles to our format
   */
  private transformAIVehicles(aiVehicles: any[]): ExtractedVehicle[] {
    return aiVehicles.map(vehicle => ({
      model: String(vehicle.model || '').trim(),
      variant: String(vehicle.variant || '').trim(),
      horsepower: this.safeParseNumber(vehicle.horsepower),
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      bodyType: vehicle.bodyType,
      co2Emission: this.safeParseNumber(vehicle.co2Emission),
      fuelConsumption: vehicle.fuelConsumption,
      co2TaxHalfYear: this.safeParseNumber(vehicle.co2TaxHalfYear),
      isElectric: Boolean(vehicle.isElectric),
      rangeKm: this.safeParseNumber(vehicle.rangeKm),
      consumptionKwh100km: this.safeParseNumber(vehicle.consumptionKwh100km),
      wltpRange: this.safeParseNumber(vehicle.wltpRange),
      pricingOptions: (vehicle.pricingOptions || []).map((option: any) => ({
        mileagePerYear: this.safeParseNumber(option.mileagePerYear) || 10000,
        periodMonths: this.safeParseNumber(option.periodMonths) || 12,
        monthlyPrice: this.safeParseNumber(option.monthlyPrice) || 0,
        totalCost: this.safeParseNumber(option.totalCost),
        deposit: this.safeParseNumber(option.deposit),
        firstPayment: this.safeParseNumber(option.firstPayment)
      })),
      sourceLineNumbers: [],
      confidenceScore: this.safeParseNumber(vehicle.confidenceScore) || 0.8,
      extractionMethod: 'ai',
      sourceSection: vehicle.sourceSection || 'AI Extraction'
    }))
  }

  // Utility methods

  private async generateTextHash(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async getCachedResult(textHash: string, dealerId: string, configVersion: string): Promise<CachedAIResult | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('ai_extraction_cache')
        .select('*')
        .eq('text_hash', textHash)
        .eq('dealer_id', dealerId)
        .eq('config_version', configVersion)
        .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString()) // 24 hour cache
        .single()

      if (error || !data) return null

      return data as CachedAIResult
    } catch (error) {
      console.error('❌ Cache lookup failed:', error)
      return null
    }
  }

  private async cacheResult(textHash: string, dealerId: string, configVersion: string, result: AIExtractionResponse): Promise<void> {
    try {
      await this.supabaseClient
        .from('ai_extraction_cache')
        .upsert({
          text_hash: textHash,
          dealer_id: dealerId,
          config_version: configVersion,
          result: result,
          created_at: new Date().toISOString(),
          hit_count: 0,
          success_rate: result.confidence
        })
    } catch (error) {
      console.error('❌ Failed to cache AI result:', error)
    }
  }

  private calculateAICost(tokens: number, model: string): number {
    // Cost per 1K tokens (approximate OpenAI pricing)
    const costPer1K: Record<string, number> = {
      'gpt-4-turbo-preview': 0.01,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.0015,
      'gpt-3.5-turbo-16k': 0.003
    }
    
    const rate = costPer1K[model] || costPer1K['gpt-3.5-turbo']
    return (tokens / 1000) * rate
  }

  private async checkBudgetConstraints(dealerId: string): Promise<void> {
    const dailyUsage = this.budgetTracker.get(dealerId) || 0
    
    // Check against reasonable daily limit (10x per-PDF limit)
    const dailyLimit = 1.0 // $1 per day per dealer
    
    if (dailyUsage >= dailyLimit) {
      throw new Error(`Daily AI budget exceeded for dealer ${dealerId}: $${dailyUsage.toFixed(4)}`)
    }
  }

  private updateBudgetTracking(dealerId: string, cost: number): void {
    const currentUsage = this.budgetTracker.get(dealerId) || 0
    this.budgetTracker.set(dealerId, currentUsage + cost)
  }

  private async updateCacheHitCount(textHash: string): Promise<void> {
    try {
      await this.supabaseClient
        .rpc('increment_cache_hit_count', { text_hash: textHash })
    } catch (error) {
      console.error('❌ Failed to update cache hit count:', error)
    }
  }

  private getCacheAge(createdAt: string): number {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000)
  }

  private getExampleRelevance(example: AIExample): number {
    // Simple relevance scoring - could be enhanced with ML
    return example.description ? 1.0 : 0.5
  }

  private vehiclesMatch(vehicle1: ExtractedVehicle, vehicle2: ExtractedVehicle): boolean {
    return vehicle1.model.toLowerCase() === vehicle2.model.toLowerCase() &&
           vehicle1.variant.toLowerCase() === vehicle2.variant.toLowerCase()
  }

  private splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    const lines = text.split('\n')
    let currentChunk = ''
    
    for (const line of lines) {
      if (currentChunk.length + line.length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = ''
        }
      }
      currentChunk += line + '\n'
    }
    
    if (currentChunk) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }

  private deduplicateVehicles(vehicles: ExtractedVehicle[]): ExtractedVehicle[] {
    const seen = new Set<string>()
    return vehicles.filter(vehicle => {
      const key = `${vehicle.model}-${vehicle.variant}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private safeParseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const parsed = Number(value)
    return isNaN(parsed) ? undefined : parsed
  }

  private async initializeOptimization(): Promise<void> {
    // Initialize optimization data from database
    try {
      const { data, error } = await this.supabaseClient
        .from('ai_optimization_metrics')
        .select('*')
        .order('last_optimized_at', { ascending: false })

      if (!error && data) {
        for (const metric of data) {
          this.optimizationMetrics.set(metric.dealer_id, metric)
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize optimization data:', error)
    }
  }

  private async updateOptimizationMetrics(
    dealerId: string,
    response: AIExtractionResponse,
    mode: string
  ): Promise<void> {
    const dataPoint: PerformanceDataPoint = {
      timestamp: new Date().toISOString(),
      confidence: response.confidence,
      cost: response.cost,
      extractionSuccess: response.vehicles.length > 0
    }

    const existing = this.optimizationMetrics.get(dealerId)
    if (existing) {
      existing.performanceHistory.push(dataPoint)
      // Keep only last 100 data points
      if (existing.performanceHistory.length > 100) {
        existing.performanceHistory = existing.performanceHistory.slice(-100)
      }
    }
  }

  private async learnFromExtraction(
    dealerId: string,
    text: string,
    response: AIExtractionResponse
  ): Promise<void> {
    // Create learning example from successful extraction
    const example: AIExample = {
      input: text.substring(0, 500), // First 500 chars as example
      output: response.vehicles.slice(0, 2), // First 2 vehicles as example
      description: `Successful extraction with ${response.confidence.toFixed(2)} confidence`
    }

    const existing = this.learningData.get(dealerId) || []
    existing.push(example)
    
    // Keep only best 10 examples per dealer
    if (existing.length > 10) {
      existing.sort((a, b) => this.getExampleRelevance(b) - this.getExampleRelevance(a))
      this.learningData.set(dealerId, existing.slice(0, 10))
    } else {
      this.learningData.set(dealerId, existing)
    }
  }
}

/*
 * AIExtractionEngine
 * 
 * Advanced AI-powered vehicle data extraction with intelligent optimization.
 * 
 * Key Features:
 * - Dealer-specific prompt generation with learned examples
 * - Multi-model selection based on complexity and cost
 * - Intelligent fallback strategies for reliability
 * - Result caching by text hash to minimize AI costs
 * - Confidence-based validation and post-processing
 * - Budget tracking and cost optimization
 * - Learning from successful extractions
 * - Performance monitoring and optimization
 * 
 * Usage:
 * const engine = new AIExtractionEngine(supabaseClient, apiKey)
 * const result = await engine.extractVehicleData({
 *   text: pdfText,
 *   dealerConfig: config,
 *   mode: 'full'
 * })
 */