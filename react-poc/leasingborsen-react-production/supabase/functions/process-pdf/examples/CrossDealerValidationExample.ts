import { CrossDealerValidator, StandardizedVehicle } from '../validation/CrossDealerValidator.ts'
import { UnitConverter } from '../validation/UnitConverter.ts'
import { StandardizationMaps } from '../validation/StandardizationMaps.ts'
import { ExtractedVehicle } from '../types/DealerConfig.ts'

/* Claude Change Summary:
 * Created CrossDealerValidationExample to demonstrate standardization capabilities.
 * Shows how different dealer formats are normalized to consistent output.
 * Includes real-world examples from multiple dealer types.
 * Related to: Cross-dealer validation and standardization system
 */

/**
 * Comprehensive example demonstrating cross-dealer validation and standardization
 */
export class CrossDealerValidationExample {

  /**
   * Example vehicles from different dealers with various formatting issues
   */
  static getSampleVehicles(): ExtractedVehicle[] {
    return [
      // Volkswagen dealer - good data but inconsistent naming
      {
        model: 'ID 4 leasingpriser',
        variant: 'Pro 150 hk',
        horsepower: 150,
        transmission: 'Automatisk',
        fuelType: 'Electric',
        bodyType: 'suv',
        co2Emission: 0,
        isElectric: true,
        rangeKm: 520,
        consumptionKwh100km: 17.9,
        pricingOptions: [
          {
            mileagePerYear: 15000,
            periodMonths: 36,
            monthlyPrice: 12500,
            totalCost: 450000,
            firstPayment: 25000
          },
          {
            mileagePerYear: 20000,
            periodMonths: 48,
            monthlyPrice: 11800,
            totalCost: 566400,
            firstPayment: 25000
          }
        ],
        sourceLineNumbers: [15, 16, 17],
        confidenceScore: 0.85,
        extractionMethod: 'pattern',
        sourceSection: 'Lines 15-17'
      },

      // Toyota dealer - different formatting, imperial units
      {
        model: 'Prius',
        variant: 'Hybrid 122 PS',
        horsepower: 122,
        transmission: 'CVT',
        fuelType: 'hybrid',
        bodyType: 'Hatchback',
        co2Emission: 89,
        fuelConsumption: '3.9 L/100km',
        isElectric: false,
        pricingOptions: [
          {
            mileagePerYear: 12000,
            periodMonths: 36,
            monthlyPrice: 8900
          },
          {
            mileagePerYear: 15000,
            periodMonths: 48,
            monthlyPrice: 8200
          }
        ],
        sourceLineNumbers: [42, 43, 44],
        confidenceScore: 0.75,
        extractionMethod: 'ai',
        sourceSection: 'Lines 42-44'
      },

      // BMW dealer - different power unit, missing some fields
      {
        model: 'i4',
        variant: 'eDrive40',
        horsepower: undefined, // Missing, but we know it's ~340 HP
        transmission: undefined,
        fuelType: 'Battery',
        bodyType: undefined,
        co2Emission: 0,
        isElectric: true,
        rangeKm: 590,
        consumptionKwh100km: 19.1,
        pricingOptions: [
          {
            mileagePerYear: 20000,
            periodMonths: 36,
            monthlyPrice: 15900,
            totalCost: 572400
          }
        ],
        sourceLineNumbers: [88],
        confidenceScore: 0.65,
        extractionMethod: 'hybrid',
        sourceSection: 'Line 88'
      },

      // Mercedes dealer - different naming conventions
      {
        model: 'EQC',
        variant: '400 4MATIC',
        horsepower: 408,
        transmission: '9G-TRONIC',
        fuelType: 'Full Electric',
        bodyType: 'SUV',
        co2Emission: 0,
        isElectric: true,
        rangeKm: 423,
        consumptionKwh100km: 22.2,
        pricingOptions: [
          {
            mileagePerYear: 15000,
            periodMonths: 48,
            monthlyPrice: 18500,
            totalCost: 888000,
            deposit: 50000
          }
        ],
        sourceLineNumbers: [156, 157],
        confidenceScore: 0.80,
        extractionMethod: 'pattern',
        sourceSection: 'Lines 156-157'
      },

      // Audi dealer - kW power units, different fuel consumption format
      {
        model: 'Q4 e-tron',
        variant: '50 quattro',
        horsepower: 265, // Actually 195 kW, but extracted as HP incorrectly
        transmission: 'Automatisk',
        fuelType: 'Electric',
        bodyType: 'Compact SUV',
        co2Emission: 0,
        isElectric: true,
        rangeKm: 488,
        consumptionKwh100km: 19.6,
        pricingOptions: [
          {
            mileagePerYear: 10000,
            periodMonths: 36,
            monthlyPrice: 14200
          },
          {
            mileagePerYear: 15000,
            periodMonths: 36,
            monthlyPrice: 14700
          },
          {
            mileagePerYear: 20000,
            periodMonths: 36,
            monthlyPrice: 15200
          }
        ],
        sourceLineNumbers: [201, 202, 203, 204],
        confidenceScore: 0.90,
        extractionMethod: 'ai',
        sourceSection: 'Lines 201-204'
      },

      // Problem vehicle - missing critical data
      {
        model: 'Unknown Model',
        variant: '',
        horsepower: 2000, // Clearly wrong
        transmission: undefined,
        fuelType: undefined,
        bodyType: undefined,
        co2Emission: 500, // Also wrong
        isElectric: false,
        pricingOptions: [],
        sourceLineNumbers: [300],
        confidenceScore: 0.20,
        extractionMethod: 'pattern',
        sourceSection: 'Line 300'
      }
    ]
  }

