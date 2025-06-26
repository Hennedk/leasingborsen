import { z } from 'zod'

// Common validation helpers
const positiveNumber = z.number().positive('Must be a positive number')
// const nonNegativeNumber = z.number().nonnegative('Must be non-negative')
const danishCurrency = z.number().min(0, 'Currency must be non-negative')
const danishDateString = z.string().regex(
  /^\d{2}[-/]\d{2}[-/]\d{4}$|^\d{4}[-/]\d{2}[-/]\d{2}$/,
  'Date must be in Danish format (DD-MM-YYYY or DD/MM/YYYY) or ISO format'
)

// Document Information Schema
export const DocumentInfoSchema = z.object({
  brand: z.string().min(1, 'Brand is required').max(50, 'Brand name too long'),
  documentDate: danishDateString,
  currency: z.enum(['DKK', 'EUR', 'USD'], {
    errorMap: () => ({ message: 'Currency must be DKK, EUR, or USD' })
  }),
  language: z.enum(['da', 'en'], {
    errorMap: () => ({ message: 'Language must be da (Danish) or en (English)' })
  }),
  documentType: z.enum(['private_leasing', 'business_leasing', 'price_list'], {
    errorMap: () => ({ message: 'Invalid document type' })
  })
})

// Vehicle Specifications Schema
export const VehicleSpecificationsSchema = z.object({
  fuelConsumptionKmpl: z.number().min(0).max(50).optional(),
  co2EmissionsGkm: z.number().min(0).max(500).optional(),
  energyLabel: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G']).optional(),
  electricRangeKm: z.number().min(0).max(1000).nullable().optional(),
  batteryCapacityKwh: z.number().min(0).max(200).nullable().optional(),
  horsePower: z.number().min(1).max(2000).optional(),
  acceleration0to100: z.number().min(0).max(30).optional()
}).refine(
  (data) => {
    // If it's an electric vehicle, it should have battery capacity
    if (data.electricRangeKm && data.electricRangeKm > 0) {
      return data.batteryCapacityKwh && data.batteryCapacityKwh > 0
    }
    return true
  },
  {
    message: 'Electric vehicles must have battery capacity specified',
    path: ['batteryCapacityKwh']
  }
)

// Pricing Schema
export const PricingSchema = z.object({
  monthlyPayment: positiveNumber.max(50000, 'Monthly payment seems unrealistic'),
  firstPayment: danishCurrency.max(500000, 'First payment seems unrealistic').optional(),
  totalCost: danishCurrency.max(2000000, 'Total cost seems unrealistic').optional(),
  annualKilometers: z.number().min(5000).max(100000).optional(),
  co2TaxBiannual: danishCurrency.max(20000).optional()
}).refine(
  (data) => {
    // Total cost should be reasonable compared to monthly payment
    if (data.totalCost && data.monthlyPayment) {
      const maxReasonableCost = data.monthlyPayment * 60 // 5 years max
      return data.totalCost <= maxReasonableCost
    }
    return true
  },
  {
    message: 'Total cost seems unrealistic compared to monthly payment',
    path: ['totalCost']
  }
)

// Vehicle Variant Schema
export const VehicleVariantSchema = z.object({
  variantName: z.string().min(1, 'Variant name is required').max(100, 'Variant name too long'),
  engineSpecification: z.string().min(1, 'Engine specification is required').max(100, 'Engine specification too long'),
  transmission: z.enum(['manual', 'automatic', 'cvt'], {
    errorMap: () => ({ message: 'Transmission must be manual, automatic, or cvt' })
  }),
  pricing: PricingSchema,
  specifications: VehicleSpecificationsSchema.optional()
}).refine(
  (data) => {
    // Engine specification should match variant name context
    const engineLower = data.engineSpecification.toLowerCase()
    const variantLower = data.variantName.toLowerCase()
    
    // Basic consistency check
    if (variantLower.includes('electric') || variantLower.includes('ev')) {
      return engineLower.includes('electric') || engineLower.includes('ev') || 
             engineLower.includes('kwh') || engineLower.includes('kw')
    }
    return true
  },
  {
    message: 'Engine specification should match variant type',
    path: ['engineSpecification']
  }
)

