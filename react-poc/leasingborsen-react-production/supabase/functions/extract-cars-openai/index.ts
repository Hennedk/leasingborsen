import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractCarsRequest {
  textContent: string
  dealerName: string
  fileName?: string
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
  }
}

// Advanced Toyota-specific text cleaner based on the Python cleaner patterns
function cleanToyotaText(text: string): string {
  let cleaned = text
  
  // Step 1: Remove Toyota-specific noise patterns
  const toyotaNoisePatterns = [
    /TOYOTA PRISLISTE.*?PRIVATLEASING.*?\d+\.\s*\w+\s+\d{4}/gm, // Header
    /Forbrugstal er beregnet efter WLTP-metode.*?KLIK HER/gm, // WLTP info
    /Positiv kreditgodk\. kræves.*?Financial Services Danmark A\/S\./gm, // Legal disclaimer
    /SE UDSTYRSVARIANTER HER/gm, // Equipment links
    /MULIGHED FOR TILVALG AF TILBEHØRSPAKKER.*?Toyota-forhandler\./gm, // Accessory packages
    /Ønsker du flere kilometer.*?Toyota-forhandler\./gm, // Extra km info
    /Alle ydelser er inkl\.:.*?ekstraudstyr\./gm, // Inclusions/exclusions
    /\n{3,}/gm, // Multiple newlines
    /\s{3,}/gm, // Multiple spaces
  ]
  
  toyotaNoisePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '\n')
  })
  
  // Step 2: Extract and organize car sections
  const carSections: string[] = []
  const lines = cleaned.split('\n')
  
  // Toyota model patterns - including Urban Cruiser
  const toyotaModels = [
    'AYGO X', 'YARIS', 'YARIS CROSS', 'URBAN CRUISER', 'COROLLA', 'COROLLA TOURING SPORTS',
    'C-HR', 'RAV4', 'HIGHLANDER', 'BZ4X', 'PROACE'
  ]
  
  let currentModel = ''
  let currentSection: string[] = []
  let inDataSection = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check if this line is a Toyota model header
    const modelMatch = toyotaModels.find(model => line.includes(model))
    if (modelMatch) {
      // Save previous section
      if (currentModel && currentSection.length > 0) {
        carSections.push(`${currentModel}\n${currentSection.join('\n')}`)
      }
      
      // Start new section
      currentModel = modelMatch
      currentSection = []
      inDataSection = false
      continue
    }
    
    // Check if we're in a data section (contains pricing data)
    const hasRelevantData = 
      /\d{1,3}[.,]\d{3}\s*(?:kr|DKK)/i.test(line) || // Price format
      /\d+\s*(?:HK|hk|kWh)/i.test(line) || // Power/battery
      /(Active|Style|Executive|Comfort|Technology|Elegant|Plus|Sport|Pulse|GR)/i.test(line) || // Variants
      /(benzin|diesel|hybrid|aut\.|automatgear)/i.test(line) || // Engine/transmission
      /\d+-dørs/i.test(line) || // Door count
      /36 MÅNEDER|måneder/i.test(line) // Contract terms
    
    if (hasRelevantData) {
      inDataSection = true
    }
    
    // Add lines that contain data or are part of a data section
    if (inDataSection && line.length > 0) {
      // Stop data section if we hit certain patterns
      if (line.includes('Ydelse') && line.includes('Førstegangs') && line.includes('Totalpris')) {
        currentSection.push(line) // Include header
        continue
      }
      
      currentSection.push(line)
      
      // Reset data section flag after empty line or non-data line
      if (line.length === 0 || (!hasRelevantData && currentSection.length > 5)) {
        inDataSection = false
      }
    }
  }
  
  // Add final section
  if (currentModel && currentSection.length > 0) {
    carSections.push(`${currentModel}\n${currentSection.join('\n')}`)
  }
  
  // Step 3: Join sections with clear separators
  const structuredText = carSections
    .filter(section => section.length > 50)
    .join('\n\n=== MODEL SEPARATOR ===\n\n')
  
  // Step 4: Final cleanup and size management
  let finalText = structuredText
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim()
  
  // Ensure we don't exceed token limits
  const maxChars = 50000 // ~12500 tokens - increased to capture all models
  if (finalText.length > maxChars) {
    // Truncate but try to keep complete sections
    const sections = finalText.split('=== MODEL SEPARATOR ===')
    let truncatedText = ''
    
    for (const section of sections) {
      if (truncatedText.length + section.length < maxChars) {
        truncatedText += (truncatedText ? '\n\n=== MODEL SEPARATOR ===\n\n' : '') + section
      } else {
        break
      }
    }
    
    finalText = truncatedText + '\n\n[Additional models truncated to stay within processing limits]'
  }
  
  return finalText || text.substring(0, maxChars)
}

