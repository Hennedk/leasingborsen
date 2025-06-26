import { BaseAIProvider } from './base'
import type { ExtractionResult, ExtractOptions, ExtractedCarData } from '../types'

/**
 * Mock provider for testing and development
 * Returns predefined structured data to simulate AI extraction
 */
export class MockAIProvider extends BaseAIProvider {
  readonly name = 'mock'
  readonly modelVersion = 'mock-v1.0'

  /**
   * Mock extraction that returns predefined data
   */
  async extract(content: string, options: ExtractOptions = {}): Promise<ExtractionResult> {
    const startTime = Date.now()

    // Validate input content
    const validation = this.validateContent(content)
    if (!validation.isValid) {
      return this.createResult(
        false,
        undefined,
        {
          type: 'validation',
          message: validation.errors.map(e => e.message).join('; '),
          details: validation.errors,
          retryable: false
        }
      )
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))

    // Simulate extraction based on content hints
    const mockData = this.generateMockData(content, options)
    
    // Simulate some extraction warnings
    const warnings: string[] = []
    if (content.length > 5000) {
      warnings.push('Large document detected - some details may be missed')
    }
    if (!content.includes('DKK') && !content.includes('kr')) {
      warnings.push('Currency information not clearly identified')
    }

    const finalData: ExtractedCarData = {
      ...mockData,
      metadata: {
        ...mockData.metadata,
        extractionTimestamp: new Date().toISOString(),
        extractionWarnings: warnings.length > 0 ? warnings : undefined
      }
    }

    const processingTime = Date.now() - startTime
    const estimatedTokens = this.estimateTokens(content)

