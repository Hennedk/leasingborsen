// Example usage of the validation system
import { CarDataValidator } from './validator'
import type { ExtractedCarData } from '../types'

// Example valid data for testing
export const exampleValidData: ExtractedCarData = {
  documentInfo: {
    brand: 'Toyota',
    documentDate: '2024-06-01',
    currency: 'DKK',
    language: 'da',
    documentType: 'private_leasing'
  },
  vehicles: [
    {
      model: 'Corolla',
      category: 'Compact',
      leasePeriodMonths: 36,
      powertrainType: 'hybrid',
      variants: [
        {
          variantName: 'Corolla 1.8 Hybrid',
          engineSpecification: '1.8 Hybrid 122 hk',
          transmission: 'automatic',
          pricing: {
            monthlyPayment: 3500,
            firstPayment: 35000,
            totalCost: 126000,
            annualKilometers: 15000,
            co2TaxBiannual: 1200
          },
          specifications: {
            fuelConsumptionKmpl: 25.0,
            co2EmissionsGkm: 92,
            energyLabel: 'A',
            horsePower: 122,
            acceleration0to100: 8.1
          }
        },
        {
          variantName: 'Corolla 2.0 Hybrid',
          engineSpecification: '2.0 Hybrid 196 hk',
          transmission: 'automatic',
          pricing: {
            monthlyPayment: 4200,
            firstPayment: 42000,
            totalCost: 151200,
            annualKilometers: 15000,
            co2TaxBiannual: 1500
          },
          specifications: {
            fuelConsumptionKmpl: 22.5,
            co2EmissionsGkm: 105,
            energyLabel: 'A',
            horsePower: 196,
            acceleration0to100: 7.5
          }
        }
      ]
    },
    {
      model: 'bZ4X',
      category: 'SUV',
      leasePeriodMonths: 36,
      powertrainType: 'electric',
      variants: [
        {
          variantName: 'bZ4X Pure FWD',
          engineSpecification: 'Electric 204 hk',
          transmission: 'automatic',
          pricing: {
            monthlyPayment: 5800,
            firstPayment: 58000,
            totalCost: 208800,
            annualKilometers: 15000,
            co2TaxBiannual: 0
          },
          specifications: {
            co2EmissionsGkm: 0,
            energyLabel: 'A',
            electricRangeKm: 516,
            batteryCapacityKwh: 71.4,
            horsePower: 204,
            acceleration0to100: 6.9
          }
        }
      ]
    }
  ],
  accessories: [
    {
      packageName: 'Servicepakke',
      description: 'Omfattende servicepakke med vedligeholdelse',
      monthlyCost: 450,
      category: 'service',
      packageCode: 'SP001'
    },
    {
      packageName: 'Vinterdæk pakke',
      description: 'Komplet vinterdæk sæt med fælge',
      monthlyCost: 200,
      category: 'wheels',
      packageCode: 'WP001'
    }
  ],
  metadata: {
    extractionTimestamp: '2024-06-24T10:00:00Z',
    documentPages: 15,
    extractionWarnings: []
  }
}

// Example invalid data for testing
export const exampleInvalidData = {
  documentInfo: {
    brand: '', // Invalid: empty brand
    documentDate: 'invalid-date', // Invalid: bad date format
    currency: 'USD', // Warning: non-DKK currency
    language: 'da',
    documentType: 'private_leasing'
  },
  vehicles: [
    {
      model: 'Corolla',
      leasePeriodMonths: 36,
      powertrainType: 'electric', // Inconsistent with variant below
      variants: [
        {
          variantName: 'Corolla Gasoline', // Inconsistent with powertrainType
          engineSpecification: '1.6 Gasoline 120 hk', // Inconsistent with electric
          transmission: 'manual',
          pricing: {
            monthlyPayment: -100, // Invalid: negative price
            firstPayment: 1000000, // Warning: very high first payment
            totalCost: 50000, // Invalid: too low compared to monthly
            annualKilometers: 1000, // Invalid: too low
            co2TaxBiannual: 25000 // Invalid: too high for Denmark
          },
          specifications: {
            fuelConsumptionKmpl: 100, // Invalid: unrealistic
            co2EmissionsGkm: 600, // Invalid: too high
            energyLabel: 'Z', // Invalid: not a valid energy label
            electricRangeKm: 10, // Invalid: too low for electric
            batteryCapacityKwh: 5, // Invalid: too small
            horsePower: 5000, // Invalid: unrealistic
            acceleration0to100: 50 // Invalid: too slow
          }
        }
      ]
    }
  ]
  // Missing required accessories array structure
}

/**
 * Example usage function
 */
export async function runValidationExamples(): Promise<void> {
  console.log('=== Car Data Validation Examples ===\n')

  // Test valid data
  console.log('1. Testing VALID data:')
  const validResult = await CarDataValidator.validate(exampleValidData)
  console.log(`Result: ${CarDataValidator.getValidationSummary(validResult)}`)
  
  if (validResult.warnings.length > 0) {
    console.log('Warnings:')
    validResult.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`)
    })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')

  // Test invalid data
  console.log('2. Testing INVALID data:')
  const invalidResult = await CarDataValidator.validate(exampleInvalidData)
  console.log(`Result: ${CarDataValidator.getValidationSummary(invalidResult)}`)
  
  if (invalidResult.errors.length > 0) {
    console.log('Errors:')
    console.log(CarDataValidator.formatValidationErrors(invalidResult.errors))
  }
  
  if (invalidResult.warnings.length > 0) {
    console.log('\nWarnings:')
    invalidResult.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`)
    })
  }

  console.log('\n' + '='.repeat(50) + '\n')

  // Test quick validation
  console.log('3. Testing QUICK validation:')
  const quickValid = await CarDataValidator.validateQuick(exampleValidData)
  const quickInvalid = await CarDataValidator.validateQuick(exampleInvalidData)
  console.log(`Valid data quick check: ${quickValid ? 'PASS' : 'FAIL'}`)
  console.log(`Invalid data quick check: ${quickInvalid ? 'PASS' : 'FAIL'}`)

  console.log('\n' + '='.repeat(50) + '\n')

  // Test critical errors
  console.log('4. Testing CRITICAL errors detection:')
  const criticalErrors = CarDataValidator.getCriticalErrors(invalidResult)
  console.log(`Found ${criticalErrors.length} critical errors:`)
  criticalErrors.forEach((error, index) => {
    console.log(`  ${index + 1}. ${error.field}: ${error.message}`)
  })
}

// Export for use in other files
export { CarDataValidator }