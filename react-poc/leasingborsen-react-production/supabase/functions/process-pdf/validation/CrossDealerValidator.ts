import { ExtractedVehicle, PricingOption, ValidationResult } from '../types/DealerConfig.ts'

/* Claude Change Summary:
 * Created CrossDealerValidator for universal data standardization.
 * Implements industry-standard validation, normalization, and scoring.
 * Provides consistent data formatting across all dealers.
 * Related to: Cross-dealer validation and standardization system
 */

export interface StandardizedVehicle extends ExtractedVehicle {
  // Enhanced fields with standardized values
  standardizedModel: string
  standardizedVariant: string
  standardizedBodyType?: string
  standardizedFuelType?: string
  standardizedTransmission?: string
  
  // Unit conversions
  horsepowerHP?: number    // Always in HP
  horsepowerKW?: number    // Always in kW
  fuelConsumptionL100km?: number  // Always in L/100km
  fuelConsumptionKmL?: number     // Always in km/L
  
  // Quality metrics
  dataCompleteness: number      // 0-1 score
  validationConfidence: number  // 0-1 score
  crossDealerConsistency: number // 0-1 score
  qualityScore: number         // Overall 0-1 score
  
  // Validation flags
  validationFlags: ValidationFlag[]
  normalizations: NormalizationRecord[]
}

export interface ValidationFlag {
  type: 'error' | 'warning' | 'info'
  field: string
  message: string
  originalValue?: any
  correctedValue?: any
}

export interface NormalizationRecord {
  field: string
  operation: string
  originalValue: any
  normalizedValue: any
  reason: string
}

export interface StandardizationMappings {
  modelNames: Record<string, string>
  bodyTypes: Record<string, string>
  fuelTypes: Record<string, string>
  transmissionTypes: Record<string, string>
  brandVariations: Record<string, string>
}

export interface ValidationRanges {
  priceRange: { min: number; max: number }
  horsepowerRange: { min: number; max: number }
  fuelConsumptionRange: { min: number; max: number }
  co2EmissionRange: { min: number; max: number }
  electricRangeRange: { min: number; max: number }
  leasingTermRange: { min: number; max: number }
  mileageRange: { min: number; max: number }
}

export class CrossDealerValidator {
  private mappings: StandardizationMappings
  private validationRanges: ValidationRanges

  constructor() {
    this.mappings = this.initializeStandardizationMappings()
    this.validationRanges = this.initializeValidationRanges()
  }

  /**
   * Main validation and standardization entry point
   */
  async validateAndStandardize(vehicles: ExtractedVehicle[]): Promise<{
    standardizedVehicles: StandardizedVehicle[]
    overallQualityScore: number
    validationSummary: ValidationSummary
  }> {
    console.log(`🔍 Starting cross-dealer validation for ${vehicles.length} vehicles`)

    const standardizedVehicles: StandardizedVehicle[] = []
    const validationSummary: ValidationSummary = {
      totalVehicles: vehicles.length,
      passedValidation: 0,
      failedValidation: 0,
      averageQualityScore: 0,
      commonIssues: [],
      fieldCompleteness: {},
      normalizationsApplied: 0
    }

    for (const vehicle of vehicles) {
      try {
        const standardized = await this.standardizeVehicle(vehicle)
        standardizedVehicles.push(standardized)
        
        if (standardized.qualityScore >= 0.6) {
          validationSummary.passedValidation++
        } else {
          validationSummary.failedValidation++
        }
        
        validationSummary.normalizationsApplied += standardized.normalizations.length
      } catch (error) {
        console.error(`❌ Failed to standardize vehicle: ${vehicle.model} ${vehicle.variant}`, error)
        validationSummary.failedValidation++
      }
    }

    // Calculate overall metrics
    validationSummary.averageQualityScore = this.calculateAverageQualityScore(standardizedVehicles)
    validationSummary.fieldCompleteness = this.analyzeFieldCompleteness(standardizedVehicles)
    validationSummary.commonIssues = this.identifyCommonIssues(standardizedVehicles)

    const overallQualityScore = validationSummary.averageQualityScore

    console.log(`✅ Cross-dealer validation complete. Quality score: ${overallQualityScore.toFixed(3)}`)

    return {
      standardizedVehicles,
      overallQualityScore,
      validationSummary
    }
  }

