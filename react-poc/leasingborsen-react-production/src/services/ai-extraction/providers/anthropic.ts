import Anthropic from '@anthropic-ai/sdk'

import { BaseAIProvider } from './base'
import type { ExtractionResult, ExtractOptions, ExtractedCarData } from '../types'
import { config } from '../config'

/**
 * Anthropic provider for extracting structured data from Danish car leasing documents
 * Uses Claude-3 with specialized prompts for Danish text and car leasing terminology
 */
export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic'
  readonly modelVersion: string
  private client: Anthropic | null = null
  private readonly apiKey: string

  constructor() {
    super()
    this.apiKey = config.anthropicApiKey || ''
    this.modelVersion = config.anthropicModel || 'claude-3-opus-20240229'
  }

  /**
   * Initialize Anthropic client with API key validation
   */
  private async initializeClient(): Promise<Anthropic> {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error('Anthropic API key is not configured')
      }

      this.client = new Anthropic({
        apiKey: this.apiKey,
        timeout: config.getTimeoutMs(),
      })

      // Validate the API key by making a test request
      try {
        await this.client.messages.create({
          model: this.modelVersion,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      } catch (error: any) {
        this.client = null
        throw new Error(`Anthropic API key validation failed: ${error.message}`)
      }
    }

    return this.client
  }

  /**
   * Extract structured car data from leasing document text
   */
  async extract(content: string, options: ExtractOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now()
    let tokensUsed = 0
    let retryCount = 0

    try {
      // Validate input content
      const validation = this.validateContent(content)
      if (!validation.isValid) {
        return this.createResult(
          false,
          undefined,
          {
            type: 'validation',
            message: validation.errors.map(e => e.message).join('; '),
            details: validation.errors,
            retryable: false
          }
        )
      }

      // Initialize Anthropic client
      const client = await this.initializeClient()

      // Build the system prompt for Danish car leasing documents
      const systemPrompt = this.buildSystemPrompt(options)
      const userPrompt = this.buildUserPrompt(content, options)

      // Estimate tokens for cost validation
      const estimatedTokens = this.estimateTokens(systemPrompt + userPrompt)
      const estimatedCostCents = this.calculateCost(estimatedTokens)

      if (estimatedCostCents > config.maxCostPerPdfCents) {
        return this.createResult(
          false,
          undefined,
          {
            type: 'cost_limit',
            message: `Estimated cost (${estimatedCostCents}¢) exceeds limit (${config.maxCostPerPdfCents}¢)`,
            details: { estimatedTokens, estimatedCostCents },
            retryable: false
          }
        )
      }

      // Make API request with retry logic
      const maxRetries = options.maxRetries ?? config.extractionMaxRetries
      let lastError: any = null

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await client.messages.create({
            model: this.modelVersion,
            max_tokens: 4000,
            temperature: 0.1,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt }
            ]
          })

          // Extract tokens and cost information
          tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0
          const actualCostCents = this.calculateCost(tokensUsed)
          retryCount = attempt

          // Parse and validate the response
          const responseText = response.content[0]?.type === 'text' ? response.content[0].text : ''
          const extractedData = this.parseResponse(responseText)
          const dataValidation = this.validateExtractedData(extractedData)

          if (!dataValidation.isValid) {
            // If this is our last attempt, return the validation error
            if (attempt === maxRetries) {
              return this.createResult(
                false,
                undefined,
                {
                  type: 'parsing',
                  message: 'Failed to extract valid structured data after all retries',
                  details: dataValidation.errors,
                  retryable: false
                },
                tokensUsed,
                actualCostCents,
                Date.now() - startTime,
                retryCount
              )
            }
            // Otherwise, continue to next attempt
            continue
          }

          // Add extraction metadata
          const finalData: ExtractedCarData = {
            ...extractedData,
            metadata: {
              ...extractedData.metadata,
              extractionTimestamp: new Date().toISOString(),
              extractionWarnings: dataValidation.warnings.length > 0 ? dataValidation.warnings : undefined
            }
          }

          return this.createResult(
            true,
            finalData,
            undefined,
            tokensUsed,
            actualCostCents,
            Date.now() - startTime,
            retryCount
          )

        } catch (error: any) {
          lastError = error
          retryCount = attempt

          // Check if this is a retryable error
          const mappedError = this.mapError(error, 'Anthropic API request')
          if (!mappedError.retryable || attempt === maxRetries) {
            const costCents = tokensUsed > 0 ? this.calculateCost(tokensUsed) : 0
            return this.createResult(
              false,
              undefined,
              mappedError,
              tokensUsed,
              costCents,
              Date.now() - startTime,
              retryCount
            )
          }

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
      }

      // If we get here, all retries failed
      const finalError = this.mapError(lastError, 'Anthropic API request after all retries')
      const costCents = tokensUsed > 0 ? this.calculateCost(tokensUsed) : 0

      return this.createResult(
        false,
        undefined,
        finalError,
        tokensUsed,
        costCents,
        Date.now() - startTime,
        retryCount
      )

    } catch (error: any) {
      const mappedError = this.mapError(error, 'Anthropic extraction')
      const costCents = tokensUsed > 0 ? this.calculateCost(tokensUsed) : 0

      return this.createResult(
        false,
        undefined,
        mappedError,
        tokensUsed,
        costCents,
        Date.now() - startTime,
        retryCount
      )
    }
  }

  /**
   * Calculate cost based on Claude-3 pricing
   * Current pricing: $0.015/1K input tokens, $0.075/1K output tokens
   */
  calculateCost(tokens: number): number {
    if (tokens <= 0) return 0

    // Conservative estimation: assume 70% input, 30% output tokens
    const inputTokens = Math.floor(tokens * 0.7)
    const outputTokens = Math.floor(tokens * 0.3)

    // Claude-3 pricing in USD per 1K tokens
    const inputCostPer1K = 0.015
    const outputCostPer1K = 0.075

    const inputCostUsd = (inputTokens / 1000) * inputCostPer1K
    const outputCostUsd = (outputTokens / 1000) * outputCostPer1K
    const totalCostUsd = inputCostUsd + outputCostUsd

    // Convert to cents and round up
    return Math.ceil(totalCostUsd * 100)
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const client = await this.initializeClient()
      await client.messages.create({
        model: this.modelVersion,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
      return true
    } catch (error) {
      console.error('Anthropic API key validation failed:', error)
      return false
    }
  }

  /**
   * Check if the Anthropic service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) return false
      
      const client = await this.initializeClient()
      
      // Make a minimal test request
      const response = await client.messages.create({
        model: this.modelVersion,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Test' }]
      })

      return response.content.length > 0
    } catch (error) {
      console.error('Anthropic availability check failed:', error)
      return false
    }
  }

  /**
   * Build system prompt for Danish car leasing document extraction
   */
  private buildSystemPrompt(_options: ExtractOptions): string {
    return `You are Claude, an expert AI assistant for extracting structured data from Danish car leasing documents.

Your task is to analyze leasing price documents and extract complete, accurate vehicle information in JSON format.

## Core Requirements:
1. Extract ALL vehicle variants with their complete specifications
2. Identify pricing information including monthly payments, down payments, and terms
3. Recognize Danish car terminology and brands correctly
4. Handle multi-variant documents (one model with multiple engine/trim options)
5. Parse Danish number formats (comma as decimal separator)
6. Identify lease terms, mileage limits, and additional costs

## Danish Car Terms to Recognize:
- "Privatleasing" = private leasing
- "Månedsydelse" = monthly payment  
- "Førstegangsydelse" = first payment/down payment
- "Kørsel per år" = annual mileage
- "Løbetid" = lease term/duration
- "Brandstoforbrug" = fuel consumption
- "CO2-udledning" = CO2 emissions
- "Motoreffekt" = engine power
- "Gearkasse" = transmission
- "Benzin" = gasoline, "Diesel" = diesel, "El" = electric, "Hybrid" = hybrid

## Output Format:
Return ONLY valid JSON matching this exact structure:

{
  "documentInfo": {
    "brand": "string (e.g., Toyota, Volkswagen)",
    "documentDate": "string (YYYY-MM-DD or extracted date)",
    "currency": "string (DKK, EUR, etc.)",
    "language": "da",
    "documentType": "private_leasing" | "business_leasing" | "price_list"
  },
  "vehicles": [
    {
      "model": "string (car model name)",
      "category": "string (optional: SUV, Sedan, etc.)",
      "leasePeriodMonths": number,
      "powertrainType": "gasoline" | "diesel" | "hybrid" | "electric" | "plugin_hybrid",
      "variants": [
        {
          "variantName": "string (trim/variant name)",
          "engineSpecification": "string (engine details)",
          "transmission": "manual" | "automatic" | "cvt",
          "pricing": {
            "monthlyPayment": number,
            "firstPayment": number (optional),
            "totalCost": number (optional),
            "annualKilometers": number (optional),
            "co2TaxBiannual": number (optional)
          },
          "specifications": {
            "fuelConsumptionKmpl": number (optional),
            "co2EmissionsGkm": number (optional),
            "energyLabel": "string (optional)",
            "electricRangeKm": number | null (optional),
            "batteryCapacityKwh": number | null (optional),
            "horsePower": number (optional),
            "acceleration0to100": number (optional)
          }
        }
      ]
    }
  ],
  "accessories": [
    {
      "packageName": "string",
      "description": "string (optional)",
      "monthlyCost": number,
      "category": "wheels" | "service" | "insurance" | "other",
      "packageCode": "string (optional)"
    }
  ],
  "metadata": {
    "extractionTimestamp": "string (ISO 8601)",
    "documentPages": number (optional),
    "extractionWarnings": ["string"] (optional)
  }
}

## Critical Instructions:
- Extract ALL variants/trims for each model, not just one
- Parse Danish numbers correctly (1.234,56 = 1234.56)
- Include complete pricing information for each variant
- Identify powertrainType accurately based on engine specifications
- Set transmission type based on text analysis
- Return valid JSON only - no markdown, explanations, or additional text
- If data is missing, use null for numbers or omit optional fields
- Group variants under the correct vehicle model
- Ensure all required fields are present for valid structure`
  }

  /**
   * Build user prompt with the document content
   */
  private buildUserPrompt(content: string, options: ExtractOptions): string {
    const contextInfo = options.dealer ? `Dealer: ${options.dealer}\n` : ''
    
    return `${contextInfo}Please extract all car leasing information from this Danish document text:

---
${content}
---

Extract complete structured data for ALL vehicles and variants mentioned in the document. Pay special attention to:
1. Multiple variants of the same model
2. Different engine configurations 
3. Pricing tiers and lease terms
4. Danish number formatting
5. Technical specifications

Return the data as valid JSON matching the required structure.`
  }

  /**
   * Parse the AI response and handle JSON extraction
   */
  private parseResponse(responseText: string): ExtractedCarData {
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from Anthropic')
    }

    try {
      // Try to parse as direct JSON
      const parsed = JSON.parse(responseText.trim())
      return parsed as ExtractedCarData
    } catch (error) {
      // Try to extract JSON from markdown or other formatting
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          return parsed as ExtractedCarData
        } catch (innerError) {
          throw new Error('Failed to parse JSON from markdown block')
        }
      }

      // Try to find JSON object in the text
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          const jsonText = responseText.substring(jsonStart, jsonEnd + 1)
          const parsed = JSON.parse(jsonText)
          return parsed as ExtractedCarData
        } catch (innerError) {
          throw new Error('Failed to extract JSON from response text')
        }
      }

      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown parsing error'}`)
    }
  }

  /**
   * Override token estimation for Anthropic's tokenization
   * Claude uses approximately 3-4 characters per token for Danish text
   */
  protected estimateTokens(content: string): number {
    if (!content) return 0
    
    // More accurate estimation for Danish text with Claude
    const baseEstimate = Math.ceil(content.length / 3.5)
    
    // Add buffer for JSON structure response
    const responseOverhead = 800 // Estimated tokens for structured JSON output
    const promptOverhead = 700 // System prompt tokens (longer than OpenAI)
    
    return baseEstimate + responseOverhead + promptOverhead
  }
}