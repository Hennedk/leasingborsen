#!/usr/bin/env node

// Simple test to check API shadow behavior
const testApiShadow = async () => {
  console.log('🔍 Testing API Shadow Feature\n')

  // Test with a real car image URL
  const testImageUrl = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80'
  
  console.log('Fetching test car image...')
  const imgResponse = await fetch(testImageUrl)
  const imgBuffer = await imgResponse.arrayBuffer()
  const base64 = Buffer.from(imgBuffer).toString('base64')
  
  // Edge Function URL
  const edgeFunctionUrl = 'https://hqqouszbgskteivjoems.supabase.co/functions/v1/remove-bg'
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'

  console.log('\n📡 Calling Edge Function (shadow should be applied via API)...')
  
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify({
      imageData: `data:image/jpeg;base64,${base64}`,
      fileName: 'test-api-shadow-car.jpg',
      skipAutoCrop: false
    })
  })

  const result = await response.json()
  
  if (result.success) {
    console.log('✅ Success!')
    console.log('\nMetadata:', JSON.stringify(result.metadata, null, 2))
    console.log('\nProcessed image URL:', result.processed)
    console.log('\n📌 Check the processed image to see if API shadow is visible')
    console.log('   The metadata should show shadow_type: "api_shadow"')
    
    // Download and save the processed image
    const processedResponse = await fetch(result.processed)
    const processedBuffer = await processedResponse.arrayBuffer()
    const fs = require('fs')
    fs.writeFileSync('api-shadow-result.webp', Buffer.from(processedBuffer))
    console.log('\n💾 Saved processed image to: api-shadow-result.webp')
  } else {
    console.log('❌ Failed:', result.error)
  }
}

testApiShadow().catch(console.error)