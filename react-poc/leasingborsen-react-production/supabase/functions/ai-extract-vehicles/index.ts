import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from "https://esm.sh/openai@4.76.0"

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

    // Stored prompt configuration
    const useStoredPrompt = Deno.env.get('USE_OPENAI_STORED_PROMPT') === 'true'
    const storedPromptId = Deno.env.get('OPENAI_STORED_PROMPT_ID')
    
    console.log('[ai-extract-vehicles] Prompt configuration:', {
      useStoredPrompt,
      storedPromptId: storedPromptId ? 'configured' : 'not configured'
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
      existingListingsContext = `\n\nEXISTING DEALER LISTINGS FOR CONSISTENT VARIANT NAMING:
${JSON.stringify(existingListings.existing_listings, null, 2)}

CRITICAL VARIANT NAMING RULES:
1. When you find a car that matches an existing listing (same make + model + similar specs), USE THE EXISTING VARIANT NAME
2. Only use a different variant name if:
   - The horsepower is significantly different (±10 HP)
   - The transmission type is different (Manual vs Automatic)
   - The fuel type is different
   - You identify it as a genuinely new variant not in the existing listings
3. Examples:
   - If existing listing has "Active 72 HK" and you extract a 72HP Active variant → use "Active 72 HK"
   - If existing listing has "Style 116 HK" and you extract a 116HP Style variant → use "Style 116 HK"
   - If existing listing has "Executive AWD 343 HK" and you extract a 343HP AWD Executive → use "Executive AWD 343 HK"
4. This ensures consistent naming across multiple PDF uploads of the same dealer catalog`
    }

    // Load variant examples for AI guidance
    let variantExamplesContext = ''
    try {
      const variantExamplesText = await Deno.readTextFile('./variant-examples.json')
      const variantExamples = JSON.parse(variantExamplesText)
      
      variantExamplesContext = `\n\nVARIANT NAMING EXAMPLES FOR INSPIRATION:
${JSON.stringify(variantExamples, null, 2)}

CRITICAL: Use these real-world patterns as inspiration for consistent variant naming.
- Follow these exact patterns when possible, replacing {hp} with actual horsepower
- Prioritize matching existing dealer listings over these examples
- These examples show proper Danish market naming conventions`
    } catch (error) {
      console.warn('Could not load variant examples:', error)
      // Continue without variant examples if file load fails
    }


    // Modern modular prompt structure for better maintainability
    const systemPrompt = `You are a Danish vehicle leasing data extractor. Your task is to parse car leasing brochures written in Danish and return structured, compact JSON containing:
- All car models and variants
- All leasing offers (multiple per car)
- Technical data (when available)

Use normalized terms and remove accents (e.g., use "Skoda" not "Škoda").

## Key Requirements
1. Extract ALL vehicles from the brochure (including variants like Sportback, RS, GT)
2. Extract ALL leasing offers for each vehicle (different mileage/period options)
3. Use numeric codes for fuel_type, transmission, and body_type as specified
4. Always use "HK" for horsepower in variant names, never "kW"
5. Match variant names to existing patterns when possible

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

EXTRACTION RULES:
1. Find ALL car models and variants in the document
2. Extract ALL leasing offers for each car (multiple offers per car are common)
3. Extract prices as numbers only (remove "kr.", ",-" etc.)
4. Use existing variant naming patterns when possible
5. Include transmission/engine/HP in variant names when needed to differentiate
6. Always use "HK" for horsepower in variant names, never "kW"
7. Normalize brand names (e.g., "Skoda" not "Škoda")

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

CRITICAL DEDUPLICATION RULE:
If the same make + model + variant appears multiple times with identical technical specs (same WLTP, CO2, HP, etc.), merge them into ONE entry with ALL offers combined in the offers array. Only create separate entries when technical specifications differ (e.g., different WLTP values indicating different battery/engine configurations).

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

Dealer: ${finalDealerName}
File: ${fileName || 'PDF Upload'}
${fileName && fileName.toLowerCase().includes('standard-range') ? 'IMPORTANT: This file is for STANDARD RANGE variant only - use lower WLTP values from any ranges shown.' : ''}
${fileName && fileName.toLowerCase().includes('long-range') ? 'IMPORTANT: This file is for LONG RANGE variant only - use higher WLTP values from any ranges shown.' : ''}
PDF TEXT:
${finalText}`

    // Prepare dynamic content for stored prompt
    const dynamicContent = `${referenceContext}${existingListingsContext}${variantExamplesContext}

Dealer: ${finalDealerName}
File: ${fileName || 'PDF Upload'}
${fileName && fileName.toLowerCase().includes('standard-range') ? 'IMPORTANT: This file is for STANDARD RANGE variant only - use lower WLTP values from any ranges shown.' : ''}
${fileName && fileName.toLowerCase().includes('long-range') ? 'IMPORTANT: This file is for LONG RANGE variant only - use higher WLTP values from any ranges shown.' : ''}
PDF TEXT:
${finalText}`

    // Call OpenAI with either stored prompt or inline prompts
    let completion
    if (useStoredPrompt && storedPromptId) {
      console.log('[ai-extract-vehicles] Using stored prompt:', storedPromptId)
      
      // For now, let's use the inline prompt approach since stored prompts 
      // require special API access or different configuration
      console.log('[ai-extract-vehicles] Falling back to inline prompts due to stored prompt API issues')
      
      // Using inline prompts with the same system prompt as the stored one
      completion = await openai.chat.completions.create({
        model: 'gpt-4.1',
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
    } else {
      console.log('[ai-extract-vehicles] Using inline prompts')
      
      // Using inline prompts (current approach)
      completion = await openai.chat.completions.create({
        model: 'gpt-4.1',
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
    }

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('Empty response from AI')
    }

    console.log('[ai-extract-vehicles] AI Response:', response.substring(0, 500) + '...')

    let extractedCars = []
    try {
      // Extract JSON from response (handle cases where AI adds explanation text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }
      
      const parsedData = JSON.parse(jsonMatch[0])
      extractedCars = parsedData.cars || []
      console.log('[ai-extract-vehicles] Successfully extracted ' + extractedCars.length + ' cars')
    } catch (parseError: any) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI response content:', response)
      throw new Error('Failed to parse AI response: ' + (parseError.message || String(parseError)))
    }

    // Convert from compact format to full format (like original function)
    const fuelTypeMap = {
      1: 'Electric',
      2: 'Hybrid - Petrol', 
      3: 'Petrol',
      4: 'Diesel',
      5: 'Hybrid - Diesel',
      6: 'Plug-in - Petrol',
      7: 'Plug-in - Diesel'
    }

    const transmissionMap = {
      1: 'Automatic',
      2: 'Manual'
    }

    const bodyTypeMap = {
      1: 'SUV',
      2: 'Hatchback',
      3: 'Sedan', 
      4: 'Stationcar',
      5: 'Coupe',
      6: 'Cabriolet',
      7: 'Crossover (CUV)',
      8: 'Minibus (MPV)',
      9: 'Mikro'
    }

    // Expand cars from compact to full format
    const vehicles = extractedCars.map((car: any) => {
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
        variant: car.variant,
        horsepower: car.hp,
        fuel_type: fuelTypeMap[car.ft as keyof typeof fuelTypeMap] || 'Petrol',
        transmission: transmissionMap[car.tr as keyof typeof transmissionMap] || 'Manual', 
        body_type: bodyTypeMap[car.bt as keyof typeof bodyTypeMap] || 'Hatchback',
        wltp: car.wltp,
        co2_emission: car.co2,
        consumption_l_100km: car.l100,
        consumption_kwh_100km: car.kwh100,
        co2_tax_half_year: car.tax,
        offers
      }
    })

    console.log('[ai-extract-vehicles] Expanded cars:', vehicles.length)
    
    console.log('🚗 Processing ' + vehicles.length + ' extracted vehicles for comparison')

    // Use the existing compare-extracted-listings edge function for sophisticated comparison
    const comparisonResponse = await fetch(`${supabaseUrl}/functions/v1/compare-extracted-listings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        extractedCars: vehicles, // Already in proper format after expansion
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
        started_at: new Date().toISOString()
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
        confidence: match.confidence
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
    
    // Use the comparison results for statistics
    const totalNew = comparisonResult.summary.totalNew
    const totalUpdated = comparisonResult.summary.totalUpdated  
    const totalUnchanged = comparisonResult.summary.totalUnchanged

    console.log(`[ai-extract-vehicles] Extraction completed successfully`)
    
    return new Response(JSON.stringify({
      success: true,
      extractionSessionId: extractionSessionId,
      itemsProcessed: comparisonResult.summary.totalExtracted,
      summary: comparisonResult.summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('[ai-extract-vehicles] Error:', error)
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