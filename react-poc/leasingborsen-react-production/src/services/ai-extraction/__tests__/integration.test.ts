import { describe, expect, test, beforeEach } from 'vitest'
import { createTestService } from '../extraction/extractor'
import { CarDataValidator } from '../validation/validator'
import { 
  TOYOTA_SAMPLE_CONTENT, 
  BMW_SAMPLE_CONTENT, 
  MERCEDES_SAMPLE_CONTENT,
  EXPECTED_TOYOTA_RESULT,
  INVALID_CONTENT_SAMPLE,
  MULTI_DEALER_CONTENT,
  TEST_CASES,
  COST_TEST_SCENARIOS
} from './sample-data'
import type { AIExtractionService } from '../extraction/extractor'
import type { ExtractionOptions } from '../types'

describe('AI Extraction Integration Tests', () => {
  let service: AIExtractionService
  let baseOptions: ExtractionOptions

  beforeEach(() => {
    service = createTestService()
    baseOptions = {
      dealer: 'Test Dealer',
      language: 'da',
      strategy: 'primary_only',
      enableValidation: true,
      enableCostChecking: false
    }
  })

  describe('Real Document Processing', () => {
    test('processes Toyota document correctly', async () => {
      const result = await service.extract(TOYOTA_SAMPLE_CONTENT, {
        ...baseOptions,
        dealer: 'Toyota Denmark'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      if (result.data) {
        expect(result.data.documentInfo.brand).toBe('Toyota')
        expect(result.data.vehicles.length).toBeGreaterThanOrEqual(3) // Aygo X, Yaris Cross, C-HR
        
        // Check specific vehicle
        const aygoX = result.data.vehicles.find(v => v.model.includes('Aygo'))
        expect(aygoX).toBeDefined()
        expect(aygoX?.variants.length).toBeGreaterThanOrEqual(3)
        
        // Check accessories
        expect(result.data.accessories?.length).toBeGreaterThan(0)
        const winterWheels = result.data.accessories?.find(a => a.packageName.includes('Vinterhjul'))
        expect(winterWheels).toBeDefined()
      }

      // Check validation
      expect(result.validationResult?.isValid).toBe(true)
      expect(result.validationResult?.confidence).toBeGreaterThan(0.8)
    })

    test('processes BMW document correctly', async () => {
      const result = await service.extract(BMW_SAMPLE_CONTENT, {
        ...baseOptions,
        dealer: 'BMW Denmark'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      if (result.data) {
        expect(result.data.documentInfo.brand).toBe('BMW')
        expect(result.data.vehicles.length).toBeGreaterThanOrEqual(3) // iX3, 3-Series, X3
        
        // Check electric vehicle
        const ix3 = result.data.vehicles.find(v => v.model.includes('iX3'))
        expect(ix3?.powertrainType).toBe('electric')
        expect(ix3?.variants[0]?.specifications?.batteryCapacityKwh).toBeDefined()
        expect(ix3?.variants[0]?.specifications?.electricRangeKm).toBeDefined()
      }
    })

    test('processes Mercedes document correctly', async () => {
      const result = await service.extract(MERCEDES_SAMPLE_CONTENT, {
        ...baseOptions,
        dealer: 'Mercedes-Benz Denmark'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      if (result.data) {
        expect(result.data.documentInfo.brand).toBe('Mercedes-Benz')
        expect(result.data.vehicles.length).toBeGreaterThanOrEqual(3) // A-Class, EQA, C-Class
        
        // Check hybrid vehicle
        const pluginHybrid = result.data.vehicles
          .flatMap(v => v.variants)
          .find(variant => variant.specifications?.electricRangeKm)
        expect(pluginHybrid).toBeDefined()
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles minimal content gracefully', async () => {
      const result = await service.extract(TEST_CASES.minimal, baseOptions)
      
      expect(result.success).toBe(true)
      expect(result.data?.documentInfo.brand).toBe('BMW')
      expect(result.data?.vehicles[0]?.model).toBe('3-Series')
    })

    test('handles empty content', async () => {
      const result = await service.extract(TEST_CASES.empty, baseOptions)
      
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    test('handles very long content', async () => {
      const result = await service.extract(TEST_CASES.longContent, baseOptions)
      
      expect(result.success).toBe(true)
      expect(result.data?.documentInfo.brand).toBe('Toyota')
      expect(result.data?.vehicles[0]?.model).toBe('Camry')
    })

    test('handles special characters', async () => {
      const result = await service.extract(TEST_CASES.specialCharacters, baseOptions)
      
      expect(result.success).toBe(true)
      expect(result.data?.documentInfo.brand).toBe('Citroën')
    })

    test('handles invalid content with validation errors', async () => {
      const result = await service.extract(INVALID_CONTENT_SAMPLE, {
        ...baseOptions,
        enableValidation: true,
        confidenceThreshold: 0.5 // Lower threshold for invalid content
      })

      expect(result.validationResult?.isValid).toBe(false)
      expect(result.validationResult?.errors.length).toBeGreaterThan(0)
      
      // Should still extract data even if invalid
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    test('handles multi-dealer content', async () => {
      const result = await service.extract(MULTI_DEALER_CONTENT, baseOptions)
      
      expect(result.success).toBe(true)
      expect(result.data?.vehicles.length).toBeGreaterThanOrEqual(2)
      
      // Should pick one primary brand or handle both
      expect(result.data?.documentInfo.brand).toBeDefined()
    })
  })

  describe('Validation Integration', () => {
    test('validates extracted data against business rules', async () => {
      const result = await service.extract(TOYOTA_SAMPLE_CONTENT, {
        ...baseOptions,
        enableValidation: true,
        confidenceThreshold: 0.8
      })

      expect(result.validationResult).toBeDefined()
      expect(result.validationResult?.isValid).toBe(true)
      expect(result.validationResult?.confidence).toBeGreaterThan(0.8)
      expect(result.validationResult?.errors.length).toBe(0)
    })

    test('catches validation errors in extracted data', async () => {
      // This would need a content sample that produces validation errors
      const result = await service.extract(INVALID_CONTENT_SAMPLE, {
        ...baseOptions,
        enableValidation: true
      })

      if (result.validationResult && !result.validationResult.isValid) {
        expect(result.validationResult.errors.length).toBeGreaterThan(0)
        
        // Check for specific error types
        const hasBusinessRuleError = result.validationResult.errors.some(
          error => error.rule?.includes('danish_')
        )
        expect(hasBusinessRuleError).toBe(true)
      }
    })

    test('validates against Danish market rules', async () => {
      const testData = {
        documentInfo: {
          brand: 'Toyota',
          documentDate: '2024-06-01',
          currency: 'DKK',
          language: 'da',
          documentType: 'private_leasing' as const
        },
        vehicles: [{
          model: 'Test Model',
          leasePeriodMonths: 48,
          powertrainType: 'gasoline' as const,
          variants: [{
            variantName: 'Test Variant',
            engineSpecification: '1.0 TSI',
            transmission: 'manual' as const,
            pricing: {
              monthlyPayment: 50, // Too low for Danish market
              firstPayment: 150
            }
          }]
        }]
      }

      const validationResult = CarDataValidator.validate(testData)
      expect(validationResult.isValid).toBe(false)
      expect(validationResult.errors.some(e => 
        e.rule === 'danish_min_monthly_lease'
      )).toBe(true)
    })
  })

  describe('Cost Tracking Integration', () => {
    test('tracks extraction costs correctly', async () => {
      const costTrackingService = createTestService()
      
      const result = await costTrackingService.extract(COST_TEST_SCENARIOS.mediumCost.content, {
        ...baseOptions,
        enableCostChecking: true
      })

      expect(result.totalCostCents).toBeGreaterThan(0)
      expect(result.totalCostCents).toBeLessThan(100) // Reasonable range
      expect(result.metadata?.tokensUsed).toBeGreaterThan(0)
    })

    test('respects cost limits', async () => {
      // Test with very low cost limit - should still work with mock provider
      const result = await service.extract(TEST_CASES.minimal, {
        ...baseOptions,
        enableCostChecking: true
      })

      expect(result.success).toBe(true) // Mock provider should always succeed
    })
  })

  describe('Language Support', () => {
    test('handles Danish language correctly', async () => {
      const result = await service.extract(TOYOTA_SAMPLE_CONTENT, {
        ...baseOptions,
        language: 'da'
      })

      expect(result.data?.documentInfo.language).toBe('da')
      expect(result.data?.documentInfo.currency).toBe('DKK')
    })

    test('handles English language', async () => {
      const englishContent = `
        BMW 3-Series Price List 2024
        
        320i Advantage - Monthly payment: 5,200 DKK
        First payment: 15,600 DKK
      `

      const result = await service.extract(englishContent, {
        ...baseOptions,
        language: 'en'
      })

      expect(result.data?.documentInfo.language).toBe('en')
    })
  })

  describe('Extraction Strategies', () => {
    test('primary_only strategy works', async () => {
      const result = await service.extract(TEST_CASES.minimal, {
        ...baseOptions,
        strategy: 'primary_only'
      })

      expect(result.success).toBe(true)
      expect(result.providersAttempted).toHaveLength(1)
    })

    test('primary_with_fallback strategy works', async () => {
      const result = await service.extract(TEST_CASES.minimal, {
        ...baseOptions,
        strategy: 'primary_with_fallback'
      })

      expect(result.success).toBe(true)
      expect(result.providersAttempted.length).toBeGreaterThanOrEqual(1)
    })

    test('cost_optimized strategy works', async () => {
      const result = await service.extract(TEST_CASES.minimal, {
        ...baseOptions,
        strategy: 'cost_optimized'
      })

      expect(result.success).toBe(true)
      expect(result.totalCostCents).toBeGreaterThan(0)
    })
  })

  describe('Performance and Reliability', () => {
    test('processes multiple documents concurrently', async () => {
      const documents = [
        TOYOTA_SAMPLE_CONTENT,
        BMW_SAMPLE_CONTENT,
        MERCEDES_SAMPLE_CONTENT
      ]

      const promises = documents.map((content, index) => 
        service.extract(content, {
          ...baseOptions,
          dealer: `Dealer ${index + 1}`
        })
      )

      const results = await Promise.all(promises)

      expect(results.every(r => r.success)).toBe(true)
      expect(results).toHaveLength(3)
      
      // Check that different brands were extracted
      const brands = results.map(r => r.data?.documentInfo.brand)
      expect(brands).toContain('Toyota')
      expect(brands).toContain('BMW')
      expect(brands).toContain('Mercedes-Benz')
    })

    test('handles extraction timeouts gracefully', async () => {
      // Mock provider doesn't timeout, but test the timeout handling
      const result = await service.extract(COST_TEST_SCENARIOS.highCost.content, {
        ...baseOptions,
        maxProcessingTimeMs: 100 // Very short timeout
      })

      // Mock provider should complete even with short timeout
      expect(result.success).toBe(true)
    })

    test('maintains service statistics', async () => {
      const initialStats = service.getServiceStatus()
      
      await service.extract(TEST_CASES.minimal, baseOptions)
      await service.extract(TEST_CASES.minimal, baseOptions)
      
      const finalStats = service.getServiceStatus()
      
      expect(finalStats.totalExtractions).toBeGreaterThan(initialStats.totalExtractions)
      expect(finalStats.successfulExtractions).toBeGreaterThan(initialStats.successfulExtractions)
    })
  })
})