import { z } from 'zod'
import type { ExtractedCarData, ValidationResult, ValidationError } from '../types'
import { ExtractedCarDataSchema } from './schemas'
import { BusinessRules } from './rules'

/**
 * Main validator class for extracted car data
 * Combines Zod schema validation with business rule validation
 */
export class CarDataValidator {
  private static readonly CONFIDENCE_WEIGHTS = {
    STRUCTURE_VALID: 0.4,     // 40% weight for valid structure
    NO_CRITICAL_ERRORS: 0.3,  // 30% weight for no critical errors
    COMPLETENESS: 0.2,        // 20% weight for completeness
    CONSISTENCY: 0.1          // 10% weight for consistency
  }

  /**
   * Validates extracted car data against schemas and business rules
   */
  static async validate(data: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      confidence: 0
    }

    try {
      // Step 1: Validate against Zod schema
      const schemaValidation = await this.validateSchema(data)
      result.errors.push(...schemaValidation.errors)
      result.warnings.push(...schemaValidation.warnings)

      // If schema validation fails completely, return early
      if (schemaValidation.errors.length > 0) {
        result.confidence = this.calculateConfidence(result, data, false)
        return result
      }

      // Step 2: Cast to proper type after schema validation
      const validatedData = data as ExtractedCarData

      // Step 3: Apply business rules
      const businessValidation = await this.validateBusinessRules(validatedData)
      result.errors.push(...businessValidation.errors)
      result.warnings.push(...businessValidation.warnings)

      // Step 4: Calculate final validation result
      result.isValid = result.errors.length === 0
      result.confidence = this.calculateConfidence(result, validatedData, true)

      return result

    } catch (error) {
      console.error('Validation error:', error)
      result.errors.push({
        field: 'validation',
        message: `Validation process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rule: 'validation_error'
      })
      result.confidence = 0
      return result
    }
  }

  /**
   * Validates data against Zod schemas
   */
  private static async validateSchema(data: any): Promise<{ errors: ValidationError[], warnings: string[] }> {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    try {
      ExtractedCarDataSchema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.path.reduce((obj, key) => obj?.[key], data),
          rule: 'schema_validation'
        })))
      } else {
        errors.push({
          field: 'schema',
          message: 'Schema validation failed with unknown error',
          rule: 'schema_unknown_error'
        })
      }
    }

    return { errors, warnings }
  }

  /**
   * Validates business rules for Danish car market
   */
  private static async validateBusinessRules(data: ExtractedCarData): Promise<{ errors: ValidationError[], warnings: string[] }> {
    const errors: ValidationError[] = []
    const warnings: string[] = []

    // Validate required fields
    errors.push(...BusinessRules.validateRequiredFields(data))

    // Validate brand
    warnings.push(...BusinessRules.validateBrand(data.documentInfo.brand))

    // Validate each vehicle
    data.vehicles.forEach((vehicle, vehicleIndex) => {
      // Validate powertrain consistency
      const powertrainErrors = BusinessRules.validatePowertrainConsistency(vehicle)
      errors.push(...powertrainErrors.map(err => ({
        ...err,
        field: err.field.replace(/vehicles\[\d+\]/, `vehicles[${vehicleIndex}]`)
      })))

      // Validate each variant
      vehicle.variants.forEach((variant, variantIndex) => {
        // Validate pricing
        const pricingErrors = BusinessRules.validatePricing(variant, vehicle.model)
        errors.push(...pricingErrors.map(err => ({
          ...err,
          field: `vehicles[${vehicleIndex}].variants[${variantIndex}].${err.field}`
        })))

        // Validate specifications
        const specErrors = BusinessRules.validateSpecifications(variant, vehicle.powertrainType)
        errors.push(...specErrors.map(err => ({
          ...err,
          field: `vehicles[${vehicleIndex}].variants[${variantIndex}].${err.field}`
        })))
      })
    })

    // Validate accessories if present
    if (data.accessories) {
      data.accessories.forEach((accessory, index) => {
        if (accessory.monthlyCost < 0) {
          errors.push({
            field: `accessories[${index}].monthlyCost`,
            message: 'Accessory cost cannot be negative',
            value: accessory.monthlyCost,
            rule: 'non_negative_cost'
          })
        }

        if (accessory.monthlyCost > 10000) {
          warnings.push(`Accessory "${accessory.packageName}" has high monthly cost: ${BusinessRules.formatDanishCurrency(accessory.monthlyCost)}`)
        }
      })
    }

    // Data completeness warnings
    this.checkDataCompleteness(data, warnings)

    // Data consistency warnings
    this.checkDataConsistency(data, warnings)

    return { errors, warnings }
  }

  /**
   * Checks for data completeness and adds warnings
   */
  private static checkDataCompleteness(data: ExtractedCarData, warnings: string[]): void {
    let totalVariants = 0
    let variantsWithSpecs = 0
    let variantsWithCompleteSpecs = 0

    data.vehicles.forEach(vehicle => {
      totalVariants += vehicle.variants.length

      vehicle.variants.forEach(variant => {
        if (variant.specifications) {
          variantsWithSpecs++

          const specs = variant.specifications
          const specFields = [
            specs.fuelConsumptionKmpl,
            specs.co2EmissionsGkm,
            specs.horsePower,
            specs.acceleration0to100
          ]

          if (specFields.filter(field => field !== undefined).length >= 3) {
            variantsWithCompleteSpecs++
          }
        }

        // Check for missing optional but important fields
        if (!variant.pricing.firstPayment && !variant.pricing.totalCost) {
          warnings.push(`Variant "${variant.variantName}" missing first payment and total cost information`)
        }

        if (!variant.pricing.annualKilometers) {
          warnings.push(`Variant "${variant.variantName}" missing annual kilometers information`)
        }
      })
    })

    // Completeness warnings
    if (variantsWithSpecs / totalVariants < 0.5) {
      warnings.push(`Only ${Math.round((variantsWithSpecs / totalVariants) * 100)}% of variants have specifications`)
    }

    if (variantsWithCompleteSpecs / totalVariants < 0.3) {
      warnings.push(`Only ${Math.round((variantsWithCompleteSpecs / totalVariants) * 100)}% of variants have complete specifications`)
    }

    if (!data.documentInfo.documentDate) {
      warnings.push('Document date is missing')
    }

    if (!data.metadata?.extractionTimestamp) {
      warnings.push('Extraction timestamp is missing')
    }
  }

  /**
   * Checks for data consistency and adds warnings
   */
  private static checkDataConsistency(data: ExtractedCarData, warnings: string[]): void {
    // Check for consistent lease periods across vehicles
    const leasePeriods = Array.from(new Set(data.vehicles.map(v => v.leasePeriodMonths)))
    if (leasePeriods.length > 1) {
      warnings.push(`Inconsistent lease periods found: ${leasePeriods.join(', ')} months`)
    }

    // Check for consistent currency
    if (data.documentInfo.currency !== 'DKK') {
      warnings.push(`Non-Danish currency detected: ${data.documentInfo.currency}`)
    }

    // Check for price consistency within vehicle models
    data.vehicles.forEach(vehicle => {
      if (vehicle.variants.length > 1) {
        const prices = vehicle.variants.map(v => v.pricing.monthlyPayment).sort((a, b) => a - b)
        const priceRange = prices[prices.length - 1] - prices[0]
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length

        // If price range is more than 200% of average, it might be inconsistent
        if (priceRange > averagePrice * 2) {
          warnings.push(`Large price variation in ${vehicle.model}: ${BusinessRules.formatDanishCurrency(prices[0])} - ${BusinessRules.formatDanishCurrency(prices[prices.length - 1])}`)
        }
      }
    })

    // Check for duplicate variant names within the same model
    data.vehicles.forEach(vehicle => {
      const variantNames = vehicle.variants.map(v => v.variantName.toLowerCase())
      const uniqueNames = new Set(variantNames)
      if (uniqueNames.size !== variantNames.length) {
        warnings.push(`Duplicate variant names found in ${vehicle.model}`)
      }
    })
  }

  /**
   * Calculates confidence score based on validation results
   */
  private static calculateConfidence(result: ValidationResult, data: any, schemaValid: boolean): number {
    let confidence = 0

    // Structure validity (40% weight)
    if (schemaValid) {
      confidence += this.CONFIDENCE_WEIGHTS.STRUCTURE_VALID
    }

    // No critical errors (30% weight)
    const criticalErrors = result.errors.filter(err => 
      err.rule?.includes('required') || 
      err.rule?.includes('positive') ||
      err.rule === 'schema_validation'
    )
    if (criticalErrors.length === 0) {
      confidence += this.CONFIDENCE_WEIGHTS.NO_CRITICAL_ERRORS
    } else {
      // Partial credit based on error severity
      const errorPenalty = Math.min(criticalErrors.length * 0.1, this.CONFIDENCE_WEIGHTS.NO_CRITICAL_ERRORS)
      confidence += Math.max(0, this.CONFIDENCE_WEIGHTS.NO_CRITICAL_ERRORS - errorPenalty)
    }

    // Completeness (20% weight)
    if (schemaValid && data) {
      const completenessScore = this.calculateCompletenessScore(data as ExtractedCarData)
      confidence += this.CONFIDENCE_WEIGHTS.COMPLETENESS * completenessScore
    }

    // Consistency (10% weight)
    const consistencyScore = this.calculateConsistencyScore(result.warnings)
    confidence += this.CONFIDENCE_WEIGHTS.CONSISTENCY * consistencyScore

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Calculates completeness score based on available data
   */
  private static calculateCompletenessScore(data: ExtractedCarData): number {
    let score = 0
    let maxScore = 0

    // Document info completeness
    maxScore += 4
    if (data.documentInfo.brand) score += 1
    if (data.documentInfo.documentDate) score += 1
    if (data.documentInfo.currency) score += 1
    if (data.documentInfo.documentType) score += 1

    // Vehicle data completeness
    if (data.vehicles.length > 0) {
      let vehicleScore = 0
      let vehicleMaxScore = 0

      data.vehicles.forEach(vehicle => {
        vehicleMaxScore += 6
        if (vehicle.model) vehicleScore += 1
        if (vehicle.powertrainType) vehicleScore += 1
        if (vehicle.leasePeriodMonths) vehicleScore += 1
        if (vehicle.variants.length > 0) vehicleScore += 1

        vehicle.variants.forEach(variant => {
          vehicleMaxScore += 4
          if (variant.variantName) vehicleScore += 1
          if (variant.engineSpecification) vehicleScore += 1
          if (variant.pricing.monthlyPayment > 0) vehicleScore += 1
          if (variant.specifications) vehicleScore += 1
        })
      })

      score += (vehicleScore / vehicleMaxScore) * 8
      maxScore += 8
    }

    // Metadata completeness
    maxScore += 2
    if (data.metadata?.extractionTimestamp) score += 1
    if (data.metadata?.documentPages) score += 1

    return maxScore > 0 ? score / maxScore : 0
  }

  /**
   * Calculates consistency score based on warnings
   */
  private static calculateConsistencyScore(warnings: string[]): number {
    const consistencyWarnings = warnings.filter(warning => 
      warning.includes('inconsistent') || 
      warning.includes('duplicate') ||
      warning.includes('variation')
    )

    // Start with perfect consistency, reduce for each warning
    const penalty = consistencyWarnings.length * 0.2
    return Math.max(0, 1 - penalty)
  }

  /**
   * Quick validation that only checks critical fields
   */
  static async validateQuick(data: any): Promise<boolean> {
    try {
      // Basic structure check
      if (!data || typeof data !== 'object') return false
      if (!data.documentInfo || !data.vehicles || !Array.isArray(data.vehicles)) return false
      if (data.vehicles.length === 0) return false

      // Check basic required fields
      if (!data.documentInfo.brand || !data.documentInfo.currency) return false

      // Check each vehicle has required fields
      for (const vehicle of data.vehicles) {
        if (!vehicle.model || !vehicle.powertrainType || !vehicle.variants || !Array.isArray(vehicle.variants)) {
          return false
        }
        if (vehicle.variants.length === 0) return false

        for (const variant of vehicle.variants) {
          if (!variant.variantName || !variant.engineSpecification || !variant.pricing) return false
          if (!variant.pricing.monthlyPayment || variant.pricing.monthlyPayment <= 0) return false
        }
      }

      return true
    } catch (error) {
      console.error('Quick validation error:', error)
      return false
    }
  }

  /**
   * Get validation summary for logging
   */
  static getValidationSummary(result: ValidationResult): string {
    const errorCount = result.errors.length
    const warningCount = result.warnings.length
    const confidencePercent = Math.round(result.confidence * 100)

    return `Validation: ${result.isValid ? 'PASSED' : 'FAILED'} | ` +
           `Errors: ${errorCount} | Warnings: ${warningCount} | ` +
           `Confidence: ${confidencePercent}%`
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return 'No validation errors'

    return errors.map((error, index) => 
      `${index + 1}. ${error.field}: ${error.message}` +
      (error.value !== undefined ? ` (Value: ${error.value})` : '')
    ).join('\n')
  }

  /**
   * Get critical errors only
   */
  static getCriticalErrors(result: ValidationResult): ValidationError[] {
    return result.errors.filter(error => 
      error.rule?.includes('required') ||
      error.rule?.includes('positive') ||
      error.rule === 'schema_validation' ||
      error.rule?.includes('danish_min') ||
      error.rule?.includes('danish_max')
    )
  }
}