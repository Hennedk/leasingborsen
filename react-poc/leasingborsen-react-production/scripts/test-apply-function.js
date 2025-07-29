#!/usr/bin/env node

/**
 * Test script to verify the apply_selected_extraction_changes PostgreSQL function
 * This tests whether the function actually updates the database or just returns success
 * 
 * Using regular anon key since we just need to call the apply-extraction-changes Edge Function
 * which has service role permissions internally
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

// Initialize Supabase client with anon key (Edge Functions have service role permissions)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testApplyFunction() {
  console.log('🔍 Testing apply_selected_extraction_changes PostgreSQL function...\n')

  try {
    // Get a specific change from session 915f9196 that was marked as applied
    console.log('📋 1. Getting applied changes from session 915f9196...')
    const { data: appliedChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select(`
        id,
        change_type,
        existing_listing_id,
        change_status,
        extracted_data,
        applied_at
      `)
      .eq('session_id', '915f9196-d1fa-4a3b-829b-fe9afade2d31')
      .eq('change_status', 'applied')
      .eq('change_type', 'update')
      .limit(1)

    if (changesError) {
      throw new Error(`Error fetching changes: ${changesError.message}`)
    }

    if (!appliedChanges || appliedChanges.length === 0) {
      console.log('❌ No applied UPDATE changes found in session 915f9196')
      return
    }

    const testChange = appliedChanges[0]
    console.log(`✅ Found applied change: ${testChange.id}`)
    console.log(`   - Type: ${testChange.change_type}`)
    console.log(`   - Listing ID: ${testChange.existing_listing_id}`)
    console.log(`   - Applied at: ${testChange.applied_at}`)
    console.log(`   - New price: ${testChange.extracted_data?.monthly_price}`)
    console.log()

    // Check current database state for this listing
    console.log('📋 2. Checking current database state...')
    const { data: currentListing, error: listingError } = await supabase
      .from('full_listing_view')
      .select('id, monthly_price, retail_price, lease_pricing')
      .eq('id', testChange.existing_listing_id)
      .single()

    if (listingError) {
      throw new Error(`Error fetching current listing: ${listingError.message}`)
    }

    console.log(`✅ Current listing state:`)
    console.log(`   - Monthly price: ${currentListing.monthly_price}`)
    console.log(`   - Retail price: ${currentListing.retail_price}`)
    console.log(`   - Lease pricing count: ${currentListing.lease_pricing ? currentListing.lease_pricing.length : 0}`)
    
    if (currentListing.lease_pricing && currentListing.lease_pricing.length > 0) {
      console.log(`   - First offer: ${currentListing.lease_pricing[0].monthly_price}kr/md, down payment: ${currentListing.lease_pricing[0].down_payment}kr`)
    }
    console.log()

    // Compare with extracted data
    const extractedMonthlyPrice = testChange.extracted_data?.monthly_price
    const extractedRetailPrice = testChange.extracted_data?.retail_price
    
    console.log('🔍 3. Comparing current state vs extracted data...')
    console.log(`   - Extracted monthly price: ${extractedMonthlyPrice}`)
    console.log(`   - Current monthly price: ${currentListing.monthly_price}`)
    console.log(`   - Extracted retail price: ${extractedRetailPrice}`)
    console.log(`   - Current retail price: ${currentListing.retail_price}`)
    
    const priceMatches = currentListing.monthly_price == extractedMonthlyPrice
    const retailMatches = currentListing.retail_price == extractedRetailPrice
    
    console.log(`   - Monthly price matches: ${priceMatches ? '✅' : '❌'}`)
    console.log(`   - Retail price matches: ${retailMatches ? '✅' : '❌'}`)
    console.log()

    if (!priceMatches || !retailMatches) {
      console.log('❌ DATABASE STATE DOES NOT MATCH EXTRACTED DATA!')
      console.log('   This confirms that the applied changes were NOT actually applied to the database.')
      console.log()
      
      // Test calling the Edge Function directly with this change
      console.log('🧪 4. Testing direct Edge Function call with this change...')
      console.log(`   Calling apply-extraction-changes Edge Function with change ID: ${testChange.id}`)
      
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('apply-extraction-changes', {
        body: {
          sessionId: '915f9196-d1fa-4a3b-829b-fe9afade2d31',
          selectedChangeIds: [testChange.id],
          appliedBy: 'test-script'
        }
      })

      if (functionError) {
        console.log(`❌ Function call failed: ${functionError.message}`)
        console.log(`   Code: ${functionError.code}`)
        return
      }

      console.log('✅ Function call succeeded!')
      console.log('📊 Function result:', JSON.stringify(functionResult, null, 2))
      
      // Check if the database was actually updated now
      console.log()
      console.log('🔍 5. Checking database state after function call...')
      const { data: updatedListing, error: updatedError } = await supabase
        .from('full_listing_view')
        .select('id, monthly_price, retail_price, lease_pricing')
        .eq('id', testChange.existing_listing_id)
        .single()

      if (updatedError) {
        throw new Error(`Error fetching updated listing: ${updatedError.message}`)
      }

      console.log(`   - NEW Monthly price: ${updatedListing.monthly_price}`)
      console.log(`   - NEW Retail price: ${updatedListing.retail_price}`)
      
      const newPriceMatches = updatedListing.monthly_price == extractedMonthlyPrice
      const newRetailMatches = updatedListing.retail_price == extractedRetailPrice
      
      console.log(`   - Monthly price now matches: ${newPriceMatches ? '✅' : '❌'}`)
      console.log(`   - Retail price now matches: ${newRetailMatches ? '✅' : '❌'}`)
      
      if (newPriceMatches && newRetailMatches) {
        console.log()
        console.log('🎉 SUCCESS! The function call actually updated the database this time!')
        console.log('   This suggests the previous "applied" status was incorrect - the changes weren\'t actually applied before.')
      } else {
        console.log()
        console.log('❌ STILL NO MATCH! The function call did not update the database.')
        console.log('   This indicates a bug in the PostgreSQL function itself.')
      }
    } else {
      console.log('✅ Database state matches extracted data - changes were properly applied!')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testApplyFunction()