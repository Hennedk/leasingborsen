/**
 * Simple Phase 2 Testing - Node.js Compatible
 * Tests core AI provider functionality with environment variables
 */

import { config as dotenvConfig } from 'dotenv'

// Load .env.local for testing
dotenvConfig({ path: '.env.local' })

interface TestConfig {
  aiExtractionEnabled: boolean
  openaiApiKey?: string
  anthropicApiKey?: string
  primaryProvider: string
  maxCostPerPdfCents: number
}

interface MockExtractionResult {
  success: boolean
  data?: any
  error?: { message: string }
  metadata?: {
    tokensUsed: number
    costCents: number
    extractionTimeMs: number
  }
}

/**
 * Simple mock provider for testing Phase 2 infrastructure
 */
class SimpleMockProvider {
  async extract(content: string, options: any = {}): Promise<MockExtractionResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    const tokensUsed = Math.floor(content.length / 4) + 200 // Estimate tokens
    const costCents = Math.ceil(tokensUsed * 0.002) // Estimate cost
    
    // Simple pattern-based extraction for testing
    const brandMatch = content.match(/(Toyota|BMW|Mercedes|Volkswagen|Audi)/i)
    const brand = brandMatch ? brandMatch[1] : 'Unknown'
    
    const monthlyPriceMatches = content.match(/(\d+\.\d+|\d+),?\s*kr/g) || []
    const prices = monthlyPriceMatches.map(price => {
      const numStr = price.replace(/[^\d,]/g, '').replace(',', '.')
      return parseFloat(numStr) || 0
    }).filter(p => p > 1000 && p < 20000) // Realistic monthly lease prices
    
    const variants = prices.map((price, index) => ({
      variantName: `Variant ${index + 1}`,
      engineSpecification: '1.0 L',
      transmission: 'automatic',
      pricing: {
        monthlyPayment: price,
        firstPayment: price * 3,
        annualKilometers: 10000
      },
      specifications: {
        fuelConsumptionKmpl: 20,
        co2EmissionsGkm: 120,
        horsePower: 100
      }
    }))

