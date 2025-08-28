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
      maxRetries: 0,      // Disable OpenAI client's built-in retries completely
      timeout: 120000     // 120 seconds timeout for larger extractions
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
  ResponsesAPIError
} from './types.ts'

/**
 * Calculate total price consistently using the formula: (period_months × monthly_price) + first_payment
 */
function calculateTotalPrice(monthlyPrice: number, periodMonths: number, firstPayment?: number): number {
  return (periodMonths * monthlyPrice) + (firstPayment || 0)
}
import { vehicleExtractionSchema, validateExtractionResponse } from './schema.ts'
import { VariantResolver } from './variantResolver.ts'
// FeatureFlagManager removed - always use Responses API
import { FUEL_TYPE_MAP, TRANSMISSION_MAP } from './types.ts'
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
  maxRetries: 0,        // TEMPORARY: Disable retries to see first failure
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

// Consolidate existing listings with essential fields only for variant matching
function consolidateExistingListings(listings: any[]): any[] {
  const vehicleMap = new Map<string, any>()
  
  for (const listing of listings) {
    const vehicleKey = `${listing.make}_${listing.model}_${listing.variant}_${listing.horsepower}`
    
    if (!vehicleMap.has(vehicleKey)) {
      // Create vehicle with minimal essential data for variant matching
      vehicleMap.set(vehicleKey, {
        make: listing.make,
        model: listing.model,
        variant: listing.variant,
        hp: listing.horsepower
      })
    }
  }
  
  return Array.from(vehicleMap.values())
}

