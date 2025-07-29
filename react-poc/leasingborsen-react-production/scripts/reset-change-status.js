#!/usr/bin/env node

/**
 * Reset a change status from 'applied' to 'pending' so we can test the function
 * This allows us to test with a known change that should work
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function resetChangeStatus() {
  console.log('🔄 Resetting change status for testing...\n')

  try {
    // Use the change we've been analyzing
    const changeId = '8c885eb4-9cf5-41f8-918b-2103877c97a4'
    const sessionId = '915f9196-d1fa-4a3b-829b-fe9afade2d31'

    console.log('📋 1. Current change status:')
    const { data: beforeChange, error: beforeError } = await supabase
      .from('extraction_listing_changes')
      .select('change_status, applied_at, applied_by')
      .eq('id', changeId)
      .single()

    if (beforeError) {
      throw new Error(`Error fetching change: ${beforeError.message}`)
    }

    console.log(`   - Status: ${beforeChange.change_status}`)
    console.log(`   - Applied at: ${beforeChange.applied_at}`)
    console.log(`   - Applied by: ${beforeChange.applied_by}`)
    console.log()

    // Reset status to pending for testing
    console.log('🔄 2. Resetting status to pending...')
    const { data: updateResult, error: updateError } = await supabase
      .from('extraction_listing_changes')
      .update({
        change_status: 'pending',
        applied_at: null,
        applied_by: null
      })
      .eq('id', changeId)
      .select()

    if (updateError) {
      throw new Error(`Error updating change: ${updateError.message}`)
    }

    console.log('✅ Change status reset to pending')
    console.log()

    // Skip session status update for now - focus on the change
    console.log('⏭️  3. Skipping session status reset')
    console.log()

    // Now test the function with this reset change
    console.log('🧪 4. Testing function with reset change...')
    const { data: functionResult, error: functionError } = await supabase.functions.invoke('apply-extraction-changes', {
      body: {
        sessionId: sessionId,
        selectedChangeIds: [changeId],
        appliedBy: 'reset-test'
      }
    })

    if (functionError) {
      console.log(`❌ Function call failed: ${functionError.message}`)
      console.log('   This confirms the Edge Function has an issue')
      
      // Try calling the PostgreSQL function directly
      console.log()
      console.log('🧪 5. Trying direct PostgreSQL function call...')
      
      // Note: This won't work with anon key, but let's try
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('apply_selected_extraction_changes', {
          p_session_id: sessionId,
          p_selected_change_ids: [changeId],
          p_applied_by: 'direct-test'
        })

      if (rpcError) {
        console.log(`❌ Direct RPC also failed: ${rpcError.message}`)
        console.log('   This suggests a permissions issue or function doesn\'t exist')
      } else {
        console.log('✅ Direct RPC succeeded!')
        console.log('   Result:', JSON.stringify(rpcResult, null, 2))
      }
    } else {
      console.log('✅ Function call succeeded!')
      console.log('   Result:', JSON.stringify(functionResult.result, null, 2))
      
      // Check if the database was actually updated
      console.log()
      console.log('🔍 6. Checking if database was actually updated...')
      
      const { data: afterListing, error: listingError } = await supabase
        .from('full_listing_view')
        .select('monthly_price, lease_pricing')
        .eq('id', '153a86c7-97cb-415a-91e7-50ad6e117c69')
        .single()

      if (listingError) {
        throw new Error(`Error fetching updated listing: ${listingError.message}`)
      }

      console.log(`   - Monthly price: ${afterListing.monthly_price}`)
      console.log(`   - First offer: ${afterListing.lease_pricing[0]?.monthly_price}kr/md`)
      
      // Expected extracted first offer was 4395kr/md
      const expectedPrice = 4395
      const actualPrice = afterListing.lease_pricing[0]?.monthly_price
      
      if (actualPrice === expectedPrice) {
        console.log('🎉 SUCCESS! Database was actually updated with extracted data!')
      } else {
        console.log(`❌ Database not updated. Expected ${expectedPrice}kr/md, got ${actualPrice}kr/md`)
      }
    }

  } catch (error) {
    console.error('❌ Reset test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
resetChangeStatus()