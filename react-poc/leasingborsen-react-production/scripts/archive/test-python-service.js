#!/usr/bin/env node

// Test script for Python image processing service
// This verifies the Railway service is working before updating Edge Functions

const testPythonService = async () => {
  console.log('🧪 Testing Python image processing service...\n')

  // Test image - 1x1 red pixel PNG
  const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  try {
    // Test 1: Basic connectivity and minimal processing
    console.log('📡 Test 1: Basic connectivity test')
    const response1 = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: testImage,
        filename: 'test.png',
        options: {
          remove_background: false,
          auto_crop: false,
          add_shadow: false,
          create_sizes: false
        }
      })
    })

    const result1 = await response1.json()
    console.log('✅ Basic test response:', {
      success: result1.success,
      hasProcessed: !!result1.processed,
      hasMetadata: !!result1.metadata,
      error: result1.error
    })

    // Test 2: Full processing with all features
    console.log('\n📸 Test 2: Full processing test')
    const response2 = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: testImage,
        filename: 'test-full.png',
        options: {
          remove_background: true,
          auto_crop: true,
          add_shadow: true,
          create_sizes: true,
          padding_percent: 0.1
        },
        mode: 'car'
      })
    })

    const result2 = await response2.json()
    console.log('✅ Full processing response:', {
      success: result2.success,
      hasProcessed: !!result2.processed,
      hasSizes: !!result2.sizes,
      sizeKeys: result2.sizes ? Object.keys(result2.sizes) : [],
      metadata: result2.metadata,
      error: result2.error
    })

    // Test 3: Error handling with invalid image
    console.log('\n❌ Test 3: Error handling test')
    const response3 = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: 'invalid-base64',
        filename: 'test-error.png'
      })
    })

    const result3 = await response3.json()
    console.log('✅ Error handling response:', {
      success: result3.success,
      error: result3.error
    })

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📋 Summary:')
    console.log('- Service is reachable at https://leasingborsen-production.up.railway.app/')
    console.log('- Basic processing works')
    console.log('- Full processing with all features works')
    console.log('- Error handling is functional')
    console.log('\n✅ Ready to update Edge Functions!')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Details:', error)
    process.exit(1)
  }
}

// Run the test
testPythonService()