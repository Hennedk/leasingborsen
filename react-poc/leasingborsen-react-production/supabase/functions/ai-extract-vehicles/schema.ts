// JSON Schema for vehicle extraction validation

export const vehicleExtractionSchema = {
  "name": "vehicle_extraction",
  "strict": true,
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
                "description": "Array with exactly 4 elements: [monthly_price, first_payment, period_months, km_per_year]. Total price will be calculated automatically.",
                "minItems": 4,
                "maxItems": 4,
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
          "required": [
            "make",
            "model",
            "variant",
            "hp",
            "ft",
            "tr",
            "wltp",
            "co2",
            "kwh100",
            "l100",
            "tax",
            "offers"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": ["cars"],
    "additionalProperties": false
  }
}

// Validation function for runtime checking
export function validateExtractionResponse(data: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = []
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response must be an object'] }
  }
  
  if (!Array.isArray(data.cars)) {
    return { valid: false, errors: ['Response must contain a cars array'] }
  }
  
  data.cars.forEach((car: any, index: number) => {
    // Check required fields
    if (!car.make || typeof car.make !== 'string' || car.make.trim() === '') {
      errors.push(`Car ${index}: make is required and must be non-empty string`)
    }
    
    if (!car.model || typeof car.model !== 'string' || car.model.trim() === '') {
      errors.push(`Car ${index}: model is required and must be non-empty string`)
    }
    
    if (!car.variant || typeof car.variant !== 'string' || car.variant.trim() === '') {
      errors.push(`Car ${index}: variant is required and must be non-empty string`)
    }
    
    // Check offers
    if (!Array.isArray(car.offers) || car.offers.length === 0) {
      errors.push(`Car ${index}: offers must be a non-empty array`)
    } else {
      car.offers.forEach((offer: any, offerIndex: number) => {
        if (!Array.isArray(offer) || offer.length !== 4) {
          errors.push(`Car ${index}, Offer ${offerIndex}: must be an array with exactly 4 elements`)
        }
      })
    }
  })
  
  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}