import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// OpenAI import and client management
let OpenAI: any = null
let openaiClient: any = null

async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    // Lazy load OpenAI SDK
    if (!OpenAI) {
      const module = await import("https://esm.sh/openai@latest")
      OpenAI = module.default
    }
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      const configErrorDetails = categorizeError({
        message: 'OpenAI API key not configured in environment variables',
        type: 'invalid_configuration'
      })
      throw new ExtractionError(configErrorDetails)
    }

    openaiClient = new OpenAI({ 
      apiKey: openaiApiKey,
      maxRetries: 2,      // Reduce from default 5 to minimize retry attempts
      timeout: 30000      // 30 seconds timeout
    })
  }
  
  return openaiClient
}

// Import rate limiting middleware
import { rateLimiters } from '../_shared/rateLimitMiddleware.ts'

// Import our new modules
import type { 
  ExtractedVehicle,
  CompactExtractedVehicle,
  CompactExtractionResponse,
  ExtractionContext,
  ExtractionMonitoringEvent,
  ResponsesAPIError
} from './types.ts'
import { vehicleExtractionSchema, validateExtractionResponse } from './schema.ts'
import { VariantResolver } from './variantResolver.ts'
// FeatureFlagManager removed - always use Responses API
import { FUEL_TYPE_MAP, TRANSMISSION_MAP, BODY_TYPE_MAP } from './types.ts'
import { 
  estimateTokens, 
  estimateTokensForMultiplePDFs, 
  isChunkedRequest,
  validateChunkSize,
  type ChunkedExtractionRequest,
  type TokenEstimate
} from './tokenManager.ts'
import { 
  getResponsesConfigManager,
  type ResponsesAPIConfig,
  type APICallResult
} from './responsesConfigManager.ts'
import { buildExtractionContext, buildChatCompletionsContext } from './extractionContext.ts'
import { 
  ExtractionError, 
  categorizeError, 
  createErrorResponse,
  isRetryableError,
  getRetryDelay,
  retryWithBackoff,
  DEFAULT_RETRY_CONFIG,
  requestDeduplicator,
  type ErrorDetails,
  type RetryConfig
} from './errorTypes.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

// Retry configuration specifically for AI API calls
const AI_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,        // Fewer retries for expensive AI calls
  baseDelayMs: 2000,    // Start with 2 seconds
  maxDelayMs: 20000,    // Cap at 20 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.2     // 20% jitter for AI calls
}

// Retry configuration for database operations
const DB_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,        // More retries for database operations
  baseDelayMs: 500,     // Start with 500ms for fast database retries
  maxDelayMs: 5000,     // Cap at 5 seconds for database operations
  backoffMultiplier: 1.5,
  jitterFactor: 0.1     // 10% jitter for database calls
}

// Default empty structures to avoid undefined checks
const DEFAULT_REFERENCE_DATA = {
  makes_models: {},
  fuel_types: [],
  transmissions: [],
  body_types: []
}

const DEFAULT_EXISTING_LISTINGS = {
  existing_listings: []
}

