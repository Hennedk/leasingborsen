/**
 * Phase 2 Provider Testing Script
 * Tests real AI provider integration with sample Danish car documents
 */

import { config } from './src/services/ai-extraction/config'
import { OpenAIProvider } from './src/services/ai-extraction/providers/openai'
import { AnthropicProvider } from './src/services/ai-extraction/providers/anthropic'
import { MockAIProvider } from './src/services/ai-extraction/providers/mock'

// Sample Danish car leasing document content
const SAMPLE_TOYOTA_DOCUMENT = `
Toyota Aygo X Privatleasing

Aygo X 1.0 VVT-i X-trend CVT - 72 hk
Månedsydelse: 2.899 kr
Førstegangsydelse: 8.697 kr
Løbetid: 48 måneder
Kørsel per år: 10.000 km
CO2-udledning: 118 g/km
Brandstoforbrug: 21,7 km/l

Aygo X 1.0 VVT-i X-play CVT - 72 hk  
Månedsydelse: 2.699 kr
Førstegangsydelse: 8.097 kr
Løbetid: 48 måneder
Kørsel per år: 10.000 km
CO2-udledning: 118 g/km
Brandstoforbrug: 21,7 km/l

Aygo X 1.0 VVT-i X-cite CVT - 72 hk
Månedsydelse: 2.799 kr
Førstegangsydelse: 8.397 kr
Løbetid: 48 måneder
Kørsel per år: 10.000 km
CO2-udledning: 118 g/km
Brandstoforbrug: 21,7 km/l

Service og vedligeholdelse inkluderet
Halvårlig CO2-afgift: 598 kr
Færdselsafgift: 380 kr
`

const SAMPLE_BMW_ELECTRIC_DOCUMENT = `
BMW iX3 Privatleasing

iX3 eDrive20 - 286 hk
Månedsydelse: 8.995 kr
Førstegangsydelse: 26.985 kr
Løbetid: 36 måneder
Kørsel per år: 15.000 km
Rækkevidde (WLTP): 461 km
Energiforbrug: 17,8 kWh/100km
CO2-udledning: 0 g/km

iX3 eDrive20 M Sport - 286 hk
Månedsydelse: 9.495 kr
Førstegangsydelse: 28.485 kr
Løbetid: 36 måneder
Kørsel per år: 15.000 km
Rækkevidde (WLTP): 461 km
Energiforbrug: 17,8 kWh/100km
CO2-udledning: 0 g/km

Halvårlig CO2-afgift: 0 kr (eldrevne køretøjer)
Service og vedligeholdelse inkluderet
`

interface TestResult {
  provider: string
  success: boolean
  extractionTime: number
  tokensUsed: number
  costCents: number
  vehicleCount: number
  variantCount: number
  errors: string[]
  confidence?: number
}

class Phase2Tester {
  private results: TestResult[] = []

  /**
   * Test all available providers with sample documents
   */
  async testAllProviders(): Promise<void> {
    console.log('🚀 Phase 2 Provider Testing - Real AI Integration\n')
    
    // Check configuration
    console.log('📋 Configuration Check:')
    console.log(`✅ AI Extraction Enabled: ${config.isEnabled()}`)
    console.log(`✅ Primary Provider: ${config.getPrimaryProvider()}`)
    console.log(`✅ OpenAI Configured: ${!!config.openaiApiKey}`)
    console.log(`✅ Anthropic Configured: ${!!config.anthropicApiKey}`)
    console.log(`✅ Max Cost per PDF: ${config.maxCostPerPdfCents}¢`)
    console.log(`✅ Daily Cost Limit: $${config.dailyCostLimitUsd}`)
    console.log()

    // Test providers in order of priority
    const providers = [
      { name: 'mock', instance: new MockAIProvider({}) },
      ...(config.openaiApiKey ? [{ name: 'openai', instance: new OpenAIProvider() }] : []),
      ...(config.anthropicApiKey ? [{ name: 'anthropic', instance: new AnthropicProvider() }] : [])
    ]

    if (providers.length === 1) {
      console.log('⚠️  Only mock provider available - add API keys to .env.local for real testing')
      console.log()
    }

    // Test each provider with Toyota document
    console.log('🧪 Testing Toyota Aygo X Document (3 variants):')
    console.log('='.repeat(60))
    
    for (const { name, instance } of providers) {
      await this.testProvider(name, instance, SAMPLE_TOYOTA_DOCUMENT, 'Toyota')
    }

    // Test each provider with BMW electric document
    console.log('\n🧪 Testing BMW iX3 Electric Document (2 variants):')
    console.log('='.repeat(60))
    
    for (const { name, instance } of providers) {
      await this.testProvider(name, instance, SAMPLE_BMW_ELECTRIC_DOCUMENT, 'BMW')
    }

    // Generate comparison report
    this.generateComparisonReport()
  }

