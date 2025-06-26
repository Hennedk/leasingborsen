import type { ExtractedCarData, Vehicle, VehicleVariant, ValidationError } from '../types'

// Danish market-specific business rules
export class BusinessRules {
  // Danish market price ranges (in DKK per month)
  private static readonly PRICE_RANGES = {
    MIN_MONTHLY_LEASE: 1000,      // Minimum realistic monthly lease in Denmark
    MAX_MONTHLY_LEASE: 50000,     // Maximum realistic monthly lease
    MIN_FIRST_PAYMENT: 0,         // Can be zero
    MAX_FIRST_PAYMENT: 500000,    // Maximum realistic first payment
    MIN_CO2_TAX: 0,               // Can be zero for electric vehicles
    MAX_CO2_TAX: 15000,           // Maximum CO2 tax in Denmark (biannual)
    MIN_ANNUAL_KM: 5000,          // Minimum lease kilometers
    MAX_ANNUAL_KM: 100000,        // Maximum lease kilometers
  }

  // Danish car market specifications
  private static readonly SPECIFICATIONS = {
    MIN_FUEL_CONSUMPTION: 0.5,    // km/l
    MAX_FUEL_CONSUMPTION: 50,     // km/l
    MIN_CO2_EMISSIONS: 0,         // g/km (electric cars)
    MAX_CO2_EMISSIONS: 500,       // g/km
    MIN_ELECTRIC_RANGE: 50,       // km (minimum for BEV)
    MAX_ELECTRIC_RANGE: 1000,     // km
    MIN_BATTERY_CAPACITY: 10,     // kWh (minimum for practical EV)
    MAX_BATTERY_CAPACITY: 200,    // kWh
    MIN_HORSEPOWER: 50,           // hp
    MAX_HORSEPOWER: 2000,         // hp
    MIN_ACCELERATION: 2,          // seconds 0-100 km/h
    MAX_ACCELERATION: 30,         // seconds
  }

  // Common Danish car brands
  private static readonly DANISH_MARKET_BRANDS = [
    'Toyota', 'Volkswagen', 'Ford', 'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 
    'Hyundai', 'Kia', 'Mazda', 'Nissan', 'Honda', 'Skoda', 'SEAT', 'Peugeot',
    'Citroën', 'Renault', 'Opel', 'Fiat', 'Alfa Romeo', 'Jeep', 'Land Rover',
    'Jaguar', 'Tesla', 'Porsche', 'MINI', 'Subaru', 'Suzuki', 'Mitsubishi',
    'Lexus', 'Infiniti', 'Acura', 'Genesis', 'DS', 'Dacia', 'Lada'
  ]

  // Danish powertrain type patterns
  private static readonly POWERTRAIN_PATTERNS = {
    electric: ['electric', 'ev', 'bev', 'kwh', 'kw', 'elektrisk'],
    hybrid: ['hybrid', 'hev', 'mhev', 'mild hybrid', 'full hybrid'],
    plugin_hybrid: ['plugin', 'phev', 'plug-in', 'ladbar'],
    diesel: ['diesel', 'tdi', 'cdi', 'dci', 'bluedci', 'cdti'],
    gasoline: ['tsi', 'tfsi', 'vti', 'gdi', 'turbo', 'benzin', 'petrol']
  }

