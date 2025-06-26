/**
 * Simple test script to verify the AI extraction service works
 * 
 * This can be run independently to test the extraction workflow
 * without requiring a full application setup.
 */

import { createTestService } from './extractor'

/**
 * Sample Danish car leasing document content for testing
 */
const SAMPLE_CONTENT = `
Toyota Privatleasing 2024

Toyota Aygo X

Månedsydelse: 2.899 kr
Førstegangsydelse: 8.697 kr
Løbetid: 48 måneder
Kørsel per år: 15.000 km

Aygo X 1.0 VVT-i X-trend CVT - 72 hk
Månedsydelse: 2.899 kr

Aygo X 1.0 VVT-i X-cite CVT - 72 hk  
Månedsydelse: 3.199 kr

Aygo X 1.0 VVT-i X-clusiv CVT - 72 hk
Månedsydelse: 3.399 kr

Tilvalg:
Vinterhjul 15": 299 kr/md
Service & Vedligeholdelse: 450 kr/md
Forsikring: 650 kr/md

Alle priser er inkl. moms.
`

/**
 * Test the extraction service
 */
export async function testExtractionService(): Promise<void> {
  console.log('🚀 Testing AI Extraction Service...\n')

  try {
    // Create a test service instance
    const extractionService = createTestService()

    // Get service status
    console.log('📊 Service Status:')
    const status = await extractionService.getServiceStatus()
    console.log(`- Initialized: ${status.initialized}`)
    console.log(`- Available Providers: ${status.availableProviders.join(', ')}`)
    console.log(`- Primary Provider: ${status.primaryProvider}`)
    console.log('')

    // Test provider availability
    console.log('🔍 Testing Mock Provider:')
    const mockTest = await extractionService.testProvider('mock', SAMPLE_CONTENT)
    console.log(`- Available: ${mockTest.available}`)
    console.log(`- Authenticated: ${mockTest.authenticated}`)
    if (mockTest.error) {
      console.log(`- Error: ${mockTest.error}`)
    }
    console.log('')

    // Perform extraction
    console.log('🧠 Performing Test Extraction:')
    const result = await extractionService.extract(SAMPLE_CONTENT, {
      dealer: 'Toyota Test',
      language: 'da',
      enableCostChecking: false,
      enableValidation: true,
      strategy: 'primary_only'
    })

    console.log(`- Success: ${result.success}`)
    console.log(`- Providers Attempted: ${result.providersAttempted.join(', ')}`)
    console.log(`- Processing Time: ${result.totalProcessingTimeMs}ms`)
    console.log(`- Total Cost: ${result.totalCostCents}¢`)

    if (result.success && result.data) {
      console.log('\n📋 Extracted Data:')
      console.log(`- Brand: ${result.data.documentInfo.brand}`)
      console.log(`- Currency: ${result.data.documentInfo.currency}`)
      console.log(`- Vehicles: ${result.data.vehicles.length}`)
      
      result.data.vehicles.forEach((vehicle, index) => {
        console.log(`  Vehicle ${index + 1}: ${vehicle.model}`)
        console.log(`  - Powertrain: ${vehicle.powertrainType}`)
        console.log(`  - Lease Period: ${vehicle.leasePeriodMonths} months`)
        console.log(`  - Variants: ${vehicle.variants.length}`)
        
        vehicle.variants.forEach((variant, vIndex) => {
          console.log(`    ${vIndex + 1}. ${variant.variantName}`)
          console.log(`       - Engine: ${variant.engineSpecification}`)
          console.log(`       - Monthly Payment: ${variant.pricing.monthlyPayment} kr`)
        })
      })

      if (result.data.accessories && result.data.accessories.length > 0) {
        console.log(`- Accessories: ${result.data.accessories.length}`)
        result.data.accessories.forEach((accessory, index) => {
          console.log(`  ${index + 1}. ${accessory.packageName}: ${accessory.monthlyCost} kr/md`)
        })
      }

      if (result.validationResult) {
        console.log('\n✅ Validation Result:')
        console.log(`- Valid: ${result.validationResult.isValid}`)
        console.log(`- Confidence: ${Math.round(result.validationResult.confidence * 100)}%`)
        console.log(`- Errors: ${result.validationResult.errors.length}`)
        console.log(`- Warnings: ${result.validationResult.warnings.length}`)
      }
    } else if (result.error) {
      console.log('\n❌ Extraction Failed:')
      console.log(`- Error Type: ${result.error.type}`)
      console.log(`- Error Message: ${result.error.message}`)
      console.log(`- Retryable: ${result.error.retryable}`)
    }

    console.log('\n✨ Test completed successfully!')

  } catch (error) {
    console.error('\n💥 Test failed with exception:', error)
    throw error
  }
}

/**
 * Run the test if this file is executed directly
 */
if (typeof require !== 'undefined' && require.main === module) {
  testExtractionService().catch(console.error)
}