// Optimize listings for large inventories with intelligent sampling
function buildOptimizedListingsContext(existingListings: any[], pdfText?: string): string {
  if (!existingListings || existingListings.length === 0) {
    return `

🚨 EXISTING DEALER LISTINGS STATUS 🚨
No existing listings found for this dealer. All extracted vehicles will be treated as new listings.

MANDATORY VARIANT MATCHING RULES – FOLLOW THESE:
Since no existing listings are available:
- Create appropriate variant names following Danish market conventions
- Use consistent naming patterns across similar vehicles
- Include horsepower in variant names (e.g., "Advanced 231 HK")
- Be consistent with transmission notation if applicable`
  }
  
  // More aggressive reduction for large inventories to prevent token limits
  let listingsToInclude = existingListings
  const MAX_LISTINGS = 30 // Reduced to stay under token limits
  
  if (existingListings.length > MAX_LISTINGS) {
    // Extract makes/models mentioned in PDF for smarter filtering
    const pdfMakes = new Set<string>()
    const pdfModels = new Set<string>()
    
    if (pdfText) {
      const commonMakes = ['Toyota', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Ford', 'Hyundai', 'Kia', 'Skoda', 'Volvo', 'Peugeot', 'Renault', 'Nissan', 'Mazda', 'Honda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Fiat', 'Alfa Romeo', 'Jeep', 'Dodge', 'Chrysler', 'Cadillac', 'Chevrolet', 'GMC', 'Buick', 'Lincoln', 'Acura', 'Infiniti', 'Lexus', 'Genesis', 'Jaguar', 'Land Rover', 'Porsche', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini', 'Maserati', 'Aston Martin', 'McLaren', 'Bugatti']
      
      const pdfLower = pdfText.toLowerCase()
      commonMakes.forEach(make => {
        if (pdfLower.includes(make.toLowerCase())) {
          pdfMakes.add(make)
        }
      })
    }
    
    // Group by make/model and prioritize based on PDF content
    const grouped = existingListings.reduce((acc, listing) => {
      const key = `${listing.make}_${listing.model}`
      if (!acc[key]) acc[key] = []
      acc[key].push(listing)
      return acc
    }, {} as Record<string, any[]>)
    
    // Sort groups by relevance (PDF mentions first, then alphabetical)
    const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
      const [makeA] = keyA.split('_')
      const [makeB] = keyB.split('_')
      
      const aInPDF = pdfMakes.has(makeA)
      const bInPDF = pdfMakes.has(makeB)
      
      if (aInPDF && !bInPDF) return -1
      if (!aInPDF && bInPDF) return 1
      return keyA.localeCompare(keyB)
    })
    
    // Take variants from most relevant make/models first
    listingsToInclude = []
    let remainingSlots = MAX_LISTINGS
    
    for (const [key, group] of sortedGroups) {
      if (remainingSlots <= 0) break
      
      const slotsForThisGroup = Math.min(3, remainingSlots) // Up to 3 variants per make/model
      const [make] = key.split('_')
      
      // Prioritize variants from PDF-mentioned makes
      if (pdfMakes.has(make)) {
        listingsToInclude.push(...group.slice(0, slotsForThisGroup))
      } else {
        listingsToInclude.push(...group.slice(0, Math.min(2, slotsForThisGroup))) // Fewer for non-PDF makes
      }
      
      remainingSlots -= slotsForThisGroup
    }
    
    // console.log(`[ai-extract-vehicles] Smart reduction: ${existingListings.length} → ${listingsToInclude.length} listings (${pdfMakes.size} PDF makes detected)`)
  }
  
  return `\n\n🚨 CRITICAL: EXISTING DEALER LISTINGS - YOU MUST MATCH THESE EXACTLY 🚨
${JSON.stringify(listingsToInclude, null, 2)}

MANDATORY VARIANT MATCHING RULES – YOU MUST FOLLOW THESE:

**Step 1 (Match):**
- For each brochure car, find an existing listing (same make, model, ±5 HP).
- If found, copy its **variant** name **exactly**, character for character.
- Do **not** add or remove "Automatik" unless it already exists.
- Do **not** add a transmission suffix if none exists; keep it if it does.

**Step 2 (When to Create New Variant):**
Only create a new variant name if the brochure shows a **truly new configuration**, i.e.:
- Horsepower differs by **> 10 HP**
- It's a **different trim level** not in the existing listings
- The **fuel type** is fundamentally different
- The **same powertrain/trim** now has **distinct factory options** (e.g., larger wheels, panoramic sunroof, BOSE audio)
- **Transmission type** changes (Automatic vs Manual)
- **Drivetrain** changes (AWD vs RWD)

**Step 3 (How to Name New Variant):**
When you do need to create a new name:
1. **Identify** the **closest existing** variant (same make/model, closest HP).
2. **Adopt exactly** its naming **template**—word order, spacing, punctuation, suffix style.
3. If adding **equipment**, append it with " – " immediately after that base name.
   Example:
   - Base existing: "Ultimate 325 HK 4WD"
   - New with wheels: "Ultimate 325 HK 4WD – 20\" alufælge, soltag"

**Step 4 (Align with Existing Naming Patterns):**
Before finalizing any new variant name, ensure it **mirrors** your dealer's canonical format:
- **Word order** (e.g., HP before drivetrain)
- **Spacing & capitalization** (e.g., "217 HK", not "217HK")
- **Suffix style** (e.g., "aut." vs "Automatik")
- **Drivetrain & transmission** exactly where they appear in the reference

**Validation:**
For each extracted car:
> "Does this match an existing listing above? If yes, am I using the EXACT variant name?"`
}

// Helper function to generate a summary of changes (like original function)
function generateChangeSummary(match: any): string {
  if (match.changeType === 'create') {
    return `Ny bil: ${match.extracted?.make} ${match.extracted?.model} ${match.extracted?.variant}`
  }
  
  if (match.changeType === 'delete') {
    return `Slet: ${match.existing?.make} ${match.existing?.model} ${match.existing?.variant}`
  }
  
  if (match.changeType === 'update' && match.changes) {
    const changedFields = Object.keys(match.changes)
    return `Opdater ${changedFields.length} felter: ${changedFields.join(', ')}`
  }
  
  if (match.changeType === 'unchanged') {
    return `Ingen ændringer: ${match.extracted?.make} ${match.extracted?.model} ${match.extracted?.variant}`
  }
  
  return 'Ingen ændringer'
}

// Build dynamic context for Responses API
function buildDynamicContext(params: {
  finalText: string
  finalDealerName?: string
  fileName?: string
  referenceContext: string
  existingListingsContext: string
  variantExamplesContext: string
}): Record<string, any> {
  const { finalText, finalDealerName, fileName, referenceContext, existingListingsContext, variantExamplesContext } = params
  
  return {
    dealerName: finalDealerName,
    fileName: fileName,
    pdfText: finalText,
    referenceData: referenceContext,
    existingListings: existingListingsContext,
    variantExamples: variantExamplesContext,
    extractionInstructions: {
      prioritizeExistingVariants: true,
      mergeTransmissionVariants: true,
      rangeHandling: fileName?.toLowerCase().includes('standard-range') ? 'use-lower' : 
                     fileName?.toLowerCase().includes('long-range') ? 'use-higher' : 'use-context',
      variantMatchingRules: {
        hpMatchThreshold: 5,    // Step 1: ±5 HP for matching
        hpCreateThreshold: 10,  // Step 2: >10 HP for new variant
        equipmentSeparator: ' – ',  // Step 3: Equipment separator
        strictMatching: true    // Enforce exact variant copying
      }
    }
  }
}