  /**
   * Validates pricing according to Danish market rules
   */
  static validatePricing(variant: VehicleVariant, _model: string): ValidationError[] {
    const errors: ValidationError[] = []
    const { pricing } = variant

    // Monthly payment validation
    if (pricing.monthlyPayment < this.PRICE_RANGES.MIN_MONTHLY_LEASE) {
      errors.push({
        field: 'pricing.monthlyPayment',
        message: `Monthly payment ${pricing.monthlyPayment} DKK is unrealistically low for Danish market`,
        value: pricing.monthlyPayment,
        rule: 'danish_min_monthly_lease'
      })
    }

    if (pricing.monthlyPayment > this.PRICE_RANGES.MAX_MONTHLY_LEASE) {
      errors.push({
        field: 'pricing.monthlyPayment',
        message: `Monthly payment ${pricing.monthlyPayment} DKK is unrealistically high`,
        value: pricing.monthlyPayment,
        rule: 'danish_max_monthly_lease'
      })
    }

    // First payment validation
    if (pricing.firstPayment !== undefined) {
      if (pricing.firstPayment < this.PRICE_RANGES.MIN_FIRST_PAYMENT) {
        errors.push({
          field: 'pricing.firstPayment',
          message: 'First payment cannot be negative',
          value: pricing.firstPayment,
          rule: 'non_negative_first_payment'
        })
      }

      if (pricing.firstPayment > this.PRICE_RANGES.MAX_FIRST_PAYMENT) {
        errors.push({
          field: 'pricing.firstPayment',
          message: `First payment ${pricing.firstPayment} DKK is unrealistically high`,
          value: pricing.firstPayment,
          rule: 'danish_max_first_payment'
        })
      }
    }

    // Total cost reasonableness
    if (pricing.totalCost !== undefined) {
      const maxReasonableCost = pricing.monthlyPayment * 60 // 5 years
      if (pricing.totalCost > maxReasonableCost) {
        errors.push({
          field: 'pricing.totalCost',
          message: `Total cost ${pricing.totalCost} DKK seems unrealistic compared to monthly payment`,
          value: pricing.totalCost,
          rule: 'reasonable_total_cost'
        })
      }
    }

    // Annual kilometers validation
    if (pricing.annualKilometers !== undefined) {
      if (pricing.annualKilometers < this.PRICE_RANGES.MIN_ANNUAL_KM) {
        errors.push({
          field: 'pricing.annualKilometers',
          message: `Annual kilometers ${pricing.annualKilometers} is too low for typical lease`,
          value: pricing.annualKilometers,
          rule: 'min_annual_kilometers'
        })
      }

      if (pricing.annualKilometers > this.PRICE_RANGES.MAX_ANNUAL_KM) {
        errors.push({
          field: 'pricing.annualKilometers',
          message: `Annual kilometers ${pricing.annualKilometers} is unrealistically high`,
          value: pricing.annualKilometers,
          rule: 'max_annual_kilometers'
        })
      }
    }

    // CO2 tax validation
    if (pricing.co2TaxBiannual !== undefined) {
      if (pricing.co2TaxBiannual < this.PRICE_RANGES.MIN_CO2_TAX) {
        errors.push({
          field: 'pricing.co2TaxBiannual',
          message: 'CO2 tax cannot be negative',
          value: pricing.co2TaxBiannual,
          rule: 'non_negative_co2_tax'
        })
      }

      if (pricing.co2TaxBiannual > this.PRICE_RANGES.MAX_CO2_TAX) {
        errors.push({
          field: 'pricing.co2TaxBiannual',
          message: `CO2 tax ${pricing.co2TaxBiannual} DKK is higher than Danish maximum`,
          value: pricing.co2TaxBiannual,
          rule: 'danish_max_co2_tax'
        })
      }
    }

    return errors
  }

