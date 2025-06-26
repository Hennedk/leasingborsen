import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReferenceData {
  makes: Array<{id: string, name: string}>
  models: Array<{id: string, name: string, make_id: string}>
  bodyTypes: Array<{id: string, name: string}>
  fuelTypes: Array<{id: string, name: string}>
  transmissions: Array<{id: string, name: string}>
}

interface ExtractCarsRequest {
  textContent: string
  dealerName: string
  fileName?: string
  makeId?: string
  referenceData?: ReferenceData
}

interface LeaseOffer {
  monthly_price: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  total_price?: number
}

interface ExtractedCar {
  make: string
  model: string
  variant: string
  horsepower?: number
  engine_info?: string
  fuel_type: string
  transmission: string
  body_type: string
  seats?: number
  doors?: number
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  offers: LeaseOffer[]
  // Legacy fields for backward compatibility
  monthly_price?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  total_price?: number
}

interface ExtractCarsResponse {
  success: boolean
  cars?: ExtractedCar[]
  totalCars?: number
  error?: string
  metadata?: {
    processingTime: number
    tokensUsed?: number
    cost?: number
    originalTextLength?: number
    processedTextLength?: number
    compressionRatio?: number
  }
}

/**
 * Build dynamic prompt based on provided reference data and make selection
 */
