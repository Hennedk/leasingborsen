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

interface ExtractedCar {
  make: string
  model: string
  variant: string
  monthlyPrice: string
  priceNum: number
  engineInfo?: string
  fuelType?: string
  transmission?: string
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
  
  // Toyota model patterns
  const toyotaModels = [
    'AYGO X', 'YARIS', 'YARIS CROSS', 'COROLLA', 'COROLLA TOURING SPORTS',
    'C-HR', 'RAV4', 'HIGHLANDER', 'BZ4X', 'URBAN CRUISER', 'PROACE'
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
      /(Active|Style|Executive|Comfort|Plus|Sport|Pulse)/i.test(line) || // Variants
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
  const maxChars = 25000 // ~6250 tokens
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
2. Udtraher præcise månedlige priser i DKK format
3. Identificer variant navne (Active, Style, Executive, etc.)
4. Identificer motor info og HK (horsepower) når tilgængelig
5. Gruppér relaterede varianter under samme model
6. Ignorer headers, footers og legal tekst

TOYOTA MODELLER AT LEDE EFTER:
- AYGO X (Active, Play, Air, Edge variants)
- YARIS (Active, Style, Executive variants)
- YARIS CROSS (Active, Style, Executive variants)
- COROLLA (Active, Style, Executive, Touring Sports variants)
- C-HR (Active, Style, Executive variants)
- RAV4 (Active, Style, Executive, Hybrid variants)
- HIGHLANDER (Executive, Seven variants)
- BZ4X (Active, Style, Executive electric variants)
- PROACE (Work, Nomad, Family variants)

OUTPUT FORMAT (JSON):
{
  "cars": [
    {
      "make": "Toyota",
      "model": "AYGO X", 
      "variant": "Active",
      "monthlyPrice": "4.149 kr/md",
      "priceNum": 4149,
      "engineInfo": "1.0 VVT-i 72 HK",
      "fuelType": "Benzin",
      "transmission": "Manuel"
    }
  ]
}

PRISFORMATER AT LEDE EFTER:
- "4.149 kr/md", "4.149 kr/måned"
- "4.999 kr/md", "5.299 kr/md"
- Tal med punktum som tusind-separator efterfulgt af "kr/md"

MOTOR INFO PATTERNS:
- "72 HK", "116 HK", "140 HK" (benzin)
- "163 HK", "197 HK" (hybrid)
- "204 HK", "218 HK" (electric BZ4X)
- "VVT-i", "Hybrid", "Electric" motor typer

Analysér denne Toyota tekstdel grundigt og returner ALLE fundne biler som valid JSON. Fokuser specielt på Toyota modeller og deres priser i kr/md format.`;

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
    
    // Limit text size to prevent timeouts (max ~10,000 characters = ~2,500 tokens)
    const maxChars = 10000
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
          max_tokens: 4000,
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
          car.make && car.model && car.monthlyPrice
        ).map(car => ({
          ...car,
          // Ensure priceNum is properly parsed
          priceNum: car.priceNum || parseFloat(car.monthlyPrice.replace(/[^\d,]/g, '').replace(',', '.')) || 0
        }))

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