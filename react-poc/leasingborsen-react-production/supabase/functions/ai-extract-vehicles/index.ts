import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from "https://esm.sh/openai@latest"

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
import { FeatureFlagManager } from './featureFlags.ts'
import { FUEL_TYPE_MAP, TRANSMISSION_MAP, BODY_TYPE_MAP } from './types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
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
      handleRangeSpecifications: fileName?.toLowerCase().includes('standard-range') ? 'use-lower' : 
                                 fileName?.toLowerCase().includes('long-range') ? 'use-higher' : 'use-context'
    }
  }
}

// Call Responses API with fallback to Chat Completions
async function callOpenAIWithFallback(params: {
  openai: OpenAI
  context: Record<string, any>
  systemPrompt: string
  userPrompt: string
  useResponsesAPI: boolean
  storedPromptId?: string
  sessionId: string
  dealerId?: string
}): Promise<{ response: any; apiVersion: 'responses-api' | 'chat-completions'; tokensUsed: number }> {
  const { openai, context, systemPrompt, userPrompt, useResponsesAPI, storedPromptId, sessionId, dealerId } = params
  
  if (useResponsesAPI && storedPromptId) {
    try {
      console.log('[ai-extract-vehicles] Attempting Responses API call...')
      console.log('[ai-extract-vehicles] Context includes:', {
        hasReferenceData: !!context.referenceData && context.referenceData.length > 0,
        hasExistingListings: !!context.existingListings && context.existingListings.length > 0,
        referenceDataLength: context.referenceData?.length || 0,
        existingListingsLength: context.existingListings?.length || 0
      })
      
      // Include full context with existing listings and reference data
      const contextMessage = `Dealer: ${context.dealerName || 'Unknown'}
File: ${context.fileName || 'PDF Upload'}

${context.referenceData}
${context.existingListings}

PDF Text:
${context.pdfText}

Extraction Instructions:
- Prioritize existing variants: ${context.extractionInstructions?.prioritizeExistingVariants || true}
- Merge transmission variants: ${context.extractionInstructions?.mergeTransmissionVariants || true}
- Range handling: ${context.extractionInstructions?.handleRangeSpecifications || 'use-context'}`;

      const response = await openai.responses.create({
        prompt: {
          id: storedPromptId
          // Omitting version to use latest
        },
        model: 'gpt-4.1-2025-04-14',
        input: [
          {
            role: "user",
            type: "message",
            content: contextMessage
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: vehicleExtractionSchema.name,
            strict: vehicleExtractionSchema.strict,
            schema: vehicleExtractionSchema.schema
          }
        },
        temperature: 0.1
      })
      
      // Responses API returns `output`, not `results`
      if (!response.output?.length) {
        throw new Error('No output from Responses API')
      }
      
      // Get the content from the response - it's available in output_text directly
      const responseContent = response.output_text
      if (!responseContent) {
        throw new Error('No output_text in response')
      }
      
      let parsedData: any
      try {
        // Try to parse as JSON directly
        parsedData = JSON.parse(responseContent)
      } catch (jsonError) {
        // If that fails, try to extract JSON from the response
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in Responses API response')
        }
        parsedData = JSON.parse(jsonMatch[0])
      }
      
      // Validate the response structure
      const validation = validateExtractionResponse(parsedData)
      if (!validation.valid) {
        throw new Error(`Schema validation failed: ${validation.errors?.join(', ')}`)
      }
      
      console.log('[ai-extract-vehicles] Responses API call successful!')
      console.log(`[ai-extract-vehicles] Used ${response.usage?.total_tokens || 0} tokens (input: ${response.usage?.input_tokens || 0}, output: ${response.usage?.output_tokens || 0})`)
      await FeatureFlagManager.logUsage(dealerId, true, 'success')
      
      return {
        response: parsedData,
        apiVersion: 'responses-api',
        tokensUsed: response.usage?.total_tokens || 0
      }
    } catch (error) {
      console.error('[ai-extract-vehicles] Responses API error:', error)
      
      // Extract detailed error information
      let errorType = 'unknown_error'
      let errorDetails: any = {}
      
      if (error.status === 400) {
        // Parameter/format errors - fail fast
        errorType = 'invalid_parameter'
        errorDetails = {
          param: error.param,
          code: error.code,
          message: error.message
        }
        console.error('[ai-extract-vehicles] Invalid parameter error - check API format:', errorDetails)
      } else if (error.status >= 500) {
        // Server errors - could retry
        errorType = 'server_error'
        errorDetails = {
          status: error.status,
          message: error.message
        }
      } else if (error.message?.includes('Schema validation')) {
        errorType = 'schema_validation'
        errorDetails = {
          errors: error.message
        }
      }
      
      // Log the error for monitoring
      const apiError: ResponsesAPIError = {
        type: errorType,
        message: error.message || 'Unknown error',
        details: errorDetails,
        fallbackUsed: true
      }
      
      console.log('[ai-extract-vehicles] Falling back to Chat Completions API...')
      await FeatureFlagManager.logUsage(dealerId, false, `error: ${errorType}`)
    }
  }
  
  // Fallback to Chat Completions API (existing logic)
  console.log('[ai-extract-vehicles] Using Chat Completions API')
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-2025-04-14',
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
    max_tokens: 16000
  })
  
  const response = completion.choices[0]?.message?.content
  if (!response) {
    throw new Error('Empty response from AI')
  }
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in AI response')
  }
  
  const parsedData = JSON.parse(jsonMatch[0])
  
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

