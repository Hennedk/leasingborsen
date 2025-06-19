import { VWPDFProcessor } from './src/lib/processors/vwPDFProcessor.js'

async function testSchemaFix() {
  console.log('🧪 Testing VW PDF batch processing with schema fixes...')
  
  const processor = new VWPDFProcessor()
  
  // Create a mock File object that mimics the real PDF
  const mockFile = {
    name: 'VolkswagenLeasingpriser.pdf',
    size: 245760,
    type: 'application/pdf'
  }
  
  try {
    console.log('\n📤 Testing complete batch processing workflow...')
    
    // Test the main processing function
    const result = await processor.processPDF(
      'seller-123', // Mock seller ID
      mockFile,
      'admin@test.com'
    )
    
    console.log('\n✅ Batch processing completed successfully!')
    console.log(`📊 Batch ID: ${result.batchId}`)
    console.log(`📝 Items created: ${result.itemsCreated}`)
    console.log(`📈 Stats:`, result.stats)
    
    console.log('\n🔍 Testing batch details retrieval...')
    const batchDetails = await processor.getBatchDetails(result.batchId)
    console.log(`📋 Batch has ${batchDetails.items.length} items`)
    
    console.log('\n🎯 Testing approval workflow...')
    const itemIds = batchDetails.items.map(item => item.id)
    const approvalResult = await processor.applyApprovedChanges(result.batchId, itemIds)
    
    console.log('\n🎉 Complete workflow test successful!')
    console.log(`✅ Applied: ${approvalResult.applied}`)
    console.log(`➕ Created: ${approvalResult.created}`)
    console.log(`📝 Updated: ${approvalResult.updated}`)
    console.log(`🗑️ Deleted: ${approvalResult.deleted}`)
    console.log(`❌ Errors: ${approvalResult.errors.length}`)
    
    if (approvalResult.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:')
      approvalResult.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. Item ${error.itemId}: ${error.error}`)
      })
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Full error:', error)
  }
}

// Run the test
testSchemaFix().catch(console.error)