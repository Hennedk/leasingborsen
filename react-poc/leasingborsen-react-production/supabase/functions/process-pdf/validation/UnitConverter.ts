/* Claude Change Summary:
 * Created UnitConverter for standardized unit conversions.
 * Handles power, fuel consumption, and other automotive unit conversions.
 * Provides bidirectional conversion capabilities with validation.
 * Related to: Cross-dealer validation and standardization system
 */

export interface ConversionResult {
  value: number
  unit: string
  originalValue: number
  originalUnit: string
  formula: string
  precision?: number
}

export class UnitConverter {
  
  /**
   * Convert horsepower to kilowatts
   */
  static hpToKw(hp: number): ConversionResult {
    const kw = Math.round(hp * 0.7355 * 10) / 10 // Round to 1 decimal
    return {
      value: kw,
      unit: 'kW',
      originalValue: hp,
      originalUnit: 'HP',
      formula: 'HP × 0.7355',
      precision: 1
    }
  }

  /**
   * Convert kilowatts to horsepower
   */
  static kwToHp(kw: number): ConversionResult {
    const hp = Math.round(kw / 0.7355)
    return {
      value: hp,
      unit: 'HP',
      originalValue: kw,
      originalUnit: 'kW',
      formula: 'kW ÷ 0.7355',
      precision: 0
    }
  }

  /**
   * Convert L/100km to km/L
   */
  static l100kmToKmL(l100km: number): ConversionResult {
    const kmL = Math.round((100 / l100km) * 10) / 10 // Round to 1 decimal
    return {
      value: kmL,
      unit: 'km/L',
      originalValue: l100km,
      originalUnit: 'L/100km',
      formula: '100 ÷ L/100km',
      precision: 1
    }
  }

  /**
   * Convert km/L to L/100km
   */
  static kmLToL100km(kmL: number): ConversionResult {
    const l100km = Math.round((100 / kmL) * 10) / 10 // Round to 1 decimal
    return {
      value: l100km,
      unit: 'L/100km',
      originalValue: kmL,
      originalUnit: 'km/L',
      formula: '100 ÷ km/L',
      precision: 1
    }
  }

  /**
   * Convert miles per gallon (US) to L/100km
   */
  static mpgUsToL100km(mpg: number): ConversionResult {
    const l100km = Math.round((235.214583 / mpg) * 10) / 10
    return {
      value: l100km,
      unit: 'L/100km',
      originalValue: mpg,
      originalUnit: 'MPG (US)',
      formula: '235.214583 ÷ MPG',
      precision: 1
    }
  }

  /**
   * Convert miles per gallon (Imperial) to L/100km
   */
  static mpgImpToL100km(mpg: number): ConversionResult {
    const l100km = Math.round((282.481 / mpg) * 10) / 10
    return {
      value: l100km,
      unit: 'L/100km',
      originalValue: mpg,
      originalUnit: 'MPG (Imperial)',
      formula: '282.481 ÷ MPG',
      precision: 1
    }
  }

  /**
   * Convert L/100km to miles per gallon (US)
   */
  static l100kmToMpgUs(l100km: number): ConversionResult {
    const mpg = Math.round((235.214583 / l100km) * 10) / 10
    return {
      value: mpg,
      unit: 'MPG (US)',
      originalValue: l100km,
      originalUnit: 'L/100km',
      formula: '235.214583 ÷ L/100km',
      precision: 1
    }
  }

  /**
   * Convert kilometers to miles
   */
  static kmToMiles(km: number): ConversionResult {
    const miles = Math.round(km * 0.621371 * 10) / 10
    return {
      value: miles,
      unit: 'miles',
      originalValue: km,
      originalUnit: 'km',
      formula: 'km × 0.621371',
      precision: 1
    }
  }

  /**
   * Convert miles to kilometers
   */
  static milesToKm(miles: number): ConversionResult {
    const km = Math.round(miles * 1.609344)
    return {
      value: km,
      unit: 'km',
      originalValue: miles,
      originalUnit: 'miles',
      formula: 'miles × 1.609344',
      precision: 0
    }
  }

  /**
   * Convert kWh/100km to miles/kWh
   */
  static kwhPer100kmToMilesPerKwh(kwhPer100km: number): ConversionResult {
    const milesPerKwh = Math.round((62.1371 / kwhPer100km) * 100) / 100 // Round to 2 decimals
    return {
      value: milesPerKwh,
      unit: 'miles/kWh',
      originalValue: kwhPer100km,
      originalUnit: 'kWh/100km',
      formula: '62.1371 ÷ kWh/100km',
      precision: 2
    }
  }

  /**
   * Convert miles/kWh to kWh/100km
   */
  static milesPerKwhToKwhPer100km(milesPerKwh: number): ConversionResult {
    const kwhPer100km = Math.round((62.1371 / milesPerKwh) * 10) / 10
    return {
      value: kwhPer100km,
      unit: 'kWh/100km',
      originalValue: milesPerKwh,
      originalUnit: 'miles/kWh',
      formula: '62.1371 ÷ miles/kWh',
      precision: 1
    }
  }