  /**
   * Run the complete validation example
   */
  static async runExample(): Promise<void> {
    console.log('🔍 Cross-Dealer Validation Example')
    console.log('=====================================\n')

    const validator = new CrossDealerValidator()
    const sampleVehicles = this.getSampleVehicles()

    console.log(`📊 Input: ${sampleVehicles.length} vehicles from different dealers`)
    this.printInputSummary(sampleVehicles)

    // Perform validation and standardization
    console.log('\n🔄 Running cross-dealer validation and standardization...\n')
    const result = await validator.validateAndStandardize(sampleVehicles)

    // Print results
    console.log('✅ Validation Results:')
    console.log(`   Overall Quality Score: ${result.overallQualityScore.toFixed(3)}`)
    console.log(`   Passed Validation: ${result.validationSummary.passedValidation}/${result.validationSummary.totalVehicles}`)
    console.log(`   Normalizations Applied: ${result.validationSummary.normalizationsApplied}`)

    // Show field completeness
    console.log('\n📈 Field Completeness:')
    for (const [field, completeness] of Object.entries(result.validationSummary.fieldCompleteness)) {
      const percentage = (completeness * 100).toFixed(1)
      console.log(`   ${field}: ${percentage}%`)
    }

    // Show common issues
    if (result.validationSummary.commonIssues.length > 0) {
      console.log('\n⚠️  Common Issues:')
      result.validationSummary.commonIssues.forEach(issue => {
        console.log(`   - ${issue}`)
      })
    }

    // Show detailed standardization for first few vehicles
    console.log('\n🔧 Detailed Standardization Examples:')
    result.standardizedVehicles.slice(0, 3).forEach((vehicle, index) => {
      this.printVehicleStandardization(vehicle, index + 1)
    })

    // Unit conversion examples
    console.log('\n🔄 Unit Conversion Examples:')
    this.showUnitConversionExamples()

    // Model name standardization examples
    console.log('\n📝 Model Name Standardization Examples:')
    this.showModelStandardizationExamples()

    console.log('\n✅ Cross-dealer validation example complete!')
  }