// Vehicle Schema
export const VehicleSchema = z.object({
  model: z.string().min(1, 'Model name is required').max(50, 'Model name too long'),
  category: z.string().max(50, 'Category too long').optional(),
  leasePeriodMonths: z.number().min(12, 'Lease period must be at least 12 months').max(60, 'Lease period too long'),
  powertrainType: z.enum(['gasoline', 'diesel', 'hybrid', 'electric', 'plugin_hybrid'], {
    errorMap: () => ({ message: 'Invalid powertrain type' })
  }),
  variants: z.array(VehicleVariantSchema).min(1, 'At least one variant is required').max(50, 'Too many variants')
}).refine(
  (data) => {
    // Validate that variants have consistent powertrain with vehicle
    const powertrainLower = data.powertrainType.toLowerCase()
    return data.variants.every(variant => {
      const engineLower = variant.engineSpecification.toLowerCase()
      
      if (powertrainLower === 'electric') {
        return engineLower.includes('electric') || engineLower.includes('ev') || 
               engineLower.includes('kwh') || engineLower.includes('kw')
      }
      if (powertrainLower === 'diesel') {
        return engineLower.includes('diesel') || engineLower.includes('tdi') || 
               engineLower.includes('cdi') || engineLower.includes('dci')
      }
      if (powertrainLower === 'hybrid' || powertrainLower === 'plugin_hybrid') {
        return engineLower.includes('hybrid') || engineLower.includes('phev') || 
               engineLower.includes('hev')
      }
      return true // Allow gasoline without strict matching
    })
  },
  {
    message: 'Vehicle variants must match the specified powertrain type',
    path: ['variants']
  }
)

// Accessory Schema
export const AccessorySchema = z.object({
  packageName: z.string().min(1, 'Package name is required').max(100, 'Package name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  monthlyCost: danishCurrency.max(10000, 'Monthly cost seems unrealistic'),
  category: z.enum(['wheels', 'service', 'insurance', 'other'], {
    errorMap: () => ({ message: 'Invalid accessory category' })
  }),
  packageCode: z.string().max(20, 'Package code too long').optional()
})

// Metadata Schema
export const MetadataSchema = z.object({
  extractionTimestamp: z.string().datetime('Invalid timestamp format'),
  documentPages: z.number().min(1).max(100).optional(),
  extractionWarnings: z.array(z.string()).optional()
})

// Main Extracted Car Data Schema
export const ExtractedCarDataSchema = z.object({
  documentInfo: DocumentInfoSchema,
  vehicles: z.array(VehicleSchema).min(1, 'At least one vehicle is required').max(100, 'Too many vehicles'),
  accessories: z.array(AccessorySchema).max(50, 'Too many accessories').optional(),
  metadata: MetadataSchema.optional()
}).refine(
  (data) => {
    // Check for duplicate vehicle models
    const modelNames = data.vehicles.map(v => v.model.toLowerCase())
    const uniqueModels = new Set(modelNames)
    return uniqueModels.size === modelNames.length
  },
  {
    message: 'Duplicate vehicle models found',
    path: ['vehicles']
  }
).refine(
  (data) => {
    // Check for reasonable number of variants per vehicle
    const totalVariants = data.vehicles.reduce((sum, vehicle) => sum + vehicle.variants.length, 0)
    return totalVariants <= 200 // Max 200 total variants across all vehicles
  },
  {
    message: 'Too many total variants across all vehicles',
    path: ['vehicles']
  }
)

// Validation Error Schema
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any().optional(),
  rule: z.string().optional()
})

// Validation Result Schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1)
})

// Export types inferred from schemas
export type DocumentInfoType = z.infer<typeof DocumentInfoSchema>
export type VehicleSpecificationsType = z.infer<typeof VehicleSpecificationsSchema>
export type PricingType = z.infer<typeof PricingSchema>
export type VehicleVariantType = z.infer<typeof VehicleVariantSchema>
export type VehicleType = z.infer<typeof VehicleSchema>
export type AccessoryType = z.infer<typeof AccessorySchema>
export type MetadataType = z.infer<typeof MetadataSchema>
export type ExtractedCarDataType = z.infer<typeof ExtractedCarDataSchema>
export type ValidationErrorType = z.infer<typeof ValidationErrorSchema>
export type ValidationResultType = z.infer<typeof ValidationResultSchema>