  /**
   * Convert Celsius to Fahrenheit
   */
  static celsiusToFahrenheit(celsius: number): ConversionResult {
    const fahrenheit = Math.round((celsius * 9/5 + 32) * 10) / 10
    return {
      value: fahrenheit,
      unit: '°F',
      originalValue: celsius,
      originalUnit: '°C',
      formula: '(°C × 9/5) + 32',
      precision: 1
    }
  }

  /**
   * Convert Fahrenheit to Celsius
   */
  static fahrenheitToCelsius(fahrenheit: number): ConversionResult {
    const celsius = Math.round(((fahrenheit - 32) * 5/9) * 10) / 10
    return {
      value: celsius,
      unit: '°C',
      originalValue: fahrenheit,
      originalUnit: '°F',
      formula: '(°F - 32) × 5/9',
      precision: 1
    }
  }

  /**
   * Convert bar to PSI
   */
  static barToPsi(bar: number): ConversionResult {
    const psi = Math.round(bar * 14.5038 * 10) / 10
    return {
      value: psi,
      unit: 'PSI',
      originalValue: bar,
      originalUnit: 'bar',
      formula: 'bar × 14.5038',
      precision: 1
    }
  }

  /**
   * Convert PSI to bar
   */
  static psiToBar(psi: number): ConversionResult {
    const bar = Math.round((psi / 14.5038) * 100) / 100
    return {
      value: bar,
      unit: 'bar',
      originalValue: psi,
      originalUnit: 'PSI',
      formula: 'PSI ÷ 14.5038',
      precision: 2
    }
  }

  /**
   * Convert grams per kilometer to pounds per mile (CO2 emissions)
   */
  static gPerKmToLbPerMile(gPerKm: number): ConversionResult {
    const lbPerMile = Math.round((gPerKm * 0.00356) * 1000) / 1000 // Round to 3 decimals
    return {
      value: lbPerMile,
      unit: 'lb/mile',
      originalValue: gPerKm,
      originalUnit: 'g/km',
      formula: 'g/km × 0.00356',
      precision: 3
    }
  }

  /**
   * Automatic unit detection and conversion
   */
  static detectAndConvert(value: string, targetUnit?: string): ConversionResult | null {
    const cleanValue = value.toLowerCase().trim()

    // Power conversions
    const hpMatch = cleanValue.match(/(\d+(?:\.\d+)?)\s*(?:hp|hk|ps|ch|bhp)/i)
    if (hpMatch) {
      const hp = parseFloat(hpMatch[1])
      return targetUnit === 'kW' ? this.hpToKw(hp) : { 
        value: hp, 
        unit: 'HP', 
        originalValue: hp, 
        originalUnit: 'HP', 
        formula: 'no conversion' 
      }
    }

    const kwMatch = cleanValue.match(/(\d+(?:\.\d+)?)\s*kw/i)
    if (kwMatch) {
      const kw = parseFloat(kwMatch[1])
      return targetUnit === 'HP' ? this.kwToHp(kw) : { 
        value: kw, 
        unit: 'kW', 
        originalValue: kw, 
        originalUnit: 'kW', 
        formula: 'no conversion' 
      }
    }

    // Fuel consumption conversions
    const l100kmMatch = cleanValue.match(/(\d+(?:\.\d+)?)\s*l\/100\s*km/i)
    if (l100kmMatch) {
      const l100km = parseFloat(l100kmMatch[1])
      return targetUnit === 'km/L' ? this.l100kmToKmL(l100km) : { 
        value: l100km, 
        unit: 'L/100km', 
        originalValue: l100km, 
        originalUnit: 'L/100km', 
        formula: 'no conversion' 
      }
    }

    const kmLMatch = cleanValue.match(/(\d+(?:\.\d+)?)\s*km\/l/i)
    if (kmLMatch) {
      const kmL = parseFloat(kmLMatch[1])
      return targetUnit === 'L/100km' ? this.kmLToL100km(kmL) : { 
        value: kmL, 
        unit: 'km/L', 
        originalValue: kmL, 
        originalUnit: 'km/L', 
        formula: 'no conversion' 
      }
    }

    // Electric consumption conversions
    const kwhMatch = cleanValue.match(/(\d+(?:\.\d+)?)\s*kwh\/100\s*km/i)
    if (kwhMatch) {
      const kwh = parseFloat(kwhMatch[1])
      return targetUnit === 'miles/kWh' ? this.kwhPer100kmToMilesPerKwh(kwh) : { 
        value: kwh, 
        unit: 'kWh/100km', 
        originalValue: kwh, 
        originalUnit: 'kWh/100km', 
        formula: 'no conversion' 
      }
    }

    // CO2 emissions
    const co2Match = cleanValue.match(/(\d+(?:\.\d+)?)\s*g\/km/i)
    if (co2Match) {
      const gPerKm = parseFloat(co2Match[1])
      return targetUnit === 'lb/mile' ? this.gPerKmToLbPerMile(gPerKm) : { 
        value: gPerKm, 
        unit: 'g/km', 
        originalValue: gPerKm, 
        originalUnit: 'g/km', 
        formula: 'no conversion' 
      }
    }

    return null
  }