    return this.createResult(
      true,
      finalData,
      undefined,
      estimatedTokens,
      this.calculateCost(estimatedTokens),
      processingTime,
      0
    )
  }

  /**
   * Mock cost calculation (very low cost for testing)
   */
  calculateCost(tokens: number): number {
    // Mock provider has minimal cost for testing
    return Math.max(1, Math.floor(tokens / 1000))
  }

  /**
   * Always returns true for mock provider
   */
  async validateApiKey(): Promise<boolean> {
    return true
  }

  /**
   * Always returns true for mock provider
   */
  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Generate mock data based on content analysis
   */
  private generateMockData(content: string, _options: ExtractOptions): ExtractedCarData {
    // Analyze content for hints about the brand/model
    const brand = this.detectBrand(content)
    const model = this.detectModel(content, brand)
    const variants = this.generateVariants(content, brand, model)

    return {
      documentInfo: {
        brand,
        documentDate: new Date().toISOString().split('T')[0],
        currency: 'DKK',
        language: 'da',
        documentType: 'private_leasing'
      },
      vehicles: [
        {
          model,
          category: this.getVehicleCategory(model),
          leasePeriodMonths: 48,
          powertrainType: this.detectPowertrainType(content) as any,
          variants
        }
      ],
      accessories: this.generateAccessories(),
      metadata: {
        extractionTimestamp: new Date().toISOString(),
        documentPages: Math.floor(content.length / 2000) + 1
      }
    }
  }

  /**
   * Detect brand from content
   */
  private detectBrand(content: string): string {
    const brands = ['Toyota', 'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Ford', 'Volvo', 'Peugeot', 'Citroën', 'Nissan']
    const contentLower = content.toLowerCase()
    
    for (const brand of brands) {
      if (contentLower.includes(brand.toLowerCase())) {
        return brand
      }
    }
    
    return 'Toyota' // Default fallback
  }

  /**
   * Detect model from content based on brand
   */
  private detectModel(content: string, brand: string): string {
    const contentLower = content.toLowerCase()
    
    const modelMappings: Record<string, string[]> = {
      'Toyota': ['Camry', 'Corolla', 'RAV4', 'Prius', 'Yaris', 'Aygo X', 'C-HR', 'Highlander'],
      'Volkswagen': ['Golf', 'Polo', 'Passat', 'Tiguan', 'Touran', 'Arteon', 'T-Cross', 'ID.4'],
      'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'i3', 'i4', 'iX3', 'Z4'],
      'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class', 'EQC', 'EQA', 'EQB'],
      'Audi': ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'e-tron', 'Q4 e-tron']
    }

    const possibleModels = modelMappings[brand] || ['Unknown Model']
    
    for (const model of possibleModels) {
      if (contentLower.includes(model.toLowerCase())) {
        return model
      }
    }
    
    return possibleModels[0]
  }

  /**
   * Generate variants based on content analysis
   */
  private generateVariants(content: string, brand: string, model: string): any[] {
    const basePrice = this.extractBasePrice(content)
    const variantCount = Math.min(3, Math.max(1, Math.floor(content.length / 2000)))

    const variants = []
    for (let i = 0; i < variantCount; i++) {
      const variant = {
        variantName: this.generateVariantName(model, i),
        engineSpecification: this.generateEngineSpec(brand, i),
        transmission: i % 2 === 0 ? 'automatic' : 'manual',
        pricing: {
          monthlyPayment: basePrice + (i * 500),
          firstPayment: (basePrice + (i * 500)) * 3,
          totalCost: (basePrice + (i * 500)) * 48,
          annualKilometers: 15000,
          co2TaxBiannual: 1000 + (i * 200)
        },
        specifications: {
          fuelConsumptionKmpl: 15.5 - (i * 0.5),
          co2EmissionsGkm: 120 + (i * 10),
          energyLabel: ['A', 'B', 'C'][i] || 'A',
          horsePower: 150 + (i * 25),
          acceleration0to100: 8.5 + (i * 0.3),
          electricRangeKm: brand === 'Toyota' && model.includes('Prius') ? 60 : null,
          batteryCapacityKwh: brand === 'Toyota' && model.includes('Prius') ? 13.6 : null
        }
      }
      variants.push(variant)
    }

    return variants
  }

  /**
   * Extract base price from content or use default
   */
  private extractBasePrice(content: string): number {
    // Look for Danish price patterns
    const pricePatterns = [
      /(\d{1,3}(?:\.\d{3})*),(\d{2})\s*kr/g,
      /(\d{1,3}(?:\.\d{3})*)\s*kr/g,
      /(\d{2,5})\s*kr/g
    ]

    for (const pattern of pricePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        // Extract first price found
        const priceMatch = matches[0].match(/(\d{1,3}(?:\.\d{3})*)/g)
        if (priceMatch) {
          const price = parseInt(priceMatch[0].replace(/\./g, ''))
          if (price > 1000 && price < 50000) {
            return price
          }
        }
      }
    }

    return 3500 // Default price
  }

  /**
   * Generate variant name
   */
  private generateVariantName(model: string, index: number): string {
    const suffixes = ['Base', 'Comfort', 'Premium', 'Sport', 'Executive']
    return `${model} ${suffixes[index] || 'Standard'}`
  }

  /**
   * Generate engine specification
   */
  private generateEngineSpec(_brand: string, index: number): string {
    const engines = [
      '1.2 TSI 110 hk',
      '1.4 TSI 150 hk',
      '2.0 TDI 150 hk',
      '1.6 TDI 115 hk',
      '1.0 TSI 95 hk'
    ]
    return engines[index] || engines[0]
  }

  /**
   * Detect powertrain type from content
   */
  private detectPowertrainType(content: string): string {
    const contentLower = content.toLowerCase()
    
    if (contentLower.includes('electric') || contentLower.includes('el-') || contentLower.includes('elektr')) {
      return 'electric'
    }
    if (contentLower.includes('hybrid')) {
      return 'hybrid'
    }
    if (contentLower.includes('diesel') || contentLower.includes('tdi')) {
      return 'diesel'
    }
    
    return 'gasoline'
  }

  /**
   * Get vehicle category based on model
   */
  private getVehicleCategory(model: string): string {
    const modelLower = model.toLowerCase()
    
    if (modelLower.includes('suv') || modelLower.includes('x') || modelLower.includes('rav4') || modelLower.includes('tiguan')) {
      return 'SUV'
    }
    if (modelLower.includes('sedan') || modelLower.includes('camry') || modelLower.includes('passat')) {
      return 'Sedan'
    }
    if (modelLower.includes('hatchback') || modelLower.includes('golf') || modelLower.includes('polo')) {
      return 'Hatchback'
    }
    
    return 'Sedan'
  }

  /**
   * Generate mock accessories
   */
  private generateAccessories(): any[] {
    return [
      {
        packageName: 'Vinterhjul',
        description: 'Komplette vinterhjul 17"',
        monthlyCost: 299,
        category: 'wheels',
        packageCode: 'WH17'
      },
      {
        packageName: 'Service & Vedligeholdelse',
        description: 'Fuld service og vedligeholdelse',
        monthlyCost: 450,
        category: 'service',
        packageCode: 'SV01'
      }
    ]
  }

  /**
   * Override token estimation for mock provider
   */
  protected estimateTokens(content: string): number {
    // Mock provider uses simple character-based estimation
    return Math.floor(content.length / 4) + 500
  }
}