  /**
   * Validates vehicle specifications against realistic ranges
   */
  static validateSpecifications(variant: VehicleVariant, powertrainType: string): ValidationError[] {
    const errors: ValidationError[] = []
    const specs = variant.specifications

    if (!specs) return errors

    // Fuel consumption validation
    if (specs.fuelConsumptionKmpl !== undefined) {
      if (specs.fuelConsumptionKmpl < this.SPECIFICATIONS.MIN_FUEL_CONSUMPTION) {
        errors.push({
          field: 'specifications.fuelConsumptionKmpl',
          message: `Fuel consumption ${specs.fuelConsumptionKmpl} km/l is unrealistically low`,
          value: specs.fuelConsumptionKmpl,
          rule: 'min_fuel_consumption'
        })
      }

      if (specs.fuelConsumptionKmpl > this.SPECIFICATIONS.MAX_FUEL_CONSUMPTION) {
        errors.push({
          field: 'specifications.fuelConsumptionKmpl',
          message: `Fuel consumption ${specs.fuelConsumptionKmpl} km/l is unrealistically high`,
          value: specs.fuelConsumptionKmpl,
          rule: 'max_fuel_consumption'
        })
      }
    }

    // CO2 emissions validation
    if (specs.co2EmissionsGkm !== undefined) {
      if (specs.co2EmissionsGkm < this.SPECIFICATIONS.MIN_CO2_EMISSIONS) {
        errors.push({
          field: 'specifications.co2EmissionsGkm',
          message: 'CO2 emissions cannot be negative',
          value: specs.co2EmissionsGkm,
          rule: 'non_negative_co2_emissions'
        })
      }

      if (specs.co2EmissionsGkm > this.SPECIFICATIONS.MAX_CO2_EMISSIONS) {
        errors.push({
          field: 'specifications.co2EmissionsGkm',
          message: `CO2 emissions ${specs.co2EmissionsGkm} g/km is unrealistically high`,
          value: specs.co2EmissionsGkm,
          rule: 'max_co2_emissions'
        })
      }

      // Electric vehicles should have zero CO2 emissions
      if (powertrainType === 'electric' && specs.co2EmissionsGkm > 0) {
        errors.push({
          field: 'specifications.co2EmissionsGkm',
          message: 'Electric vehicles should have zero CO2 emissions',
          value: specs.co2EmissionsGkm,
          rule: 'electric_zero_co2'
        })
      }
    }

    // Electric range validation
    if (specs.electricRangeKm !== undefined && specs.electricRangeKm !== null) {
      if (specs.electricRangeKm < this.SPECIFICATIONS.MIN_ELECTRIC_RANGE) {
        errors.push({
          field: 'specifications.electricRangeKm',
          message: `Electric range ${specs.electricRangeKm} km is too low for practical use`,
          value: specs.electricRangeKm,
          rule: 'min_electric_range'
        })
      }

      if (specs.electricRangeKm > this.SPECIFICATIONS.MAX_ELECTRIC_RANGE) {
        errors.push({
          field: 'specifications.electricRangeKm',
          message: `Electric range ${specs.electricRangeKm} km is unrealistically high`,
          value: specs.electricRangeKm,
          rule: 'max_electric_range'
        })
      }
    }

    // Battery capacity validation
    if (specs.batteryCapacityKwh !== undefined && specs.batteryCapacityKwh !== null) {
      if (specs.batteryCapacityKwh < this.SPECIFICATIONS.MIN_BATTERY_CAPACITY) {
        errors.push({
          field: 'specifications.batteryCapacityKwh',
          message: `Battery capacity ${specs.batteryCapacityKwh} kWh is too small`,
          value: specs.batteryCapacityKwh,
          rule: 'min_battery_capacity'
        })
      }

      if (specs.batteryCapacityKwh > this.SPECIFICATIONS.MAX_BATTERY_CAPACITY) {
        errors.push({
          field: 'specifications.batteryCapacityKwh',
          message: `Battery capacity ${specs.batteryCapacityKwh} kWh is unrealistically large`,
          value: specs.batteryCapacityKwh,
          rule: 'max_battery_capacity'
        })
      }
    }

    // Horsepower validation
    if (specs.horsePower !== undefined) {
      if (specs.horsePower < this.SPECIFICATIONS.MIN_HORSEPOWER) {
        errors.push({
          field: 'specifications.horsePower',
          message: `Horsepower ${specs.horsePower} hp is unrealistically low`,
          value: specs.horsePower,
          rule: 'min_horsepower'
        })
      }

      if (specs.horsePower > this.SPECIFICATIONS.MAX_HORSEPOWER) {
        errors.push({
          field: 'specifications.horsePower',
          message: `Horsepower ${specs.horsePower} hp is unrealistically high`,
          value: specs.horsePower,
          rule: 'max_horsepower'
        })
      }
    }

    // Acceleration validation
    if (specs.acceleration0to100 !== undefined) {
      if (specs.acceleration0to100 < this.SPECIFICATIONS.MIN_ACCELERATION) {
        errors.push({
          field: 'specifications.acceleration0to100',
          message: `Acceleration ${specs.acceleration0to100}s is unrealistically fast`,
          value: specs.acceleration0to100,
          rule: 'min_acceleration_time'
        })
      }

      if (specs.acceleration0to100 > this.SPECIFICATIONS.MAX_ACCELERATION) {
        errors.push({
          field: 'specifications.acceleration0to100',
          message: `Acceleration ${specs.acceleration0to100}s is unrealistically slow`,
          value: specs.acceleration0to100,
          rule: 'max_acceleration_time'
        })
      }
    }

    return errors
  }

  /**
   * Validates powertrain consistency with engine specifications
   */
  static validatePowertrainConsistency(vehicle: Vehicle): ValidationError[] {
    const errors: ValidationError[] = []
    const powertrainType = vehicle.powertrainType.toLowerCase()

    vehicle.variants.forEach((variant, index) => {
      const engineSpec = variant.engineSpecification.toLowerCase()
      const variantName = variant.variantName.toLowerCase()

      // Check if engine specification matches powertrain type
      const patterns = this.POWERTRAIN_PATTERNS[powertrainType as keyof typeof this.POWERTRAIN_PATTERNS]
      
      if (patterns && !patterns.some(pattern => 
        engineSpec.includes(pattern) || variantName.includes(pattern)
      )) {
        errors.push({
          field: `vehicles[${index}].variants[${index}].engineSpecification`,
          message: `Engine specification "${variant.engineSpecification}" doesn't match powertrain type "${vehicle.powertrainType}"`,
          value: variant.engineSpecification,
          rule: 'powertrain_consistency'
        })
      }

      // Electric vehicle specific checks
      if (powertrainType === 'electric') {
        const specs = variant.specifications
        if (specs) {
          // Electric vehicles should have battery capacity
          if (!specs.batteryCapacityKwh || specs.batteryCapacityKwh <= 0) {
            errors.push({
              field: `vehicles[${index}].variants[${index}].specifications.batteryCapacityKwh`,
              message: 'Electric vehicles must have battery capacity specified',
              value: specs.batteryCapacityKwh,
              rule: 'electric_battery_required'
            })
          }

          // Electric vehicles should have electric range
          if (!specs.electricRangeKm || specs.electricRangeKm <= 0) {
            errors.push({
              field: `vehicles[${index}].variants[${index}].specifications.electricRangeKm`,
              message: 'Electric vehicles must have electric range specified',
              value: specs.electricRangeKm,
              rule: 'electric_range_required'
            })
          }
        }
      }
    })

    return errors
  }