const CAR_EXTRACTION_PROMPT = `Du er en ekspert i danske Toyota bilprislister. Din opgave er at identificere og udtrække struktureret data om alle Toyota bilvarianter fra den givne tekstdel.

VIGTIGE REGLER:
1. Find ALLE Toyota modeller og varianter i teksten
2. For hver bil, find ALLE tilgængelige leasing tilbud (forskellige km/år, periode, priser)
3. Udtraher præcise månedlige priser som tal (uden valuta)
4. Udtraher førstegangsydelse (first payment) fra "Førstegangs" kolonne
5. Udtraher kontraktperiode fra "36 måneder" eller lignende
6. Udtraher kilometergrænse fra "15.000 km/år" eller lignende  
7. Udtraher totalpris hvis tilgængelig
8. Skab UNIKKE variant navne - ingen dubletter tilladt
9. Kombiner base variant + transmission/motor når nødvendigt
10. Udtraher HK (horsepower) som separat tal
11. Standardisér brændstof og transmission til danske termer
12. Bestem biltype baseret på model
13. Ignorer headers, footers og legal tekst

UNIKKE VARIANT REGLER:
- Hvis samme model+variant har forskellige priser → tilføj transmission
- Hvis samme model+variant har forskellige motorer → tilføj motor info
- Hvis samme model+variant har forskellig HK → tilføj HK
- Eksempler: "Active Manual", "Active Automatic", "Executive 130 HK", "Active AWD"

TOYOTA MODELLER AT LEDE EFTER (brug PRÆCIS disse navne i output):
- Aygo X (Active, Pulse variants) - Småbil
- Yaris (Active, Style, Style Comfort, Style Technology variants) - Småbil  
- Yaris Cross (Active, Style, Executive, Elegant, GR Sport variants) - SUV
- Urban Cruiser (Active Hybrid, Style Hybrid variants) - SUV
- Corolla (Active, Style variants) - Kompaktbil
- C-HR (Active, Style, Executive variants) - SUV
- RAV4 (Active, Style, Executive variants) - SUV
- Highlander (Executive variants) - SUV
- bZ4X (Active, Executive variants) - SUV (BEMÆRK: lille 'b')
- Proace (Work, Nomad, Family variants) - Van

KRITISK - YARIS VARIANT SPECIFICATION:
- Yaris Active (manual og automatisk transmission)
- Yaris Style (manual og automatisk transmission)  
- Yaris Style Comfort (automatisk transmission)
- Yaris Style Technology (automatisk transmission)
- ALLE fire Yaris varianter SKAL inkluderes - led specifikt efter Style Comfort og Style Technology

KRITISK - YARIS CROSS VARIANT SPECIFICATION:
- Yaris Cross Active (5-dørs 1.5 Hybrid 130 hk aut.)
- Yaris Cross Style (5-dørs 1.5 Hybrid 130 hk aut.)
- Yaris Cross Executive (5-dørs 1.5 Hybrid 130 hk aut.)
- Yaris Cross Elegant (5-dørs 1.5 Hybrid 130 hk aut.)
- Yaris Cross GR Sport (5-dørs 1.5 Hybrid 130 hk aut.)
- ALLE fem Yaris Cross varianter SKAL inkluderes - led specifikt efter Elegant og GR Sport

OUTPUT FORMAT (JSON):
{
  "cars": [
    {
      "make": "Toyota",
      "model": "Aygo X", 
      "variant": "Active Manual",
      "horsepower": 72,
      "fuel_type": "Petrol",
      "transmission": "Manual",
      "body_type": "Hatchback",
      "doors": 5,
      "year": 2025,
      "offers": [
        {
          "monthly_price": 2699,
          "first_payment": 8097,
          "period_months": 36,
          "mileage_per_year": 15000,
          "total_price": 97164
        },
        {
          "monthly_price": 2899,
          "first_payment": 8697,
          "period_months": 48,
          "mileage_per_year": 20000,
          "total_price": 139152
        }
      ]
    },
    {
      "make": "Toyota",
      "model": "Aygo X", 
      "variant": "Active Automatic",
      "horsepower": 72,
      "fuel_type": "Petrol",
      "transmission": "Automatic",
      "body_type": "Hatchback",
      "doors": 5,
      "year": 2025,
      "offers": [
        {
          "monthly_price": 2999,
          "first_payment": 8997,
          "period_months": 36,
          "mileage_per_year": 15000,
          "total_price": 107964
        }
      ]
    }
  ]
}

BRÆNDSTOFTYPER (kun tilladt database værdier):
- "Petrol" (for VVT-i benzinmotorer)
- "Hybrid - Petrol" (for hybrid systemer)
- "Electric" (for elektriske BZ4X)

TRANSMISSION (kun tilladt database værdier):
- "Manual" (manuel gearkasse)
- "Automatic" (automatisk gearkasse)

BILTYPER (kun tilladt database værdier):
- Aygo X, Yaris: "Hatchback"
- Yaris Cross, Urban Cruiser, C-HR, RAV4, Highlander, bZ4X: "SUV"
- Corolla: "Hatchback"
- Proace: "Minibus (MPV)"

MOTOR INFO PARSING:
- Udtraher kun HK som tal: "72 HK" → horsepower: 72
- Udtraher motor detaljer: "1.0 VVT-i 72 HK" → engine_info: "1.0 VVT-i"
- For elektrisk: "57,7 kWh 167 HK" → engine_info: "57,7 kWh", horsepower: 167
- For AWD: "73,1 kWh 343 HK AWD" → engine_info: "73,1 kWh AWD", horsepower: 343

MULTIPLE OFFERS EXTRACTION (KRITISK):
- HVER bil kan have FLERE tilbud med forskellige termer
- Led efter tabeller med FLERE rækker for samme bil/variant
- Forskellige km/år grænser: 10.000, 15.000, 20.000, 25.000
- Forskellige perioder: 24, 36, 48 måneder
- Forskellige førstegangsydelser baseret på periode/km
- SAMLET alle tilbud for samme bil i offers array
- Eksempel: Aygo X Active Manual kan have 3 tilbud: 15k km/36 mdr, 20k km/36 mdr, 15k km/48 mdr
- Led efter kolonner som "10.000 km", "15.000 km", "20.000 km" i samme tabel
- Led efter forskellige perioder: "24 mdr", "36 mdr", "48 mdr"

LEASE TERMER AT LEDE EFTER:
- "Ydelse pr. md" eller "kr./md" → monthly_price
- "Førstegangs" eller "Første betaling" → first_payment 
- "36 måneder" eller "mdr" → period_months (konverter til tal)
- "15.000 km/år" eller lignende → mileage_per_year (konverter til tal)
- "Totalpris" → total_price
- Tabeller med kolonner som "Ydelse", "Førstegangs", "Totalpris"
- Led efter FLERE rækker med forskellige kombinationer af km/år og periode

DØRE/ÅR:
- AYGO X, YARIS, COROLLA: doors: 5
- YARIS CROSS, C-HR, RAV4, BZ4X: doors: 5
- HIGHLANDER: doors: 5
- PROACE: doors: 4
- year: 2025 (alle er 2025 modeller)

KRITISK: Brug KUN disse eksakte database værdier:
BODY_TYPE: "Cabriolet", "Coupe", "Crossover (CUV)", "Hatchback", "Mikro", "Minibus (MPV)", "Sedan", "Stationcar", "SUV"
TRANSMISSION: "Manual", "Automatic"  
FUEL_TYPE: "Petrol", "Diesel", "Electric", "Hybrid - Petrol", "Hybrid - Diesel", "Plug-in - Petrol", "Plug-in - Diesel"

VARIANT UNIQUENESS EKSEMPLER:
- AYGO X Active (Manual) → variant: "Active Manual"
- AYGO X Active (Automatic) → variant: "Active Automatic"  
- BZ4X Active (167 HK) → variant: "Active 167 HK"
- BZ4X Active (224 HK) → variant: "Active 224 HK"
- BZ4X Active (343 HK AWD) → variant: "Active AWD"

HVER model+variant kombination SKAL være unik. Tilføj transmission, HK eller andre forskelle til variant navnet.

MODEL NAVN FORMATERING (KRITISK):
- Brug PRÆCIS den formatering vist i TOYOTA MODELLER listen ovenfor
- "Aygo X" IKKE "AYGO X"
- "Yaris" IKKE "YARIS"  
- "Yaris Cross" IKKE "YARIS CROSS"
- "bZ4X" IKKE "BZ4X" (bemærk lille 'b')
- "Urban Cruiser" IKKE "URBAN CRUISER"

VIGTIG BEMÆRKNING OM OFFERS:
- HVER bil SKAL have mindst ét tilbud i offers array
- Hvis der kun findes én prisrække, brug den som det ene tilbud
- Hvis der findes flere prisrækker for samme bil, inkludér ALLE som separate tilbud
- Undgå tomme offers arrays - hver bil skal have data

COMPLETENESS CHECK - FORVENTET ANTAL:
- Toyota prislister indeholder typisk 27 forskellige bil-variants
- Sørg for at finde ALLE Yaris varianter: Active, Style, Style Comfort, Style Technology (4 total)
- Sørg for at finde ALLE Yaris Cross varianter: Active, Style, Executive, Elegant, GR Sport (5 total)
- Led særligt efter Urban Cruiser på sidste side hvis de mangler
- Led særligt efter Yaris Cross Elegant og GR Sport som ofte mangler
- Hvis mindre end 25 biler findes, gennemgå teksten igen for manglende modeller

Analysér denne Toyota tekstdel grundigt og returner ALLE fundne biler som valid JSON med unikke variant navne, korrekt model formatering og komplette tilbudsdata.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { textContent, dealerName, fileName } = await req.json() as ExtractCarsRequest

    if (!textContent || textContent.trim().length < 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Text content is required and must be at least 10 characters' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Starting OpenAI car extraction for dealer: ${dealerName}`)
    console.log(`Original text length: ${textContent.length} characters`)

    const startTime = Date.now()

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Clean the API key (remove any whitespace)
    const cleanApiKey = openaiApiKey.trim()

    // Use Toyota-specific cleaner for better structure
    let processedText = cleanToyotaText(textContent)
    console.log(`Toyota cleaner processed text: ${processedText.length} characters (from ${textContent.length})`)
    
    // Limit text size to prevent timeouts - increased to capture all models including Urban Cruiser
    const maxChars = 30000 // ~7,500 tokens - should capture all Toyota models
    if (processedText.length > maxChars) {
      processedText = processedText.substring(0, maxChars) + '\n\n[Text truncated for processing...]'
      console.log(`Text truncated to ${maxChars} characters to prevent timeout`)
    }
    
    // Log a sample to see what we're sending
    console.log(`Final text being sent to OpenAI: ${processedText.length} characters`)
    console.log(`First 500 chars being sent to OpenAI:`)
    console.log(processedText.substring(0, 500))
    
    // Log the structure we created
    const sections = processedText.split('=== MODEL SEPARATOR ===')
    console.log(`Toyota cleaner created ${sections.length} model sections`)
    sections.slice(0, 3).forEach((section, i) => {
      console.log(`Section ${i + 1} preview: ${section.substring(0, 100)}...`)
    })

    // Prepare single API call with preprocessed text
    const messages = [
      {
        role: "system",
        content: CAR_EXTRACTION_PROMPT
      },
      {
        role: "user", 
        content: `Dealer: ${dealerName}\n${fileName ? `Fil: ${fileName}\n` : ''}Toyota-struktureret tekst:\n\n${processedText}`
      }
    ]

    try {
      // Call OpenAI API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
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
        throw new Error('Request timed out after 30 seconds')
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