  /**
   * Standardize a single vehicle
   */
  private async standardizeVehicle(vehicle: ExtractedVehicle): Promise<StandardizedVehicle> {
    const validationFlags: ValidationFlag[] = []
    const normalizations: NormalizationRecord[] = []

    // Create base standardized vehicle
    const standardized: StandardizedVehicle = {
      ...vehicle,
      standardizedModel: '',
      standardizedVariant: '',
      dataCompleteness: 0,
      validationConfidence: 0,
      crossDealerConsistency: 0,
      qualityScore: 0,
      validationFlags,
      normalizations
    }

    // 1. Standardize model and variant names
    this.standardizeModelNames(standardized, normalizations, validationFlags)

    // 2. Standardize and validate technical specifications
    this.standardizeTechnicalSpecs(standardized, normalizations, validationFlags)

    // 3. Standardize body type and fuel type
    this.standardizeTypes(standardized, normalizations, validationFlags)

    // 4. Validate and standardize pricing
    this.standardizePricing(standardized, normalizations, validationFlags)

    // 5. Perform unit conversions
    this.performUnitConversions(standardized, normalizations)

    // 6. Validate against industry ranges
    this.validateIndustryRanges(standardized, validationFlags)

    // 7. Calculate quality scores
    this.calculateQualityScores(standardized)

    return standardized
  }

  /**
   * Standardize model and variant names
   */
  private standardizeModelNames(
    vehicle: StandardizedVehicle,
    normalizations: NormalizationRecord[],
    validationFlags: ValidationFlag[]
  ): void {
    // Normalize model name
    const originalModel = vehicle.model?.trim() || ''
    const cleanModel = this.cleanModelName(originalModel)
    const standardizedModel = this.mapModelName(cleanModel)

    if (standardizedModel !== originalModel) {
      normalizations.push({
        field: 'model',
        operation: 'name_standardization',
        originalValue: originalModel,
        normalizedValue: standardizedModel,
        reason: 'Mapped to standard model name format'
      })
    }

    vehicle.standardizedModel = standardizedModel

    // Normalize variant name
    const originalVariant = vehicle.variant?.trim() || ''
    const cleanVariant = this.cleanVariantName(originalVariant)
    
    if (cleanVariant !== originalVariant) {
      normalizations.push({
        field: 'variant',
        operation: 'variant_cleaning',
        originalValue: originalVariant,
        normalizedValue: cleanVariant,
        reason: 'Cleaned variant name formatting'
      })
    }

    vehicle.standardizedVariant = cleanVariant

    // Validation flags
    if (!standardizedModel) {
      validationFlags.push({
        type: 'error',
        field: 'model',
        message: 'Model name is missing or empty'
      })
    }

    if (!cleanVariant) {
      validationFlags.push({
        type: 'warning',
        field: 'variant',
        message: 'Variant name is missing or empty'
      })
    }
  }

