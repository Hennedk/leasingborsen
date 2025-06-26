import { describe, expect, test, beforeEach } from 'vitest'
import { testExtractionService } from '../extraction/test-extraction'
import { validatePhase1, runComprehensiveTests } from './test-runner'
import { createTestService } from '../extraction/extractor'
import { CarDataValidator } from '../validation/validator'
import { 
  TOYOTA_SAMPLE_CONTENT,
  BMW_SAMPLE_CONTENT,
  MERCEDES_SAMPLE_CONTENT,
  EXPECTED_TOYOTA_RESULT,
  MULTI_DEALER_CONTENT,
  TEST_CASES,
  COST_TEST_SCENARIOS
} from './sample-data'
import type { AIExtractionService } from '../extraction/extractor'
import type { ExtractionOptions } from '../types'

/**
 * End-to-End Extraction Tests
 * 
 * These tests simulate real-world usage scenarios and validate
 * the complete extraction pipeline from raw content to validated results.
 */

describe('End-to-End Extraction Tests', () => {
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

  describe('Complete Extraction Workflows', () => {
    test('processes Toyota document end-to-end', async () => {
      const result = await service.extract(TOYOTA_SAMPLE_CONTENT, {
        ...baseOptions,
        dealer: 'Toyota Denmark'
      })

      // Check extraction success
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.validationResult?.isValid).toBe(true)
      
      if (result.data) {
        // Validate document structure
        expect(result.data.documentInfo.brand).toBe('Toyota')
        expect(result.data.documentInfo.documentType).toBe('private_leasing')
        expect(result.data.documentInfo.currency).toBe('DKK')
        expect(result.data.documentInfo.language).toBe('da')

        // Validate vehicle extraction
        expect(result.data.vehicles.length).toBeGreaterThanOrEqual(3)
        
        const aygoX = result.data.vehicles.find(v => v.model.includes('Aygo'))
        expect(aygoX).toBeDefined()
        expect(aygoX?.powertrainType).toBe('gasoline')
        expect(aygoX?.leasePeriodMonths).toBe(48)
        expect(aygoX?.variants.length).toBeGreaterThanOrEqual(3)

        // Validate pricing data
        aygoX?.variants.forEach(variant => {
          expect(variant.pricing.monthlyPayment).toBeGreaterThan(1000)
          expect(variant.pricing.monthlyPayment).toBeLessThan(50000)
          expect(variant.pricing.firstPayment).toBeGreaterThan(0)
        })

        // Validate accessories
        expect(result.data.accessories?.length).toBeGreaterThan(0)
        const servicePackage = result.data.accessories?.find(a => 
          a.packageName.includes('Service')
        )
        expect(servicePackage).toBeDefined()
        expect(servicePackage?.category).toBe('service')
      }

      // Check processing metadata
      expect(result.totalProcessingTimeMs).toBeGreaterThan(0)
      expect(result.totalProcessingTimeMs).toBeLessThan(10000)
      expect(result.providersAttempted).toContain('mock')
    })

    test('processes BMW electric/hybrid document end-to-end', async () => {
      const result = await service.extract(BMW_SAMPLE_CONTENT, {
        ...baseOptions,
        dealer: 'BMW Denmark'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      if (result.data) {
        expect(result.data.documentInfo.brand).toBe('BMW')
        expect(result.data.documentInfo.documentType).toBe('business_leasing')

        // Check for electric vehicle
        const electricVehicle = result.data.vehicles.find(v => 
          v.powertrainType === 'electric'
        )
        expect(electricVehicle).toBeDefined()
        expect(electricVehicle?.variants[0]?.specifications?.batteryCapacityKwh).toBeGreaterThan(0)
        expect(electricVehicle?.variants[0]?.specifications?.electricRangeKm).toBeGreaterThan(0)
        expect(electricVehicle?.variants[0]?.specifications?.co2EmissionsGkm).toBe(0)

        // Check for plugin hybrid
        const hybridVehicle = result.data.vehicles.find(v => 
          v.powertrainType === 'plugin_hybrid'
        )
        expect(hybridVehicle).toBeDefined()
        expect(hybridVehicle?.variants[0]?.specifications?.electricRangeKm).toBeGreaterThan(0)
        expect(hybridVehicle?.variants[0]?.specifications?.batteryCapacityKwh).toBeGreaterThan(0)
      }

      // Validate business rules
      expect(result.validationResult?.isValid).toBe(true)
      expect(result.validationResult?.confidence).toBeGreaterThan(0.8)
    })

    test('processes Mercedes comprehensive document end-to-end', async () => {
      const result = await service.extract(MERCEDES_SAMPLE_CONTENT, {
        ...baseOptions,
        dealer: 'Mercedes-Benz Denmark'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      if (result.data) {
        expect(result.data.documentInfo.brand).toBe('Mercedes-Benz')
        expect(result.data.vehicles.length).toBeGreaterThanOrEqual(3)

        // Check model variety
        const models = result.data.vehicles.map(v => v.model)
        expect(models).toContain('A-Klasse')
        expect(models.some(m => m.includes('EQA') || m.includes('EQ'))).toBe(true)

        // Validate electric vehicle specs
        const electricVehicle = result.data.vehicles.find(v => 
          v.powertrainType === 'electric'
        )
        if (electricVehicle) {
          expect(electricVehicle.variants[0].specifications?.co2EmissionsGkm).toBe(0)
          expect(electricVehicle.variants[0].specifications?.batteryCapacityKwh).toBeGreaterThan(50)
        }
      }
    })
  })

  describe('Workflow Scenarios', () => {
    test('handles complete dealer processing workflow', async () => {
      const dealerDocuments = [
        { content: TOYOTA_SAMPLE_CONTENT, dealer: 'Toyota Denmark' },
        { content: BMW_SAMPLE_CONTENT, dealer: 'BMW Denmark' },
        { content: MERCEDES_SAMPLE_CONTENT, dealer: 'Mercedes-Benz Denmark' }
      ]

      const results = []

      for (const doc of dealerDocuments) {
        const result = await service.extract(doc.content, {
          ...baseOptions,
          dealer: doc.dealer
        })
        
        expect(result.success).toBe(true)
        results.push(result)
      }

      // Verify dealer-specific processing
      expect(results[0].data?.documentInfo.brand).toBe('Toyota')
      expect(results[1].data?.documentInfo.brand).toBe('BMW')
      expect(results[2].data?.documentInfo.brand).toBe('Mercedes-Benz')

      // Check service statistics
      const status = service.getServiceStatus()
      expect(status.totalExtractions).toBeGreaterThanOrEqual(3)
      expect(status.successfulExtractions).toBeGreaterThanOrEqual(3)
      expect(status.successRate).toBe(1.0)
    })

    test('handles batch processing workflow', async () => {
      const batchContent = [
        TEST_CASES.minimal,
        TEST_CASES.specialCharacters,
        TEST_CASES.multipleModels.substring(0, 500) // Truncate for testing
      ]

      const batchPromises = batchContent.map((content, index) =>
        service.extract(content, {
          ...baseOptions,
          dealer: `Dealer ${index + 1}`
        })
      )

      const results = await Promise.all(batchPromises)

      expect(results.every(r => r.success)).toBe(true)
      expect(results).toHaveLength(3)

      // Check that different content produced different results
      const brands = results.map(r => r.data?.documentInfo.brand)
      expect(new Set(brands).size).toBeGreaterThan(1)
    })

    test('handles incremental processing workflow', async () => {
      // Simulate processing documents of increasing complexity
      const documents = [
        { content: TEST_CASES.minimal, expectedVehicles: 1 },
        { content: TOYOTA_SAMPLE_CONTENT, expectedVehicles: 3 },
        { content: BMW_SAMPLE_CONTENT, expectedVehicles: 3 }
      ]

      for (const doc of documents) {
        const result = await service.extract(doc.content, baseOptions)
        
        expect(result.success).toBe(true)
        expect(result.data?.vehicles.length).toBeGreaterThanOrEqual(doc.expectedVehicles)
      }

      // Service should maintain consistent performance
      const status = service.getServiceStatus()
      expect(status.avgProcessingTimeMs).toBeLessThan(5000)
    })
  })

  describe('Error Recovery and Resilience', () => {
    test('recovers from validation errors gracefully', async () => {
      // Document with validation issues but extractable content
      const problematicContent = `
        Toyota Aygo X
        Månedsydelse: 50 kr (too low)
        Førstegangsydelse: -1000 kr (negative)
        CO2-udslip: 999 g/km (too high)
        Løbetid: 48 måneder
      `

      const result = await service.extract(problematicContent, {
        ...baseOptions,
        enableValidation: true,
        confidenceThreshold: 0.3 // Lower threshold to allow problematic data
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.validationResult?.isValid).toBe(false)
      expect(result.validationResult?.errors.length).toBeGreaterThan(0)

      // Should still extract basic vehicle info
      expect(result.data?.vehicles[0]?.model).toBe('Aygo X')
      expect(result.data?.vehicles[0]?.leasePeriodMonths).toBe(48)
    })

    test('handles mixed content gracefully', async () => {
      const result = await service.extract(MULTI_DEALER_CONTENT, baseOptions)

      expect(result.success).toBe(true)
      expect(result.data?.vehicles.length).toBeGreaterThanOrEqual(2)

      // Should extract vehicles from both brands or pick primary
      const vehicleModels = result.data?.vehicles.map(v => v.model) || []
      expect(vehicleModels.length).toBeGreaterThan(0)
    })

    test('maintains quality with edge case content', async () => {
      const edgeCases = [
        TEST_CASES.empty,
        TEST_CASES.minimal,
        TEST_CASES.longContent.substring(0, 1000), // Truncate for testing
        TEST_CASES.specialCharacters
      ]

      for (const content of edgeCases) {
        const result = await service.extract(content, baseOptions)
        
        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
        
        // Should maintain reasonable confidence even with edge cases
        if (content.length > 10) { // Skip empty content
          expect(result.validationResult?.confidence).toBeGreaterThan(0.3)
        }
      }
    })
  })

  describe('Performance and Quality Metrics', () => {
    test('maintains consistent processing speed', async () => {
      const testContent = TOYOTA_SAMPLE_CONTENT
      const iterations = 5
      const processingTimes = []

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()
        const result = await service.extract(testContent, baseOptions)
        const endTime = Date.now()

        expect(result.success).toBe(true)
        processingTimes.push(endTime - startTime)
      }

      // Check consistency (standard deviation shouldn't be too high)
      const avgTime = processingTimes.reduce((sum, time) => sum + time, 0) / iterations
      const variance = processingTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / iterations
      const stdDev = Math.sqrt(variance)

      expect(avgTime).toBeLessThan(5000) // Average under 5 seconds
      expect(stdDev).toBeLessThan(avgTime * 0.5) // Standard deviation < 50% of average
    })

    test('achieves target quality metrics', async () => {
      const qualityTests = [
        { content: TOYOTA_SAMPLE_CONTENT, minConfidence: 0.85, minVehicles: 3 },
        { content: BMW_SAMPLE_CONTENT, minConfidence: 0.8, minVehicles: 3 },
        { content: MERCEDES_SAMPLE_CONTENT, minConfidence: 0.8, minVehicles: 3 }
      ]

      for (const test of qualityTests) {
        const result = await service.extract(test.content, baseOptions)

        expect(result.success).toBe(true)
        expect(result.validationResult?.confidence).toBeGreaterThanOrEqual(test.minConfidence)
        expect(result.data?.vehicles.length).toBeGreaterThanOrEqual(test.minVehicles)
      }
    })

    test('handles cost efficiency requirements', async () => {
      const costScenarios = Object.values(COST_TEST_SCENARIOS)

      for (const scenario of costScenarios) {
        const result = await service.extract(scenario.content, {
          ...baseOptions,
          enableCostChecking: true
        })

        expect(result.success).toBe(true)
        expect(result.totalCostCents).toBeGreaterThan(0)
        expect(result.totalCostCents).toBeLessThanOrEqual(scenario.expectedCostCents * 2) // Allow 2x variance
        
        // Cost efficiency: should extract meaningful data for the cost
        if (result.data?.vehicles.length) {
          const costPerVehicle = result.totalCostCents / result.data.vehicles.length
          expect(costPerVehicle).toBeLessThan(50) // Less than 50 cents per vehicle
        }
      }
    })
  })

  describe('Full System Integration', () => {
    test('runs built-in test extraction successfully', async () => {
      // Test the built-in test function
      await expect(testExtractionService()).resolves.not.toThrow()
    })

    test('validates complete Phase 1 implementation', async () => {
      const isValid = await validatePhase1()
      expect(isValid).toBe(true)
    })

    test('passes comprehensive test suite', async () => {
      const results = await runComprehensiveTests()
      
      expect(results.failedTests).toBe(0)
      expect(results.passedTests).toBeGreaterThan(10)
      expect(results.totalTests).toBeGreaterThan(15)
      
      // Check individual component results
      expect(results.components.serviceInit?.passed).toBeGreaterThan(0)
      expect(results.components.mockProvider?.passed).toBeGreaterThan(0)
      expect(results.components.validation?.passed).toBeGreaterThan(0)
      expect(results.components.endToEnd?.passed).toBeGreaterThan(0)
    })
  })

  describe('Real-world Simulation', () => {
    test('simulates dealer onboarding workflow', async () => {
      // Simulate a new dealer providing their first documents
      const dealerWorkflow = [
        {
          step: 'Initial document',
          content: TEST_CASES.minimal,
          expectation: 'Basic extraction works'
        },
        {
          step: 'Sample price list',
          content: TOYOTA_SAMPLE_CONTENT,
          expectation: 'Full extraction with validation'
        },
        {
          step: 'Complex document',
          content: BMW_SAMPLE_CONTENT,
          expectation: 'Handles electric/hybrid vehicles'
        }
      ]

      for (const step of dealerWorkflow) {
        const result = await service.extract(step.content, {
          ...baseOptions,
          dealer: 'New Dealer Test'
        })

        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
        
        // Each step should improve or maintain quality
        if (step.content.length > 100) {
          expect(result.validationResult?.confidence).toBeGreaterThan(0.7)
        }
      }
    })

    test('simulates high-volume processing day', async () => {
      // Simulate processing multiple documents in a short time
      const documents = Array(10).fill(TOYOTA_SAMPLE_CONTENT)
      const startTime = Date.now()

      const promises = documents.map((content, index) =>
        service.extract(content, {
          ...baseOptions,
          dealer: `Volume Dealer ${index + 1}`
        })
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All should succeed
      expect(results.every(r => r.success)).toBe(true)
      
      // Should maintain performance under load
      expect(totalTime).toBeLessThan(30000) // Less than 30 seconds for 10 documents
      
      // Service should track statistics correctly
      const status = service.getServiceStatus()
      expect(status.totalExtractions).toBeGreaterThanOrEqual(10)
    })

    test('simulates error recovery scenario', async () => {
      // Simulate mixed success/failure scenarios
      const mixedContent = [
        TOYOTA_SAMPLE_CONTENT,  // Should succeed
        '',                     // Should succeed (empty)
        'Invalid content',      // Should succeed with low confidence
        BMW_SAMPLE_CONTENT      // Should succeed
      ]

      const results = []
      
      for (const content of mixedContent) {
        const result = await service.extract(content, {
          ...baseOptions,
          dealer: 'Recovery Test Dealer'
        })
        
        results.push(result)
      }

      // Most should succeed
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBeGreaterThanOrEqual(3)
      
      // Service should remain stable
      const status = service.getServiceStatus()
      expect(status.successRate).toBeGreaterThan(0.75)
    })
  })
})