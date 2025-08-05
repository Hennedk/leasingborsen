#!/usr/bin/env node

// Test script to diagnose Edge Function shadow behavior
const testEdgeFunctionShadow = async () => {
  console.log('🧪 Testing Edge Function Shadow Behavior...\n')

  // Test image - 1x1 red pixel PNG
  const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  const testImageDataUrl = `data:image/png;base64,${testImageBase64}`

  // Production Edge Function
  const edgeFunctionUrl = 'https://hqqouszbgskteivjoems.supabase.co/functions/v1/remove-bg'
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'

  try {
    console.log('📡 Testing Edge Function with shadow enabled')
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        imageData: testImageDataUrl,
        fileName: 'test-shadow-diagnosis.png',
        skipAutoCrop: false
      })
    })

    const result = await response.json()
    console.log('Response status:', response.status)
    console.log('Response:', JSON.stringify(result, null, 2))

    if (result.success && result.processed) {
      // Check what the processed URL looks like
      console.log('\n🔍 Analyzing processed image URL:')
      console.log('Processed URL:', result.processed)
      
      // The URL pattern can help identify if shadow was applied
      if (result.metadata) {
        console.log('\nMetadata:', result.metadata)
      }
    }

    // Test direct Python service to compare
    console.log('\n📡 Testing Python service directly')
    const pythonResponse = await fetch('https://leasingborsen-production.up.railway.app/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: testImageBase64,
        filename: 'test-python-direct.png',
        options: {
          remove_background: true,
          add_shadow: true,
          auto_crop: false,
          create_sizes: false
        }
      })
    })

    if (pythonResponse.ok) {
      const pythonResult = await pythonResponse.json()
      console.log('Python service metadata:', pythonResult.metadata)
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Details:', error)
  }
}

// Run the test
testEdgeFunctionShadow()