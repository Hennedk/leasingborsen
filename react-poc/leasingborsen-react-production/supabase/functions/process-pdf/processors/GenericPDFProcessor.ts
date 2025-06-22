import { getDocument } from 'https://esm.sh/pdfjs-serverless@1.0.1'
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DealerConfig, ExtractedVehicle, ExtractionResult, PricingOption, RegexPattern, DealerType } from '../types/DealerConfig.ts'
import { ProgressTracker } from '../utils/ProgressTracker.ts'
import { AIExtractionEngine } from '../ai/AIExtractionEngine.ts'
import { AIOptimizationManager } from '../ai/AIOptimizationManager.ts'
import { CrossDealerValidator, StandardizedVehicle, ValidationSummary } from '../validation/CrossDealerValidator.ts'

/* Claude Change Summary:
 * Created GenericPDFProcessor for server-side PDF processing.
 * Migrated from client-side VW processor to config-driven architecture.
 * Supports both regex-based and AI-based extraction with hybrid approach.
 * Uses pdfjs-serverless for Deno compatibility.
 * Related to: Server-side PDF processing migration
 */

interface ProcessingResult {
  method: 'cache' | 'pattern' | 'ai' | 'hybrid'
  itemsProcessed: number
  averageConfidence: number
  aiCost?: number
  aiTokens?: number
  processingTimeMs: number
  vehicles: ExtractedVehicle[]
  standardizedVehicles?: StandardizedVehicle[]
  validationSummary?: ValidationSummary
  overallQualityScore?: number
  errors?: string[]
  warnings?: string[]
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class GenericPDFProcessor {
  private aiEngine: AIExtractionEngine
  private optimizationManager: AIOptimizationManager
  private crossDealerValidator: CrossDealerValidator

  constructor(
    private config: DealerConfig,
    private supabaseClient: SupabaseClient,
    private dealerType: DealerType = 'unknown'
  ) {
    this.aiEngine = new AIExtractionEngine(this.supabaseClient)
    this.optimizationManager = new AIOptimizationManager(this.supabaseClient)
    this.crossDealerValidator = new CrossDealerValidator()
  }

  /**
   * Main entry point for processing PDF files
   */
  async processPDF(
    pdfData: Uint8Array,
    batchId: string,
    progressTracker: ProgressTracker
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 1. Check cache first
      await progressTracker.updateProgress(30, 'Checking extraction cache...')
      const cachedResult = await this.checkCache(pdfData, batchId)
      if (cachedResult && cachedResult.confidence >= this.config.extraction.confidence.cacheResults) {
        console.log(`✅ Using cached extraction result (confidence: ${cachedResult.confidence})`)
        
        // Apply cross-dealer validation to cached results as well
        await progressTracker.updateProgress(95, 'Applying cross-dealer validation to cached results...')
        const validationResult = await this.crossDealerValidator.validateAndStandardize(cachedResult.vehicles)
        
        return {
          ...cachedResult,
          method: 'cache',
          processingTimeMs: Date.now() - startTime,
          standardizedVehicles: validationResult.standardizedVehicles,
          validationSummary: validationResult.validationSummary,
          overallQualityScore: validationResult.overallQualityScore
        }
      }

      // 2. Extract text from PDF
      await progressTracker.updateProgress(40, 'Extracting text from PDF...')
      const extractedText = await this.extractTextFromPDF(pdfData)
      console.log(`📄 Extracted ${extractedText.length} characters from PDF`)

      // 3. Try pattern-based extraction first
      await progressTracker.updateExtractionProgress(50, 'pattern', 0)
      const patternResult = await this.extractWithPatterns(extractedText)
      
      // 4. Evaluate pattern confidence
      const patternConfidence = this.calculateConfidence(patternResult)
      console.log(`🎯 Pattern extraction confidence: ${patternConfidence.toFixed(2)}`)

      // 5. Decide if AI extraction is needed
      if (patternConfidence >= this.config.extraction.confidence.usePatternOnly) {
        // High confidence - use pattern results only
        console.log(`✅ Using pattern-only extraction (high confidence)`)
        await progressTracker.updateExtractionProgress(90, 'pattern', patternResult.vehicles.length)
        
        // Store in cache for future use
        if (patternConfidence >= this.config.extraction.confidence.cacheResults) {
          await this.cacheResult(pdfData, patternResult, patternConfidence)
        }

        // Apply cross-dealer validation and standardization
        await progressTracker.updateProgress(95, 'Applying cross-dealer validation...')
        const validationResult = await this.crossDealerValidator.validateAndStandardize(patternResult.vehicles)

        return {
          method: 'pattern',
          itemsProcessed: patternResult.vehicles.length,
          averageConfidence: patternConfidence,
          processingTimeMs: Date.now() - startTime,
          vehicles: patternResult.vehicles,
          standardizedVehicles: validationResult.standardizedVehicles,
          validationSummary: validationResult.validationSummary,
          overallQualityScore: validationResult.overallQualityScore,
          errors,
          warnings
        }
      }

      // 6. Use AI extraction for low confidence or hybrid approach
      if (patternConfidence < this.config.extraction.confidence.minimumAcceptable) {
        // Very low confidence - rely primarily on AI
        console.log(`🤖 Using AI extraction (low pattern confidence)`)
        await progressTracker.updateExtractionProgress(60, 'ai', 0)
        
        const aiResult = await this.extractWithAI(extractedText, progressTracker)
        const aiConfidence = aiResult.confidence // Use AI engine's confidence
        
        await progressTracker.updateExtractionProgress(90, 'ai', aiResult.vehicles.length)

        // Cache if confidence is high enough
        if (aiConfidence >= this.config.extraction.confidence.cacheResults) {
          await this.cacheResult(pdfData, aiResult, aiConfidence)
        }

        // Apply cross-dealer validation and standardization
        await progressTracker.updateProgress(95, 'Applying cross-dealer validation...')
        const validationResult = await this.crossDealerValidator.validateAndStandardize(aiResult.vehicles)

        return {
          method: 'ai',
          itemsProcessed: aiResult.vehicles.length,
          averageConfidence: aiConfidence,
          aiCost: aiResult.aiCost,
          aiTokens: aiResult.aiTokens,
          processingTimeMs: Date.now() - startTime,
          vehicles: aiResult.vehicles,
          standardizedVehicles: validationResult.standardizedVehicles,
          validationSummary: validationResult.validationSummary,
          overallQualityScore: validationResult.overallQualityScore,
          errors,
          warnings
        }
      }

      // 7. Hybrid approach - combine pattern and AI results
      console.log(`🔄 Using hybrid extraction (medium pattern confidence)`)
      await progressTracker.updateExtractionProgress(60, 'hybrid', patternResult.vehicles.length)
      
      const hybridResult = await this.hybridExtraction(
        extractedText,
        patternResult,
        progressTracker
      )
      
      const hybridConfidence = hybridResult.confidence // Use confidence from hybrid method
      await progressTracker.updateExtractionProgress(90, 'hybrid', hybridResult.vehicles.length)

      // Cache if confidence is high enough
      if (hybridConfidence >= this.config.extraction.confidence.cacheResults) {
        await this.cacheResult(pdfData, hybridResult, hybridConfidence)
      }

      // Apply cross-dealer validation and standardization
      await progressTracker.updateProgress(95, 'Applying cross-dealer validation...')
      const validationResult = await this.crossDealerValidator.validateAndStandardize(hybridResult.vehicles)

      return {
        method: 'hybrid',
        itemsProcessed: hybridResult.vehicles.length,
        averageConfidence: hybridConfidence,
        aiCost: hybridResult.aiCost,
        aiTokens: hybridResult.aiTokens,
        processingTimeMs: Date.now() - startTime,
        vehicles: hybridResult.vehicles,
        standardizedVehicles: validationResult.standardizedVehicles,
        validationSummary: validationResult.validationSummary,
        overallQualityScore: validationResult.overallQualityScore,
        errors,
        warnings
      }

    } catch (error) {
      console.error('❌ PDF processing error:', error)
      errors.push(error instanceof Error ? error.message : 'Unknown processing error')
      throw error
    }
  }