  /**
   * Validates brand name against known Danish market brands
   */
  static validateBrand(brand: string): string[] {
    const warnings: string[] = []
    
    const normalizedBrand = brand.trim().toLowerCase()
    const knownBrands = this.DANISH_MARKET_BRANDS.map(b => b.toLowerCase())

    if (!knownBrands.includes(normalizedBrand)) {
      // Check for common misspellings or variations
      const similarBrands = knownBrands.filter(knownBrand => 
        this.calculateSimilarity(normalizedBrand, knownBrand) > 0.7
      )

      if (similarBrands.length > 0) {
        warnings.push(`Brand "${brand}" may be misspelled. Similar brands: ${similarBrands.join(', ')}`)
      } else {
        warnings.push(`Brand "${brand}" is not commonly found in Danish market`)
      }
    }

    return warnings
  }

  /**
   * Validates that required fields are present for Danish market
   */
  static validateRequiredFields(data: ExtractedCarData): ValidationError[] {
    const errors: ValidationError[] = []

    // Document info validation
    if (!data.documentInfo.brand) {
      errors.push({
        field: 'documentInfo.brand',
        message: 'Brand is required',
        rule: 'required_field'
      })
    }

    if (!data.documentInfo.documentDate) {
      errors.push({
        field: 'documentInfo.documentDate',
        message: 'Document date is required',
        rule: 'required_field'
      })
    }

    // Vehicle validation
    data.vehicles.forEach((vehicle, vehicleIndex) => {
      if (!vehicle.model) {
        errors.push({
          field: `vehicles[${vehicleIndex}].model`,
          message: 'Vehicle model is required',
          rule: 'required_field'
        })
      }

      if (vehicle.variants.length === 0) {
        errors.push({
          field: `vehicles[${vehicleIndex}].variants`,
          message: 'At least one variant is required per vehicle model',
          rule: 'required_variants'
        })
      }

      vehicle.variants.forEach((variant, variantIndex) => {
        if (!variant.variantName) {
          errors.push({
            field: `vehicles[${vehicleIndex}].variants[${variantIndex}].variantName`,
            message: 'Variant name is required',
            rule: 'required_field'
          })
        }

        if (!variant.engineSpecification) {
          errors.push({
            field: `vehicles[${vehicleIndex}].variants[${variantIndex}].engineSpecification`,
            message: 'Engine specification is required',
            rule: 'required_field'
          })
        }

        if (variant.pricing.monthlyPayment <= 0) {
          errors.push({
            field: `vehicles[${vehicleIndex}].variants[${variantIndex}].pricing.monthlyPayment`,
            message: 'Monthly payment must be greater than 0',
            rule: 'positive_monthly_payment'
          })
        }
      })
    })

    return errors
  }

  /**
   * Calculate string similarity for brand name matching
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0

    const editDistance = this.calculateEditDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate edit distance between two strings
   */
  private static calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1]
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Format Danish currency for error messages
   */
  static formatDanishCurrency(amount: number): string {
    return new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Parse Danish number format (handles both comma and dot as decimal separator)
   */
  static parseDanishNumber(value: string): number | null {
    if (typeof value !== 'string') return null
    
    // Remove spaces and handle Danish number format
    const cleanValue = value.replace(/\s/g, '')
    
    // Handle Danish format: 1.234,56 -> 1234.56
    if (cleanValue.includes(',') && cleanValue.includes('.')) {
      // Both comma and dot present - dot is thousands separator
      return parseFloat(cleanValue.replace(/\./g, '').replace(',', '.'))
    }
    
    // Only comma present - comma is decimal separator
    if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      return parseFloat(cleanValue.replace(',', '.'))
    }
    
    // Standard format or only dot present
    return parseFloat(cleanValue)
  }
}