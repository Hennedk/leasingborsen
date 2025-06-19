import type { PromptTemplate } from './types'

// Dealer-specific prompt templates for better extraction accuracy
export const DEALER_PROMPTS: Record<string, PromptTemplate> = {
  volkswagen: {
    system: `You are a specialized Volkswagen vehicle listing parser. Extract structured data from VW dealer PDFs.

    VW Models include: T-Roc, T-Cross, Polo, Golf, Passat, Arteon, Tiguan, Touareg, Touran, Caddy, 
    ID.3, ID.4, ID.5, ID.7, ID.Buzz (Kort/Lang), e-up!, e-Golf

    Common VW Variants:
    - Life+, Style+, GTX+, GTX Performance+, GTX Max+, Max+
    - R-Line, Elegance, Comfortline, Highline
    - Black Edition, Edition, Sport Edition
    - 4Motion (AWD), GTI, GTD, GTE (hybrid)

    VW Engine Patterns:
    - TSI (petrol), TDI (diesel), eTSI (mild hybrid), eHybrid (plugin hybrid)
    - Electric: kW ratings (150 kW = 204 hk)
    - ACT (cylinder deactivation), DSG (dual-clutch), EVO (efficiency package)

    Danish Terms:
    - "hk" = horsepower, "kW" = kilowatts
    - "km/år" = km per year, "mdr." = months
    - "kr." = Danish kroner, "Rækkevidde" = range (electric)
    - "Forbrug" = consumption, "CO₂" = CO2 emissions`,

    user: `Extract ALL Volkswagen vehicles and their leasing offers from this text. Pay special attention to:

    1. Model names (T-Roc, ID.3, etc.)
    2. Variant names (Life+, Style+, GTX+, R-Line, etc.)
    3. Engine specifications (TSI, TDI, electric kW/hk)
    4. Multiple leasing offers per vehicle (different durations, mileage, prices)
    5. Technical specs (CO₂, consumption, range for electric)

    Return ONLY valid JSON with this exact structure:
    {
      "vehicles": [
        {
          "make": "Volkswagen",
          "model": "ID.3",
          "variant": "Life+",
          "horsepower": 170,
          "specifications": {
            "co2_emission": 0,
            "fuel_consumption": "15.3 kWh/100km",
            "range_km": 387,
            "is_electric": true,
            "transmission": "Automatic",
            "fuel_type": "Elektrisk"
          },
          "offers": [
            {
              "duration_months": 48,
              "mileage_km": 10000,
              "monthly_price": 3295,
              "deposit": 5000,
              "total_cost": 163760,
              "min_price_12_months": 45140
            }
          ],
          "confidence": 0.95
        }
      ]
    }

    Text to parse:
    `,
    
    examples: [
      {
        input: "ID.3 Life+ 170 hk Rækkevidde: 387 km | Forbrug: 15,3 kWh/100km | 10.000 km/år 48 mdr. 163.760 kr. 45.140 kr. 5.000 kr. 3.295 kr.",
        output: {
          make: "Volkswagen",
          model: "ID.3",
          variant: "Life+",
          horsepower: 170,
          specifications: {
            co2_emission: 0,
            fuel_consumption: "15.3 kWh/100km",
            range_km: 387,
            is_electric: true,
            transmission: "Automatic",
            fuel_type: "Elektrisk"
          },
          offers: [
            {
              duration_months: 48,
              mileage_km: 10000,
              monthly_price: 3295,
              deposit: 5000,
              total_cost: 163760,
              min_price_12_months: 45140
            }
          ],
          confidence: 0.95
        }
      }
    ]
  },

  generic: {
    system: `You are a car listing parser. Extract structured vehicle data from dealer PDFs in any language.

    Common car specifications:
    - Make: Toyota, BMW, Audi, Mercedes, Volkswagen, etc.
    - Model: Usually follows make (Toyota Corolla, BMW 3 Series)
    - Variant: Trim level, engine, or special edition
    - Horsepower: Look for "hk", "hp", "kW", "PS"
    - Prices: Look for currency symbols, "kr", "DKK", "EUR"
    - Mileage: "km/år", "km per year", annual mileage limits
    - Duration: "mdr", "months", "måneder", lease duration

    Be conservative - only extract data you're confident about.`,

    user: `Extract ALL vehicles and their leasing offers from this text. Return ONLY valid JSON:

    {
      "vehicles": [
        {
          "make": "Brand",
          "model": "Model",
          "variant": "Trim/Engine",
          "horsepower": 150,
          "specifications": {
            "is_electric": false,
            "fuel_type": "Benzin"
          },
          "offers": [
            {
              "duration_months": 12,
              "mileage_km": 10000,
              "monthly_price": 2500
            }
          ],
          "confidence": 0.8
        }
      ]
    }

    Text to parse:
    `
  }
}

export function getPromptForDealer(dealerName?: string): PromptTemplate {
  if (!dealerName) return DEALER_PROMPTS.generic
  
  const normalized = dealerName.toLowerCase()
  
  if (normalized.includes('volkswagen') || normalized.includes('vw')) {
    return DEALER_PROMPTS.volkswagen
  }
  
  return DEALER_PROMPTS.generic
}

// Cost estimation helpers
export const AI_PRICING = {
  'gpt-3.5-turbo': {
    input_per_1k: 0.0015,  // $0.0015 per 1K input tokens
    output_per_1k: 0.002   // $0.002 per 1K output tokens
  },
  'gpt-4-turbo': {
    input_per_1k: 0.01,    // $0.01 per 1K input tokens
    output_per_1k: 0.03    // $0.03 per 1K output tokens
  }
}

export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English/Danish
  return Math.ceil(text.length / 4)
}

export function estimateCost(inputTokens: number, outputTokens: number, model: string = 'gpt-3.5-turbo'): number {
  const pricing = AI_PRICING[model as keyof typeof AI_PRICING] || AI_PRICING['gpt-3.5-turbo']
  
  const inputCost = (inputTokens / 1000) * pricing.input_per_1k
  const outputCost = (outputTokens / 1000) * pricing.output_per_1k
  
  return inputCost + outputCost
}