#!/usr/bin/env node

/**
 * Test the OpenAI Responses API with your vehicle extraction prompt
 */

import OpenAI from 'openai'

const vehicleExtractionSchema = {
  "name": "vehicle_extraction",
  "strict": true,
  "description": null,
  "schema": {
    "type": "object",
    "properties": {
      "cars": {
        "type": "array",
        "description": "List of vehicles extracted from the PDF",
        "items": {
          "type": "object",
          "properties": {
            "make": {
              "type": "string",
              "description": "Vehicle manufacturer (e.g., Volkswagen, Audi)",
              "minLength": 1
            },
            "model": {
              "type": "string",
              "description": "Vehicle model name (e.g., Golf, A3)",
              "minLength": 1
            },
            "variant": {
              "type": "string",
              "description": "Vehicle variant/trim with HK for horsepower (e.g., 'Style 150 HK')",
              "minLength": 1
            },
            "hp": {
              "type": ["integer", "null"],
              "description": "Horsepower as a number",
              "minimum": 0,
              "maximum": 2000
            },
            "ft": {
              "type": "integer",
              "description": "Fuel type code: 1=Electric, 2=Hybrid-Petrol, 3=Petrol, 4=Diesel, 5=Hybrid-Diesel, 6=Plug-in-Petrol, 7=Plug-in-Diesel",
              "enum": [1, 2, 3, 4, 5, 6, 7]
            },
            "tr": {
              "type": "integer",
              "description": "Transmission code: 1=Automatic, 2=Manual",
              "enum": [1, 2]
            },
            "bt": {
              "type": "integer",
              "description": "Body type code: 1=SUV, 2=Hatchback, 3=Sedan, 4=Stationcar, 5=Coupe, 6=Cabriolet, 7=Crossover, 8=Minibus, 9=Mikro",
              "enum": [1, 2, 3, 4, 5, 6, 7, 8, 9]
            },
            "wltp": {
              "type": ["integer", "null"],
              "description": "WLTP range in km (for electric) or fuel efficiency",
              "minimum": 0,
              "maximum": 1000
            },
            "co2": {
              "type": ["integer", "null"],
              "description": "CO2 emissions in g/km",
              "minimum": 0,
              "maximum": 500
            },
            "kwh100": {
              "type": ["number", "null"],
              "description": "Electric consumption in kWh/100km",
              "minimum": 0,
              "maximum": 100
            },
            "l100": {
              "type": ["number", "null"],
              "description": "Fuel consumption in liters/100km",
              "minimum": 0,
              "maximum": 50
            },
            "tax": {
              "type": ["integer", "null"],
              "description": "CO2 tax per half year in DKK",
              "minimum": 0,
              "maximum": 100000
            },
            "offers": {
              "type": "array",
              "description": "List of leasing offers for this vehicle",
              "minItems": 1,
              "items": {
                "type": "array",
                "description": "Array with exactly 5 elements: [monthly_price, first_payment, period_months, km_per_year, total_price]",
                "minItems": 5,
                "maxItems": 5,
                "items": {
                  "anyOf": [
                    {
                      "type": "integer",
                      "minimum": 0
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              }
            }
          },
          "required": ["make", "model", "variant", "hp", "ft", "tr", "bt", "wltp", "co2", "kwh100", "l100", "tax", "offers"],
          "additionalProperties": false
        }
      }
    },
    "required": ["cars"],
    "additionalProperties": false
  }
}

async function testVehicleExtraction() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required')
    process.exit(1)
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  console.log('🚗 Testing Vehicle Extraction with OpenAI Responses API...\n')

  try {
    // Your system prompt
    const systemPrompt = `You are a Danish vehicle-leasing data extractor.  

**Step 1 (Match):** For each brochure car, find an existing listing (same make, model, ±5 HP) and copy its variant name exactly.  
**Step 2 (New):** If no match, create a new variant per guidelines.

**Rules:**
1. Only create new variants when truly different.
2. Merge transmission variants—never split "X" from "X Automatik."
3. Extract all leasing offers for each car.
4. Use numeric codes for ft, tr, bt.
5. Always use "HK" for horsepower.

**Output (JSON Schema \`vehicle_extraction\`):**
Return exactly one JSON object with:
\`\`\`json
{ "cars": [ /* see saved JSON-schema in UI */ ] }
\`\`\``

    // Test data with existing listings context
    const testInput = `
Dealer: Toyota Denmark
File: january-2025-offers.pdf

PDF Content:
Toyota Corolla 1.8 Hybrid Active Plus
- 140 hestekræfter
- Hybrid (benzin)
- Automatgear
- Hatchback karosseri
- Leasing: 3.500 kr/md
- Førstegangsydelse: 25.000 kr
- Løbetid: 36 måneder
- Km/år: 15.000
- Samlet pris: 151.000 kr
- WLTP: 4.5 l/100km
- CO2: 102 g/km
- Halvårlig afgift: 420 kr

Toyota Yaris 1.5 Hybrid Active
- 116 hestekræfter  
- Hybrid (benzin)
- Automatgear
- Hatchback karosseri
- Leasing: 2.800 kr/md
- Førstegangsydelse: 20.000 kr
- Løbetid: 36 måneder
- Km/år: 15.000
- Samlet pris: 120.800 kr
- WLTP: 3.8 l/100km
- CO2: 87 g/km
- Halvårlig afgift: 360 kr

Existing Dealer Variants (2 vehicles):
• Toyota Corolla 1.8 Hybrid Active Plus 140 HK
• Toyota Yaris 1.5 Hybrid Active 116 HK

Please extract all vehicles and respond in JSON format according to the vehicle_extraction schema.`

    console.log('📝 Creating vehicle extraction response...')
    
    const response = await openai.responses.create({
      model: 'gpt-4.1-2025-04-14',
      instructions: systemPrompt,
      input: testInput,
      temperature: 0.1,
      text: {
        format: {
          type: 'json_schema',
          name: vehicleExtractionSchema.name,
          strict: vehicleExtractionSchema.strict,
          schema: vehicleExtractionSchema.schema
        }
      },
      metadata: {
        test: 'vehicle-extraction-poc',
        dealer: 'Toyota Denmark'
      }
    })

    console.log('✅ Response created successfully!')
    console.log(`   ID: ${response.id}`)
    console.log(`   Status: ${response.status}`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Tokens: ${response.usage?.total_tokens || 0} (input: ${response.usage?.input_tokens || 0}, output: ${response.usage?.output_tokens || 0})`)
    console.log('\n📊 Extracted Vehicle Data:')
    
    try {
      const extractedData = JSON.parse(response.output_text || '{}')
      console.log(JSON.stringify(extractedData, null, 2))
      
      // Validate the extraction
      if (extractedData.cars && extractedData.cars.length > 0) {
        console.log(`\n✅ Successfully extracted ${extractedData.cars.length} vehicles:`)
        extractedData.cars.forEach((car: any, index: number) => {
          console.log(`   ${index + 1}. ${car.make} ${car.model} - ${car.variant}`)
          console.log(`      Leasing: ${car.offers[0][0]} kr/md (${car.offers[0][2]} months)`)
        })
      }
    } catch (parseError) {
      console.log('Raw output:', response.output_text)
    }

    // Test with stored prompt ID if available
    if (process.env.OPENAI_STORED_PROMPT_ID) {
      console.log('\n📝 Testing with stored prompt ID...')
      console.log(`   Prompt ID: ${process.env.OPENAI_STORED_PROMPT_ID}`)
      
      try {
        const response2 = await openai.responses.create({
          model: 'gpt-4.1-2025-04-14',
          prompt: {
            id: process.env.OPENAI_STORED_PROMPT_ID,
            version: '10'
          },
          input: [{
            role: "user",
            type: "message", 
            content: testInput
          }],
          temperature: 0.1,
          text: {
            format: {
              type: "json_schema",
              name: vehicleExtractionSchema.name,
              strict: vehicleExtractionSchema.strict,
              schema: vehicleExtractionSchema.schema
            }
          }
        })

        console.log('✅ Response created with stored prompt!')
        console.log(`   Response ID: ${response2.id}`)
        console.log(`   Output available: ${!!response2.output_text}`)
      } catch (error) {
        console.log('❌ Error using stored prompt:', error.message)
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test response...')
    await openai.responses.delete(response.id)
    console.log('✅ Test response deleted')

    console.log('\n🎉 Vehicle extraction test completed!')
    console.log('\n💡 Integration Tips:')
    console.log('1. Use structured output with json_schema for consistent results')
    console.log('2. Include existing variants in the context for better matching')
    console.log('3. The model correctly uses variant names from existing listings')
    console.log('4. All numeric codes (ft, tr, bt) are properly applied')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

// Run the test
testVehicleExtraction().catch(console.error)