#!/usr/bin/env node

/**
 * Test what the PostgreSQL function actually returns vs what Edge Function expects
 * This will identify response format mismatches
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPostgreSQLResponseFormat() {
  console.log('🔍 Testing PostgreSQL function response format...\n')

  try {
    // Use a known working change
    const sessionId = '537d92a3-9d66-4a15-8d23-62f1b9834f96'
    const changeId = 'fd2ac213-4e4f-4450-9aee-99df7cb61d04'

    console.log('📋 1. Direct PostgreSQL RPC call:')
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [changeId],
        p_applied_by: 'format-test'
      })

    if (rpcError) {
      console.log(`❌ RPC Error: ${rpcError.message}`)
      console.log('   This explains why Edge Function fails!')
      
      // Let's check what the actual error is
      console.log('\n🔍 Error details:')
      console.log(`   Code: ${rpcError.code}`)
      console.log(`   Details: ${rpcError.details}`)
      console.log(`   Hint: ${rpcError.hint}`)
      console.log(`   Message: ${rpcError.message}`)
      
      return
    }

    console.log('✅ RPC call succeeded!')
    console.log('\n📊 Raw response data:')
    console.log(JSON.stringify(rpcData, null, 2))
    
    console.log('\n🔍 Response analysis:')
    console.log(`   Type: ${typeof rpcData}`)
    console.log(`   Is Array: ${Array.isArray(rpcData)}`)
    
    if (Array.isArray(rpcData)) {
      console.log(`   Array length: ${rpcData.length}`)
      if (rpcData.length > 0) {
        console.log('   First element:', JSON.stringify(rpcData[0], null, 2))
      }
    } else if (typeof rpcData === 'object' && rpcData !== null) {
      console.log('   Object keys:', Object.keys(rpcData))
    }

    // Check what fields the Edge Function expects
    console.log('\n📋 2. Edge Function expected fields:')
    const expectedFields = [
      'applied_creates',
      'applied_updates', 
      'applied_deletes',
      'discarded_count',
      'total_processed',
      'error_count',
      'errors',
      'session_id',
      'applied_by',
      'applied_at'
    ]

    let actualData = rpcData
    if (Array.isArray(rpcData) && rpcData.length > 0) {
      actualData = rpcData[0]
    }

    if (actualData && typeof actualData === 'object') {
      console.log('✅ Field presence check:')
      expectedFields.forEach(field => {
        const hasField = actualData.hasOwnProperty(field)
        const value = actualData[field]
        console.log(`   ${hasField ? '✅' : '❌'} ${field}: ${hasField ? value : 'MISSING'}`)
      })
      
      // Check for unexpected fields
      const actualFields = Object.keys(actualData)
      const unexpectedFields = actualFields.filter(field => !expectedFields.includes(field))
      if (unexpectedFields.length > 0) {
        console.log('\n⚠️  Unexpected fields in response:')
        unexpectedFields.forEach(field => {
          console.log(`   + ${field}: ${actualData[field]}`)
        })
      }
    } else {
      console.log('❌ Response is not an object - cannot check fields')
    }

    // Test the Edge Function parsing logic
    console.log('\n📋 3. Edge Function parsing simulation:')
    let result
    if (Array.isArray(rpcData) && rpcData.length > 0) {
      result = rpcData[0]
      console.log('✅ Would use rpcData[0] (array with data)')
    } else if (rpcData && typeof rpcData === 'object') {
      result = rpcData
      console.log('✅ Would use rpcData directly (object)')
    } else {
      console.log('❌ Would fail - unexpected response format')
      console.log('   This would cause "Unexpected response format" error in Edge Function')
      return
    }

    // Simulate the Edge Function response construction
    console.log('\n📋 4. Simulated Edge Function response:')
    try {
      const edgeFunctionResponse = {
        success: true,
        result: {
          applied_creates: result.applied_creates,
          applied_updates: result.applied_updates,
          applied_deletes: result.applied_deletes,
          discarded_count: result.discarded_count,
          total_processed: result.total_processed,
          error_count: result.error_count,
          errors: result.errors || [],
          session_id: result.session_id,
          applied_by: result.applied_by,
          applied_at: result.applied_at
        }
      }
      
      console.log('✅ Edge Function response would be:')
      console.log(JSON.stringify(edgeFunctionResponse, null, 2))
      
    } catch (e) {
      console.log(`❌ Edge Function response construction would fail: ${e.message}`)
      console.log('   This explains the "non-2xx status code" error!')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    
    // If it's a permission issue, that might be the root cause
    if (error.message.includes('permission') || error.message.includes('authentication')) {
      console.log('\n💡 POTENTIAL ROOT CAUSE: Permission/Authentication Issue')
      console.log('   The Edge Function might be failing due to service role key issues')
      console.log('   or RLS policies preventing the function from being called')
    }
  }
}

// Run the test
testPostgreSQLResponseFormat()