  /**
   * Clean model name from common formatting issues
   */
  private cleanModelName(model: string): string {
    return model
      .replace(/\s*leasingpriser\s*/gi, '')
      .replace(/\s*prisliste\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Clean variant name from common formatting issues
   */
  private cleanVariantName(variant: string): string {
    return variant
      .replace(/\s*hk\s*/gi, ' HP ')
      .replace(/\s*kw\s*/gi, ' kW ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Map model name to standardized format
   */
  private mapModelName(model: string): string {
    // Direct mappings
    if (this.mappings.modelNames[model]) {
      return this.mappings.modelNames[model]
    }

    // Fuzzy matching for common variations
    const lowerModel = model.toLowerCase()
    
    for (const [pattern, standardName] of Object.entries(this.mappings.modelNames)) {
      if (lowerModel.includes(pattern.toLowerCase()) || 
          pattern.toLowerCase().includes(lowerModel)) {
        return standardName
      }
    }

    return model
  }

  /**
   * Standardize technical specifications
   */
  private standardizeTechnicalSpecs(
    vehicle: StandardizedVehicle,
    normalizations: NormalizationRecord[],
    validationFlags: ValidationFlag[]
  ): void {
    // Standardize horsepower
    if (vehicle.horsepower) {
      const hp = this.normalizeHorsepower(vehicle.horsepower)
      if (hp !== vehicle.horsepower) {
        normalizations.push({
          field: 'horsepower',
          operation: 'power_normalization',
          originalValue: vehicle.horsepower,
          normalizedValue: hp,
          reason: 'Normalized power value'
        })
        vehicle.horsepower = hp
      }
    }

    // Validate horsepower range
    if (vehicle.horsepower && 
        (vehicle.horsepower < this.validationRanges.horsepowerRange.min || 
         vehicle.horsepower > this.validationRanges.horsepowerRange.max)) {
      validationFlags.push({
        type: 'warning',
        field: 'horsepower',
        message: `Horsepower ${vehicle.horsepower} HP is outside typical range (${this.validationRanges.horsepowerRange.min}-${this.validationRanges.horsepowerRange.max} HP)`
      })
    }

    // Standardize CO2 emissions
    if (vehicle.co2Emission) {
      const co2 = this.normalizeCO2Emission(vehicle.co2Emission)
      if (co2 !== vehicle.co2Emission) {
        normalizations.push({
          field: 'co2Emission',
          operation: 'co2_normalization',
          originalValue: vehicle.co2Emission,
          normalizedValue: co2,
          reason: 'Normalized CO2 emission value'
        })
        vehicle.co2Emission = co2
      }
    }

    // Validate CO2 range
    if (vehicle.co2Emission &&
        (vehicle.co2Emission < this.validationRanges.co2EmissionRange.min ||
         vehicle.co2Emission > this.validationRanges.co2EmissionRange.max)) {
      validationFlags.push({
        type: 'warning',
        field: 'co2Emission',
        message: `CO2 emission ${vehicle.co2Emission} g/km is outside typical range`
      })
    }

    // Validate electric specifications
    if (vehicle.isElectric) {
      if (!vehicle.rangeKm && !vehicle.wltpRange) {
        validationFlags.push({
          type: 'warning',
          field: 'rangeKm',
          message: 'Electric vehicle missing range information'
        })
      }

      if (vehicle.rangeKm && 
          (vehicle.rangeKm < this.validationRanges.electricRangeRange.min ||
           vehicle.rangeKm > this.validationRanges.electricRangeRange.max)) {
        validationFlags.push({
          type: 'warning',
          field: 'rangeKm',
          message: `Electric range ${vehicle.rangeKm} km is outside typical range`
        })
      }
    }
  }

  /**
   * Standardize body type and fuel type
   */
  private standardizeTypes(
    vehicle: StandardizedVehicle,
    normalizations: NormalizationRecord[],
    validationFlags: ValidationFlag[]
  ): void {
    // Standardize body type
    if (vehicle.bodyType) {
      const standardBodyType = this.mappings.bodyTypes[vehicle.bodyType] || 
                              this.mapBodyType(vehicle.bodyType)
      
      if (standardBodyType !== vehicle.bodyType) {
        normalizations.push({
          field: 'bodyType',
          operation: 'body_type_mapping',
          originalValue: vehicle.bodyType,
          normalizedValue: standardBodyType,
          reason: 'Mapped to standard body type'
        })
      }
      
      vehicle.standardizedBodyType = standardBodyType
    }

    // Standardize fuel type
    let fuelType = vehicle.fuelType || ''
    
    // Infer fuel type if missing
    if (!fuelType) {
      if (vehicle.isElectric) {
        fuelType = 'Electric'
      } else if (vehicle.fuelConsumption) {
        fuelType = 'Gasoline' // Default assumption
      }
    }

    if (fuelType) {
      const standardFuelType = this.mappings.fuelTypes[fuelType] || 
                              this.mapFuelType(fuelType)
      
      if (standardFuelType !== vehicle.fuelType) {
        normalizations.push({
          field: 'fuelType',
          operation: 'fuel_type_mapping',
          originalValue: vehicle.fuelType,
          normalizedValue: standardFuelType,
          reason: vehicle.fuelType ? 'Mapped to standard fuel type' : 'Inferred fuel type'
        })
      }
      
      vehicle.standardizedFuelType = standardFuelType
      if (!vehicle.fuelType) {
        vehicle.fuelType = standardFuelType
      }
    }

    // Standardize transmission
    if (vehicle.transmission) {
      const standardTransmission = this.mappings.transmissionTypes[vehicle.transmission] ||
                                  this.mapTransmission(vehicle.transmission)
      
      if (standardTransmission !== vehicle.transmission) {
        normalizations.push({
          field: 'transmission',
          operation: 'transmission_mapping',
          originalValue: vehicle.transmission,
          normalizedValue: standardTransmission,
          reason: 'Mapped to standard transmission type'
        })
      }
      
      vehicle.standardizedTransmission = standardTransmission
    }
  }

  /**
   * Standardize pricing information
   */
  private standardizePricing(
    vehicle: StandardizedVehicle,
    normalizations: NormalizationRecord[],
    validationFlags: ValidationFlag[]
  ): void {
    if (!vehicle.pricingOptions || vehicle.pricingOptions.length === 0) {
      validationFlags.push({
        type: 'error',
        field: 'pricingOptions',
        message: 'No pricing options available'
      })
      return
    }

    const standardizedPricing: PricingOption[] = []

    for (const pricing of vehicle.pricingOptions) {
      const standardizedOption: PricingOption = { ...pricing }

      // Validate monthly price
      if (standardizedOption.monthlyPrice < this.validationRanges.priceRange.min ||
          standardizedOption.monthlyPrice > this.validationRanges.priceRange.max) {
        validationFlags.push({
          type: 'warning',
          field: 'monthlyPrice',
          message: `Monthly price ${standardizedOption.monthlyPrice} kr is outside typical range`
        })
      }

      // Validate leasing term
      if (standardizedOption.periodMonths < this.validationRanges.leasingTermRange.min ||
          standardizedOption.periodMonths > this.validationRanges.leasingTermRange.max) {
        validationFlags.push({
          type: 'warning',
          field: 'periodMonths',
          message: `Leasing term ${standardizedOption.periodMonths} months is outside typical range`
        })
      }

      // Validate mileage
      if (standardizedOption.mileagePerYear < this.validationRanges.mileageRange.min ||
          standardizedOption.mileagePerYear > this.validationRanges.mileageRange.max) {
        validationFlags.push({
          type: 'warning',
          field: 'mileagePerYear',
          message: `Annual mileage ${standardizedOption.mileagePerYear} km is outside typical range`
        })
      }

      // Calculate total cost if missing
      if (!standardizedOption.totalCost && standardizedOption.monthlyPrice && standardizedOption.periodMonths) {
        const calculatedTotal = standardizedOption.monthlyPrice * standardizedOption.periodMonths +
                               (standardizedOption.firstPayment || 0) +
                               (standardizedOption.deposit || 0)
        
        standardizedOption.totalCost = calculatedTotal
        
        normalizations.push({
          field: 'totalCost',
          operation: 'cost_calculation',
          originalValue: undefined,
          normalizedValue: calculatedTotal,
          reason: 'Calculated total cost from monthly payments'
        })
      }

      standardizedPricing.push(standardizedOption)
    }

    vehicle.pricingOptions = standardizedPricing
  }

  /**
   * Perform unit conversions
   */
  private performUnitConversions(
    vehicle: StandardizedVehicle,
    normalizations: NormalizationRecord[]
  ): void {
    // Convert horsepower between HP and kW
    if (vehicle.horsepower) {
      vehicle.horsepowerHP = vehicle.horsepower
      vehicle.horsepowerKW = Math.round(vehicle.horsepower * 0.7355) // HP to kW conversion
      
      normalizations.push({
        field: 'horsepowerKW',
        operation: 'unit_conversion',
        originalValue: `${vehicle.horsepower} HP`,
        normalizedValue: `${vehicle.horsepowerKW} kW`,
        reason: 'Converted HP to kW (1 HP = 0.7355 kW)'
      })
    }

    // Convert fuel consumption between different units
    if (vehicle.fuelConsumption && !vehicle.isElectric) {
      const consumption = this.parseFuelConsumption(vehicle.fuelConsumption)
      if (consumption) {
        vehicle.fuelConsumptionL100km = consumption.l100km
        vehicle.fuelConsumptionKmL = consumption.kmL
        
        normalizations.push({
          field: 'fuelConsumption',
          operation: 'fuel_consumption_normalization',
          originalValue: vehicle.fuelConsumption,
          normalizedValue: `${consumption.l100km} L/100km, ${consumption.kmL} km/L`,
          reason: 'Normalized fuel consumption to standard units'
        })
      }
    }
  }

  /**
   * Validate against industry standard ranges
   */
  private validateIndustryRanges(
    vehicle: StandardizedVehicle,
    validationFlags: ValidationFlag[]
  ): void {
    // Cross-validation between related fields
    if (vehicle.isElectric && vehicle.fuelConsumption && !vehicle.consumptionKwh100km) {
      validationFlags.push({
        type: 'warning',
        field: 'consumptionKwh100km',
        message: 'Electric vehicle has fuel consumption but missing kWh consumption'
      })
    }

    if (!vehicle.isElectric && vehicle.rangeKm && !vehicle.fuelConsumption) {
      validationFlags.push({
        type: 'warning',
        field: 'fuelConsumption',
        message: 'Non-electric vehicle has range but missing fuel consumption'
      })
    }

    // Consistency checks
    if (vehicle.co2Emission === 0 && !vehicle.isElectric) {
      validationFlags.push({
        type: 'warning',
        field: 'co2Emission',
        message: 'Zero CO2 emission for non-electric vehicle'
      })
    }

    if (vehicle.isElectric && vehicle.co2Emission && vehicle.co2Emission > 50) {
      validationFlags.push({
        type: 'warning',
        field: 'co2Emission',
        message: 'High CO2 emission for electric vehicle'
      })
    }
  }

  /**
   * Calculate quality scores
   */
  private calculateQualityScores(vehicle: StandardizedVehicle): void {
    // Data completeness score (0-1)
    const requiredFields = ['model', 'variant', 'pricingOptions']
    const importantFields = ['horsepower', 'fuelType', 'bodyType', 'transmission']
    const optionalFields = ['co2Emission', 'fuelConsumption']

    let completenessScore = 0
    let totalWeight = 0

    // Required fields (weight: 3)
    for (const field of requiredFields) {
      const weight = 3
      totalWeight += weight
      if (vehicle[field as keyof StandardizedVehicle]) {
        completenessScore += weight
      }
    }

    // Important fields (weight: 2)
    for (const field of importantFields) {
      const weight = 2
      totalWeight += weight
      if (vehicle[field as keyof StandardizedVehicle]) {
        completenessScore += weight
      }
    }

    // Optional fields (weight: 1)
    for (const field of optionalFields) {
      const weight = 1
      totalWeight += weight
      if (vehicle[field as keyof StandardizedVehicle]) {
        completenessScore += weight
      }
    }

    vehicle.dataCompleteness = totalWeight > 0 ? completenessScore / totalWeight : 0

    // Validation confidence score (0-1)
    const errorCount = vehicle.validationFlags.filter(f => f.type === 'error').length
    const warningCount = vehicle.validationFlags.filter(f => f.type === 'warning').length
    
    vehicle.validationConfidence = Math.max(0, 1 - (errorCount * 0.3) - (warningCount * 0.1))

    // Cross-dealer consistency score (0-1)
    // Based on how well the data fits standard patterns
    const normalizationCount = vehicle.normalizations.length
    const dataPoints = Object.keys(vehicle).length
    vehicle.crossDealerConsistency = Math.max(0, 1 - (normalizationCount / dataPoints) * 0.5)

    // Overall quality score (0-1)
    vehicle.qualityScore = (
      vehicle.dataCompleteness * 0.4 +
      vehicle.validationConfidence * 0.4 +
      vehicle.crossDealerConsistency * 0.2
    )
  }

  // Helper methods for normalization
  private normalizeHorsepower(hp: number): number {
    // Round to nearest 5 HP for consistency
    return Math.round(hp / 5) * 5
  }

  private normalizeCO2Emission(co2: number): number {
    // Round to nearest gram
    return Math.round(co2)
  }

  private mapBodyType(bodyType: string): string {
    const normalized = bodyType.toLowerCase().trim()
    
    // Common mappings
    const mappings = {
      'suv': 'SUV',
      'estate': 'Estate',
      'hatchback': 'Hatchback',
      'sedan': 'Sedan',
      'coupe': 'Coupe',
      'convertible': 'Convertible',
      'wagon': 'Estate',
      'van': 'Van',
      'pickup': 'Pickup'
    }

    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) {
        return value
      }
    }

    return bodyType
  }

  private mapFuelType(fuelType: string): string {
    const normalized = fuelType.toLowerCase().trim()
    
    const mappings = {
      'gasoline': 'Gasoline',
      'petrol': 'Gasoline',
      'benzin': 'Gasoline',
      'diesel': 'Diesel',
      'electric': 'Electric',
      'hybrid': 'Hybrid',
      'plug-in hybrid': 'Plug-in Hybrid',
      'phev': 'Plug-in Hybrid'
    }

    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) {
        return value
      }
    }

    return fuelType
  }