// Call Responses API with fallback to Chat Completions
async function callOpenAIWithFallback(params: {
  context: Record<string, any>
  systemPrompt: string
  userPrompt: string
  useResponsesAPI: boolean
  sessionId: string
  dealerId?: string
}): Promise<{ response: any; apiVersion: 'responses-api' | 'chat-completions'; tokensUsed: number }> {
  const { context, systemPrompt, userPrompt, useResponsesAPI, sessionId, dealerId } = params
  
  // Get OpenAI client using lazy loading
  const openai = await getOpenAIClient()
  
  // Define startTime at function scope to be available in catch block
  const startTime = Date.now()
  
  if (useResponsesAPI) {
    try {
      console.log('[ai-extract-vehicles] Attempting Responses API call with configuration manager...')
      
      // Get configuration from database with retry logic
      const configManager = getResponsesConfigManager()
      console.log('[ai-extract-vehicles] Getting configuration...')
      const config = await retryWithBackoff(
        () => configManager.getConfigWithFallback('vehicle-extraction'),
        DB_RETRY_CONFIG,
        'Configuration retrieval'
      )
      console.log('[ai-extract-vehicles] Configuration retrieved successfully')
      
      // Check if we got a valid configuration
      if (!config) {
        console.error('[ai-extract-vehicles] No valid Responses API configuration found, falling back to Chat Completions')
        throw new Error('No valid Responses API configuration available')
      }
      
      console.log('[ai-extract-vehicles] Configuration loaded:', {
        prompt_id: config.openai_prompt_id,
        version: config.openai_prompt_version,
        model: config.model,
        temperature: config.temperature
      })
      
      // Build input for Responses API using extracted function
      const inputText = buildExtractionContext({
        dealerName: context.dealerName,
        fileName: context.fileName,
        pdfText: context.pdfText,
        referenceData: context.referenceData,
        existingListings: context.existingListings
      })

      // Build API payload using configuration with variable substitution
      const payload = configManager.buildAPIPayload(config, inputText)

      console.log('[ai-extract-vehicles] Built payload for Responses API:')
      console.log('- Prompt ID:', payload.prompt.id)
      console.log('- Prompt Version:', payload.prompt.version)
      console.log('- Input length:', payload.input.length, 'characters')
      console.log('- Max output tokens:', payload.max_output_tokens)
      console.log('- Format: Relies on system prompt instructions')
      
      // Wrap Responses API call with exponential backoff retry
      console.log('[ai-extract-vehicles] Calling OpenAI Responses API with retry logic...')
      const response = await retryWithBackoff(
        () => openai.responses.create(payload),
        AI_RETRY_CONFIG,
        'OpenAI Responses API'
      )
      console.log('[ai-extract-vehicles] Responses API call completed successfully')
      
      // Get the content from the response using the standard output_text property
      const responseContent = response.output_text
      if (!responseContent) {
        console.error('[ai-extract-vehicles] Response structure:', JSON.stringify(response, null, 2))
        const noOutputErrorDetails = categorizeError({
          message: 'No output_text found in Responses API response',
          type: 'parsing_error'
        })
        throw new ExtractionError(noOutputErrorDetails)
      }
      
      let parsedData: any
      try {
        // Try to parse as JSON directly
        parsedData = JSON.parse(responseContent)
      } catch (jsonError) {
        console.log('[ai-extract-vehicles] Direct JSON parse failed, attempting extraction...')
        console.log('[ai-extract-vehicles] Response content preview:', responseContent.substring(0, 200))
        
        // If that fails, try to extract JSON from the response
        // Look for JSON that starts with { and ends with }
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('[ai-extract-vehicles] No JSON found in response. Full response:', responseContent)
          const noJsonErrorDetails = categorizeError({
            message: 'No JSON found in Responses API response',
            type: 'parsing_error'
          })
          throw new ExtractionError(noJsonErrorDetails)
        }
        
        try {
          parsedData = JSON.parse(jsonMatch[0])
        } catch (extractError) {
          console.error('[ai-extract-vehicles] Failed to parse extracted JSON:', jsonMatch[0].substring(0, 200))
          const parseErrorDetails = categorizeError({
            message: `JSON parse error: ${extractError.message}`,
            type: 'parsing_error'
          })
          throw new ExtractionError(parseErrorDetails)
        }
      }
      
      // Validate the response structure
      const validation = validateExtractionResponse(parsedData)
      if (!validation.valid) {
        const validationErrorDetails = categorizeError({
          message: `Schema validation failed: ${validation.errors?.join(', ')}`,
          type: 'validation_error'
        })
        throw new ExtractionError(validationErrorDetails)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Log successful API call
      const apiResult: APICallResult = {
        success: true,
        data: parsedData,
        tokens: {
          completion_tokens: response.usage?.output_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0
        },
        duration_ms: duration
      }
      
      await configManager.logAPICall(config, apiResult, duration)
      // FeatureFlagManager.logUsage removed
      
      console.log('[ai-extract-vehicles] Responses API call successful!')
      console.log(`[ai-extract-vehicles] Used ${response.usage?.total_tokens || 0} tokens in ${duration}ms`)
      
      return {
        response: parsedData,
        apiVersion: 'responses-api',
        tokensUsed: response.usage?.total_tokens || 0
      }
    } catch (error) {
      console.error('[ai-extract-vehicles] Responses API error:', error)
      
      // Use new error categorization system
      const errorDetails = categorizeError(error)
      const extractionError = new ExtractionError(errorDetails)
      
      console.error(`[ai-extract-vehicles] Categorized error - Type: ${errorDetails.type}, Severity: ${errorDetails.severity}`)
      console.error(`[ai-extract-vehicles] User message: ${errorDetails.userMessage}`)
      console.error(`[ai-extract-vehicles] Retryable: ${errorDetails.isRetryable}`)
      
      // For critical errors (invalid API key, etc.), don't fall back
      if (errorDetails.severity === 'critical' || !errorDetails.isRetryable) {
        console.error('[ai-extract-vehicles] Critical error - not falling back to Chat Completions')
        throw extractionError
      }
      
      // For rate limits and quota exceeded, throw immediately to preserve error details
      if (errorDetails.type === 'quota_exceeded' || errorDetails.type === 'rate_limited') {
        console.error('[ai-extract-vehicles] Rate/quota limit reached - preserving error details')
        throw extractionError
      }
      
      // Log the error for monitoring
      const endTime = Date.now()
      const duration = endTime - startTime
      
      const apiResult: APICallResult = {
        success: false,
        error: `${errorDetails.type}: ${errorDetails.message}`,
        duration_ms: duration
      }
      
      // Log error with configuration manager
      try {
        const configManager = getResponsesConfigManager()
        const config = await configManager.getConfigWithFallback('vehicle-extraction')
        await configManager.logAPICall(config, apiResult, duration)
      } catch (logError) {
        console.error('[ai-extract-vehicles] Failed to log API error:', logError)
      }
      
      const apiError: ResponsesAPIError = {
        type: errorDetails.type,
        message: errorDetails.message,
        details: errorDetails.technicalDetails,
        fallbackUsed: true
      }
      
      console.log(`[ai-extract-vehicles] Falling back to Chat Completions API due to ${errorDetails.type}...`)
    }
  }
  
  // Fallback to Chat Completions API (existing logic)
  console.log('[ai-extract-vehicles] Using Chat Completions API with retry logic')
  
  const completion = await retryWithBackoff(
    () => openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000
    }),
    AI_RETRY_CONFIG,
    'OpenAI Chat Completions API'
  )
  
  const response = completion.choices[0]?.message?.content
  if (!response) {
    const emptyResponseErrorDetails = categorizeError({
      message: 'Empty response from Chat Completions API',
      type: 'parsing_error'
    })
    throw new ExtractionError(emptyResponseErrorDetails)
  }
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    const noJsonErrorDetails = categorizeError({
      message: 'No JSON found in Chat Completions API response',
      type: 'parsing_error'
    })
    throw new ExtractionError(noJsonErrorDetails)
  }
  
  let parsedData: any
  try {
    parsedData = JSON.parse(jsonMatch[0])
  } catch (parseError) {
    const parseErrorDetails = categorizeError({
      message: `JSON parse error in Chat Completions response: ${parseError.message}`,
      type: 'parsing_error'
    })
    throw new ExtractionError(parseErrorDetails)
  }
  
  return {
    response: parsedData,
    apiVersion: 'chat-completions',
    tokensUsed: completion.usage?.total_tokens || 0
  }
}