function buildGenericPrompt(referenceData?: ReferenceData, makeId?: string): string {
  // Determine which make we're extracting for
  const selectedMake = makeId && referenceData ? 
    referenceData.makes.find(m => m.id === makeId) : null
  
  // Get models for the selected make
  const availableModels = selectedMake && referenceData ? 
    referenceData.models.filter(m => m.make_id === makeId) : []
  
  // Build make-specific or generic instructions
  const makeInstructions = selectedMake ? 
    `Du fokuserer på ${selectedMake.name} biler fra denne prisliste.` :
    `Du arbejder med en bilprisliste fra en dansk bilforhandler.`
  
  // Build model list
  const modelsList = availableModels.length > 0 ? 
    availableModels.map(m => `- ${m.name}`).join('\n') :
    `- Led efter alle bilmodeller i teksten
- Brug modelnavne som de står i prislisten
- Sørg for korrekt stavning og formatering
- For Skoda: Brug "Enyaq" i stedet for "Enyaq iV"`
  
  // Get database constraints
  const bodyTypes = referenceData?.bodyTypes.map(bt => `"${bt.name}"`).join(', ') || 
    '"Cabriolet", "Coupe", "Crossover (CUV)", "Hatchback", "Mikro", "Minibus (MPV)", "Sedan", "Stationcar", "SUV"'
  
  const fuelTypes = referenceData?.fuelTypes.map(ft => `"${ft.name}"`).join(', ') || 
    '"Petrol", "Diesel", "Electric", "Hybrid - Petrol", "Hybrid - Diesel", "Plug-in - Petrol", "Plug-in - Diesel"'
  
  const transmissions = referenceData?.transmissions.map(t => `"${t.name}"`).join(', ') || 
    '"Manual", "Automatic"'

  return `Du er en ekspert i danske bilprislister. ${makeInstructions}

VIGTIGE REGLER:
1. Find ALLE bilmodeller og varianter i teksten
2. For hver bil, find ALLE tilgængelige leasing tilbud (forskellige km/år, periode, priser)
3. Udtraher præcise månedlige priser som tal (uden valuta)
4. Udtraher førstegangsydelse (first payment) fra "Førstegangs" kolonne
5. Udtraher kontraktperiode fra "36 måneder" eller lignende
6. Udtraher kilometergrænse fra "15.000 km/år" eller lignende  
7. Udtraher totalpris hvis tilgængelig
8. Skab UNIKKE variant navne - ingen dubletter tilladt
9. Kombiner base variant + transmission/motor når nødvendigt
10. Udtraher HK (horsepower) som separat tal
11. Udtraher tekniske data når tilgængelig (WLTP, CO2, forbrug, afgift)
12. Standardisér brændstof og transmission til danske termer
13. Bestem biltype baseret på model
14. Ignorer headers, footers og legal tekst

MODELLER AT LEDE EFTER:
${modelsList}

UNIKKE VARIANT REGLER:
- Hvis samme model+variant har forskellige priser → tilføj transmission
- Hvis samme model+variant har forskellige motorer → tilføj motor info
- Hvis samme model+variant har forskellig HK → tilføj HK
- Eksempler: "Active Manual", "Active Automatic", "Executive 130 HK", "Sport AWD"

COMMON VARIANT PATTERNS:
- Active, Style, Executive, Comfort, Technology, Elegant, Sport, Plus
- Base, Essential, Advance, Premium, Luxury
- Manual, Automatic transmissions
- Different engine variants (e.g., "2.0 TDI", "1.4 TSI")

OUTPUT FORMAT (JSON):
{
  "cars": [
    {
      "make": "${selectedMake?.name || 'BrandName'}",
      "model": "ModelName", 
      "variant": "VariantName",
      "horsepower": 150,
      "fuel_type": "Hybrid - Petrol",
      "transmission": "Automatic",
      "body_type": "SUV",
      "seats": 5,
      "doors": 5,
      "year": 2025,
      "wltp": 245,
      "co2_emission": 105,
      "consumption_l_100km": 4.6,
      "consumption_kwh_100km": 14.2,
      "co2_tax_half_year": 1540,
      "offers": [
        {
          "monthly_price": 4999,
          "first_payment": 14997,
          "period_months": 36,
          "mileage_per_year": 15000,
          "total_price": 179964
        },
        {
          "monthly_price": 5299,
          "first_payment": 15897,
          "period_months": 48,
          "mileage_per_year": 20000,
          "total_price": 254352
        }
      ]
    }
  ]
}

TILLADT DATABASE VÆRDIER (brug KUN disse):
BODY_TYPE: ${bodyTypes}
TRANSMISSION: ${transmissions}
FUEL_TYPE: ${fuelTypes}

MULTIPLE OFFERS EXTRACTION (KRITISK):
- HVER bil kan have FLERE tilbud med forskellige termer
- Led efter tabeller med FLERE rækker for samme bil/variant
- Forskellige km/år grænser: 10.000, 15.000, 20.000, 25.000
- Forskellige perioder: 24, 36, 48 måneder
- Forskellige førstegangsydelser baseret på periode/km
- SAMLET alle tilbud for samme bil i offers array

LEASE TERMER AT LEDE EFTER:
- "Ydelse pr. md" eller "kr./md" → monthly_price
- "Førstegangs" eller "Første betaling" → first_payment 
- "36 måneder" eller "mdr" → period_months (konverter til tal)
- "15.000 km/år" eller lignende → mileage_per_year (konverter til tal)
- "Totalpris" → total_price
- Tabeller med kolonner som "Ydelse", "Førstegangs", "Totalpris"

TEKNISKE DATA AT LEDE EFTER (VALGFRIT):
- "WLTP" eller "rækkevidde" → wltp (km, kun for elbiler)
- "CO2" eller "g/km" → co2_emission (gram per kilometer)
- "km/l" eller "l/100km" → consumption_l_100km (liter per 100 km)
- "kWh/100km" → consumption_kwh_100km (kun for el/hybrid)
- "Halvårsafgift" eller "afgift" → co2_tax_half_year (kroner per halvår)
- "sæder" eller "personer" → seats (antal siddepladser)
- "døre" → doors (antal døre)

COMPLETENESS CHECK:
- Find ALLE modeller og varianter i prislisten
- Hvis færre end forventet antal biler findes, gennemgå teksten igen
- Led særligt efter biler på sidste sider som ofte mangler

VIGTIG BEMÆRKNING OM OFFERS:
- HVER bil SKAL have mindst ét tilbud i offers array
- Hvis der kun findes én prisrække, brug den som det ene tilbud
- Hvis der findes flere prisrækker for samme bil, inkludér ALLE som separate tilbud
- Undgå tomme offers arrays - hver bil skal have data

Analysér denne bilprisliste grundigt og returner ALLE fundne biler som valid JSON med unikke variant navne, korrekt model formatering og komplette tilbudsdata.`
}

/**
 * Generic text cleaner that works for most car brands
 */