  private mapTransmission(transmission: string): string {
    const normalized = transmission.toLowerCase().trim()
    
    const mappings = {
      'manual': 'Manual',
      'automatic': 'Automatic',
      'cvt': 'CVT',
      'dsg': 'DSG',
      'tiptronic': 'Automatic'
    }

    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) {
        return value
      }
    }

    return transmission
  }

  private parseFuelConsumption(consumption: string): { l100km: number; kmL: number } | null {
    // Try to parse different fuel consumption formats
    const l100kmMatch = consumption.match(/(\d+[,.]?\d*)\s*l\/100\s*km/i)
    if (l100kmMatch) {
      const l100km = parseFloat(l100kmMatch[1].replace(',', '.'))
      const kmL = Math.round((100 / l100km) * 10) / 10
      return { l100km, kmL }
    }

    const kmLMatch = consumption.match(/(\d+[,.]?\d*)\s*km\/l/i)
    if (kmLMatch) {
      const kmL = parseFloat(kmLMatch[1].replace(',', '.'))
      const l100km = Math.round((100 / kmL) * 10) / 10
      return { l100km, kmL }
    }

    return null
  }

  // Analytics methods
  private calculateAverageQualityScore(vehicles: StandardizedVehicle[]): number {
    if (vehicles.length === 0) return 0
    
    const totalScore = vehicles.reduce((sum, vehicle) => sum + vehicle.qualityScore, 0)
    return totalScore / vehicles.length
  }

  private analyzeFieldCompleteness(vehicles: StandardizedVehicle[]): Record<string, number> {
    if (vehicles.length === 0) return {}

    const fields = ['model', 'variant', 'horsepower', 'fuelType', 'bodyType', 'transmission', 'co2Emission', 'pricingOptions']
    const completeness: Record<string, number> = {}

    for (const field of fields) {
      const completeCount = vehicles.filter(vehicle => {
        const value = vehicle[field as keyof StandardizedVehicle]
        return value !== undefined && value !== null && value !== ''
      }).length
      
      completeness[field] = completeCount / vehicles.length
    }

    return completeness
  }

  private identifyCommonIssues(vehicles: StandardizedVehicle[]): string[] {
    const issueCount: Record<string, number> = {}

    for (const vehicle of vehicles) {
      for (const flag of vehicle.validationFlags) {
        const key = `${flag.type}:${flag.field}:${flag.message}`
        issueCount[key] = (issueCount[key] || 0) + 1
      }
    }

    // Return issues that affect more than 10% of vehicles
    const threshold = Math.max(1, Math.floor(vehicles.length * 0.1))
    return Object.entries(issueCount)
      .filter(([, count]) => count >= threshold)
      .map(([issue]) => issue)
      .slice(0, 10) // Top 10 issues
  }

  // Configuration methods
  private initializeStandardizationMappings(): StandardizationMappings {
    return {
      modelNames: {
        // Volkswagen
        'ID.4': 'ID.4',
        'ID 4': 'ID.4',
        'ID4': 'ID.4',
        'e-Golf': 'e-Golf',
        'e-Up': 'e-up!',
        'e-up': 'e-up!',
        'Golf': 'Golf',
        'Passat': 'Passat',
        'Tiguan': 'Tiguan',
        'Touareg': 'Touareg',
        
        // Audi
        'e-tron': 'e-tron',
        'e-tron GT': 'e-tron GT',
        'Q4 e-tron': 'Q4 e-tron',
        'A3': 'A3',
        'A4': 'A4',
        'A6': 'A6',
        'Q3': 'Q3',
        'Q5': 'Q5',
        'Q7': 'Q7',
        
        // Toyota
        'Prius': 'Prius',
        'Corolla': 'Corolla',
        'Camry': 'Camry',
        'RAV4': 'RAV4',
        'Highlander': 'Highlander',
        'C-HR': 'C-HR',
        
        // BMW
        'iX3': 'iX3',
        'i4': 'i4',
        'iX': 'iX',
        '3 Series': '3 Series',
        '5 Series': '5 Series',
        'X3': 'X3',
        'X5': 'X5',
        
        // Mercedes-Benz
        'EQC': 'EQC',
        'EQA': 'EQA',
        'EQB': 'EQB',
        'A-Class': 'A-Class',
        'C-Class': 'C-Class',
        'E-Class': 'E-Class',
        'GLC': 'GLC',
        'GLE': 'GLE'
      },
      
      bodyTypes: {
        'SUV': 'SUV',
        'Compact SUV': 'Compact SUV',
        'Mid-size SUV': 'Mid-size SUV',
        'Large SUV': 'Large SUV',
        'Estate': 'Estate',
        'Hatchback': 'Hatchback',
        'Sedan': 'Sedan',
        'Coupe': 'Coupe',
        'Convertible': 'Convertible',
        'Van': 'Van',
        'Pickup': 'Pickup',
        'Crossover': 'Crossover'
      },
      
      fuelTypes: {
        'Gasoline': 'Gasoline',
        'Diesel': 'Diesel',
        'Electric': 'Electric',
        'Hybrid': 'Hybrid',
        'Plug-in Hybrid': 'Plug-in Hybrid',
        'Hydrogen': 'Hydrogen'
      },
      
      transmissionTypes: {
        'Manual': 'Manual',
        'Automatic': 'Automatic',
        'CVT': 'CVT',
        'DSG': 'DSG',
        'Semi-automatic': 'Semi-automatic'
      },
      
      brandVariations: {
        'VW': 'Volkswagen',
        'BMW': 'BMW',
        'Mercedes': 'Mercedes-Benz',
        'MB': 'Mercedes-Benz',
        'Audi': 'Audi',
        'Toyota': 'Toyota',
        'Volvo': 'Volvo',
        'Ford': 'Ford',
        'Opel': 'Opel',
        'Peugeot': 'Peugeot',
        'Renault': 'Renault',
        'Citroën': 'Citroën',
        'Skoda': 'Škoda',
        'SEAT': 'SEAT'
      }
    }
  }

  private initializeValidationRanges(): ValidationRanges {
    return {
      priceRange: {
        min: 1000,     // 1,000 kr/month
        max: 50000     // 50,000 kr/month
      },
      horsepowerRange: {
        min: 50,       // 50 HP
        max: 1000      // 1,000 HP
      },
      fuelConsumptionRange: {
        min: 2.0,      // 2.0 L/100km
        max: 25.0      // 25.0 L/100km
      },
      co2EmissionRange: {
        min: 0,        // 0 g/km (electric)
        max: 400       // 400 g/km
      },
      electricRangeRange: {
        min: 100,      // 100 km
        max: 800       // 800 km
      },
      leasingTermRange: {
        min: 12,       // 12 months
        max: 60        // 60 months
      },
      mileageRange: {
        min: 5000,     // 5,000 km/year
        max: 50000     // 50,000 km/year
      }
    }
  }
}

export interface ValidationSummary {
  totalVehicles: number
  passedValidation: number
  failedValidation: number
  averageQualityScore: number
  commonIssues: string[]
  fieldCompleteness: Record<string, number>
  normalizationsApplied: number
}

/*
 * CrossDealerValidator
 * 
 * Universal validation and standardization system for vehicle data.
 * Ensures consistent data quality across all dealers and formats.
 * 
 * Key Features:
 * - Model name normalization (ID.4, ID 4, ID4 → ID.4)
 * - Body type standardization (SUV, Compact SUV, etc.)
 * - Fuel type mapping and validation
 * - Unit conversions (HP ↔ kW, L/100km ↔ km/L)
 * - Industry-standard range validation
 * - Quality scoring and completeness analysis
 * - Cross-dealer consistency checks
 * - Comprehensive validation reporting
 * 
 * Usage:
 * const validator = new CrossDealerValidator()
 * const result = await validator.validateAndStandardize(vehicles)
 * console.log(`Quality score: ${result.overallQualityScore}`)
 */