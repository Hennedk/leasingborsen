import { describe, expect, test } from 'vitest'
import { CarDataValidator } from '../validation/validator'
import { BusinessRules } from '../validation/rules'
import type { ExtractedCarData, Vehicle, VehicleVariant } from '../types'

describe('CarDataValidator', () => {
  const validCarData: ExtractedCarData = {
    documentInfo: {
      brand: 'Toyota',
      documentDate: '2024-06-01',
      currency: 'DKK',
      language: 'da',
      documentType: 'private_leasing'
    },
    vehicles: [{
      model: 'Aygo X',
      leasePeriodMonths: 48,
      powertrainType: 'gasoline',
      variants: [{
        variantName: 'X-trend CVT',
        engineSpecification: '1.0 VVT-i - 72 hk',
        transmission: 'cvt',
        pricing: {
          monthlyPayment: 2899,
          firstPayment: 8697,
          annualKilometers: 15000
        },
        specifications: {
          fuelConsumptionKmpl: 18.5,
          co2EmissionsGkm: 120,
          horsePower: 72,
          acceleration0to100: 14.5
        }
      }]
    }]
  }

  test('validates correct car data successfully', () => {
    const result = CarDataValidator.validate(validCarData)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  test('detects missing required fields', () => {
    const invalidData = {
      ...validCarData,
      documentInfo: {
        ...validCarData.documentInfo,
        brand: '' // Missing brand
      }
    }

    const result = CarDataValidator.validate(invalidData)
    
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.field === 'documentInfo.brand')).toBe(true)
  })

  test('validates pricing ranges', () => {
    const invalidData = {
      ...validCarData,
      vehicles: [{
        ...validCarData.vehicles[0],
        variants: [{
          ...validCarData.vehicles[0].variants[0],
          pricing: {
            monthlyPayment: 100, // Too low for Danish market
            firstPayment: 300
          }
        }]
      }]
    }

    const result = CarDataValidator.validate(invalidData)
    
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => 
      e.field?.includes('monthlyPayment') && 
      e.rule === 'danish_min_monthly_lease'
    )).toBe(true)
  })

  test('validates powertrain consistency', () => {
    const invalidData = {
      ...validCarData,
      vehicles: [{
        ...validCarData.vehicles[0],
        powertrainType: 'electric' as const,
        variants: [{
          ...validCarData.vehicles[0].variants[0],
          specifications: {
            ...validCarData.vehicles[0].variants[0].specifications,
            co2EmissionsGkm: 120, // Electric should be 0
            batteryCapacityKwh: undefined // Electric should have battery
          }
        }]
      }]
    }

    const result = CarDataValidator.validate(invalidData)
    
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.rule === 'electric_zero_co2')).toBe(true)
    expect(result.errors.some(e => e.rule === 'electric_battery_required')).toBe(true)
  })

  test('quick validation skips detailed checks', () => {
    const result = CarDataValidator.validateQuick(validCarData)
    
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('returns critical errors only', () => {
    const invalidData = {
      ...validCarData,
      vehicles: [] // No vehicles
    }

    const result = CarDataValidator.validate(invalidData)
    const criticalErrors = CarDataValidator.getCriticalErrors(result)
    
    expect(criticalErrors.length).toBeGreaterThan(0)
  })
})

describe('BusinessRules', () => {
  const validVariant: VehicleVariant = {
    variantName: 'Test Variant',
    engineSpecification: '2.0 TSI',
    transmission: 'automatic',
    pricing: {
      monthlyPayment: 5000,
      firstPayment: 15000,
      annualKilometers: 20000
    },
    specifications: {
      fuelConsumptionKmpl: 15.5,
      co2EmissionsGkm: 150,
      horsePower: 200,
      acceleration0to100: 8.5
    }
  }

  test('validates pricing within Danish ranges', () => {
    const errors = BusinessRules.validatePricing(validVariant, 'Test Model')
    expect(errors).toHaveLength(0)
  })

  test('rejects unrealistic monthly payments', () => {
    const invalidVariant = {
      ...validVariant,
      pricing: {
        ...validVariant.pricing,
        monthlyPayment: 100000 // Too high
      }
    }

    const errors = BusinessRules.validatePricing(invalidVariant, 'Test Model')
    expect(errors.some(e => e.rule === 'danish_max_monthly_lease')).toBe(true)
  })

  test('validates specifications ranges', () => {
    const errors = BusinessRules.validateSpecifications(validVariant, 'gasoline')
    expect(errors).toHaveLength(0)
  })

  test('validates electric vehicle requirements', () => {
    const electricVehicle: Vehicle = {
      model: 'Model 3',
      leasePeriodMonths: 36,
      powertrainType: 'electric',
      variants: [{
        ...validVariant,
        specifications: {
          ...validVariant.specifications,
          batteryCapacityKwh: 75,
          electricRangeKm: 400,
          co2EmissionsGkm: 0
        }
      }]
    }

    const errors = BusinessRules.validatePowertrainConsistency(electricVehicle)
    expect(errors).toHaveLength(0)
  })

  test('validates Danish market brands', () => {
    const warnings = BusinessRules.validateBrand('Toyota')
    expect(warnings).toHaveLength(0)

    const unknownWarnings = BusinessRules.validateBrand('UnknownBrand')
    expect(unknownWarnings.length).toBeGreaterThan(0)
  })

  test('validates required fields', () => {
    const incompleteData: ExtractedCarData = {
      documentInfo: {
        brand: '',
        documentDate: '',
        currency: 'DKK',
        language: 'da',
        documentType: 'private_leasing'
      },
      vehicles: []
    }

    const errors = BusinessRules.validateRequiredFields(incompleteData)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(e => e.field === 'documentInfo.brand')).toBe(true)
  })

  test('parses Danish number formats', () => {
    expect(BusinessRules.parseDanishNumber('1.234,56')).toBe(1234.56)
    expect(BusinessRules.parseDanishNumber('1234,56')).toBe(1234.56)
    expect(BusinessRules.parseDanishNumber('1234.56')).toBe(1234.56)
    expect(BusinessRules.parseDanishNumber('1 234,56')).toBe(1234.56)
  })

  test('formats Danish currency', () => {
    const formatted = BusinessRules.formatDanishCurrency(1234.56)
    expect(formatted).toContain('1.235') // Rounded
    expect(formatted).toContain('kr') // Danish currency symbol
  })
})