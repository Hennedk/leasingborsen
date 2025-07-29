#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Test the deletion fix by attempting to apply a deletion change
 */
async function testDeletionFix() {
  console.log('🧪 Testing Phase 1 deletion fix...\n')
  
  try {
    // Find a recent extraction session with deletion changes
    console.log('1. Looking for recent extraction sessions with deletions...')
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('extraction_sessions')
      .select('id, session_name, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (sessionsError) {
      throw sessionsError
    }
    
    console.log(`Found ${sessions.length} recent sessions:`)
    sessions.forEach(session => {
      console.log(`   ${session.id} - ${session.session_name} (${session.status})`)
    })
    
    // Find a session with pending deletion changes
    for (const session of sessions) {
      const { data: changes, error: changesError } = await supabase
        .from('extraction_listing_changes')
        .select('id, change_type, existing_listing_id')
        .eq('session_id', session.id)
        .eq('change_type', 'delete')
        .eq('change_status', 'pending')
        .limit(1)
      
      if (changesError) {
        console.log(`   Error checking changes for ${session.id}: ${changesError.message}`)
        continue
      }
      
      if (changes.length > 0) {
        console.log(`\n2. Found session ${session.id} with ${changes.length} pending deletion(s)`)
        console.log(`   Change ID: ${changes[0].id}`)
        console.log(`   Listing to delete: ${changes[0].existing_listing_id}`)
        
        // Test the apply function
        console.log('\n3. Testing apply_selected_extraction_changes...')
        
        const { data: result, error: applyError } = await supabase.functions.invoke('apply-extraction-changes', {
          body: {
            sessionId: session.id,
            selectedChangeIds: [changes[0].id],
            appliedBy: 'test_script'
          }
        })
        
        if (applyError) {
          console.log(`❌ Apply function failed: ${applyError.message}`)
          return false
        }
        
        console.log('\n4. Apply function result:')
        console.log(`   Creates applied: ${result.applied_creates}`)
        console.log(`   Updates applied: ${result.applied_updates}`)
        console.log(`   Deletes applied: ${result.applied_deletes}`)
        console.log(`   Errors encountered: ${result.error_count}`)
        
        if (result.applied_deletes > 0) {
          console.log('\n✅ SUCCESS: Deletion was applied successfully!')
          console.log('   Phase 1 fix appears to be working.')
          return true
        } else {
          console.log('\n❌ FAILURE: Deletion was not applied.')
          if (result.error_details && result.error_details.length > 0) {
            console.log('   Error details:')
            result.error_details.forEach((error, i) => {
              console.log(`     ${i + 1}. ${error.error}`)
            })
          }
          return false
        }
      }
    }
    
    console.log('\n⚠️  No sessions with pending deletions found.')
    console.log('   Phase 1 fix cannot be tested without pending deletion changes.')
    return null
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

/**
 * Verify the function changes are deployed
 */
async function verifyFunctionUpdate() {
  console.log('🔍 Verifying function deployment...\n')
  
  try {
    // Test that the function exists and basic structure is correct
    const { data, error } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: '00000000-0000-0000-0000-000000000000', // Non-existent ID
        p_selected_change_ids: [],
        p_applied_by: 'test'
      })
    
    // We expect this to return error details about "Could not find session", which means function is deployed
    if (data && data.error_details && data.error_details[0] && data.error_details[0].error.includes('Could not find session')) {
      console.log('✅ Function is deployed and responding correctly')
      return true
    } else {
      console.log('❌ Function response unexpected:', error?.message || JSON.stringify(data, null, 2))
      return false
    }
    
  } catch (error) {
    console.error('❌ Function verification failed:', error.message)
    return false
  }
}

// Run the tests
async function runTests() {
  console.log('🚀 Phase 1 Deletion Fix Test Suite\n')
  
  const functionOk = await verifyFunctionUpdate()
  if (!functionOk) {
    console.log('❌ Function verification failed. Cannot proceed with tests.')
    return
  }
  
  const testResult = await testDeletionFix()
  
  console.log('\n📊 Test Summary:')
  if (testResult === true) {
    console.log('✅ Phase 1 deletion fix is working correctly')
  } else if (testResult === false) {
    console.log('❌ Phase 1 deletion fix has issues that need investigation')
  } else {
    console.log('⚠️  Could not test deletion fix (no pending deletions available)')
  }
}

runTests().catch(console.error)