function cleanGenericText(text: string): string {
  let cleaned = text
  
  // Step 1: Remove common noise patterns
  const noisePatterns = [
    /Forbrugstal er beregnet efter WLTP-metode.*?(?=\n|$)/gm,
    /Positiv kreditgodk\. kræves.*?(?=\n|$)/gm,
    /Ønsker du flere kilometer.*?forhandler\.?/gm,
    /Alle ydelser er inkl\..*?(?=\n|$)/gm,
    /\n{3,}/gm, // Multiple newlines
    /\s{3,}/gm, // Multiple spaces
  ]
  
  noisePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '\n')
  })
  
  // Step 2: Extract pricing data sections
  const lines = cleaned.split('\n')
  const relevantLines: string[] = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Keep lines with pricing data, model names, or variants
    const hasRelevantData = 
      /\d{1,3}[.,]\d{3}\s*(?:kr|DKK)/i.test(trimmedLine) || // Price format
      /\d+\s*(?:HK|hk|kWh)/i.test(trimmedLine) || // Power/battery
      /(Active|Style|Executive|Comfort|Technology|Elegant|Sport|Plus|Base|Premium)/i.test(trimmedLine) || // Variants
      /(benzin|diesel|hybrid|aut\.|automatgear|manual)/i.test(trimmedLine) || // Engine/transmission
      /\d+-dørs/i.test(trimmedLine) || // Door count
      /måneder|mdr/i.test(trimmedLine) || // Contract terms
      /km\/år/i.test(trimmedLine) // Mileage
    
    if (hasRelevantData || trimmedLine.length > 3) {
      relevantLines.push(trimmedLine)
    }
  }
  
  // Step 3: Final cleanup and size management
  let finalText = relevantLines.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim()
  
  // Ensure we don't exceed token limits - increased for longer dealer PDFs
  const maxChars = 40000 // ~10,000 tokens - allows for more comprehensive extraction
  if (finalText.length > maxChars) {
    finalText = finalText.substring(0, maxChars) + '\n\n[Text truncated for processing...]'
  }
  
  return finalText || text.substring(0, maxChars)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { textContent, dealerName, fileName, makeId, referenceData } = await req.json() as ExtractCarsRequest

    if (!textContent || textContent.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Text content is required and must be at least 10 characters' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting generic car extraction for dealer: ${dealerName}`)
    console.log(`Make ID: ${makeId || 'Not specified'}`)
    console.log(`Original text length: ${textContent.length} characters`)
    console.log(`Estimated pages: ${Math.ceil(textContent.length / 2000)} (based on ~2000 chars/page)`)

    const startTime = Date.now()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Clean the API key (remove any whitespace)
    const cleanApiKey = openaiApiKey.trim()

    // Use generic text cleaner
    let processedText = cleanGenericText(textContent)
    console.log(`Generic cleaner processed text: ${processedText.length} characters (from ${textContent.length})`)
    
    // Build dynamic prompt
    const dynamicPrompt = buildGenericPrompt(referenceData, makeId)
    console.log(`Built dynamic prompt for make: ${makeId ? 'specific' : 'generic'}`)
    
    // Log a sample to see what we're sending
    console.log(`Final text being sent to OpenAI: ${processedText.length} characters`)
    console.log(`First 500 chars being sent to OpenAI:`)
    console.log(processedText.substring(0, 500))

    // Prepare API call with dynamic prompt
    const messages = [
      {
        role: "system",
        content: dynamicPrompt
      },
      {
        role: "user", 
        content: `Dealer: ${dealerName}\n${fileName ? `Fil: ${fileName}\n` : ''}Bilprisliste tekst:\n\n${processedText}`
      }
    ]

    try {
      // Call OpenAI API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 120 second timeout for longer PDFs
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: messages,
          max_tokens: 6000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
      }

      const openaiResult = await response.json()
      const processingTime = Date.now() - startTime

      console.log(`OpenAI response received in ${processingTime}ms`)
      console.log(`Tokens used: ${openaiResult.usage?.total_tokens || 'unknown'}`)

      // Parse the extracted cars
      let extractedCars: ExtractedCar[] = []
      try {
        const messageContent = openaiResult.choices[0].message.content
        console.log(`Raw OpenAI response: ${messageContent.substring(0, 500)}...`)
        
        const aiResponse = JSON.parse(messageContent)
        extractedCars = aiResponse.cars || []
        
        // Validate and clean the extracted data
        extractedCars = extractedCars.filter(car => 
          car.make && car.model && (car.offers?.length > 0 || car.monthly_price)
        ).map(car => {
          // Process offers array or create from legacy fields
          let offers: LeaseOffer[] = []
          
          if (car.offers && Array.isArray(car.offers) && car.offers.length > 0) {
            // Use new offers array format
            offers = car.offers.map(offer => ({
              monthly_price: typeof offer.monthly_price === 'number' ? offer.monthly_price : 
                           parseFloat(String(offer.monthly_price).replace(/[^\d,]/g, '').replace(',', '.')) || 0,
              first_payment: offer.first_payment ? 
                           (typeof offer.first_payment === 'number' ? offer.first_payment : 
                            parseFloat(String(offer.first_payment).replace(/[^\d,]/g, '').replace(',', '.')) || undefined) : undefined,
              period_months: offer.period_months || 36,
              mileage_per_year: offer.mileage_per_year || 15000,
              total_price: offer.total_price ? 
                         (typeof offer.total_price === 'number' ? offer.total_price : 
                          parseFloat(String(offer.total_price).replace(/[^\d,]/g, '').replace(',', '.')) || undefined) : undefined
            }))
          } else if (car.monthly_price) {
            // Create offers from legacy fields for backward compatibility
            const monthlyPrice = typeof car.monthly_price === 'number' ? car.monthly_price : 
                               parseFloat(String(car.monthly_price).replace(/[^\d,]/g, '').replace(',', '.')) || 0
            offers = [{
              monthly_price: monthlyPrice,
              first_payment: car.first_payment ? 
                           (typeof car.first_payment === 'number' ? car.first_payment : 
                            parseFloat(String(car.first_payment).replace(/[^\d,]/g, '').replace(',', '.')) || undefined) : undefined,
              period_months: car.period_months || 36,
              mileage_per_year: car.mileage_per_year || 15000,
              total_price: car.total_price ? 
                         (typeof car.total_price === 'number' ? car.total_price : 
                          parseFloat(String(car.total_price).replace(/[^\d,]/g, '').replace(',', '.')) || undefined) : undefined
            }]
          }

          return {
            ...car,
            // Ensure horsepower is a number if provided
            horsepower: car.horsepower ? (typeof car.horsepower === 'number' ? car.horsepower : parseInt(String(car.horsepower))) : undefined,
            // Default year if not provided
            year: car.year || 2025,
            // Default doors if not provided
            doors: car.doors || 5,
            // Processed offers array
            offers,
            // Keep legacy fields for backward compatibility
            monthly_price: offers[0]?.monthly_price || 0,
            first_payment: offers[0]?.first_payment,
            period_months: offers[0]?.period_months,
            mileage_per_year: offers[0]?.mileage_per_year,
            total_price: offers[0]?.total_price
          }
        })

      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        throw new Error('Failed to parse AI response as JSON')
      }

      console.log(`Successfully extracted ${extractedCars.length} cars`)

      // Construct response
      const extractResponse: ExtractCarsResponse = {
        success: true,
        cars: extractedCars,
        totalCars: extractedCars.length,
        metadata: {
          processingTime,
          tokensUsed: openaiResult.usage?.total_tokens,
          cost: openaiResult.usage?.total_tokens ? (openaiResult.usage.total_tokens * 0.00003) : undefined,
          originalTextLength: textContent.length,
          processedTextLength: processedText.length,
          compressionRatio: Math.round((1 - processedText.length / textContent.length) * 100)
        }
      }

      return new Response(
        JSON.stringify(extractResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (apiError) {
      console.error('OpenAI API error:', apiError)
      if (apiError.name === 'AbortError') {
        throw new Error('Request timed out after 120 seconds')
      }
      throw apiError
    }

  } catch (error) {
    console.error('Car extraction error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during car extraction'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})