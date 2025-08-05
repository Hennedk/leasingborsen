#!/usr/bin/env node

// Test to verify shadows are only applied with background removal
const testShadowBehavior = async () => {
  console.log('🧪 Testing Shadow Behavior\n')
  console.log('Verifying that shadows are ONLY applied when background removal is enabled\n')

  // Test configurations
  const tests = [
    {
      name: 'bg-removal-with-shadow',
      options: {
        remove_background: true,
        add_shadow: true,
        auto_crop: true
      },
      expected: {
        has_background_removed: true,
        has_shadow: true,
        shadow_type: 'api_shadow'
      },
      description: '✅ Background removal + shadow (should have API shadow)'
    },
    {
      name: 'bg-removal-no-shadow',
      options: {
        remove_background: true,
        add_shadow: false,
        auto_crop: true
      },
      expected: {
        has_background_removed: true,
        has_shadow: false,
        shadow_type: undefined
      },
      description: '✅ Background removal without shadow'
    },
    {
      name: 'no-bg-removal-with-shadow',
      options: {
        remove_background: false,
        add_shadow: true,
        auto_crop: true
      },
      expected: {
        has_background_removed: false,
        has_shadow: false,  // Should NOT have shadow
        shadow_type: undefined
      },
      description: '❌ No background removal + shadow request (should NOT add shadow)'
    },
    {
      name: 'no-bg-removal-no-shadow',
      options: {
        remove_background: false,
        add_shadow: false,
        auto_crop: true
      },
      expected: {
        has_background_removed: false,
        has_shadow: false,
        shadow_type: undefined
      },
      description: '✅ No background removal, no shadow'
    }
  ]

  // Simple test image (1x1 red pixel)
  const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  const testImageDataUrl = `data:image/png;base64,${testImageBase64}`

  // Edge Function configuration
  const edgeFunctionUrl = 'https://hqqouszbgskteivjoems.supabase.co/functions/v1/remove-bg'
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcW91c3piZ3NrdGVpdmpvZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5MDM4NDcsImV4cCI6MjA2MjQ3OTg0N30.7lzVZ6PN6vCHeqqKhCpgtFRVrBzXxj53wSSAR6UK0aQ'

  // Test Python service directly (for options without background removal)
  const pythonServiceUrl = 'https://leasingborsen-production.up.railway.app/process-image'

  console.log('Running tests...\n')
  
  for (const test of tests) {
    console.log(`📋 Test: ${test.description}`)
    console.log(`   Options: ${JSON.stringify(test.options)}`)
    
    try {
      let result
      
      if (test.options.remove_background) {
        // Use Edge Function (which always does background removal)
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({
            imageData: testImageDataUrl,
            fileName: `test-${test.name}.png`,
            skipAutoCrop: !test.options.auto_crop
          })
        })
        
        result = await response.json()
      } else {
        // Call Python service directly for non-background-removal tests
        const response = await fetch(pythonServiceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: testImageBase64,
            filename: `test-${test.name}.png`,
            options: test.options
          })
        })
        
        result = await response.json()
      }
      
      if (result.success) {
        const metadata = result.metadata
        console.log(`   Result:`)
        console.log(`     - Background removed: ${metadata.has_background_removed}`)
        console.log(`     - Has shadow: ${metadata.has_shadow}`)
        console.log(`     - Shadow type: ${metadata.shadow_type || 'none'}`)
        
        // Verify expectations
        const passed = 
          metadata.has_background_removed === test.expected.has_background_removed &&
          metadata.has_shadow === test.expected.has_shadow &&
          (metadata.shadow_type || undefined) === test.expected.shadow_type
        
        if (passed) {
          console.log(`   ✅ PASSED - Behavior is correct`)
        } else {
          console.log(`   ❌ FAILED - Unexpected behavior`)
          console.log(`   Expected:`, test.expected)
          console.log(`   Got:`, {
            has_background_removed: metadata.has_background_removed,
            has_shadow: metadata.has_shadow,
            shadow_type: metadata.shadow_type
          })
        }
      } else {
        console.log(`   ❌ Processing failed: ${result.error}`)
      }
    } catch (error) {
      console.log(`   ❌ Test error: ${error.message}`)
    }
    
    console.log()
  }
  
  console.log('🎯 Summary:')
  console.log('- Shadows should ONLY be applied when background removal is enabled')
  console.log('- When background removal is disabled, no shadow should be added')
  console.log('- The API shadow feature is integrated with background removal')
}

// Run the test
testShadowBehavior().catch(console.error)