  /**
   * Print summary of input vehicles
   */
  private static printInputSummary(vehicles: ExtractedVehicle[]): void {
    console.log('\nInput Vehicles:')
    vehicles.forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle.model} ${vehicle.variant} (${vehicle.extractionMethod})`)
      console.log(`   Power: ${vehicle.horsepower || 'missing'} HP, Fuel: ${vehicle.fuelType || 'missing'}`)
      console.log(`   Pricing options: ${vehicle.pricingOptions.length}`)
    })
  }

  /**
   * Print detailed standardization for a vehicle
   */
  private static printVehicleStandardization(vehicle: StandardizedVehicle, index: number): void {
    console.log(`\n${index}. ${vehicle.model} → ${vehicle.standardizedModel}`)
    console.log(`   Variant: ${vehicle.variant} → ${vehicle.standardizedVariant}`)
    console.log(`   Quality Score: ${vehicle.qualityScore.toFixed(3)}`)
    console.log(`   Data Completeness: ${vehicle.dataCompleteness.toFixed(3)}`)
    console.log(`   Validation Confidence: ${vehicle.validationConfidence.toFixed(3)}`)

    // Show normalizations
    if (vehicle.normalizations.length > 0) {
      console.log('   Normalizations:')
      vehicle.normalizations.forEach(norm => {
        console.log(`     - ${norm.field}: ${norm.originalValue} → ${norm.normalizedValue} (${norm.reason})`)
      })
    }

    // Show validation flags
    if (vehicle.validationFlags.length > 0) {
      console.log('   Validation Flags:')
      vehicle.validationFlags.forEach(flag => {
        console.log(`     - ${flag.type}: ${flag.field} - ${flag.message}`)
      })
    }

    // Show unit conversions
    if (vehicle.horsepowerHP && vehicle.horsepowerKW) {
      console.log(`   Power: ${vehicle.horsepowerHP} HP = ${vehicle.horsepowerKW} kW`)
    }

    if (vehicle.fuelConsumptionL100km && vehicle.fuelConsumptionKmL) {
      console.log(`   Fuel: ${vehicle.fuelConsumptionL100km} L/100km = ${vehicle.fuelConsumptionKmL} km/L`)
    }
  }

  /**
   * Show unit conversion examples
   */
  private static showUnitConversionExamples(): void {
    const examples = [
      '150 HP',
      '110 kW',
      '5.8 L/100km',
      '17.2 km/L',
      '19.1 kWh/100km',
      '120 g/km'
    ]

    examples.forEach(example => {
      console.log(`\n${example}:`)
      const conversions = UnitConverter.getAllConversions(example)
      conversions.forEach(conv => {
        console.log(`  → ${UnitConverter.formatConversion(conv)}`)
      })
    })
  }

  /**
   * Show model name standardization examples
   */
  private static showModelStandardizationExamples(): void {
    const examples = [
      { input: 'ID 4', brand: 'Volkswagen' },
      { input: 'id4', brand: 'Volkswagen' },
      { input: 'e-tron GT', brand: 'Audi' },
      { input: 'etron GT', brand: 'Audi' },
      { input: 'C-HR', brand: 'Toyota' },
      { input: 'CHR', brand: 'Toyota' },
      { input: '3 Series', brand: 'BMW' },
      { input: '3-Series', brand: 'BMW' }
    ]

    examples.forEach(example => {
      const result = StandardizationMaps.findStandardizedModel(example.input, example.brand)
      if (result) {
        console.log(`${example.input} → ${result.standardName} (confidence: ${result.confidence.toFixed(3)})`)
      } else {
        console.log(`${example.input} → No mapping found`)
      }
    })
  }

  /**
   * Demonstrate quality scoring algorithm
   */
  static demonstrateQualityScoring(): void {
    console.log('\n🎯 Quality Scoring Algorithm Demonstration')
    console.log('==========================================\n')

    const examples = [
      {
        name: 'Perfect Vehicle',
        vehicle: {
          model: 'ID.4',
          variant: 'Pro',
          horsepower: 150,
          fuelType: 'Electric',
          bodyType: 'SUV',
          transmission: 'Automatic',
          co2Emission: 0,
          pricingOptions: [{ mileagePerYear: 15000, periodMonths: 36, monthlyPrice: 12500 }]
        }
      },
      {
        name: 'Missing Optional Fields',
        vehicle: {
          model: 'Corolla',
          variant: 'Hybrid',
          pricingOptions: [{ mileagePerYear: 15000, periodMonths: 36, monthlyPrice: 8900 }]
        }
      },
      {
        name: 'Missing Required Fields',
        vehicle: {
          horsepower: 150,
          fuelType: 'Electric',
          pricingOptions: []
        }
      }
    ]

    examples.forEach(example => {
      console.log(`${example.name}:`)
      // This would require creating a mock StandardizedVehicle, 
      // but demonstrates the concept of quality scoring
      console.log(`  Data provided: ${Object.keys(example.vehicle).length} fields`)
      
      const hasRequiredFields = example.vehicle.model && example.vehicle.variant && 
                               (example.vehicle as any).pricingOptions?.length > 0
      console.log(`  Has required fields: ${hasRequiredFields}`)
      
      const estimatedQuality = hasRequiredFields ? 0.8 : 0.3
      console.log(`  Estimated quality score: ${estimatedQuality}`)
      console.log()
    })
  }

  /**
   * Show cross-dealer consistency checking
   */
  static demonstrateCrossDealerConsistency(): void {
    console.log('\n🔄 Cross-Dealer Consistency Examples')
    console.log('====================================\n')

    const variations = [
      {
        field: 'Model Names',
        variations: ['ID.4', 'ID 4', 'ID4', 'id.4'],
        standardized: 'ID.4'
      },
      {
        field: 'Body Types',
        variations: ['SUV', 'suv', 'Sport Utility Vehicle', 'Crossover'],
        standardized: 'SUV'
      },
      {
        field: 'Fuel Types',
        variations: ['Electric', 'Battery', 'BEV', 'Full Electric'],
        standardized: 'Electric'
      },
      {
        field: 'Transmission',
        variations: ['Automatic', 'Automatisk', 'Auto', 'AT'],
        standardized: 'Automatic'
      }
    ]

    variations.forEach(example => {
      console.log(`${example.field}:`)
      example.variations.forEach(variation => {
        console.log(`  "${variation}" → "${example.standardized}"`)
      })
      console.log()
    })
  }
}

/*
 * CrossDealerValidationExample
 * 
 * Comprehensive demonstration of the cross-dealer validation system.
 * Shows real-world examples of data standardization and validation.
 * 
 * Key Demonstrations:
 * - Model name normalization across dealers
 * - Unit conversions (HP/kW, L/100km/km/L)
 * - Body type and fuel type standardization
 * - Quality scoring and completeness analysis
 * - Validation flag generation
 * - Cross-dealer consistency checking
 * 
 * Usage:
 * await CrossDealerValidationExample.runExample()
 * 
 * This example shows how the system handles:
 * 1. Volkswagen ID.4 with good data but naming issues
 * 2. Toyota Prius with different formatting
 * 3. BMW i4 with missing fields
 * 4. Mercedes EQC with different conventions
 * 5. Audi Q4 e-tron with kW units
 * 6. Problem vehicle with invalid data
 */