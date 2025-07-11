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

// Optimize listings for large inventories
function buildOptimizedListingsContext(existingListings: any[]): string {
  if (!existingListings || existingListings.length === 0) {
    return ''
  }
  
  // If too many listings, prioritize variety
  let listingsToInclude = existingListings
  if (existingListings.length > 100) {
    // Group by make/model and take samples from each
    const grouped = existingListings.reduce((acc, listing) => {
      const key = `${listing.make}_${listing.model}`
      if (!acc[key]) acc[key] = []
      acc[key].push(listing)
      return acc
    }, {} as Record<string, any[]>)
    
    // Take up to 3 variants per make/model
    listingsToInclude = []
    Object.values(grouped).forEach((group: any[]) => {
      listingsToInclude.push(...group.slice(0, 3))
    })
    
    console.log(`[ai-extract-vehicles] Reduced listings from ${existingListings.length} to ${listingsToInclude.length}`)
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

CRITICAL OFFERS ARRAY STRUCTURE:
The "offers" array must have EXACTLY 5 elements in this ORDER:
[
  monthly_price,    // Position 0: RECURRING monthly payment (2,000-8,000 kr typical)
  down_payment,     // Position 1: INITIAL payment/førstegangsydelse (0-50,000 kr)
  months,           // Position 2: Contract duration (12, 24, 36, 48)
  km_per_year,      // Position 3: Annual mileage (10000, 15000, 20000, 25000, 30000)
  total_price       // Position 4: Total cost (optional, can be null)
]

⚠️ COMMON MISTAKES TO AVOID:
- If monthly price is >10,000 kr, it's probably the down payment by mistake
- Danish tables often show same monthly price with different down payments
- "Førstegangsydelse" = down payment (NOT monthly price!)

PDF Text:
${context.pdfText}

Extraction Instructions:
- Prioritize existing variants: ${context.extractionInstructions?.prioritizeExistingVariants || true}
- Merge transmission variants: ${context.extractionInstructions?.mergeTransmissionVariants || true}
- Range handling: ${context.extractionInstructions?.rangeHandling || 'use-context'}
- HP match threshold: ±${context.extractionInstructions?.variantMatchingRules?.hpMatchThreshold || 5} HP
- HP create threshold: >${context.extractionInstructions?.variantMatchingRules?.hpCreateThreshold || 10} HP
- Equipment separator: "${context.extractionInstructions?.variantMatchingRules?.equipmentSeparator || ' – '}"
- Strict variant matching: ${context.extractionInstructions?.variantMatchingRules?.strictMatching || true}`;

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
    console.log('[ai-extract-vehicles] Context data:', {
      sellerId,
      dealerName: finalDealerName,
      referenceDataKeys: Object.keys(safeReferenceData),
      existingListingsCount: safeExistingListings.existing_listings.length,
      textLength: finalText?.length
    })
    
    // Alert on potential issues
    if (sellerId && safeExistingListings.existing_listings.length === 0) {
      console.warn('[ai-extract-vehicles] No existing listings for dealer:', { sellerId, dealerName: finalDealerName })
    }
    
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
    if (safeReferenceData) {
      referenceContext = `\n\nDATABASE REFERENCE DATA FOR CONTEXT:
MAKES & MODELS: ${JSON.stringify(safeReferenceData.makes_models || {})}
FUEL TYPES: ${JSON.stringify(safeReferenceData.fuel_types || [])}
TRANSMISSIONS: ${JSON.stringify(safeReferenceData.transmissions || [])}
BODY TYPES: ${JSON.stringify(safeReferenceData.body_types || [])}

Use this reference data to ensure extracted data matches existing database values.`
    }

    // Prepare existing listings context with optimization for large inventories
    const existingListingsContext = buildOptimizedListingsContext(safeExistingListings.existing_listings)

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

    const userPrompt = `Extract all vehicles from this Danish PDF following the MANDATORY VARIANT MATCHING RULES.

🚨 MANDATORY 4-STEP PROCESS - FOLLOW EXACTLY 🚨

**Step 1:** For EACH car in the brochure:
- Find existing listing with same make, model, ±5 HP
- If found → USE THAT EXACT VARIANT NAME (copy character by character)
- Do NOT modify it (no adding/removing "Automatik", suffixes, etc.)

**Step 2:** Only create NEW variant if:
- HP differs by >10 from all existing
- Different trim level
- Different fuel type
- Same trim but with distinct factory equipment
- Different transmission type
- Different drivetrain

**Step 3:** When creating new variant:
- Find closest existing variant
- Copy its naming pattern EXACTLY
- For equipment: add " – " + equipment list

**Step 4:** Validate each extraction:
"Does this match an existing listing? Am I using the EXACT variant name?"

EXTRACTION RULES:
1. Extract ALL vehicles and ALL offers
2. Prices as numbers only (no "kr.", ",-")
3. Always "HK" for horsepower, never "kW"
4. Normalize brands ("Skoda" not "Škoda")
5. MERGE transmission variants (they're the same car)

DANISH TERMS TO EXTRACT:
- Monthly payment: "kr./md", "Ydelse pr. md"
- Down payment: "Førstegangsydelse", "Første betaling"
- Contract period: "36 måneder", "48 mdr"
- Annual mileage: "15.000 km/år", "20.000 km/år"
- Total price: "Totalpris"
- Horsepower: "HK" (never use kW)
- Technical specs: WLTP, CO2, fuel consumption, CO2 tax

OUTPUT FORMAT & OFFERS ARRAY STRUCTURE:

⚠️ CRITICAL: The "offers" array has EXACTLY 5 elements in this ORDER:
Position 0: monthly_price (månedlig ydelse) - The RECURRING payment (2,000-8,000 kr typical)
Position 1: down_payment (førstegangsydelse) - The INITIAL payment (0-50,000 kr typical)
Position 2: months (periode) - Contract duration (12, 24, 36, 48)
Position 3: km_per_year (km/år) - Annual mileage (10000, 15000, 20000, 25000, 30000)
Position 4: total_price (totalpris) - Total contract cost (optional, can be null)

EXAMPLE:
{
  "cars": [
    {
      "make": "Hyundai",
      "model": "Ioniq 6",
      "variant": "Advanced 229 HK",
      "hp": 229,
      "ft": 1,  // 1=Electric
      "tr": 1,  // 1=Automatic
      "bt": 3,  // 3=Sedan
      "wltp": 614,
      "co2": 0,
      "kwh100": 15.1,
      "tax": 0,
      "offers": [
        [4995, 9995, 36, 10000, 189815],   // 4,995 kr/md, 9,995 kr down, 36 months, 10k km/year
        [4995, 14995, 36, 15000, 194815],  // Same monthly, higher down payment
        [4995, 29995, 36, 20000, 209815]   // Same monthly, even higher down payment
      ]
    }
  ]
}

DANISH PRICING PATTERNS:
- Tables often show SAME monthly price with DIFFERENT down payments
- "Førstegangsydelse" = down payment (NOT monthly price!)
- "Månedlig ydelse" or "kr./md" = monthly price
- If you see 14,995 or 29,995 as "monthly" - it's probably the down payment!

EXAMPLES OF CORRECT MATCHING:
Based on existing listings, you MUST match exactly:
- Brochure shows "Tucson Essential 217 HP Automatic" → Use existing "Essential 217 HK" (NOT "Essential 217 HK Automatik")
- Brochure shows "Kona 120 HP Essential Auto" → Use existing "Essential 120 HK" (NOT creating new variant)
- Brochure shows "Executive AWD 192 HP" → Use existing "Executive Line AWD 192 HK" (exact match)

EQUIPMENT DIFFERENTIATION:
- Base trim: "Ultimate 325 HK 4WD"
- With equipment package: "Ultimate 325 HK 4WD – 20\" alufælge, soltag, BOSE"
- Each distinct equipment package gets its own entry

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

REMEMBER: Follow the 4-step process for EVERY vehicle:
1. Check existing listings (±5 HP)
2. Only create new if >10 HP difference or truly different config
3. Copy naming patterns exactly
4. Validate: "Am I using the EXACT existing variant name?"

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