  /**
   * Get all possible conversions for a value
   */
  static getAllConversions(value: string): ConversionResult[] {
    const conversions: ConversionResult[] = []
    
    // Try each target unit
    const targetUnits = ['HP', 'kW', 'L/100km', 'km/L', 'miles/kWh', 'kWh/100km', 'lb/mile']
    
    for (const targetUnit of targetUnits) {
      const result = this.detectAndConvert(value, targetUnit)
      if (result && result.formula !== 'no conversion') {
        conversions.push(result)
      }
    }
    
    return conversions
  }

  /**
   * Validate if a conversion result is reasonable
   */
  static validateConversion(result: ConversionResult): {
    isValid: boolean
    warnings: string[]
  } {
    const warnings: string[] = []
    let isValid = true

    // Validate power conversions
    if (result.unit === 'HP' || result.originalUnit === 'HP') {
      if (result.value < 50 || result.value > 1000) {
        warnings.push(`Unusual power value: ${result.value} ${result.unit}`)
        if (result.value < 10 || result.value > 2000) {
          isValid = false
        }
      }
    }

    // Validate fuel consumption
    if (result.unit.includes('L/100km') || result.unit.includes('km/L')) {
      if (result.unit === 'L/100km' && (result.value < 2 || result.value > 25)) {
        warnings.push(`Unusual fuel consumption: ${result.value} L/100km`)
        if (result.value < 0.5 || result.value > 50) {
          isValid = false
        }
      }
      if (result.unit === 'km/L' && (result.value < 4 || result.value > 50)) {
        warnings.push(`Unusual fuel economy: ${result.value} km/L`)
        if (result.value < 2 || result.value > 100) {
          isValid = false
        }
      }
    }

    // Validate electric consumption
    if (result.unit.includes('kWh') || result.unit.includes('miles/kWh')) {
      if (result.unit === 'kWh/100km' && (result.value < 10 || result.value > 35)) {
        warnings.push(`Unusual electric consumption: ${result.value} kWh/100km`)
        if (result.value < 5 || result.value > 50) {
          isValid = false
        }
      }
    }

    return { isValid, warnings }
  }

  /**
   * Format conversion result for display
   */
  static formatConversion(result: ConversionResult): string {
    const precision = result.precision || 0
    const valueStr = precision > 0 ? result.value.toFixed(precision) : result.value.toString()
    
    return `${result.originalValue} ${result.originalUnit} = ${valueStr} ${result.unit} (${result.formula})`
  }

  /**
   * Get standard unit for a measurement type
   */
  static getStandardUnit(measurementType: 'power' | 'fuel_consumption' | 'electric_consumption' | 'co2_emission' | 'distance'): string {
    const standardUnits = {
      power: 'HP',
      fuel_consumption: 'L/100km',
      electric_consumption: 'kWh/100km',
      co2_emission: 'g/km',
      distance: 'km'
    }
    
    return standardUnits[measurementType]
  }

  /**
   * Convert any power value to standard HP
   */
  static normalizeToStandardPower(value: string): ConversionResult | null {
    const powerResult = this.detectAndConvert(value, 'HP')
    if (powerResult && powerResult.unit === 'kW') {
      return this.kwToHp(powerResult.value)
    }
    return powerResult
  }

  /**
   * Convert any fuel consumption to standard L/100km
   */
  static normalizeToStandardFuelConsumption(value: string): ConversionResult | null {
    const fuelResult = this.detectAndConvert(value, 'L/100km')
    if (fuelResult && fuelResult.unit === 'km/L') {
      return this.kmLToL100km(fuelResult.value)
    }
    return fuelResult
  }
}

/*
 * UnitConverter
 * 
 * Comprehensive unit conversion utility for automotive specifications.
 * Provides bidirectional conversions with validation and formatting.
 * 
 * Key Features:
 * - Power conversions (HP ↔ kW)
 * - Fuel consumption (L/100km ↔ km/L ↔ MPG)
 * - Electric consumption (kWh/100km ↔ miles/kWh)
 * - Distance conversions (km ↔ miles)
 * - Automatic unit detection and conversion
 * - Validation of conversion results
 * - Standardization to industry-standard units
 * 
 * Usage:
 * const result = UnitConverter.hpToKw(150)
 * console.log(UnitConverter.formatConversion(result))
 * // "150 HP = 110.3 kW (HP × 0.7355)"
 * 
 * const auto = UnitConverter.detectAndConvert("150 HP", "kW")
 * console.log(auto?.value) // 110.3
 */