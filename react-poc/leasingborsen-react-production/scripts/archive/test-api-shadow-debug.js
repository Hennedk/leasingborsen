#!/usr/bin/env node

// Debug script to test API shadow behavior
const testApiShadowDebug = async () => {
  console.log('🔍 API Shadow Debug Test\n')

  // Create a simple test image (red square)
  const canvas = require('canvas')
  const createCanvas = canvas.createCanvas
  const c = createCanvas(200, 200)
  const ctx = c.getContext('2d')
  
  // Draw a red square
  ctx.fillStyle = 'red'
  ctx.fillRect(50, 50, 100, 100)
  
  const testImageBase64 = c.toDataURL('image/png').split(',')[1]

  // Direct API4AI test
  console.log('📡 Testing API4AI directly with shadow modes...\n')
  
  const testModes = [
    { mode: 'fg-image', desc: 'Foreground only (no shadow)' },
    { mode: 'fg-image-shadow', desc: 'Foreground with shadow' }
  ]

  const API4AI_KEY = process.env.API4AI_KEY || 'YOUR_API_KEY'
  
  for (const test of testModes) {
    console.log(`Testing mode: ${test.mode} - ${test.desc}`)
    
    try {
      const FormData = require('form-data')
      const form = new FormData()
      form.append('image', Buffer.from(testImageBase64, 'base64'), {
        filename: 'test.png',
        contentType: 'image/png'
      })

      const response = await fetch(
        `https://cars-image-background-removal.p.rapidapi.com/v1/results?mode=${test.mode}`,
        {
          method: 'POST',
          headers: {
            'X-RapidAPI-Key': API4AI_KEY,
            'X-RapidAPI-Host': 'cars-image-background-removal.p.rapidapi.com',
            ...form.getHeaders()
          },
          body: form
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Success - Mode: ${test.mode}`)
        
        // Check if shadow was applied
        if (result.results?.[0]?.entities) {
          const entities = result.results[0].entities
          const shadowEntity = entities.find(e => e.name?.includes('shadow'))
          if (shadowEntity) {
            console.log('   Shadow entity found:', shadowEntity.name)
          } else {
            console.log('   No shadow entity in response')
          }
        }
      } else {
        console.log(`❌ Failed - Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    console.log()
  }

  // Test via Python service
  console.log('\n📡 Testing Python service shadow behavior...\n')
  
  try {
    const pythonResponse = await fetch(
      'https://leasingborsen-production.up.railway.app/process-image',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: testImageBase64,
          filename: 'test-python-shadow.png',
          options: {
            remove_background: true,
            add_shadow: true,
            auto_crop: false,
            create_sizes: false
          }
        })
      }
    )

    if (pythonResponse.ok) {
      const result = await pythonResponse.json()
      console.log('Python service result:')
      console.log('- Shadow applied:', result.metadata?.has_shadow)
      console.log('- Shadow type:', result.metadata?.shadow_type)
      console.log('- Background removed:', result.metadata?.has_background_removed)
      
      // Check if the result image has visible shadow
      if (result.processed) {
        const fs = require('fs')
        fs.writeFileSync('python-shadow-test.webp', Buffer.from(result.processed, 'base64'))
        console.log('\n💾 Saved test result to: python-shadow-test.webp')
        console.log('   Check this file to see if shadow is visible')
      }
    }
  } catch (error) {
    console.error('Python service error:', error.message)
  }
}

// Check for API key
if (!process.env.API4AI_KEY) {
  console.log('⚠️  Warning: API4AI_KEY not set in environment')
  console.log('   The API test will fail without a valid key')
  console.log('   Set it with: export API4AI_KEY=your_key\n')
}

// Install dependencies if needed
const checkDependencies = async () => {
  try {
    require('canvas')
    require('form-data')
  } catch {
    console.log('📦 Installing required dependencies...')
    const { execSync } = require('child_process')
    execSync('npm install canvas form-data', { stdio: 'inherit' })
  }
}

checkDependencies().then(() => testApiShadowDebug())