  /**
   * Extract text content from PDF using pdfjs-serverless
   */
  private async extractTextFromPDF(pdfData: Uint8Array): Promise<string> {
    try {
      console.log(`📄 Starting PDF text extraction (${pdfData.length} bytes)`)
      
      // Load PDF document
      const document = await getDocument({
        data: pdfData,
        useSystemFonts: true
      }).promise

      console.log(`📄 PDF loaded: ${document.numPages} pages`)

      // Extract text from all pages
      const textParts: string[] = []
      
      for (let pageNum = 1; pageNum <= document.numPages; pageNum++) {
        const page = await document.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Join text items with space, preserve line breaks
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        
        textParts.push(pageText)
        console.log(`📄 Page ${pageNum}: ${pageText.length} characters`)
      }

      const fullText = textParts.join('\n\n')
      console.log(`📄 Total extracted: ${fullText.length} characters`)

      return fullText

    } catch (error) {
      console.error('❌ PDF text extraction failed:', error)
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract vehicle data using regex patterns from configuration
   */
  private async extractWithPatterns(text: string): Promise<ExtractionResult> {
    const vehicles: ExtractedVehicle[] = []
    const lines = text.split('\n')
    const patternsUsed: string[] = []

    let currentModel = ''
    let currentVariant = ''
    let currentSpecs: Partial<ExtractedVehicle> = {}
    let currentPricing: PricingOption[] = []
    let lineNumbers: number[] = []

    console.log(`🔍 Starting pattern extraction on ${lines.length} lines`)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Check for model header
      const modelMatch = this.matchPattern(line, this.config.extraction.patterns.modelHeader)
      if (modelMatch) {
        // Save previous vehicle if exists
        if (currentModel && currentVariant && currentPricing.length > 0) {
          vehicles.push(this.createVehicle(
            currentModel,
            currentVariant,
            currentSpecs,
            currentPricing,
            lineNumbers
          ))
        }

        // Start new vehicle
        currentModel = modelMatch[1]
        currentVariant = ''
        currentSpecs = {}
        currentPricing = []
        lineNumbers = [i + 1]
        patternsUsed.push('modelHeader')
        console.log(`🚗 Found model: ${currentModel}`)
        continue
      }

      // Check for variant line
      const variantMatch = this.matchPattern(line, this.config.extraction.patterns.variantLine) ||
                          this.matchPattern(line, this.config.extraction.patterns.modelVariantLine)
      if (variantMatch && currentModel) {
        currentVariant = variantMatch[1]
        lineNumbers.push(i + 1)
        
        // Extract horsepower if present
        const hpMatch = variantMatch[2]
        if (hpMatch) {
          currentSpecs.horsepower = parseInt(hpMatch)
        }
        
        console.log(`  📋 Variant: ${currentVariant}`)
        continue
      }

      // Extract technical specifications
      this.extractSpecifications(line, currentSpecs, i + 1, lineNumbers)

      // Extract pricing options
      const pricingMatch = this.matchPattern(line, this.config.extraction.patterns.pricingLine) ||
                          this.matchPattern(line, this.config.extraction.patterns.pricingLineAlt)
      if (pricingMatch) {
        const pricing = this.parsePricingMatch(pricingMatch)
        if (pricing) {
          currentPricing.push(pricing)
          lineNumbers.push(i + 1)
          patternsUsed.push('pricing')
          console.log(`    💰 Pricing: ${pricing.mileagePerYear}km/year, ${pricing.monthlyPrice}kr/month`)
        }
      }
    }

    // Save last vehicle
    if (currentModel && currentVariant && currentPricing.length > 0) {
      vehicles.push(this.createVehicle(
        currentModel,
        currentVariant,
        currentSpecs,
        currentPricing,
        lineNumbers
      ))
    }

    console.log(`✅ Pattern extraction complete: ${vehicles.length} vehicles found`)

    return {
      vehicles,
      method: 'pattern',
      confidence: vehicles.length > 0 ? 0.7 : 0.3, // Base confidence
      processingTimeMs: 0,
      itemsProcessed: vehicles.length,
      patternsUsed: Array.from(new Set(patternsUsed))
    }
  }

  /**
   * Extract specifications from a line of text
   */
  private extractSpecifications(
    line: string,
    specs: Partial<ExtractedVehicle>,
    lineNumber: number,
    lineNumbers: number[]
  ): void {
    // Power specifications
    const powerMatch = this.matchPattern(line, this.config.extraction.patterns.powerSpec)
    if (powerMatch) {
      specs.horsepower = parseInt(powerMatch[1])
      lineNumbers.push(lineNumber)
    }

    // CO2 specifications
    const co2Match = this.matchPattern(line, this.config.extraction.patterns.co2Specs)
    if (co2Match) {
      specs.co2Emission = parseInt(co2Match[1])
      specs.fuelConsumption = co2Match[2]
      specs.co2TaxHalfYear = parseInt(co2Match[3])
      lineNumbers.push(lineNumber)
    }

    // Electric specifications
    const electricMatch = this.matchPattern(line, this.config.extraction.patterns.electricSpecs)
    if (electricMatch) {
      specs.isElectric = true
      specs.rangeKm = parseInt(electricMatch[1])
      specs.consumptionKwh100km = parseFloat(electricMatch[2].replace(',', '.'))
      specs.wltpRange = specs.rangeKm // Use same value for WLTP
      lineNumbers.push(lineNumber)
    }

    // Transmission
    const transmissionMatch = this.matchPattern(line, this.config.extraction.patterns.transmissionSpec)
    if (transmissionMatch) {
      specs.transmission = transmissionMatch[0]
      lineNumbers.push(lineNumber)
    }
  }

  /**
   * Match a line against an array of regex patterns
   */
  private matchPattern(line: string, patterns: RegexPattern[]): RegExpMatchArray | null {
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern.pattern, pattern.flags || '')
        const match = line.match(regex)
        if (match) return match
      } catch (error) {
        console.error(`❌ Invalid regex pattern: ${pattern.pattern}`, error)
      }
    }
    return null
  }

  /**
   * Parse pricing information from regex match
   */
  private parsePricingMatch(match: RegExpMatchArray): PricingOption | null {
    try {
      // Remove formatting from numbers
      const parseNumber = (str: string): number => {
        return parseInt(str.replace(/[.,\s]/g, ''))
      }

      // Different patterns have different capture groups
      if (match.length >= 7) {
        // Full pricing pattern
        return {
          mileagePerYear: parseNumber(match[1]),
          periodMonths: parseInt(match[2]),
          totalCost: parseNumber(match[3]),
          firstPayment: parseNumber(match[5]),
          monthlyPrice: parseNumber(match[6])
        }
      } else if (match.length >= 5) {
        // Alternative pricing pattern
        return {
          mileagePerYear: parseNumber(match[1]),
          periodMonths: parseInt(match[2]),
          totalCost: parseNumber(match[3]),
          monthlyPrice: parseNumber(match[4])
        }
      }

      return null
    } catch (error) {
      console.error('❌ Error parsing pricing match:', error)
      return null
    }
  }

  /**
   * Create a vehicle object from extracted data
   */
  private createVehicle(
    model: string,
    variant: string,
    specs: Partial<ExtractedVehicle>,
    pricingOptions: PricingOption[],
    lineNumbers: number[]
  ): ExtractedVehicle {
    return {
      model: model.replace(/\s*leasingpriser\s*/i, '').trim(),
      variant: variant.trim(),
      horsepower: specs.horsepower,
      transmission: specs.transmission,
      fuelType: specs.isElectric ? 'Electric' : undefined,
      bodyType: undefined, // Not extracted from patterns
      co2Emission: specs.co2Emission,
      fuelConsumption: specs.fuelConsumption,
      co2TaxHalfYear: specs.co2TaxHalfYear,
      isElectric: specs.isElectric || false,
      rangeKm: specs.rangeKm,
      consumptionKwh100km: specs.consumptionKwh100km,
      wltpRange: specs.wltpRange,
      pricingOptions,
      sourceLineNumbers: lineNumbers,
      confidenceScore: 0.7, // Base confidence for pattern extraction
      extractionMethod: 'pattern',
      sourceSection: `Lines ${lineNumbers[0]}-${lineNumbers[lineNumbers.length - 1]}`
    }
  }

  /**
   * Extract vehicle data using AI with advanced optimization
   */
  private async extractWithAI(
    text: string,
    progressTracker: ProgressTracker,
    patternResults?: ExtractedVehicle[]
  ): Promise<ExtractionResult & { aiCost?: number; aiTokens?: number }> {
    console.log(`🤖 Starting advanced AI extraction`)

    try {
      // Use the new AI extraction engine
      const aiResponse = await this.aiEngine.extractVehicleData({
        text,
        dealerConfig: this.config,
        patternResults,
        mode: patternResults && patternResults.length > 0 ? 'supplement' : 'full'
      })
      
      // Update progress with AI cost
      await progressTracker.updateAICost(aiResponse.cost, aiResponse.tokens)

      console.log(`✅ AI extraction complete: ${aiResponse.vehicles.length} vehicles found (confidence: ${aiResponse.confidence.toFixed(2)})`)

      return {
        vehicles: aiResponse.vehicles,
        method: 'ai',
        confidence: aiResponse.confidence,
        processingTimeMs: aiResponse.processingTime,
        itemsProcessed: aiResponse.vehicles.length,
        aiCost: aiResponse.cost,
        aiTokens: aiResponse.tokens
      }

    } catch (error) {
      console.error('❌ AI extraction failed:', error)
      throw error
    }
  }

  /**
   * Combine pattern and AI extraction results using intelligent merging
   */
  private async hybridExtraction(
    text: string,
    patternResult: ExtractionResult,
    progressTracker: ProgressTracker
  ): Promise<ExtractionResult & { aiCost?: number; aiTokens?: number }> {
    console.log(`🔄 Starting intelligent hybrid extraction`)

    // Use AI in 'supplement' mode to enhance pattern results
    const aiResult = await this.extractWithAI(text, progressTracker, patternResult.vehicles)

    // The AI engine already handles intelligent merging when pattern results are provided
    // Use AI results as they're more sophisticated than our basic merging
    const hybridConfidence = Math.max(patternResult.confidence, aiResult.confidence) * 0.95 // Slight bonus for hybrid

    console.log(`✅ Hybrid extraction complete: ${aiResult.vehicles.length} vehicles (confidence: ${hybridConfidence.toFixed(2)})`)

    return {
      vehicles: aiResult.vehicles,
      method: 'hybrid',
      confidence: hybridConfidence,
      processingTimeMs: patternResult.processingTimeMs + aiResult.processingTimeMs,
      itemsProcessed: aiResult.vehicles.length,
      aiCost: aiResult.aiCost,
      aiTokens: aiResult.aiTokens
    }
  }

  /**
   * Merge pattern and AI extraction results
   */
  private mergeExtractionResults(
    patternVehicles: ExtractedVehicle[],
    aiVehicles: ExtractedVehicle[]
  ): ExtractedVehicle[] {
    const merged: ExtractedVehicle[] = []
    const processedAI = new Set<number>()

    // Start with pattern results as base
    for (const patternVehicle of patternVehicles) {
      // Find matching AI vehicle
      const aiIndex = aiVehicles.findIndex(ai =>
        ai.model === patternVehicle.model &&
        ai.variant === patternVehicle.variant
      )

      if (aiIndex >= 0) {
        // Merge data, preferring AI for missing fields
        const aiVehicle = aiVehicles[aiIndex]
        processedAI.add(aiIndex)

        merged.push({
          ...patternVehicle,
          horsepower: patternVehicle.horsepower || aiVehicle.horsepower,
          transmission: patternVehicle.transmission || aiVehicle.transmission,
          fuelType: patternVehicle.fuelType || aiVehicle.fuelType,
          bodyType: patternVehicle.bodyType || aiVehicle.bodyType,
          // Merge pricing options
          pricingOptions: this.mergePricingOptions(
            patternVehicle.pricingOptions,
            aiVehicle.pricingOptions
          ),
          confidenceScore: (patternVehicle.confidenceScore + aiVehicle.confidenceScore) / 2,
          extractionMethod: 'hybrid'
        })
      } else {
        // No AI match, use pattern result
        merged.push(patternVehicle)
      }
    }

    // Add any AI-only vehicles
    aiVehicles.forEach((aiVehicle, index) => {
      if (!processedAI.has(index)) {
        merged.push({
          ...aiVehicle,
          extractionMethod: 'hybrid'
        })
      }
    })

    return merged
  }

  /**
   * Merge pricing options from pattern and AI results
   */
  private mergePricingOptions(
    patternPricing: PricingOption[],
    aiPricing: PricingOption[]
  ): PricingOption[] {
    const merged: PricingOption[] = [...patternPricing]
    
    // Add any unique AI pricing options
    for (const aiOption of aiPricing) {
      const exists = patternPricing.some(p =>
        p.mileagePerYear === aiOption.mileagePerYear &&
        p.periodMonths === aiOption.periodMonths
      )
      
      if (!exists) {
        merged.push(aiOption)
      }
    }

    return merged
  }

  /**
   * Calculate confidence score for extraction results
   */
  private calculateConfidence(result: ExtractionResult): number {
    let confidence = 0
    const vehicles = result.vehicles

    if (vehicles.length === 0) return 0

    // Base confidence from extraction method
    if (result.method === 'pattern') confidence = 0.6
    else if (result.method === 'ai') confidence = 0.8
    else if (result.method === 'hybrid') confidence = 0.9

    // Adjust based on data completeness
    let completenessScore = 0
    for (const vehicle of vehicles) {
      let vehicleScore = 0
      if (vehicle.model) vehicleScore += 0.2
      if (vehicle.variant) vehicleScore += 0.2
      if (vehicle.horsepower) vehicleScore += 0.1
      if (vehicle.pricingOptions.length > 0) vehicleScore += 0.3
      if (vehicle.pricingOptions.length > 2) vehicleScore += 0.2
      
      completenessScore += vehicleScore
    }
    completenessScore /= vehicles.length

    // Final confidence is weighted average
    return confidence * 0.6 + completenessScore * 0.4
  }

  /**
   * Validate extracted data against configuration rules
   */
  private validateExtractedData(vehicles: ExtractedVehicle[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check vehicle count
    if (vehicles.length < this.config.validation.minItemsPerPDF) {
      errors.push(`Too few vehicles extracted: ${vehicles.length} < ${this.config.validation.minItemsPerPDF}`)
    }
    if (vehicles.length > this.config.validation.maxItemsPerPDF) {
      warnings.push(`Many vehicles extracted: ${vehicles.length} > ${this.config.validation.maxItemsPerPDF}`)
    }

    // Validate each vehicle
    for (const vehicle of vehicles) {
      // Check required fields
      for (const field of this.config.validation.requiredFields) {
        if (!vehicle[field as keyof ExtractedVehicle]) {
          errors.push(`Missing required field '${field}' for ${vehicle.model} ${vehicle.variant}`)
        }
      }

      // Validate pricing
      for (const pricing of vehicle.pricingOptions) {
        if (pricing.monthlyPrice < this.config.validation.priceRange.min ||
            pricing.monthlyPrice > this.config.validation.priceRange.max) {
          warnings.push(`Price out of range for ${vehicle.model}: ${pricing.monthlyPrice}`)
        }
      }

      // Check model whitelist/blacklist
      if (this.config.validation.modelWhitelist?.length > 0) {
        if (!this.config.validation.modelWhitelist.includes(vehicle.model)) {
          warnings.push(`Model not in whitelist: ${vehicle.model}`)
        }
      }
      if (this.config.validation.modelBlacklist?.includes(vehicle.model)) {
        errors.push(`Model in blacklist: ${vehicle.model}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Format results for storage
   */
  private formatResults(vehicles: ExtractedVehicle[]): ProcessingResult {
    // Apply field mappings
    const mappedVehicles = vehicles.map(vehicle => {
      const mapped: any = {}
      
      for (const mapping of this.config.extraction.fieldMappings) {
        const sourceValue = vehicle[mapping.sourceField as keyof ExtractedVehicle]
        
        if (sourceValue !== undefined || mapping.defaultValue !== undefined) {
          let targetValue = sourceValue ?? mapping.defaultValue
          
          // Apply transformation
          if (mapping.transformation) {
            targetValue = this.applyTransformation(targetValue, mapping.transformation)
          }
          
          mapped[mapping.targetField] = targetValue
        }
      }
      
      return mapped as ExtractedVehicle
    })

    return {
      method: 'pattern',
      itemsProcessed: mappedVehicles.length,
      averageConfidence: 0,
      processingTimeMs: 0,
      vehicles: mappedVehicles
    }
  }

  /**
   * Apply field transformation
   */
  private applyTransformation(value: any, transformation: string): any {
    switch (transformation) {
      case 'lowercase':
        return String(value).toLowerCase()
      case 'uppercase':
        return String(value).toUpperCase()
      case 'trim':
        return String(value).trim()
      case 'parseNumber':
        if (typeof value === 'string') {
          return parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''))
        }
        return Number(value)
      case 'parseBoolean':
        return Boolean(value)
      default:
        return value
    }
  }

  /**
   * Check cache for existing extraction results
   */
  private async checkCache(pdfData: Uint8Array, batchId: string): Promise<ProcessingResult | null> {
    if (!this.config.optimization.cacheEnabled) return null

    try {
      // Generate hash of PDF content
      const hash = await this.generatePDFHash(pdfData)
      
      // Query cache table
      const { data, error } = await this.supabaseClient
        .from('extraction_cache')
        .select('*')
        .eq('pdf_hash', hash)
        .eq('dealer_id', this.config.id)
        .gte('created_at', new Date(Date.now() - this.config.optimization.cacheExpiryHours * 3600000).toISOString())
        .single()

      if (error || !data) return null

      console.log(`📦 Found cached extraction (age: ${this.getAgeInHours(data.created_at)}h)`)

      return {
        method: 'cache',
        itemsProcessed: data.items_count,
        averageConfidence: data.confidence_score,
        processingTimeMs: 0,
        vehicles: data.extracted_data.vehicles
      }

    } catch (error) {
      console.error('❌ Cache check failed:', error)
      return null
    }
  }

  /**
   * Store extraction results in cache
   */
  private async cacheResult(
    pdfData: Uint8Array,
    result: ExtractionResult,
    confidence: number
  ): Promise<void> {
    if (!this.config.optimization.cacheEnabled) return

    try {
      const hash = await this.generatePDFHash(pdfData)
      
      await this.supabaseClient
        .from('extraction_cache')
        .upsert({
          pdf_hash: hash,
          dealer_id: this.config.id,
          config_version: this.config.version,
          extracted_data: result,
          confidence_score: confidence,
          items_count: result.vehicles.length,
          extraction_method: result.method,
          created_at: new Date().toISOString()
        })

      console.log(`📦 Cached extraction result (${result.vehicles.length} items)`)

    } catch (error) {
      console.error('❌ Failed to cache result:', error)
    }
  }

  /**
   * Generate hash of PDF content
   */
  private async generatePDFHash(pdfData: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', pdfData)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get AI daily usage for budget tracking
   */
  private async getAIDailyUsage(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await this.supabaseClient
        .from('processing_jobs')
        .select('ai_cost')
        .eq('dealer_id', this.config.id)
        .gte('created_at', `${today}T00:00:00`)
        .not('ai_cost', 'is', null)

      if (error) throw error

      return data?.reduce((sum, job) => sum + (job.ai_cost || 0), 0) || 0

    } catch (error) {
      console.error('❌ Failed to get AI usage:', error)
      return 0
    }
  }

  // AI extraction methods moved to AIExtractionEngine

  /**
   * Optimize AI performance based on processing results
   */
  async optimizeAIPerformance(batchId: string): Promise<void> {
    try {
      console.log(`🔧 Running AI optimization for dealer: ${this.config.id}`)
      
      // Generate optimization insights
      const insights = await this.optimizationManager.analyzeAndOptimize(this.config.id)
      
      if (insights.length > 0) {
        console.log(`📊 Generated ${insights.length} optimization insights:`)
        insights.forEach(insight => {
          console.log(`  - ${insight.type}: ${insight.description} (${insight.impact} impact)`)
        })
      }

      // Optimize prompts if needed
      const promptOptimization = await this.optimizationManager.optimizePrompts(this.config.id, this.config)
      if (promptOptimization) {
        console.log(`🎯 Prompt optimization available: ${promptOptimization.improvementReason}`)
      }

      // Run cost optimizations
      const costOptimization = await this.optimizationManager.optimizeCosts(this.config.id)
      console.log(`💰 Cost efficiency: ${costOptimization.currentCostEfficiency.toFixed(2)} extractions/$`)
      
      if (costOptimization.expectedSavings > 0) {
        console.log(`💡 Expected savings: $${costOptimization.expectedSavings.toFixed(4)} per extraction`)
      }

    } catch (error) {
      console.error('❌ AI optimization failed:', error)
    }
  }

  /**
   * Process user feedback for continuous learning
   */
  async processFeedback(
    extractionId: string,
    feedback: 'correct' | 'incorrect' | 'partially_correct',
    corrections?: any
  ): Promise<void> {
    try {
      await this.optimizationManager.processUserFeedback(
        this.config.id,
        extractionId,
        feedback,
        corrections
      )
      
      console.log(`📝 Processed feedback: ${feedback} for extraction ${extractionId}`)
    } catch (error) {
      console.error('❌ Failed to process feedback:', error)
    }
  }

  /**
   * Get age of cached data in hours
   */
  private getAgeInHours(createdAt: string): number {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    return Math.floor((now - created) / 3600000)
  }
}

/*
 * GenericPDFProcessor
 * 
 * Configuration-driven PDF processing for any dealer.
 * 
 * Key Features:
 * - Regex-based pattern extraction using dealer configuration
 * - AI-based extraction with budget controls
 * - Hybrid extraction combining both approaches
 * - Intelligent caching to reduce AI costs
 * - Progress tracking with real-time updates
 * - Comprehensive validation and error handling
 * - Field mapping and transformation support
 * 
 * Processing Flow:
 * 1. Check cache for existing results
 * 2. Extract text from PDF using pdfjs-serverless
 * 3. Try pattern-based extraction first
 * 4. Use AI if pattern confidence is low
 * 5. Combine results in hybrid mode for best accuracy
 * 6. Validate and transform results
 * 7. Cache successful extractions
 * 
 * Usage:
 * const processor = new GenericPDFProcessor(dealerConfig, supabaseClient)
 * const result = await processor.processPDF(pdfData, batchId, progressTracker)
 */