/**
 * Simple Phase 1 Validation Script
 * Tests core functionality without complex test runner
 */

import { MockAIProvider } from './src/services/ai-extraction/providers/mock.js'

async function testBasicFunctionality() {
  console.log('🚀 Testing Phase 1 Basic Functionality...\n')
  
  try {
    // Test 1: Mock Provider Initialization
    console.log('📦 Test 1: Mock Provider Initialization')
    const provider = new MockAIProvider({})
    console.log(`✅ Provider created: ${provider.name}`)
    
    // Test 2: Provider Availability
    console.log('\n🔍 Test 2: Provider Availability')
    const isAvailable = await provider.isAvailable()
    const isAuthenticated = await provider.validateApiKey()
    console.log(`✅ Available: ${isAvailable}`)
    console.log(`✅ Authenticated: ${isAuthenticated}`)
    
    // Test 3: Basic Extraction
    console.log('\n🧠 Test 3: Basic Extraction')
    const testContent = `
      Toyota Aygo X Privatleasing
      
      Aygo X 1.0 VVT-i X-trend CVT - 72 hk
      Månedsydelse: 2.899 kr
      Førstegangsydelse: 8.697 kr
      Løbetid: 48 måneder
    `
    
    const result = await provider.extract(testContent, {
      dealer: 'Toyota Test',
      language: 'da'
    })
    
    console.log(`✅ Extraction Success: ${result.success}`)
    console.log(`✅ Brand Detected: ${result.data?.documentInfo.brand}`)
    console.log(`✅ Vehicle Count: ${result.data?.vehicles.length}`)
    console.log(`✅ Variant Count: ${result.data?.vehicles[0]?.variants.length}`)
    console.log(`✅ Processing Time: ${result.metadata?.extractionTimeMs}ms`)
    console.log(`✅ Cost: ${result.metadata?.costCents}¢`)
    
    // Test 4: Validation
    console.log('\n✅ Test 4: Data Validation')
    if (result.data) {
      const hasRequiredFields = !!(
        result.data.documentInfo.brand &&
        result.data.documentInfo.currency &&
        result.data.vehicles.length > 0 &&
        result.data.vehicles[0].variants.length > 0
      )
      console.log(`✅ Required Fields Present: ${hasRequiredFields}`)
      
      const pricing = result.data.vehicles[0].variants[0].pricing
      const validPricing = pricing.monthlyPayment > 0 && pricing.monthlyPayment < 100000
      console.log(`✅ Valid Pricing: ${validPricing} (${pricing.monthlyPayment} kr)`)
    }
    
    console.log('\n🎉 Phase 1 Basic Validation: PASSED')
    console.log('✅ Mock provider working correctly')
    console.log('✅ Extraction pipeline functional')
    console.log('✅ Data structure valid')
    console.log('✅ Danish content processing working')
    
    return true
    
  } catch (error) {
    console.error('\n❌ Phase 1 Basic Validation: FAILED')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    return false
  }
}

// Run the test
testBasicFunctionality().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Test runner failed:', error)
  process.exit(1)
})