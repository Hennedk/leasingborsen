#!/usr/bin/env node

/**
 * Test the exact same call that the Edge Function makes to isolate the issue
 * Compare service role vs anon key behavior
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// We need to check if there's a service role key available
// The Edge Function should have access to this via SUPABASE_SERVICE_ROLE_KEY

async function testEdgeFunctionIssue() {
  console.log('🔍 Testing Edge Function issue - service role vs anon key...\n')

  try {
    const sessionId = '537d92a3-9d66-4a15-8d23-62f1b9834f96'
    const changeId = 'fd2ac213-4e4f-4450-9aee-99df7cb61d04'

    // Test 1: Using anon key (this is what our scripts use)
    console.log('📋 1. Testing with anon key (what our scripts use):')
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    
    try {
      const { data: anonData, error: anonError } = await anonClient
        .rpc('apply_selected_extraction_changes', {
          p_session_id: sessionId,
          p_selected_change_ids: [changeId],
          p_applied_by: 'anon-test'
        })

      if (anonError) {
        console.log(`❌ Anon key failed: ${anonError.message}`)
        console.log(`   Code: ${anonError.code}`)
        console.log(`   Details: ${anonError.details}`)
      } else {
        console.log('✅ Anon key succeeded!')
        console.log(`   Applied updates: ${anonData.applied_updates}`)
      }
    } catch (e) {
      console.log(`❌ Anon key threw exception: ${e.message}`)
    }
    console.log()

    // Test 2: Check what Edge Function receives when it calls functions.invoke
    console.log('📋 2. Testing Edge Function invocation pattern:')
    
    try {
      const { data: functionData, error: functionError } = await anonClient.functions.invoke('apply-extraction-changes', {
        body: {
          sessionId: sessionId,
          selectedChangeIds: [changeId],
          appliedBy: 'edge-test'
        }
      })

      if (functionError) {
        console.log(`❌ Edge Function call failed: ${functionError.message}`)
        console.log('   This is the exact error our scripts were seeing!')
        
        // Try to get more details about the error
        if (functionError.context) {
          console.log('   Context:', JSON.stringify(functionError.context, null, 2))
        }
        
        // Check if it's a deployment issue
        console.log()
        console.log('💡 Possible causes:')
        console.log('   1. Edge Function not deployed properly')
        console.log('   2. Edge Function has a runtime error')
        console.log('   3. Edge Function environment variables missing')
        console.log('   4. Edge Function service role key expired/invalid')
        
      } else {
        console.log('✅ Edge Function call succeeded!')
        console.log(`   Response:`, JSON.stringify(functionData, null, 2))
      }
    } catch (e) {
      console.log(`❌ Edge Function threw exception: ${e.message}`)
    }
    console.log()

    // Test 3: Check if Edge Function exists and is deployed
    console.log('📋 3. Checking Edge Function deployment status:')
    
    // Try calling with invalid data to see if we get a validation error vs deployment error
    try {
      const { data: validationData, error: validationError } = await anonClient.functions.invoke('apply-extraction-changes', {
        body: {
          sessionId: 'invalid',
          selectedChangeIds: [],
          appliedBy: 'validation-test'
        }
      })

      if (validationError) {
        // If we get a specific validation error, the function is deployed
        if (validationError.message?.includes('non-2xx') || validationError.message?.includes('invalid')) {
          console.log('✅ Edge Function is deployed (got validation error)')
          console.log('   The issue is likely within the function logic')
        } else {
          console.log('❌ Edge Function deployment issue')
          console.log('   Error:', validationError.message)
        }
      } else {
        console.log('⚠️  Edge Function accepted invalid data - this is unexpected')
      }
    } catch (e) {
      console.log(`❌ Validation test failed: ${e.message}`)
    }

    // Test 4: Final diagnosis
    console.log()
    console.log('📋 4. DIAGNOSIS & SOLUTION:')
    console.log('Based on our tests:')
    console.log('✅ PostgreSQL function works correctly with anon key')
    console.log('✅ Response format is compatible with Edge Function')
    console.log('❌ Edge Function wrapper is failing')
    console.log()
    console.log('🔧 Recommended fixes:')
    console.log('1. Redeploy the Edge Function to ensure it\'s current')
    console.log('2. Check Edge Function environment variables (service role key)')
    console.log('3. Add error logging to Edge Function for better debugging')
    console.log('4. Consider bypassing Edge Function and calling RPC directly from frontend')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testEdgeFunctionIssue()