serve(async (req) => {
  // Handle CORS preflight immediately
  if (req.method === 'OPTIONS') {
    console.log('[ai-extract-vehicles] CORS preflight request received')
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    })
  }

  console.log(`[ai-extract-vehicles] ${req.method} request received`)

  try {
    // Parse request with all parameters from original function
    const requestBody = await req.json()
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
    
    console.log('📝 Request params:', { 
      dealerName: finalDealerName, 
      sellerId, 
      sellerName,
      batchId,
      makeId,
      makeName,
      fileName,
      textLength: finalText?.length,
      hasReferenceData: !!referenceData,
      hasExistingListings: !!existingListings,
      existingListingsCount: existingListings?.existing_listings?.length || 0
    })
    
    if (!finalText || typeof finalText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text parameter is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize OpenAI client
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    // Check feature flags
    const useResponsesAPI = await FeatureFlagManager.shouldUseResponsesAPI(sellerId)
    const isEmergencyDisabled = await FeatureFlagManager.isEmergencyDisabled()
    
    if (isEmergencyDisabled) {
      console.log('[ai-extract-vehicles] Emergency disable active, using Chat Completions')
    }
    
    const storedPromptId = Deno.env.get('OPENAI_STORED_PROMPT_ID')
    
    console.log('[ai-extract-vehicles] Feature flag decision:', {
      useResponsesAPI: useResponsesAPI && !isEmergencyDisabled,
      storedPromptId: storedPromptId ? 'configured' : 'not configured',
      dealerId: sellerId
    })

    // Prepare reference data context (like original function)
    let referenceContext = ''
    if (referenceData) {
      referenceContext = `\n\nDATABASE REFERENCE DATA FOR CONTEXT:
MAKES & MODELS: ${JSON.stringify(referenceData.makes_models || {})}
FUEL TYPES: ${JSON.stringify(referenceData.fuel_types || [])}
TRANSMISSIONS: ${JSON.stringify(referenceData.transmissions || [])}
BODY TYPES: ${JSON.stringify(referenceData.body_types || [])}

Use this reference data to ensure extracted data matches existing database values.`
    }

    // Prepare existing listings context (like original function)
    let existingListingsContext = ''
    if (existingListings?.existing_listings && existingListings.existing_listings.length > 0) {
      existingListingsContext = `\n\n🚨 CRITICAL: EXISTING DEALER LISTINGS - YOU MUST MATCH THESE EXACTLY 🚨
${JSON.stringify(existingListings.existing_listings, null, 2)}

MANDATORY VARIANT MATCHING RULES - YOU MUST FOLLOW THESE:
1. BEFORE creating any new variant name, CHECK if a similar vehicle exists above:
   - Same make + model + similar horsepower (±5 HP) = USE THE EXACT EXISTING VARIANT NAME
   - Do NOT add "Automatik" if the existing variant doesn't have it
   - Do NOT remove "Automatik" if the existing variant has it
   - COPY the variant name CHARACTER BY CHARACTER as it appears above

2. TRANSMISSION SUFFIX RULE:
   - If existing listing has NO transmission suffix → DO NOT add one
   - If existing listing HAS a transmission suffix → KEEP it exactly
   - This prevents duplicates: "Essential 217 HK" and "Essential 217 HK Automatik" are the SAME car

3. Only create a NEW variant name if:
   - The horsepower is significantly different (>10 HP difference)
   - It's a genuinely different trim level not in the existing listings
   - The fuel type is fundamentally different (not just hybrid variations)

4. EXAMPLES OF CORRECT MATCHING:
   - Existing: "Essential 217 HK" → You MUST use: "Essential 217 HK" (NOT "Essential 217 HK Automatik")
   - Existing: "Style 116 HK Automatik" → You MUST use: "Style 116 HK Automatik" (keep the suffix)
   - Existing: "Executive AWD 343 HK" → You MUST use: "Executive AWD 343 HK" (NOT adding transmission)

5. VALIDATION: For each car you extract, mentally check:
   "Does this match any existing listing above? If yes, am I using the EXACT variant name?"`
    }

    // Load variant examples for AI guidance
    let variantExamplesContext = ''
    // Skip loading variant examples file since it's not deployed with the function
    // The examples are better provided through existing listings anyway

    // System and user prompts (from original function)
    const systemPrompt = `You are a Danish vehicle leasing data extractor with a CRITICAL requirement: You MUST match extracted vehicles to the dealer's existing inventory to prevent duplicates.

Your task is to parse car leasing brochures and return structured JSON, while MATCHING existing dealer listings whenever possible.

## PRIORITY #1: MATCH EXISTING DEALER LISTINGS
- You will receive the dealer's current inventory
- When you find a vehicle that matches (same make + model + similar HP), USE THE EXACT EXISTING VARIANT NAME
- Do NOT create new variants like "X Automatik" if the dealer already has "X" in inventory

## Key Requirements
1. MATCH to existing dealer inventory first, create new entries only when truly different
2. Extract ALL vehicles from the brochure (but merge transmission variants)
3. Extract ALL leasing offers for each vehicle (different mileage/period options)
4. Use numeric codes for fuel_type, transmission, and body_type as specified
5. Always use "HK" for horsepower in variant names, never "kW"
6. Equipment differentiation: When the same powertrain/trim appears with different equipment packages:
   - Base version: Use variant name as-is
   - With equipment: Append " - " followed by the equipment list (e.g., "77.4 kWh - 325 HK 4WD Ultimate - 20\" alufælge, soltag, digitale sidespejle")
   - Include all listed equipment items separated by commas

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

## Important Rules
- Extract prices as numbers only (remove "kr.", ",-" etc.)
- Each car MUST have at least one offer
- Use the numeric codes, not string values for ft, tr, bt
- Omit optional fields if not present (use null)
- Return ONLY the JSON object, no explanatory text`

    const userPrompt = `Extract all vehicles and their leasing offers from this Danish PDF.

🚨 CRITICAL MATCHING REQUIREMENT 🚨
Before extracting ANY vehicle, you MUST:
1. Check if it matches an existing dealer listing (provided below)
2. If it matches (same make + model + similar HP ±5) → USE THE EXACT EXISTING VARIANT NAME
3. DO NOT create variants like "X" and "X Automatik" as separate entries - they are the SAME vehicle

EXTRACTION RULES:
1. Find ALL car models and variants in the document
2. MATCH to existing dealer listings when possible (USE EXACT VARIANT NAMES)
3. Extract ALL leasing offers for each car (multiple offers per car are common)
4. Extract prices as numbers only (remove "kr.", ",-" etc.)
5. Always use "HK" for horsepower in variant names, never "kW"
6. Normalize brand names (e.g., "Skoda" not "Škoda")
7. NEVER create duplicate entries that differ only by transmission suffix
8. Equipment differentiation: When the same powertrain/trim appears with different equipment packages:
   - Base version: Use variant name as-is (e.g., "Ultimate 325 HK 4WD")
   - With equipment: Append " - " followed by the equipment list (e.g., "Ultimate 325 HK 4WD - 20\" alufælge, soltag, digitale sidespejle")
   - Include all listed equipment items separated by commas

DANISH TERMS TO EXTRACT:
- Monthly payment: "kr./md", "Ydelse pr. md"
- Down payment: "Førstegangsydelse", "Første betaling"
- Contract period: "36 måneder", "48 mdr"
- Annual mileage: "15.000 km/år", "20.000 km/år"
- Total price: "Totalpris"
- Horsepower: "HK" (never use kW)
- Technical specs: WLTP, CO2, fuel consumption, CO2 tax

OUTPUT FORMAT:
Return compact JSON with this structure:
{
  "cars": [
    {
      "make": "Audi",
      "model": "Q6 e-tron",
      "variant": "Progress 252 HK",
      "hp": 252,
      "ft": 1,  // fuel_type: 1=Electric, 2=Hybrid-Petrol, 3=Petrol, 4=Diesel, 5=Hybrid-Diesel, 6=Plug-in-Petrol, 7=Plug-in-Diesel
      "tr": 1,  // transmission: 1=Automatic, 2=Manual
      "bt": 1,  // body_type: 1=SUV, 2=Hatchback, 3=Sedan, 4=Stationcar, 5=Coupe, 6=Cabriolet, 7=Crossover, 8=Minibus, 9=Mikro
      "wltp": 625,
      "co2": 0,
      "kwh100": 17.0,
      "tax": 420,
      "offers": [
        [6495, 35000, 36, 15000, 268820]  // [monthly_price, down_payment, months, km_per_year, total_price]
      ]
    }
  ]
}

IMPORTANT:
- Extract ALL vehicles (including variants like Sportback, RS, GT)
- Extract ALL offers (different mileage/period options)
- Each car must have at least one offer
- Use the numeric codes for fuel_type, transmission, and body_type

🚨 CRITICAL DEDUPLICATION AND MATCHING RULES 🚨

RULE 1 - MATCH EXISTING LISTINGS:
- If the dealer already has "Essential 217 HK" in their inventory, and you find a Tucson Essential with 217 HP → USE "Essential 217 HK"
- Do NOT create "Essential 217 HK Automatik" as a new variant - it's the SAME car

RULE 2 - PREVENT TRANSMISSION DUPLICATES:
- "Tucson Essential 217 HK" and "Tucson Essential 217 HK Automatik" = SAME vehicle, merge into ONE entry
- "Kona Essential 120 HK" and "Kona Essential 120 HK Automatik" = SAME vehicle, merge into ONE entry
- Use the variant name that matches existing inventory, or the simpler one if new

RULE 3 - MERGE IDENTICAL VEHICLES:
If the same make + model + variant appears multiple times with identical technical specs (same WLTP, CO2, HP, etc.), merge them into ONE entry with ALL offers combined in the offers array. Only create separate entries when technical specifications differ significantly.

RANGE SPECIFICATION HANDLING:
- When you see range values like "443-563 km", "76.1-99.8 kWh", or "195-228 Wh/km", these typically show the range across ALL variants of a model, NOT multiple vehicles in the current PDF
- Use context clues to determine the actual variant:
  * Filename indicators (e.g., "standard-range" = use lower value, "long-range" = use higher value)
  * Section headers or titles indicating specific variant
  * The pricing context (standard range typically has lower prices)
  * Look for specific text like "Standard Range", "Long Range", "GT-Line" in the document
- Multiple pricing tables with different down payments (Førstegangsydelse) = multiple offers for the SAME vehicle, NOT different vehicles

KIA-SPECIFIC RULES:
- Kia PDFs often show full model range specifications but contain pricing for only one specific variant
- The filename usually indicates which variant (e.g., "ev9-upgrade-standard-range.pdf" = Standard Range variant only)
- When you see different down payment amounts (e.g., 29,995 kr and 49,995 kr), these are different financing options for the SAME vehicle
- Do NOT create separate vehicles based on different down payments or range specifications

${referenceContext}
${existingListingsContext}
${variantExamplesContext}

DEALER-SPECIFIC MATCHING EXAMPLES FOR ${finalDealerName}:
Based on the existing listings above, here are EXACT matches you must make:
- If you extract a Tucson Essential with 217 HP → Use "Essential 217 HK" (NOT "Tucson Essential 217 HK Automatik")
- If you extract a Kona Essential with 120 HP → Use "Essential 120 HK" (NOT "Kona Essential 120 HK Automatik") 
- If you extract a Tucson Executive AWD with 192 HP → Use "Executive Line AWD 192 HK" (NOT adding Automatik)
- Match the existing pattern EXACTLY - do not add model names or transmission types if they're not in the existing variant

Dealer: ${finalDealerName}
File: ${fileName || 'PDF Upload'}
${fileName && fileName.toLowerCase().includes('standard-range') ? 'IMPORTANT: This file is for STANDARD RANGE variant only - use lower WLTP values from any ranges shown.' : ''}
${fileName && fileName.toLowerCase().includes('long-range') ? 'IMPORTANT: This file is for LONG RANGE variant only - use higher WLTP values from any ranges shown.' : ''}
PDF TEXT:
${finalText}`

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

    // Call OpenAI with appropriate API
    console.log('[ai-extract-vehicles] Starting AI extraction...')
    const startTime = Date.now()
    
    const { response: aiResponse, apiVersion, tokensUsed } = await callOpenAIWithFallback({
      openai,
      context: dynamicContext,
      systemPrompt,
      userPrompt,
      useResponsesAPI: useResponsesAPI && !isEmergencyDisabled,
      storedPromptId,
      sessionId: batchId || 'unknown',
      dealerId: sellerId
    })

    const endTime = Date.now()
    console.log(`[ai-extract-vehicles] AI extraction completed in ${endTime - startTime}ms using ${apiVersion}`)

    // Extract cars from response
    const extractedCars: CompactExtractedVehicle[] = aiResponse.cars || []
    console.log('[ai-extract-vehicles] Successfully extracted ' + extractedCars.length + ' cars')

    // Create variant resolver
    const variantResolver = new VariantResolver(extractionContext)
    
    // Resolve variants and get statistics
    const variantResolutions = await variantResolver.resolveVariants(extractedCars)
    const resolutionStats = variantResolver.getResolutionStats(variantResolutions)
    
    console.log('[ai-extract-vehicles] Variant resolution stats:', resolutionStats)

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

    console.log('[ai-extract-vehicles] Expanded cars with variant tracking:', vehicles.length)
    
    console.log('🚗 Processing ' + vehicles.length + ' extracted vehicles for comparison')

    // Use the existing compare-extracted-listings edge function for sophisticated comparison
    const comparisonResponse = await fetch(`${supabaseUrl}/functions/v1/compare-extracted-listings`, {
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
    })

    if (!comparisonResponse.ok) {
      throw new Error(`Comparison failed: ${comparisonResponse.status} ${await comparisonResponse.text()}`)
    }

    const comparisonResult = await comparisonResponse.json()
    
    if (!comparisonResult.success) {
      throw new Error(`Comparison failed: ${comparisonResult.error}`)
    }

    console.log('🔍 Comparison completed:', {
      totalExtracted: comparisonResult.summary.totalExtracted,
      totalNew: comparisonResult.summary.totalNew,
      totalUpdated: comparisonResult.summary.totalUpdated,
      totalUnchanged: comparisonResult.summary.totalUnchanged,
      exactMatches: comparisonResult.summary.exactMatches,
      fuzzyMatches: comparisonResult.summary.fuzzyMatches
    })

    // Create extraction session with comparison results
    const sessionName = fileName || `PDF Extraction - ${finalDealerName || 'Unknown'} - ${new Date().toISOString().split('T')[0]}`
    
    // Create extraction session first (like original function)
    const { data: sessionData, error: sessionError } = await supabase
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
      .single()
    
    if (sessionError) {
      console.error('Error creating extraction session:', sessionError)
      throw sessionError
    }
    
    console.log(`[ai-extract-vehicles] Created extraction session:`, sessionData.id)
    const extractionSessionId = sessionData.id
    
    // Update session with results (like original function)
    const { error: updateError } = await supabase
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
      .eq('id', extractionSessionId)
    
    if (updateError) {
      console.error('Error updating session:', updateError)
      throw updateError
    }
    
    console.log('✅ Successfully updated extraction session:', extractionSessionId)
    
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
    
    const { error: changesError } = await supabase
      .from('extraction_listing_changes')
      .insert(changes)
    
    if (changesError) {
      console.error('Error storing extraction changes:', changesError)
      throw changesError
    }
    
    console.log('✅ Successfully stored extraction changes:', changes.length)
    
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

    console.log(`[ai-extract-vehicles] Extraction completed successfully`)
    
    return new Response(JSON.stringify({
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
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('[ai-extract-vehicles] Error:', error)
    
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
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})