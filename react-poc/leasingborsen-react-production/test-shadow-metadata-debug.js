#!/usr/bin/env node

// Debug test to check shadow metadata
const testShadowMetadata = async () => {
  console.log('🔍 Testing Shadow Metadata\n')

  const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  
  // Test direct Python service call
  console.log('📡 Testing Python service directly with background removal + shadow...')
  
  const pythonResponse = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: testImageBase64,
      filename: 'test-metadata.png',
      options: {
        remove_background: true,
        add_shadow: true,
        auto_crop: false,
        create_sizes: false
      }
    })
  })

  const result = await pythonResponse.json()
  
  console.log('Response:', JSON.stringify(result, null, 2))
  
  if (result.success) {
    console.log('\nMetadata analysis:')
    console.log('- has_background_removed:', result.metadata.has_background_removed)
    console.log('- has_shadow:', result.metadata.has_shadow)
    console.log('- shadow_type:', result.metadata.shadow_type)
    console.log('- All metadata keys:', Object.keys(result.metadata))
  }
}

testShadowMetadata().catch(console.error)