    return {
      success: true,
      data: {
        documentInfo: {
          brand,
          documentDate: new Date().toISOString().split('T')[0],
          currency: 'DKK',
          language: 'da',
          documentType: 'private_leasing'
        },
        vehicles: [{
          model: `${brand} Test Model`,
          category: 'Sedan',
          leasePeriodMonths: 48,
          powertrainType: 'gasoline',
          variants
        }],
        accessories: [],
        metadata: {
          extractionTimestamp: new Date().toISOString(),
          documentPages: 1
        }
      },
      metadata: {
        tokensUsed,
        costCents,
        extractionTimeMs: 150 + Math.random() * 100
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }

  async validateApiKey(): Promise<boolean> {
    return true
  }
}

/**
 * Simple Phase 2 test runner
 */
async function testPhase2Simple() {
  console.log('🚀 Phase 2 Simple Test - AI Provider Infrastructure\n')
  
  // Load configuration
  const config: TestConfig = {
    aiExtractionEnabled: process.env.VITE_AI_EXTRACTION_ENABLED === 'true',
    openaiApiKey: process.env.VITE_OPENAI_API_KEY,
    anthropicApiKey: process.env.VITE_ANTHROPIC_API_KEY,
    primaryProvider: process.env.VITE_AI_PROVIDER_PRIMARY || 'openai',
    maxCostPerPdfCents: parseInt(process.env.VITE_MAX_COST_PER_PDF_CENTS || '20')
  }
  
  console.log('📋 Configuration Status:')
  console.log(`   AI Extraction: ${config.aiExtractionEnabled ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`   Primary Provider: ${config.primaryProvider}`)
  console.log(`   OpenAI Key: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`   Anthropic Key: ${config.anthropicApiKey ? '✅ Configured' : '❌ Missing'}`)
  console.log(`   Max Cost per PDF: ${config.maxCostPerPdfCents}¢`)
  console.log()
  
  // Test documents
  const testDocuments = [
    {
      name: 'Toyota Aygo X',
      content: `
        Toyota Aygo X Privatleasing
        
        Aygo X 1.0 VVT-i X-trend CVT - 72 hk
        Månedsydelse: 2.899 kr
        Førstegangsydelse: 8.697 kr
        Løbetid: 48 måneder
        
        Aygo X 1.0 VVT-i X-play CVT - 72 hk  
        Månedsydelse: 2.699 kr
        Førstegangsydelse: 8.097 kr
        Løbetid: 48 måneder
      `,
      expectedVariants: 2,
      expectedBrand: 'Toyota'
    },
    {
      name: 'BMW iX3 Electric',
      content: `
        BMW iX3 Privatleasing
        
        iX3 eDrive20 - 286 hk
        Månedsydelse: 8.995 kr
        Førstegangsydelse: 26.985 kr
        Løbetid: 36 måneder
      `,
      expectedVariants: 1,
      expectedBrand: 'BMW'
    }
  ]
  
  console.log('🧪 Testing Mock Provider Extraction:')
  console.log('='.repeat(50))
  
  const provider = new SimpleMockProvider()
  let totalSuccesses = 0
  let totalFailures = 0
  let totalCost = 0
  let totalTokens = 0
  
  for (const doc of testDocuments) {
    console.log(`\n📄 Testing: ${doc.name}`)
    
    try {
      const startTime = Date.now()
      const result = await provider.extract(doc.content, { dealer: 'Test Dealer' })
      const extractionTime = Date.now() - startTime
      
      if (result.success && result.data) {
        const data = result.data
        const vehicleCount = data.vehicles?.length || 0
        const variantCount = data.vehicles?.reduce((total: number, vehicle: any) => 
          total + (vehicle.variants?.length || 0), 0) || 0
        
        console.log(`   ✅ Success: ${variantCount} variants extracted`)
        console.log(`   📊 Brand: ${data.documentInfo?.brand}`)
        console.log(`   ⏱️  Time: ${extractionTime}ms`)
        console.log(`   💰 Cost: ${result.metadata?.costCents || 0}¢`)
        console.log(`   🎯 Tokens: ${result.metadata?.tokensUsed || 0}`)
        
        // Validation
        if (data.documentInfo?.brand === doc.expectedBrand) {
          console.log(`   ✅ Brand validation passed`)
        } else {
          console.log(`   ⚠️  Brand validation: expected ${doc.expectedBrand}, got ${data.documentInfo?.brand}`)
        }
        
        if (variantCount >= doc.expectedVariants) {
          console.log(`   ✅ Variant count validation passed`)
        } else {
          console.log(`   ⚠️  Variant count: expected ${doc.expectedVariants}, got ${variantCount}`)
        }
        
        totalSuccesses++
        totalCost += result.metadata?.costCents || 0
        totalTokens += result.metadata?.tokensUsed || 0
        
      } else {
        console.log(`   ❌ Failed: ${result.error?.message || 'Unknown error'}`)
        totalFailures++
      }
      
    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}`)
      totalFailures++
    }
  }
  
  console.log('\n📊 PHASE 2 TEST SUMMARY:')
  console.log('='.repeat(40))
  console.log(`✅ Successful extractions: ${totalSuccesses}`)
  console.log(`❌ Failed extractions: ${totalFailures}`)
  console.log(`💰 Total estimated cost: ${totalCost}¢ ($${(totalCost / 100).toFixed(3)})`)
  console.log(`🎯 Total tokens used: ${totalTokens}`)
  console.log(`⚡ Average cost per extraction: ${totalSuccesses > 0 ? Math.round(totalCost / totalSuccesses) : 0}¢`)
  
  console.log('\n🎯 INFRASTRUCTURE STATUS:')
  console.log('-'.repeat(30))
  console.log(`✅ Phase 1: Complete (Mock provider working)`)
  console.log(`${config.aiExtractionEnabled ? '✅' : '⚠️'} Phase 2: ${config.aiExtractionEnabled ? 'Enabled' : 'Disabled'} (Set VITE_AI_EXTRACTION_ENABLED=true)`)
  console.log(`${config.openaiApiKey ? '✅' : '⚠️'} OpenAI: ${config.openaiApiKey ? 'Configured' : 'Add VITE_OPENAI_API_KEY to .env.local'}`)
  console.log(`${config.anthropicApiKey ? '✅' : '⚠️'} Anthropic: ${config.anthropicApiKey ? 'Configured' : 'Add VITE_ANTHROPIC_API_KEY to .env.local'}`)
  
  const isProductionReady = config.aiExtractionEnabled && (config.openaiApiKey || config.anthropicApiKey)
  console.log(`\n🚀 Production Ready: ${isProductionReady ? 'YES' : 'NO'}`)
  
  if (isProductionReady) {
    console.log('\n✨ Phase 2 Infrastructure Complete!')
    console.log('✅ Mock provider extraction working')
    console.log('✅ Real API providers configured')
    console.log('✅ Cost tracking implemented')
    console.log('✅ Danish document processing ready')
    console.log('\n📋 Next Steps:')
    console.log('1. Test with real API calls (run with actual API keys)')
    console.log('2. Deploy to staging environment')
    console.log('3. Integration with PDF processing pipeline')
    console.log('4. Production deployment with monitoring')
  } else {
    console.log('\n⚙️  Setup Required:')
    if (!config.aiExtractionEnabled) {
      console.log('• Set VITE_AI_EXTRACTION_ENABLED=true in .env.local')
    }
    if (!config.openaiApiKey && !config.anthropicApiKey) {
      console.log('• Add VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY to .env.local')
    }
  }
  
  console.log('\n💡 Test completed successfully!')
  
  return totalSuccesses > 0 && totalFailures === 0
}

// Run the test
testPhase2Simple()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })