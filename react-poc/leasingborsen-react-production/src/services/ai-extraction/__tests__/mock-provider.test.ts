import { describe, expect, test, beforeEach } from 'vitest'
import { MockAIProvider } from '../providers/mock'
import type { ExtractOptions } from '../types'

describe('MockProvider', () => {
  let provider: MockAIProvider
  let mockOptions: ExtractOptions

  beforeEach(() => {
    provider = new MockAIProvider({})
    mockOptions = {
      dealer: 'Test Dealer',
      language: 'da'
    }
  })

  test('initializes correctly', () => {
    expect(provider.name).toBe('mock')
    expect(provider.costPerThousandTokens).toBe(1) // 1 cent per 1000 tokens
  })

  test('isAvailable always returns true', () => {
    expect(provider.isAvailable()).toBe(true)
  })

  test('isAuthenticated always returns true', () => {
    expect(provider.isAuthenticated()).toBe(true)
  })

  test('extract returns valid Danish car data structure', async () => {
    const content = `
      Toyota Aygo X Privatleasing
      
      Aygo X 1.0 VVT-i X-trend CVT - 72 hk
      Månedsydelse: 2.899 kr
      Førstegangsydelse: 8.697 kr
      
      Aygo X 1.0 VVT-i X-cite CVT - 72 hk  
      Månedsydelse: 3.199 kr
      Førstegangsydelse: 9.597 kr
    `

    const result = await provider.extract(content, mockOptions)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    
    if (result.data) {
      // Check document info
      expect(result.data.documentInfo.brand).toBe('Toyota')
      expect(result.data.documentInfo.currency).toBe('DKK')
      expect(result.data.documentInfo.language).toBe('da')
      expect(result.data.documentInfo.documentType).toBe('private_leasing')

      // Check vehicles
      expect(result.data.vehicles).toHaveLength(1)
      const vehicle = result.data.vehicles[0]
      expect(vehicle.model).toBe('Aygo X')
      expect(vehicle.powertrainType).toBe('gasoline')
      expect(vehicle.leasePeriodMonths).toBe(48)

      // Check variants
      expect(vehicle.variants).toHaveLength(2)
      
      const variant1 = vehicle.variants[0]
      expect(variant1.variantName).toBe('X-trend CVT')
      expect(variant1.engineSpecification).toBe('1.0 VVT-i - 72 hk')
      expect(variant1.transmission).toBe('cvt')
      expect(variant1.pricing.monthlyPayment).toBe(2899)
      expect(variant1.pricing.firstPayment).toBe(8697)

      const variant2 = vehicle.variants[1]
      expect(variant2.variantName).toBe('X-cite CVT')
      expect(variant2.pricing.monthlyPayment).toBe(3199)
      expect(variant2.pricing.firstPayment).toBe(9597)
    }

    // Check metadata
    expect(result.metadata).toBeDefined()
    expect(result.metadata?.provider).toBe('mock')
    expect(result.metadata?.tokensUsed).toBeGreaterThan(0)
    expect(result.metadata?.costCents).toBeGreaterThan(0)
    expect(result.metadata?.confidence).toBeGreaterThanOrEqual(0.8)
  })

  test('handles minimal content gracefully', async () => {
    const content = 'BMW 3-Series'

    const result = await provider.extract(content, mockOptions)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    
    if (result.data) {
      expect(result.data.documentInfo.brand).toBe('BMW')
      expect(result.data.vehicles).toHaveLength(1)
      expect(result.data.vehicles[0].model).toBe('3-Series')
      expect(result.data.vehicles[0].variants).toHaveLength(1)
    }
  })

  test('simulates processing time', async () => {
    const startTime = Date.now()
    
    await provider.extract('Test content', mockOptions)
    
    const processingTime = Date.now() - startTime
    expect(processingTime).toBeGreaterThanOrEqual(500) // At least 500ms
    expect(processingTime).toBeLessThan(2000) // Less than 2 seconds
  })

  test('calculates cost correctly', async () => {
    const content = 'A'.repeat(1000) // Roughly 1000 characters
    const result = await provider.extract(content, mockOptions)

    expect(result.metadata?.tokensUsed).toBeGreaterThan(0)
    expect(result.metadata?.costCents).toBeGreaterThan(0)
    
    // Cost should be reasonable (tokens * cost per token)
    const expectedCost = Math.ceil((result.metadata?.tokensUsed || 0) / 1000)
    expect(result.metadata?.costCents).toBe(expectedCost)
  })

  test('includes extraction warnings for complex content', async () => {
    const content = `
      Toyota Hybrid Collection 2024
      Multiple models with various powertrains
      Complex pricing structure
      Electric and hybrid variants
    `

    const result = await provider.extract(content, mockOptions)

    expect(result.data?.metadata?.extractionWarnings).toBeDefined()
    expect(result.data?.metadata?.extractionWarnings).toContain('Mock provider: Simplified extraction')
  })

  test('supports different dealers', async () => {
    const mercedesOptions = { ...mockOptions, dealer: 'Mercedes-Benz Denmark' }
    const result = await provider.extract('Mercedes C-Class', mercedesOptions)

    expect(result.data?.documentInfo.brand).toBe('Mercedes-Benz')
    expect(result.data?.vehicles[0].model).toBe('C-Class')
  })

  test('maintains consistent data structure', async () => {
    const result = await provider.extract('Test content', mockOptions)

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
  })
})