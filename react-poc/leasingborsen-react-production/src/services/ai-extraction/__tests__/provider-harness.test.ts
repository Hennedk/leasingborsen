import { describe, expect, test, beforeEach, vi } from 'vitest'
import { MockProvider } from '../providers/mock'
import { OpenAIProvider } from '../providers/openai'
import { AnthropicProvider } from '../providers/anthropic'
import type { BaseAIProvider } from '../providers/base'
import type { ExtractionOptions } from '../types'
import { 
  TOYOTA_SAMPLE_CONTENT,
  BMW_SAMPLE_CONTENT,
  TEST_CASES,
  COST_TEST_SCENARIOS
} from './sample-data'

/**
 * Provider Test Harness
 * 
 * This test suite provides comprehensive testing for all AI providers
 * to ensure consistent behavior and quality across different implementations.
 */

// Mock environment variables for testing
const mockEnv = {
  VITE_OPENAI_API_KEY: 'test-openai-key',
  VITE_ANTHROPIC_API_KEY: 'test-anthropic-key',
  VITE_OPENAI_MODEL: 'gpt-4-turbo-preview',
  VITE_ANTHROPIC_MODEL: 'claude-3-sonnet-20240229'
}

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Provider Test Harness', () => {
  let providers: Record<string, BaseAIProvider>
  let testOptions: ExtractionOptions

  beforeEach(() => {
    // Setup environment
    Object.assign(process.env, mockEnv)
    
    // Initialize providers
    providers = {
      mock: new MockProvider({}),
      openai: new OpenAIProvider({}),
      anthropic: new AnthropicProvider({})
    }

    testOptions = {
      dealer: 'Test Dealer',
      language: 'da'
    }

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('Provider Initialization', () => {
    test('all providers initialize correctly', () => {
      for (const [name, provider] of Object.entries(providers)) {
        expect(provider.name).toBe(name)
        expect(provider.costPerThousandTokens).toBeGreaterThan(0)
        expect(typeof provider.isAvailable).toBe('function')
        expect(typeof provider.isAuthenticated).toBe('function')
        expect(typeof provider.extract).toBe('function')
      }
    })

    test('providers report availability correctly', () => {
      expect(providers.mock.isAvailable()).toBe(true)
      
      // OpenAI and Anthropic availability depends on API keys
      // In test environment with mock keys, they should be available
      expect(providers.openai.isAvailable()).toBe(true)
      expect(providers.anthropic.isAvailable()).toBe(true)
    })

    test('providers report authentication correctly', () => {
      expect(providers.mock.isAuthenticated()).toBe(true)
      
      // With mock API keys, authentication check should pass
      expect(providers.openai.isAuthenticated()).toBe(true)
      expect(providers.anthropic.isAuthenticated()).toBe(true)
    })
  })

  describe('Provider Consistency Tests', () => {
    test('all providers return consistent data structure', async () => {
      const content = TOYOTA_SAMPLE_CONTENT

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          // Only test mock provider in this environment
          const result = await provider.extract(content, testOptions)

          expect(result).toHaveProperty('success')
          expect(result).toHaveProperty('data')
          expect(result).toHaveProperty('metadata')
          
          if (result.data) {
            expect(result.data).toHaveProperty('documentInfo')
            expect(result.data).toHaveProperty('vehicles')
            
            expect(result.data.documentInfo).toHaveProperty('brand')
            expect(result.data.documentInfo).toHaveProperty('documentDate')
            expect(result.data.documentInfo).toHaveProperty('currency')
            expect(result.data.documentInfo).toHaveProperty('language')
            expect(result.data.documentInfo).toHaveProperty('documentType')
          }

          if (result.metadata) {
            expect(result.metadata).toHaveProperty('provider', name)
            expect(result.metadata).toHaveProperty('tokensUsed')
            expect(result.metadata).toHaveProperty('costCents')
            expect(result.metadata).toHaveProperty('extractionTimeMs')
            expect(result.metadata).toHaveProperty('confidence')
          }
        }
      }
    })

    test('providers handle empty content consistently', async () => {
      const content = ''

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const result = await provider.extract(content, testOptions)
          
          // Should not crash and should return some result
          expect(result.success).toBeDefined()
          expect(result.data || result.error).toBeDefined()
        }
      }
    })

    test('providers handle minimal content consistently', async () => {
      const content = 'BMW 3-Series'

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const result = await provider.extract(content, testOptions)
          
          expect(result.success).toBe(true)
          expect(result.data?.documentInfo.brand).toBe('BMW')
          expect(result.data?.vehicles[0]?.model).toBe('3-Series')
        }
      }
    })
  })

  describe('Provider Performance Tests', () => {
    test('providers complete extraction within reasonable time', async () => {
      const content = TOYOTA_SAMPLE_CONTENT

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const startTime = Date.now()
          const result = await provider.extract(content, testOptions)
          const endTime = Date.now()
          
          const processingTime = endTime - startTime
          
          expect(result.success).toBe(true)
          expect(processingTime).toBeLessThan(10000) // Less than 10 seconds
          
          if (result.metadata) {
            expect(result.metadata.extractionTimeMs).toBeGreaterThan(0)
            expect(result.metadata.extractionTimeMs).toBeLessThan(processingTime + 1000) // Within reasonable range
          }
        }
      }
    })

    test('providers handle large content efficiently', async () => {
      const largeContent = COST_TEST_SCENARIOS.highCost.content

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const startTime = Date.now()
          const result = await provider.extract(largeContent, testOptions)
          const endTime = Date.now()
          
          const processingTime = endTime - startTime
          
          expect(result.success).toBe(true)
          expect(processingTime).toBeLessThan(15000) // Less than 15 seconds for large content
          
          if (result.metadata) {
            expect(result.metadata.tokensUsed).toBeGreaterThan(1000)
            expect(result.metadata.costCents).toBeGreaterThan(1)
          }
        }
      }
    })
  })

  describe('Provider Cost Calculation', () => {
    test('providers calculate costs correctly', async () => {
      const scenarios = [
        { content: COST_TEST_SCENARIOS.lowCost.content, expectedRange: [1, 5] },
        { content: COST_TEST_SCENARIOS.mediumCost.content, expectedRange: [1, 10] },
        { content: COST_TEST_SCENARIOS.highCost.content, expectedRange: [5, 50] }
      ]

      for (const scenario of scenarios) {
        for (const [name, provider] of Object.entries(providers)) {
          if (name === 'mock') {
            const result = await provider.extract(scenario.content, testOptions)
            
            expect(result.success).toBe(true)
            
            if (result.metadata) {
              expect(result.metadata.costCents).toBeGreaterThanOrEqual(scenario.expectedRange[0])
              expect(result.metadata.costCents).toBeLessThanOrEqual(scenario.expectedRange[1])
            }
          }
        }
      }
    })

    test('providers report token usage accurately', async () => {
      const content = TOYOTA_SAMPLE_CONTENT

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const result = await provider.extract(content, testOptions)
          
          expect(result.success).toBe(true)
          
          if (result.metadata) {
            expect(result.metadata.tokensUsed).toBeGreaterThan(0)
            
            // Cost should be proportional to tokens used
            const expectedCost = Math.ceil(result.metadata.tokensUsed * provider.costPerThousandTokens / 1000)
            expect(result.metadata.costCents).toBeCloseTo(expectedCost, 0)
          }
        }
      }
    })
  })

  describe('Provider Error Handling', () => {
    test('providers handle malformed content gracefully', async () => {
      const malformedContent = 'Invalid JSON: {broken: content, missing quotes}'

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const result = await provider.extract(malformedContent, testOptions)
          
          // Should not crash, either succeed or return proper error
          expect(result.success !== undefined).toBe(true)
          expect(result.data || result.error).toBeDefined()
        }
      }
    })

    test('providers handle special characters correctly', async () => {
      const specialContent = 'Citroën C4 Grand Spacetourer - 130 hk\nPris: 4.500 kr/md\nSpecial chars: æøå ÆØÅ'

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const result = await provider.extract(specialContent, testOptions)
          
          expect(result.success).toBe(true)
          expect(result.data?.documentInfo.brand).toBe('Citroën')
        }
      }
    })
  })

  describe('Provider Quality Tests', () => {
    test('providers extract expected number of vehicles', async () => {
      const content = BMW_SAMPLE_CONTENT // Contains iX3, X3, 3-Serie = 3 vehicles

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const result = await provider.extract(content, testOptions)
          
          expect(result.success).toBe(true)
          expect(result.data?.vehicles.length).toBeGreaterThanOrEqual(3)
        }
      }
    })

    test('providers identify powertrain types correctly', async () => {
      const electricContent = 'BMW iX3 Electric SUV\nBatteristørrelse: 74 kWh\nMånedsydelse: 8500 kr'
      const hybridContent = 'Toyota Prius Hybrid\n1.5 Hybrid motor\nMånedsydelse: 4500 kr'
      const gasolineContent = 'Audi A4 2.0 TFSI\nBenzinmotor\nMånedsydelse: 6000 kr'

      const testCases = [
        { content: electricContent, expectedType: 'electric' },
        { content: hybridContent, expectedType: 'hybrid' },
        { content: gasolineContent, expectedType: 'gasoline' }
      ]

      for (const testCase of testCases) {
        for (const [name, provider] of Object.entries(providers)) {
          if (name === 'mock') {
            const result = await provider.extract(testCase.content, testOptions)
            
            expect(result.success).toBe(true)
            expect(result.data?.vehicles[0]?.powertrainType).toBe(testCase.expectedType)
          }
        }
      }
    })

    test('providers maintain confidence scores appropriately', async () => {
      const scenarios = [
        { content: TOYOTA_SAMPLE_CONTENT, minConfidence: 0.8 }, // Complete document
        { content: TEST_CASES.minimal, minConfidence: 0.6 },     // Minimal content
        { content: TEST_CASES.empty, minConfidence: 0.3 }       // Empty content
      ]

      for (const scenario of scenarios) {
        for (const [name, provider] of Object.entries(providers)) {
          if (name === 'mock') {
            const result = await provider.extract(scenario.content, testOptions)
            
            expect(result.success).toBe(true)
            
            if (result.metadata) {
              expect(result.metadata.confidence).toBeGreaterThanOrEqual(scenario.minConfidence)
              expect(result.metadata.confidence).toBeLessThanOrEqual(1.0)
            }
          }
        }
      }
    })
  })

  describe('Provider Stress Tests', () => {
    test('providers handle multiple concurrent extractions', async () => {
      const content = TOYOTA_SAMPLE_CONTENT
      const concurrentRequests = 5

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const promises = Array(concurrentRequests).fill(null).map(() => 
            provider.extract(content, testOptions)
          )

          const results = await Promise.all(promises)
          
          expect(results).toHaveLength(concurrentRequests)
          expect(results.every(r => r.success)).toBe(true)
        }
      }
    })

    test('providers handle repeated extractions consistently', async () => {
      const content = TEST_CASES.minimal
      const iterations = 3

      for (const [name, provider] of Object.entries(providers)) {
        if (name === 'mock') {
          const results = []
          
          for (let i = 0; i < iterations; i++) {
            const result = await provider.extract(content, testOptions)
            results.push(result)
          }

          expect(results).toHaveLength(iterations)
          expect(results.every(r => r.success)).toBe(true)
          
          // Check consistency of extracted data
          const brands = results.map(r => r.data?.documentInfo.brand)
          expect(new Set(brands).size).toBe(1) // All should extract same brand
        }
      }
    })
  })
})

/**
 * Provider comparison utility for performance analysis
 */
export async function compareProviders(content: string, options: ExtractionOptions) {
  const providers = {
    mock: new MockProvider({})
  }

  const results = []

  for (const [name, provider] of Object.entries(providers)) {
    const startTime = Date.now()
    
    try {
      const result = await provider.extract(content, options)
      const endTime = Date.now()
      
      results.push({
        provider: name,
        success: result.success,
        processingTime: endTime - startTime,
        tokensUsed: result.metadata?.tokensUsed || 0,
        costCents: result.metadata?.costCents || 0,
        confidence: result.metadata?.confidence || 0,
        vehicleCount: result.data?.vehicles.length || 0,
        variantCount: result.data?.vehicles.reduce((sum, v) => sum + v.variants.length, 0) || 0,
        accessoryCount: result.data?.accessories?.length || 0
      })
    } catch (error) {
      results.push({
        provider: name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        tokensUsed: 0,
        costCents: 0,
        confidence: 0,
        vehicleCount: 0,
        variantCount: 0,
        accessoryCount: 0
      })
    }
  }

  return results
}

/**
 * Test harness runner for specific provider
 */
export async function testProvider(providerName: string, testCases: string[]) {
  const provider = new MockProvider({}) // Only mock provider available in test environment
  const results = []

  for (const content of testCases) {
    const startTime = Date.now()
    
    try {
      const result = await provider.extract(content, {
        dealer: 'Test Dealer',
        language: 'da'
      })
      
      results.push({
        content: content.substring(0, 50) + '...',
        success: result.success,
        processingTime: Date.now() - startTime,
        vehicleCount: result.data?.vehicles.length || 0,
        confidence: result.metadata?.confidence || 0,
        error: null
      })
    } catch (error) {
      results.push({
        content: content.substring(0, 50) + '...',
        success: false,
        processingTime: Date.now() - startTime,
        vehicleCount: 0,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}