  /**
   * Test individual provider with document
   */
  private async testProvider(
    providerName: string, 
    provider: any, 
    document: string, 
    expectedBrand: string
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`\n🤖 Testing ${providerName.toUpperCase()} Provider:`)
      
      // Check availability first
      const isAvailable = await provider.isAvailable()
      if (!isAvailable) {
        console.log(`❌ Provider not available (API key missing or invalid)`)
        this.results.push({
          provider: providerName,
          success: false,
          extractionTime: 0,
          tokensUsed: 0,
          costCents: 0,
          vehicleCount: 0,
          variantCount: 0,
          errors: ['Provider not available']
        })
        return
      }

      console.log(`✅ Provider available`)

      // Perform extraction
      const result = await provider.extract(document, {
        dealer: `${expectedBrand} Test Dealer`,
        language: 'da'
      })

      const extractionTime = Date.now() - startTime

      if (result.success && result.data) {
        const data = result.data
        const vehicleCount = data.vehicles?.length || 0
        const variantCount = data.vehicles?.reduce((total: number, vehicle: any) => 
          total + (vehicle.variants?.length || 0), 0) || 0

        console.log(`✅ Extraction successful`)
        console.log(`   Brand: ${data.documentInfo?.brand}`)
        console.log(`   Vehicles: ${vehicleCount}`)
        console.log(`   Variants: ${variantCount}`)
        console.log(`   Processing time: ${extractionTime}ms`)
        console.log(`   Tokens used: ${result.metadata?.tokensUsed || 0}`)
        console.log(`   Cost: ${result.metadata?.costCents || 0}¢`)

        // Validate expected results
        const errors: string[] = []
        if (data.documentInfo?.brand !== expectedBrand) {
          errors.push(`Expected brand ${expectedBrand}, got ${data.documentInfo?.brand}`)
        }
        if (vehicleCount === 0) {
          errors.push('No vehicles extracted')
        }
        if (variantCount === 0) {
          errors.push('No variants extracted')
        }

        this.results.push({
          provider: providerName,
          success: true,
          extractionTime,
          tokensUsed: result.metadata?.tokensUsed || 0,
          costCents: result.metadata?.costCents || 0,
          vehicleCount,
          variantCount,
          errors,
          confidence: result.metadata?.confidence
        })

        if (errors.length > 0) {
          console.log(`⚠️  Validation warnings: ${errors.join(', ')}`)
        }

      } else {
        console.log(`❌ Extraction failed: ${result.error?.message || 'Unknown error'}`)
        this.results.push({
          provider: providerName,
          success: false,
          extractionTime,
          tokensUsed: result.metadata?.tokensUsed || 0,
          costCents: result.metadata?.costCents || 0,
          vehicleCount: 0,
          variantCount: 0,
          errors: [result.error?.message || 'Extraction failed']
        })
      }

    } catch (error: any) {
      const extractionTime = Date.now() - startTime
      console.log(`❌ Provider test failed: ${error.message}`)
      this.results.push({
        provider: providerName,
        success: false,
        extractionTime,
        tokensUsed: 0,
        costCents: 0,
        vehicleCount: 0,
        variantCount: 0,
        errors: [error.message]
      })
    }
  }

  /**
   * Generate comprehensive comparison report
   */
  private generateComparisonReport(): void {
    console.log('\n📊 PROVIDER COMPARISON REPORT')
    console.log('='.repeat(80))

    const successfulResults = this.results.filter(r => r.success)
    const failedResults = this.results.filter(r => !r.success)

    console.log(`\n✅ Successful Extractions: ${successfulResults.length}/${this.results.length}`)
    console.log(`❌ Failed Extractions: ${failedResults.length}/${this.results.length}`)

    if (successfulResults.length > 0) {
      console.log('\n🏆 Performance Metrics:')
      console.log('-'.repeat(60))
      
      const avgTime = successfulResults.reduce((sum, r) => sum + r.extractionTime, 0) / successfulResults.length
      const totalCost = successfulResults.reduce((sum, r) => sum + r.costCents, 0)
      const totalTokens = successfulResults.reduce((sum, r) => sum + r.tokensUsed, 0)

      console.log(`Average extraction time: ${Math.round(avgTime)}ms`)
      console.log(`Total cost: ${totalCost}¢ ($${(totalCost / 100).toFixed(3)})`)
      console.log(`Total tokens used: ${totalTokens}`)
      
      console.log('\n📈 Provider Performance:')
      successfulResults.forEach(result => {
        const efficiency = result.variantCount / (result.extractionTime / 1000) // variants per second
        console.log(`${result.provider.toUpperCase()}: ${result.variantCount} variants in ${result.extractionTime}ms (${efficiency.toFixed(2)} variants/sec) - ${result.costCents}¢`)
      })
    }

    if (failedResults.length > 0) {
      console.log('\n❌ Failed Tests:')
      console.log('-'.repeat(40))
      failedResults.forEach(result => {
        console.log(`${result.provider.toUpperCase()}: ${result.errors.join(', ')}`)
      })
    }

    console.log('\n🎯 PHASE 2 STATUS SUMMARY:')
    console.log('-'.repeat(40))
    
    const mockWorking = this.results.find(r => r.provider === 'mock')?.success
    const openaiWorking = this.results.find(r => r.provider === 'openai')?.success
    const anthropicWorking = this.results.find(r => r.provider === 'anthropic')?.success

    console.log(`✅ Mock Provider: ${mockWorking ? 'Working' : 'Failed'}`)
    console.log(`${openaiWorking ? '✅' : '❌'} OpenAI Provider: ${openaiWorking ? 'Working' : 'Not configured or failed'}`)
    console.log(`${anthropicWorking ? '✅' : '❌'} Anthropic Provider: ${anthropicWorking ? 'Working' : 'Not configured or failed'}`)

    const readyForProduction = mockWorking && (openaiWorking || anthropicWorking)
    console.log(`\n🚀 Production Ready: ${readyForProduction ? 'YES' : 'NO'}`)
    
    if (readyForProduction) {
      console.log('\n✨ Phase 2 Implementation Complete!')
      console.log('Next steps: Deploy to staging environment and run integration tests')
    } else {
      console.log('\n⚠️  Setup Required:')
      if (!openaiWorking && !anthropicWorking) {
        console.log('- Add OpenAI or Anthropic API keys to .env.local')
        console.log('- Set VITE_AI_EXTRACTION_ENABLED=true')
      }
    }
  }
}

// Run the test suite
async function runPhase2Tests() {
  const tester = new Phase2Tester()
  
  try {
    await tester.testAllProviders()
  } catch (error) {
    console.error('❌ Phase 2 testing failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase2Tests()
}

export { Phase2Tester, runPhase2Tests }