// Log monitoring event
async function logMonitoringEvent(supabase: any, event: ExtractionMonitoringEvent) {
  try {
    const { error } = await supabase
      .from('migration_metrics')
      .insert({
        created_at: event.timestamp,
        api_version: event.apiVersion,
        variant_source: 'mixed', // Will be updated with actual distribution
        confidence_score: event.inferenceRate,
        dealer_id: event.dealerId,
        session_id: event.sessionId,
        tokens_used: event.tokensUsed,
        processing_time_ms: event.processingTimeMs,
        error_occurred: event.errorOccurred,
        error_message: event.errorMessage
      })
    
    if (error) {
      console.error('[Monitoring] Failed to log event:', error)
    }
  } catch (err) {
    console.error('[Monitoring] Error logging event:', err)
  }
}

// Handle chunked requests - Phase 2: Chunked request support
async function handleChunkedRequest(chunk: ChunkedExtractionRequest, req: Request): Promise<Response> {
  console.log(`[ai-extract-vehicles] Processing chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} (ID: ${chunk.chunkId})`)
  
  // Validate chunk size
  const chunkValidation = validateChunkSize({
    id: chunk.chunkId,
    pdfFiles: chunk.pdfTexts.map((text, i) => ({
      name: `chunk_${i}.pdf`,
      text,
      pages: 1
    })),
    totalChars: chunk.pdfTexts.reduce((sum, text) => sum + text.length, 0),
    estimatedTokens: 0
  })
  
  if (!chunkValidation.valid) {
    return new Response(
      JSON.stringify({ 
        error: 'Invalid chunk size',
        reason: chunkValidation.reason,
        chunkId: chunk.chunkId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
  
  // Combine PDF texts for processing
  const combinedText = chunk.pdfTexts.join('\n\n--- PDF SEPARATOR ---\n\n')
  
  // Create a regular request object with the combined text
  const regularRequest = {
    text: combinedText,
    dealerHint: chunk.dealerHint,
    dealerName: chunk.dealerName,
    sellerId: chunk.sellerId,
    sellerName: chunk.sellerName,
    batchId: chunk.batchId,
    makeId: chunk.makeId,
    makeName: chunk.makeName,
    fileName: chunk.fileName,
    referenceData: chunk.referenceData,
    existingListings: chunk.existingListings,
    pdfUrl: chunk.pdfUrl
  }
  
  // Process the chunk using the existing logic
  // Create a new request with the regular request body
  const newReq = new Request(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(regularRequest)
  })
  
  // Recursively call the main handler without chunking
  try {
    const response = await handleRegularRequest(regularRequest)
    
    // Wrap the response to indicate it's from a chunk
    if (response.ok) {
      const data = await response.json()
      return new Response(
        JSON.stringify({
          ...data,
          chunkId: chunk.chunkId,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          isChunkedResult: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      return response
    }
  } catch (error) {
    console.error(`[ai-extract-vehicles] Chunk processing error:`, error)
    
    // Use error categorization for chunk processing errors
    let errorResponse
    if (error instanceof ExtractionError) {
      errorResponse = createErrorResponse(error)
    } else {
      const errorDetails = categorizeError(error)
      const extractionError = new ExtractionError(errorDetails)
      errorResponse = createErrorResponse(extractionError)
    }
    
    return new Response(
      JSON.stringify({ 
        ...errorResponse,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}

async function handleRegularRequest(requestBody: any): Promise<Response> {
  try {
    
    const { 
      text, 
      textContent, // Support both parameter names
      dealerHint, 
      dealerName, // Support both parameter names
      sellerId, 
      sellerName,
      batchId,
      makeId,
      makeName,
      fileName,
      referenceData,
      existingListings,
      pdfUrl
    } = requestBody
    
    // Use the correct parameter names
    const finalText = text || textContent
    const finalDealerName = dealerHint || dealerName
    
    // Check for cached result to avoid duplicate processing
    const deduplicationParams = {
      text: finalText,
      dealerName: finalDealerName,
      fileName,
      sellerId
    }
    
    const cachedResult = requestDeduplicator.getCachedResult(deduplicationParams)
    if (cachedResult) {
      console.log('[ai-extract-vehicles] Returning cached result - duplicate request detected')
      console.log(`[ai-extract-vehicles] Cache stats: ${JSON.stringify(requestDeduplicator.getCacheStats())}`)
      return new Response(JSON.stringify(cachedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }
    
    // Ensure we have valid data structures
    const safeReferenceData = {
      ...DEFAULT_REFERENCE_DATA,
      ...(referenceData || {})
    }
    
    const safeExistingListings = {
      ...DEFAULT_EXISTING_LISTINGS,
      ...(existingListings || {})
    }
    
    // Validate listing structure
    if (safeExistingListings.existing_listings && !Array.isArray(safeExistingListings.existing_listings)) {
      console.error('Invalid existingListings format - expected array')
      safeExistingListings.existing_listings = []
    }
    
    // Log for monitoring
    // console.log('[ai-extract-vehicles] Context data:', {
    //   sellerId,
    //   dealerName: finalDealerName,
    //   referenceDataKeys: Object.keys(safeReferenceData),
    //   existingListingsCount: safeExistingListings.existing_listings.length,
    //   textLength: finalText?.length
    // })
    
    // Enhanced validation and logging for existing listings
    console.log('[ai-extract-vehicles] Existing listings validation:', {
      sellerId,
      dealerName: finalDealerName,
      existingListingsParam: existingListings ? 'provided' : 'missing',
      existingListingsArray: existingListings?.existing_listings ? 'provided' : 'missing',
      arrayLength: safeExistingListings.existing_listings.length,
      arrayType: Array.isArray(safeExistingListings.existing_listings) ? 'array' : typeof safeExistingListings.existing_listings,
      rawExistingListings: existingListings,
      safeExistingListings: safeExistingListings
    })
    
    if (sellerId && safeExistingListings.existing_listings.length === 0) {
      // Log as error to match what user sees in logs
      console.error('[ai-extract-vehicles] No existing listings for dealer:', { 
        sellerId, 
        dealerName: finalDealerName
      })
      
      console.warn('[ai-extract-vehicles] ⚠️  CRITICAL: No existing listings for dealer - variant matching will be limited:', { 
        sellerId, 
        dealerName: finalDealerName,
        existingListingsProvided: !!existingListings,
        hasExistingListingsArray: !!existingListings?.existing_listings,
        existingListingsType: typeof existingListings,
        existingListingsKeys: existingListings ? Object.keys(existingListings) : 'none',
        arrayIsEmpty: Array.isArray(existingListings?.existing_listings) && existingListings.existing_listings.length === 0,
        receivedData: existingListings
      })
      
      // Log first few characters of the incoming data for debugging
      if (existingListings) {
        console.log('[ai-extract-vehicles] Raw existingListings data:', JSON.stringify(existingListings))
      }
    } else if (sellerId) {
      console.log('[ai-extract-vehicles] ✅ Existing listings loaded successfully:', {
        count: safeExistingListings.existing_listings.length,
        sampleListings: safeExistingListings.existing_listings.slice(0, 2).map(listing => ({
          make: listing.make,
          model: listing.model,
          variant: listing.variant,
          horsepower: listing.horsepower
        }))
      })
    }
    
    if (!finalText || typeof finalText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text parameter is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Token estimation for monitoring
    const tokenEstimate = estimateTokens(finalText)
    
    // Log large documents but don't block - GPT-4-1106-preview supports 128k tokens
    if (tokenEstimate.totalTokens > 100000) {
      console.log(`[ai-extract-vehicles] Large document: ${tokenEstimate.totalTokens} tokens`)
    }

    // Log token usage for monitoring
    console.log(`[ai-extract-vehicles] Token estimate: ${tokenEstimate.totalTokens} tokens (PDF: ${tokenEstimate.pdfTextTokens}, Context: ${tokenEstimate.contextTokens})`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize OpenAI client
    const openai = await getOpenAIClient()

    // Use Responses API with corrected format
    const useResponsesAPI = true
    
    console.log('[ai-extract-vehicles] Using Responses API with corrected OpenAI format')

    // Prepare reference data context (like original function)
    let referenceContext = ''
    if (safeReferenceData) {
      referenceContext = `\n\nDATABASE REFERENCE DATA FOR CONTEXT:
MAKES & MODELS: ${JSON.stringify(safeReferenceData.makes_models || {})}
FUEL TYPES: ${JSON.stringify(safeReferenceData.fuel_types || [])}
TRANSMISSIONS: ${JSON.stringify(safeReferenceData.transmissions || [])}
BODY TYPES: ${JSON.stringify(safeReferenceData.body_types || [])}`
    }

    // Prepare existing listings context with optimization for large inventories
    const existingListingsContext = buildOptimizedListingsContext(safeExistingListings.existing_listings, finalText)
    
    // Log context building results
    console.log('[ai-extract-vehicles] Context building results:', {
      existingListingsContextLength: existingListingsContext.length,
      hasListingsContent: existingListingsContext.includes('EXISTING DEALER LISTINGS'),
      contextPreview: existingListingsContext.substring(0, 100) + '...'
    })

    // Load variant examples for AI guidance
    let variantExamplesContext = ''
    // Skip loading variant examples file since it's not deployed with the function
    // The examples are better provided through existing listings anyway

    // System and user prompts (from original function)
    const systemPrompt = `You are a Danish vehicle leasing data extractor with a CRITICAL requirement: You MUST match extracted vehicles to the dealer's existing inventory following MANDATORY VARIANT MATCHING RULES.

Your task is to parse car leasing brochures and return structured JSON, while STRICTLY following the 4-step variant matching process.

## MANDATORY VARIANT MATCHING PROCESS

**Step 1 (Match Existing):**
- For EVERY car in the brochure, FIRST check existing inventory (same make, model, ±5 HP)
- If match found → Copy the variant name EXACTLY, character for character
- NEVER modify existing variant names (don't add/remove "Automatik", transmission suffixes, etc.)

**Step 2 (When to Create New):**
Create new variant ONLY when brochure shows truly different configuration:
- Horsepower differs by >10 HP
- Different trim level not in existing listings
- Fundamentally different fuel type
- Same powertrain with distinct factory options (larger wheels, sunroof, BOSE, etc.)
- Transmission type changes (Automatic vs Manual)
- Drivetrain changes (AWD vs RWD)

**Step 3 (How to Name New):**
When creating new variant:
1. Find closest existing variant (same make/model, closest HP)
2. Copy its naming template EXACTLY (word order, spacing, punctuation)
3. For equipment variants: append " – " + equipment list
   Example: "Ultimate 325 HK 4WD" → "Ultimate 325 HK 4WD – 20\" alufælge, soltag"

**Step 4 (Validate):**
Before finalizing, ensure new names match dealer's format:
- Word order (HP before/after drivetrain)
- Spacing ("217 HK" not "217HK")
- Suffix style ("aut." vs "Automatik")
- Drivetrain position in name

## Output Format
Return ONLY a compact JSON object with this exact structure:
{
  "cars": [
    {
      "make": "string",
      "model": "string", 
      "variant": "string with HK if applicable",
      "hp": number or null,
      "ft": number,  // fuel_type: 1=Electric, 2=Hybrid-Petrol, 3=Petrol, 4=Diesel, 5=Hybrid-Diesel, 6=Plug-in-Petrol, 7=Plug-in-Diesel
      "tr": number,  // transmission: 1=Automatic, 2=Manual
      "bt": number,  // body_type: 1=SUV, 2=Hatchback, 3=Sedan, 4=Stationcar, 5=Coupe, 6=Cabriolet, 7=Crossover, 8=Minibus, 9=Mikro
      "wltp": number or null,
      "co2": number or null,
      "kwh100": number or null,
      "l100": number or null,
      "tax": number or null,
      "offers": [
        [monthly_price, down_payment, months, km_per_year, total_price or null]
      ]
    }
  ]
}

## CRITICAL: Understanding the "offers" Array Structure
Each offer is an array with EXACTLY this sequence:
[
  monthly_price,    // Position 0: The RECURRING monthly payment (typically 2,000-8,000 kr)
  down_payment,     // Position 1: The INITIAL/FIRST payment (can be 0-50,000 kr)
  months,           // Position 2: Contract duration (typically 12, 24, 36, 48)
  km_per_year,      // Position 3: Annual mileage allowance (10000, 15000, 20000, 25000, 30000)
  total_price       // Position 4: Total contract cost (optional, can be null)
]

⚠️ COMMON PRICING MISTAKES TO AVOID:
- DO NOT confuse down_payment (førstegangsydelse) with monthly_price
- Monthly lease payments are typically between 2,000-8,000 kr/month
- If you see prices like 14,995 or 29,995 as "monthly", they're likely down payments
- Down payments (førstegangsydelse) can range from 0 to 50,000+ kr

## Important Rules
- Extract prices as numbers only (remove "kr.", ",-" etc.)
- Each car MUST have at least one offer
- Use the numeric codes, not string values for ft, tr, bt
- Omit optional fields if not present (use null)
- Return ONLY the JSON object, no explanatory text`

    const userPrompt = buildChatCompletionsContext({
      dealerName: finalDealerName,
      fileName,
      pdfText: finalText,
      referenceData: referenceContext,
      existingListings: existingListingsContext + variantExamplesContext
    })

    // Create extraction context
    const extractionContext: ExtractionContext = {
      dealerName: finalDealerName,
      fileName,
      referenceData,
      existingListings
    }

    // Build dynamic context for Responses API
    const dynamicContext = buildDynamicContext({
      finalText,
      finalDealerName,
      fileName,
      referenceContext,
      existingListingsContext,
      variantExamplesContext
    })

    // Monitor context size to identify potential timeout issues
    const contextSizes = {
      referenceData: referenceContext.length,
      existingListings: existingListingsContext.length,
      variantExamples: variantExamplesContext.length,
      pdfText: finalText.length,
      total: userPrompt.length
    }
    
    // Log context size analysis
    console.log(`[ai-extract-vehicles] Context analysis:`, {
      referenceData: `${Math.round(contextSizes.referenceData/1024)}KB`,
      existingListings: `${Math.round(contextSizes.existingListings/1024)}KB`,
      pdfText: `${Math.round(contextSizes.pdfText/1024)}KB`,
      totalPrompt: `${Math.round(contextSizes.total/1024)}KB`,
      existingListingsCount: safeExistingListings.existing_listings.length
    })
    
    // Warn about potentially problematic context sizes
    if (contextSizes.total > 100 * 1024) { // 100KB
      console.warn(`[ai-extract-vehicles] LARGE CONTEXT WARNING: ${Math.round(contextSizes.total/1024)}KB prompt may cause timeout`)
    }
    
    if (contextSizes.pdfText > 200 * 1024) { // 200KB
      console.warn(`[ai-extract-vehicles] LARGE PDF WARNING: ${Math.round(contextSizes.pdfText/1024)}KB PDF text may cause timeout`)
    }

    // Call OpenAI with appropriate API
    console.log('[ai-extract-vehicles] Starting AI extraction...')
    const startTime = Date.now()
    
    const apiParams = {
      context: dynamicContext,
      systemPrompt,
      userPrompt,
      useResponsesAPI: useResponsesAPI,
      sessionId: batchId || 'unknown',
      dealerId: sellerId
    }
    
    const { response: aiResponse, apiVersion, tokensUsed } = await callOpenAIWithFallback(apiParams)

    const endTime = Date.now()
    // console.log(`[ai-extract-vehicles] AI extraction completed in ${endTime - startTime}ms using ${apiVersion}`)

    // Extract cars from response
    const extractedCars: CompactExtractedVehicle[] = aiResponse.cars || []
    // console.log('[ai-extract-vehicles] Successfully extracted ' + extractedCars.length + ' cars')

    // Create variant resolver
    const variantResolver = new VariantResolver(extractionContext)
    
    // Resolve variants and get statistics
    const variantResolutions = await variantResolver.resolveVariants(extractedCars)
    const resolutionStats = variantResolver.getResolutionStats(variantResolutions)
    
    // console.log('[ai-extract-vehicles] Variant resolution stats:', resolutionStats)

    // Convert from compact format to full format with variant tracking
    const vehicles: ExtractedVehicle[] = extractedCars.map((car: CompactExtractedVehicle, index: number) => {
      const resolution = variantResolutions.get(index)!
      
      // Convert offers array to full format
      const offers = (car.offers || []).map((offer: any[]) => ({
        monthly_price: offer[0],
        first_payment: offer[1], 
        period_months: offer[2],
        mileage_per_year: offer[3],
        total_price: offer[4]
      }))

      return {
        make: car.make,
        model: car.model,
        variant: resolution.suggestedVariant || car.variant, // Use suggested variant if available
        horsepower: car.hp,
        fuel_type: FUEL_TYPE_MAP[car.ft as keyof typeof FUEL_TYPE_MAP] || 'Petrol',
        transmission: TRANSMISSION_MAP[car.tr as keyof typeof TRANSMISSION_MAP] || 'Manual', 
        body_type: BODY_TYPE_MAP[car.bt as keyof typeof BODY_TYPE_MAP] || 'Hatchback',
        wltp: car.wltp,
        co2_emission: car.co2,
        consumption_l_100km: car.l100,
        consumption_kwh_100km: car.kwh100,
        co2_tax_half_year: car.tax,
        offers,
        // Add variant tracking fields
        variantSource: resolution.source,
        variantConfidence: resolution.confidence,
        variantMatchDetails: resolution.matchDetails
      }
    })

    // console.log('[ai-extract-vehicles] Expanded cars with variant tracking:', vehicles.length)
    
    // console.log('🚗 Processing ' + vehicles.length + ' extracted vehicles for comparison')

    // Use the existing compare-extracted-listings edge function with retry logic
    const comparisonResponse = await retryWithBackoff(
      () => fetch(`${supabaseUrl}/functions/v1/compare-extracted-listings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extractedCars: vehicles, // Now includes variant tracking
          sellerId,
          sessionName: fileName || `PDF Extraction - ${finalDealerName || 'Unknown'} - ${new Date().toISOString().split('T')[0]}`
        })
      }),
      DB_RETRY_CONFIG,
      'Comparison service call'
    )

    if (!comparisonResponse.ok) {
      throw new Error(`Comparison failed: ${comparisonResponse.status} ${await comparisonResponse.text()}`)
    }

    const comparisonResult = await comparisonResponse.json()
    
    if (!comparisonResult.success) {
      throw new Error(`Comparison failed: ${comparisonResult.error}`)
    }

    // console.log('🔍 Comparison completed:', {
    //   totalExtracted: comparisonResult.summary.totalExtracted,
    //   totalNew: comparisonResult.summary.totalNew,
    //   totalUpdated: comparisonResult.summary.totalUpdated,
    //   totalUnchanged: comparisonResult.summary.totalUnchanged,
    //   exactMatches: comparisonResult.summary.exactMatches,
    //   fuzzyMatches: comparisonResult.summary.fuzzyMatches
    // })

    // Create extraction session with comparison results
    const sessionName = fileName || `PDF Extraction - ${finalDealerName || 'Unknown'} - ${new Date().toISOString().split('T')[0]}`
    
    // Create extraction session with retry logic
    const { data: sessionData, error: sessionError } = await retryWithBackoff(
      () => supabase
        .from('extraction_sessions')
        .insert({
          session_name: sessionName,
          pdf_url: pdfUrl || `local://${fileName || 'upload'}`,
          seller_id: sellerId,
          extraction_type: 'update', // Use 'update' like original
          status: 'processing',
          started_at: new Date().toISOString(),
          // Add new fields for migration tracking
          api_version: apiVersion,
          inference_rate: resolutionStats.inferenceRate,
          variant_source_stats: {
            existing: resolutionStats.existing,
            reference: resolutionStats.reference,
            inferred: resolutionStats.inferred
          }
        })
        .select()
        .single(),
      DB_RETRY_CONFIG,
      'Extraction session creation'
    )
    
    if (sessionError) {
      console.error('Error creating extraction session:', sessionError)
      throw sessionError
    }
    
    // console.log(`[ai-extract-vehicles] Created extraction session:`, sessionData.id)
    const extractionSessionId = sessionData.id
    
    // Update session with results using retry logic
    const { error: updateError } = await retryWithBackoff(
      () => supabase
        .from('extraction_sessions')
        .update({
          status: 'completed',
          total_extracted: comparisonResult.summary.totalExtracted,
          total_matched: comparisonResult.summary.totalMatched,
          total_new: comparisonResult.summary.totalNew,
          total_updated: comparisonResult.summary.totalUpdated,
          total_unchanged: comparisonResult.summary.totalUnchanged,
          total_deleted: comparisonResult.summary.totalDeleted,
          completed_at: new Date().toISOString()
        })
        .eq('id', extractionSessionId),
      DB_RETRY_CONFIG,
      'Extraction session update'
    )
    
    if (updateError) {
      console.error('Error updating session:', updateError)
      throw updateError
    }
    
    // console.log('✅ Successfully updated extraction session:', extractionSessionId)
    
    // Store extraction changes in database (like original function)
    const changes = comparisonResult.matches.map((match: any) => ({
      session_id: extractionSessionId,
      existing_listing_id: match.existing?.id || null,
      change_type: match.changeType,
      change_status: 'pending',
      confidence_score: match.confidence,
      extracted_data: match.extracted || {},
      field_changes: match.changes || null,
      change_summary: generateChangeSummary(match),
      match_method: match.matchMethod || 'unmatched',
      match_details: {
        matchMethod: match.matchMethod,
        confidence: match.confidence,
        // Include variant tracking if available
        variantSource: match.extracted?.variantSource,
        variantConfidence: match.extracted?.variantConfidence,
        variantMatchDetails: match.extracted?.variantMatchDetails
      }
    }))
    
    const { error: changesError } = await retryWithBackoff(
      () => supabase
        .from('extraction_listing_changes')
        .insert(changes),
      DB_RETRY_CONFIG,
      'Extraction changes insertion'
    )
    
    if (changesError) {
      console.error('Error storing extraction changes:', changesError)
      throw changesError
    }
    
    // console.log('✅ Successfully stored extraction changes:', changes.length)
    
    // Log monitoring event
    await logMonitoringEvent(supabase, {
      timestamp: new Date(),
      dealerId: sellerId,
      sessionId: extractionSessionId,
      apiVersion,
      variantSourceDistribution: {
        existing: resolutionStats.existing,
        reference: resolutionStats.reference,
        inferred: resolutionStats.inferred
      },
      inferenceRate: resolutionStats.inferenceRate,
      tokensUsed,
      processingTimeMs: endTime - startTime,
      errorOccurred: false
    })
    
    // Use the comparison results for statistics
    const totalNew = comparisonResult.summary.totalNew
    const totalUpdated = comparisonResult.summary.totalUpdated  
    const totalUnchanged = comparisonResult.summary.totalUnchanged

    // console.log(`[ai-extract-vehicles] Extraction completed successfully`)
    
    // Prepare successful response
    const successResponse = {
      success: true,
      extractionSessionId: extractionSessionId,
      itemsProcessed: comparisonResult.summary.totalExtracted,
      summary: {
        ...comparisonResult.summary,
        apiVersion,
        variantSourceDistribution: {
          existing: resolutionStats.existing,
          reference: resolutionStats.reference,
          inferred: resolutionStats.inferred
        },
        inferenceRate: resolutionStats.inferenceRate,
        avgVariantConfidence: resolutionStats.avgConfidence
      }
    }
    
    // Cache the successful result for deduplication
    requestDeduplicator.cacheResult(deduplicationParams, successResponse, 10 * 60 * 1000) // 10 minutes
    console.log(`[ai-extract-vehicles] Cached successful extraction result`)
    
    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('[ai-extract-vehicles] Error:', error)
    
    // Use error categorization for consistent error handling
    let errorResponse
    if (error instanceof ExtractionError) {
      // Error already categorized
      errorResponse = createErrorResponse(error)
    } else {
      // Categorize unknown errors
      const errorDetails = categorizeError(error)
      const extractionError = new ExtractionError(errorDetails)
      errorResponse = createErrorResponse(extractionError)
    }
    
    // Log error event for monitoring
    if (error instanceof Error) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      await logMonitoringEvent(supabase, {
        timestamp: new Date(),
        dealerId: undefined,
        sessionId: 'error',
        apiVersion: 'unknown' as any,
        variantSourceDistribution: { existing: 0, reference: 0, inferred: 0 },
        inferenceRate: 0,
        tokensUsed: 0,
        processingTimeMs: 0,
        errorOccurred: true,
        errorMessage: error.message
      })
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

serve(async (req) => {
  // Handle CORS preflight immediately (before rate limiting)
  if (req.method === 'OPTIONS') {
    // console.log('[ai-extract-vehicles] CORS preflight request received')
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  // Apply rate limiting for AI operations
  return rateLimiters.ai(req, async (req) => {
    // console.log(`[ai-extract-vehicles] ${req.method} request received`)

  try {
    // Parse request with all parameters from original function
    const requestBody = await req.json()
    
    // Check if this is a chunked request
    if (isChunkedRequest(requestBody)) {
      // Handle chunked request
      return await handleChunkedRequest(requestBody, req)
    }
    
    // Handle regular request
    return await handleRegularRequest(requestBody)
  } catch (error) {
    console.error('[ai-extract-vehicles] Request parsing error:', error)
    
    // Use error categorization for request parsing errors
    let errorResponse
    if (error instanceof ExtractionError) {
      errorResponse = createErrorResponse(error)
    } else {
      const errorDetails = categorizeError(error)
      const extractionError = new ExtractionError(errorDetails)
      errorResponse = createErrorResponse(extractionError)
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  }) // End of rate limiting wrapper
})