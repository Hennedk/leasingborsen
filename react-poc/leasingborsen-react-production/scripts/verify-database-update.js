#!/usr/bin/env node

/**
 * Verify if the direct PostgreSQL function call actually updated the database
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyDatabaseUpdate() {
  console.log('🔍 Verifying if database was actually updated...\n')

  try {
    const listingId = '153a86c7-97cb-415a-91e7-50ad6e117c69'
    
    // Check current database state
    console.log('📋 Current database state:')
    const { data: currentListing, error: listingError } = await supabase
      .from('full_listing_view')  
      .select('monthly_price, lease_pricing')
      .eq('id', listingId)
      .single()

    if (listingError) {
      throw new Error(`Error fetching listing: ${listingError.message}`)
    }

    console.log(`   - Monthly price: ${currentListing.monthly_price}`)
    console.log(`   - First offer: ${currentListing.lease_pricing[0]?.monthly_price}kr/md`)
    console.log(`   - Total offers: ${currentListing.lease_pricing?.length}`)
    console.log()

    // Expected data from our previous analysis:
    // The extracted first offer should be 4395kr/md
    const expectedFirstOffer = 4395
    const actualFirstOffer = currentListing.lease_pricing[0]?.monthly_price

    console.log('🔍 Comparison with expected extracted data:')
    console.log(`   - Expected first offer: ${expectedFirstOffer}kr/md`)
    console.log(`   - Actual first offer: ${actualFirstOffer}kr/md`)
    console.log(`   - Match: ${actualFirstOffer === expectedFirstOffer ? '✅' : '❌'}`)
    console.log()

    if (actualFirstOffer === expectedFirstOffer) {
      console.log('🎉 SUCCESS! The PostgreSQL function DID update the database!')
      console.log('   This means the bug is only in the Edge Function wrapper.')
      console.log('   The core database update logic works correctly.')
      
      // Update the change status to confirm
      const changeId = '8c885eb4-9cf5-41f8-918b-2103877c97a4'
      const { data: changeStatus, error: changeError } = await supabase
        .from('extraction_listing_changes')
        .select('change_status, applied_at, applied_by')
        .eq('id', changeId)
        .single()

      if (changeError) {
        console.log(`   Warning: Could not check change status: ${changeError.message}`)
      } else {
        console.log()
        console.log('📋 Change record updated:')
        console.log(`   - Status: ${changeStatus.change_status}`)
        console.log(`   - Applied at: ${changeStatus.applied_at}`)
        console.log(`   - Applied by: ${changeStatus.applied_by}`)
      }
      
    } else {
      console.log('❌ The PostgreSQL function also has a bug!')
      console.log('   It reported success but did not actually update the database.')
      console.log('   This suggests a transaction rollback or logic error in the function.')
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

// Run the verification
verifyDatabaseUpdate()