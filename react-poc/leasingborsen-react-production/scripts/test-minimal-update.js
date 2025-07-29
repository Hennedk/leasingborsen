#!/usr/bin/env node

/**
 * Minimal test to isolate the PostgreSQL function bug
 * Tests a single change step by step to identify the exact issue
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

async function testMinimalUpdate() {
  console.log('🧪 Minimal PostgreSQL function test...\n')

  try {
    // Use the first change we analyzed
    const changeId = '8c885eb4-9cf5-41f8-918b-2103877c97a4'
    const listingId = '153a86c7-97cb-415a-91e7-50ad6e117c69'
    const sessionId = '915f9196-d1fa-4a3b-829b-fe9afade2d31'

    console.log('📋 1. Before function call - current state:')
    
    // Check listing pricing before
    const { data: beforeListing, error: beforeError } = await supabase
      .from('full_listing_view')
      .select('monthly_price, lease_pricing')
      .eq('id', listingId)
      .single()

    if (beforeError) {
      throw new Error(`Error fetching before state: ${beforeError.message}`)
    }

    console.log(`   - Monthly price: ${beforeListing.monthly_price}`)
    console.log(`   - First offer: ${beforeListing.lease_pricing[0]?.monthly_price}kr/md`)
    console.log()

    // Check change status before
    const { data: beforeChange, error: beforeChangeError } = await supabase
      .from('extraction_listing_changes')
      .select('change_status, applied_at, applied_by')
      .eq('id', changeId)
      .single()

    if (beforeChangeError) {
      throw new Error(`Error fetching change before: ${beforeChangeError.message}`)
    }

    console.log(`   - Change status: ${beforeChange.change_status}`)
    console.log(`   - Applied at: ${beforeChange.applied_at}`)
    console.log(`   - Applied by: ${beforeChange.applied_by}`)
    console.log()

    console.log('🔧 2. Calling function with single change...')
    
    // Call the function
    const { data: functionResult, error: functionError } = await supabase.functions.invoke('apply-extraction-changes', {
      body: {
        sessionId: sessionId,
        selectedChangeIds: [changeId],
        appliedBy: 'minimal-test'
      }
    })

    if (functionError) {
      throw new Error(`Function call failed: ${functionError.message}`)
    }

    console.log('✅ Function returned success!')
    console.log(`   - Applied updates: ${functionResult.result.applied_updates}`)
    console.log(`   - Error count: ${functionResult.result.error_count}`)
    console.log(`   - Total processed: ${functionResult.result.total_processed}`)
    console.log()

    console.log('📋 3. After function call - checking state:')
    
    // Check listing pricing after
    const { data: afterListing, error: afterError } = await supabase
      .from('full_listing_view')
      .select('monthly_price, lease_pricing')
      .eq('id', listingId)
      .single()

    if (afterError) {
      throw new Error(`Error fetching after state: ${afterError.message}`)
    }

    console.log(`   - Monthly price: ${afterListing.monthly_price}`)
    console.log(`   - First offer: ${afterListing.lease_pricing[0]?.monthly_price}kr/md`)
    
    // Check if it changed
    const priceChanged = beforeListing.monthly_price !== afterListing.monthly_price
    const offerChanged = beforeListing.lease_pricing[0]?.monthly_price !== afterListing.lease_pricing[0]?.monthly_price
    
    console.log(`   - Monthly price changed: ${priceChanged ? '✅' : '❌'}`)
    console.log(`   - First offer changed: ${offerChanged ? '✅' : '❌'}`)
    console.log()

    // Check change status after
    const { data: afterChange, error: afterChangeError } = await supabase
      .from('extraction_listing_changes')
      .select('change_status, applied_at, applied_by')
      .eq('id', changeId)
      .single()

    if (afterChangeError) {
      throw new Error(`Error fetching change after: ${afterChangeError.message}`)
    }

    console.log(`   - Change status: ${afterChange.change_status}`)
    console.log(`   - Applied at: ${afterChange.applied_at}`)
    console.log(`   - Applied by: ${afterChange.applied_by}`)
    console.log()

    // Check session status
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('status')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      throw new Error(`Error fetching session: ${sessionError.message}`)
    }

    console.log(`   - Session status: ${session.status}`)
    console.log()

    // Final analysis
    if (functionResult.result.applied_updates > 0 && !priceChanged && !offerChanged) {
      console.log('❌ BUG CONFIRMED: Function reports success but no database changes occurred!')
      console.log('   This indicates a transaction issue or logic error in the PostgreSQL function.')
    } else if (priceChanged || offerChanged) {
      console.log('✅ Function worked correctly - database was updated!')
    } else {
      console.log('⚠️  Function reported no updates, which may be correct behavior.')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testMinimalUpdate()