// Optimize listings for variant matching (essential data only, proper JSON formatting)
function buildOptimizedListingsContext(existingListings: any[], pdfText?: string): string {
  if (!existingListings || existingListings.length === 0) {
    return '[]'
  }
  
  // Consolidate listings by vehicle identity with minimal data
  const consolidatedListings = consolidateExistingListings(existingListings)
  
  console.log(`[ai-extract-vehicles] Consolidated listings: ${existingListings.length} → ${consolidatedListings.length} unique vehicles`)
  
  return JSON.stringify(consolidatedListings, null, 2)
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

// buildDynamicContext function removed - using simplified context object directly


// Call Responses API with fallback to Chat Completions
async function callOpenAIWithFallback(params: {
  context: Record<string, any>
  systemPrompt: string
  userPrompt: string
  chatCompletionsPrompt: string
  useResponsesAPI: boolean
  sessionId: string
  dealerId?: string
}): Promise<{ response: any; apiVersion: 'responses-api' | 'chat-completions'; tokensUsed: number }> {
  const { context, systemPrompt, userPrompt, chatCompletionsPrompt, useResponsesAPI, sessionId, dealerId } = params
  
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
      console.log('[DEBUG] Raw response structure keys:', Object.keys(response))
      console.log('[DEBUG] Response content length:', responseContent?.length || 0)
      console.log('[DEBUG] Response content preview (first 500 chars):', responseContent?.substring(0, 500))
      
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
      console.log('[DEBUG] Parsed data structure:', JSON.stringify(parsedData, null, 2).substring(0, 1000))
      const validation = validateExtractionResponse(parsedData)
      console.log('[DEBUG] Validation result:', validation)
      
      if (!validation.valid) {
        console.error('[DEBUG] Validation failed with errors:', validation.errors)
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
          content: chatCompletionsPrompt
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

// Log monitoring event function removed - migration_metrics table no longer exists
// Core monitoring continues via api_call_logs in responsesConfigManager.ts

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
  // Track processing start time for AI metadata
  const processingStartTime = Date.now()
  
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
    
    // Ensure existing_listings is always an array (never null or undefined)
    if (!safeExistingListings.existing_listings || !Array.isArray(safeExistingListings.existing_listings)) {
      console.error('Invalid existingListings format - expected array, got:', typeof safeExistingListings.existing_listings)
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

    // Prepare allowed models context (dealer's make only, simplified format)
    let allowedModelsContext = '{}'
    if (safeReferenceData && makeName && makeName !== 'Unknown') {
      // Filter makes_models to only include the dealer's specific make
      let filteredMakes = {}
      
      // Try exact match first
      if (safeReferenceData.makes_models && safeReferenceData.makes_models[makeName]) {
        filteredMakes[makeName] = safeReferenceData.makes_models[makeName]
      } else {
        // Try case-insensitive match
        const makeNameLower = makeName.toLowerCase()
        const foundMake = Object.keys(safeReferenceData.makes_models || {}).find(
          make => make.toLowerCase() === makeNameLower
        )
        
        if (foundMake && safeReferenceData.makes_models) {
          filteredMakes[foundMake] = safeReferenceData.makes_models[foundMake]
          console.log(`[ai-extract-vehicles] Found case-insensitive match: '${makeName}' → '${foundMake}'`)
        } else {
          console.warn(`[ai-extract-vehicles] Make '${makeName}' not found in reference data - using all models as fallback`)
          // Use all models as fallback when dealer's make is unknown
          filteredMakes = safeReferenceData.makes_models || {}
        }
      }
      
      allowedModelsContext = JSON.stringify(filteredMakes)
      
      console.log(`[ai-extract-vehicles] Allowed models filtering results:`, {
        dealerMake: makeName || 'Not provided',
        originalMakesCount: Object.keys(safeReferenceData.makes_models || {}).length,
        filteredMakesCount: Object.keys(filteredMakes).length,
        filteredModelsCount: Object.values(filteredMakes).reduce((total, models) => total + (Array.isArray(models) ? models.length : 0), 0),
        hasValidMake: Object.keys(filteredMakes).length > 0,
        usedFallback: Object.keys(filteredMakes).length === Object.keys(safeReferenceData.makes_models || {}).length
      })
    } else if (!makeName || makeName === 'Unknown') {
      console.warn('[ai-extract-vehicles] No makeName provided or makeName is Unknown - using all models as fallback')
      // Use all available models when make is unknown
      allowedModelsContext = JSON.stringify(safeReferenceData.makes_models || {})
    }

    // Prepare existing listings context with optimization for large inventories
    const existingListingsContext = buildOptimizedListingsContext(safeExistingListings.existing_listings, finalText)
    
    // Log context building results
    console.log('[ai-extract-vehicles] Context building results:', {
      existingListingsContextLength: existingListingsContext.length,
      hasListingsContent: existingListingsContext.includes('EXISTING DEALER LISTINGS'),
      contextPreview: existingListingsContext.substring(0, 100) + '...'
    })

    // Variant examples removed - existing listings provide better context for the new format

    // System prompt for Chat Completions API fallback only
    // Note: Responses API uses stored prompts in OpenAI Playground, no system prompt needed here
    const systemPrompt = `Extract vehicle data from Danish leasing brochures. Match variants to existing inventory when possible.

## VARIANT MATCHING RULES
1. **Match existing**: For same make/model (±5 HP) → copy variant name EXACTLY
2. **Create new only if**: >10 HP difference, different trim, new fuel type, transmission change, or distinct equipment
3. **Name new variants**: Copy closest existing naming pattern + " – equipment" if applicable  
4. **Validate format**: Match dealer's word order, spacing, suffix style

## OUTPUT FORMAT
Return JSON only:
{"cars":[{"make":"string","model":"string","variant":"string","hp":number,"ft":number,"tr":number,"bt":number,"wltp":number,"co2":number,"kwh100":number,"l100":number,"tax":number,"offers":[[monthly_price,down_payment,months,km_per_year]]}]}

## FIELD CODES
ft: 1=Electric,2=Hybrid-Petrol,3=Petrol,4=Diesel,5=Hybrid-Diesel,6=Plug-in-Petrol,7=Plug-in-Diesel
tr: 1=Automatic,2=Manual  
bt: 1=SUV,2=Hatchback,3=Sedan,4=Stationcar,5=Coupe,6=Cabriolet,7=Crossover,8=Minibus,9=Mikro

## PRICING RULES
- offers array: [monthly_price, down_payment, months, km_per_year]
- Monthly payments typically 2,000-8,000 kr
- Down payments can be 0-50,000+ kr
- Extract numbers only (remove "kr.", ",-")
- Each car needs ≥1 offer`

    // Build different inputs for different APIs
    // Responses API: Data only with improved structured format (instructions are in stored OpenAI prompt)
    const responsesApiPrompt = buildExtractionContext({
      dealerName: finalDealerName,
      fileName,
      pdfText: finalText,
      allowedModels: allowedModelsContext,
      existingListings: existingListingsContext
    })

    // Chat Completions API: Full instructions + data (fallback when Responses API fails)
    const chatCompletionsPrompt = buildChatCompletionsContext({
      dealerName: finalDealerName,
      fileName,
      pdfText: finalText,
      allowedModels: allowedModelsContext,
      existingListings: existingListingsContext
    })

    // Create extraction context
    const extractionContext: ExtractionContext = {
      dealerName: finalDealerName,
      fileName,
      referenceData,
      existingListings
    }

    // Build dynamic context for Responses API (updated for new format)
    const dynamicContext = {
      dealerName: finalDealerName,
      fileName,
      pdfText: finalText,
      allowedModels: allowedModelsContext,
      existingListings: existingListingsContext
    }

    // Monitor context size to identify potential timeout issues
    const contextSizes = {
      allowedModels: allowedModelsContext.length,
      existingListings: existingListingsContext.length,
      pdfText: finalText.length,
      responsesApi: responsesApiPrompt.length,
      chatCompletions: chatCompletionsPrompt.length
    }
    
    // Log context size analysis
    console.log(`[ai-extract-vehicles] Context analysis:`, {
      allowedModels: `${Math.round(contextSizes.allowedModels/1024)}KB`,
      existingListings: `${Math.round(contextSizes.existingListings/1024)}KB`,
      pdfText: `${Math.round(contextSizes.pdfText/1024)}KB`,
      responsesApiPrompt: `${Math.round(contextSizes.responsesApi/1024)}KB`,
      chatCompletionsPrompt: `${Math.round(contextSizes.chatCompletions/1024)}KB`,
      existingListingsCount: safeExistingListings.existing_listings.length
    })
    
    // Warn about potentially problematic context sizes
    if (contextSizes.responsesApi > 100 * 1024) { // 100KB
      console.warn(`[ai-extract-vehicles] LARGE CONTEXT WARNING: ${Math.round(contextSizes.responsesApi/1024)}KB prompt may cause timeout`)
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
      userPrompt: responsesApiPrompt,      // Use minimal prompt for Responses API
      chatCompletionsPrompt,               // Full prompt for Chat Completions fallback
      useResponsesAPI: useResponsesAPI,
      sessionId: batchId || 'unknown',
      dealerId: sellerId
    }
    
    const { response: aiResponse, apiVersion, tokensUsed } = await callOpenAIWithFallback(apiParams)

    const endTime = Date.now()
    // console.log(`[ai-extract-vehicles] AI extraction completed in ${endTime - startTime}ms using ${apiVersion}`)
    
    // Get AI metadata for tracking
    let aiMetadata = {
      provider: null as string | null,
      model: null as string | null,
      costCents: null as number | null
    }
    
    try {
      const configManager = getResponsesConfigManager()
      const config = await configManager.getConfigWithFallback('vehicle-extraction')
      
      // Determine provider from model name
      aiMetadata.provider = config.model.startsWith('gpt-') ? 'openai' : 
                           config.model.startsWith('claude-') ? 'anthropic' : 
                           'openai' // default
      aiMetadata.model = config.model
      
      // Estimate cost in cents (rough approximation)
      if (tokensUsed > 0) {
        // GPT-3.5-turbo: ~$0.002 per 1K tokens, GPT-4: ~$0.03 per 1K tokens
        const costPerToken = config.model.includes('gpt-4') ? 0.00003 : 0.000002
        aiMetadata.costCents = Math.round(tokensUsed * costPerToken * 100)
      }
    } catch (configError) {
      console.warn('[ai-extract-vehicles] Could not retrieve AI metadata:', configError)
    }

    // Extract cars from response
    const extractedCars: CompactExtractedVehicle[] = aiResponse.cars || []
    console.log('[DEBUG] Extracted cars from AI response:', {
      count: extractedCars.length,
      firstCar: extractedCars[0] ? {
        make: extractedCars[0].make,
        model: extractedCars[0].model,
        variant: extractedCars[0].variant,
        hp: extractedCars[0].hp
      } : 'none'
    })

    console.log('[DEBUG] Creating variant resolver...')
    // Create variant resolver
    const variantResolver = new VariantResolver(extractionContext)
    
    // Resolve variants and get statistics
    console.log('[DEBUG] Resolving variants...')
    const variantResolutions = await variantResolver.resolveVariants(extractedCars)
    const resolutionStats = variantResolver.getResolutionStats(variantResolutions)
    
    console.log('[DEBUG] Variant resolution completed:', {
      statsKeys: resolutionStats ? Object.keys(resolutionStats) : 'none',
      resolvedCount: variantResolutions ? variantResolutions.size : 0
    })

    // Convert from compact format to full format with variant tracking
    const vehicles: ExtractedVehicle[] = extractedCars.map((car: CompactExtractedVehicle, index: number) => {
      const resolution = variantResolutions.get(index)!
      
      // Convert offers array to full format (total_price is calculated dynamically)
      const offers = (car.offers || []).map((offer: any[]) => ({
        monthly_price: offer[0],
        first_payment: offer[1], 
        period_months: offer[2],
        mileage_per_year: offer[3],
        total_price: offer[0] && offer[2] ? calculateTotalPrice(offer[0], offer[2], offer[1]) : null
      }))

      return {
        make: car.make,
        model: car.model,
        variant: resolution.suggestedVariant || car.variant, // Use suggested variant if available
        horsepower: car.hp,
        fuel_type: FUEL_TYPE_MAP[car.ft as keyof typeof FUEL_TYPE_MAP] || 'Petrol',
        transmission: TRANSMISSION_MAP[car.tr as keyof typeof TRANSMISSION_MAP] || 'Manual',
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

    console.log('[DEBUG] Vehicle mapping completed:', {
      vehicleCount: vehicles.length,
      firstVehicle: vehicles[0] ? {
        make: vehicles[0].make,
        model: vehicles[0].model,
        variant: vehicles[0].variant,
        horsepower: vehicles[0].horsepower,
        variantSource: vehicles[0].variantSource,
        offersCount: vehicles[0].offers ? vehicles[0].offers.length : 0
      } : 'none'
    })
    
    console.log('[DEBUG] About to call compare-extracted-listings with:', {
      vehicleCount: vehicles.length,
      sellerId,
      sessionName: fileName || `PDF Extraction - ${finalDealerName || 'Unknown'} - ${new Date().toISOString().split('T')[0]}`,
      firstVehicle: vehicles[0] ? {
        make: vehicles[0].make,
        model: vehicles[0].model,
        variant: vehicles[0].variant,
        horsepower: vehicles[0].horsepower
      } : 'none'
    })

    console.log('[DEBUG] Making comparison call to compare-extracted-listings...')
    
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

    console.log('[DEBUG] Comparison response received:', {
      ok: comparisonResponse.ok,
      status: comparisonResponse.status,
      statusText: comparisonResponse.statusText
    })

    if (!comparisonResponse.ok) {
      const errorText = await comparisonResponse.text()
      console.error('[DEBUG] Comparison failed with error:', errorText)
      throw new Error(`Comparison failed: ${comparisonResponse.status} ${errorText}`)
    }

    const comparisonResult = await comparisonResponse.json()
    
    console.log('[DEBUG] Comparison result:', {
      success: comparisonResult.success,
      summaryKeys: comparisonResult.summary ? Object.keys(comparisonResult.summary) : 'none',
      errorMessage: comparisonResult.error || 'none'
    })
    
    if (!comparisonResult.success) {
      console.error('[DEBUG] Comparison result failed:', comparisonResult.error)
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
          // Add AI metadata fields
          ai_provider: aiMetadata.provider,
          model_version: aiMetadata.model,
          tokens_used: tokensUsed,
          cost_cents: aiMetadata.costCents,
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
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - processingStartTime
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
    
    // Monitoring event logging removed - migration_metrics table no longer exists
    // Core monitoring continues via api_call_logs in responsesConfigManager.ts
    
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
    
    // Error monitoring event logging removed - migration_metrics table no longer exists
    // Core error monitoring continues via api_call_logs in responsesConfigManager.ts
    
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