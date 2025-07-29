#!/usr/bin/env node

/**
 * Verify that the PostgreSQL function is actually working correctly
 * Our previous tests may have been using wrong data or wrong expectations
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyFunctionWorking() {
  console.log('🔍 Verifying if PostgreSQL function is actually working correctly...\n')

  try {
    const listingId = '153a86c7-97cb-415a-91e7-50ad6e117c69'
    const changeId = '8c885eb4-9cf5-41f8-918b-2103877c97a4'

    // Get the extracted data
    const { data: changeData, error: changeError } = await supabase
      .from('extraction_listing_changes')
      .select('extracted_data, change_status, applied_at, applied_by')
      .eq('id', changeId)
      .single()

    if (changeError) {
      throw new Error(`Error fetching change: ${changeError.message}`)
    }

    console.log('📋 Change record status:')
    console.log(`   Status: ${changeData.change_status}`)
    console.log(`   Applied at: ${changeData.applied_at}`)
    console.log(`   Applied by: ${changeData.applied_by}`)
    console.log()

    // Get current database state
    const { data: currentListing, error: listingError } = await supabase
      .from('full_listing_view')
      .select('id, monthly_price, lease_pricing')
      .eq('id', listingId)
      .single()

    if (listingError) {
      throw new Error(`Error fetching listing: ${listingError.message}`)
    }

    console.log('📋 Current database state:')
    console.log(`   Monthly price: ${currentListing.monthly_price}`)
    console.log(`   Total pricing offers: ${currentListing.lease_pricing?.length}`)
    
    if (currentListing.lease_pricing && currentListing.lease_pricing.length > 0) {
      console.log('   First 3 offers:')
      currentListing.lease_pricing.slice(0, 3).forEach((offer, idx) => {
        console.log(`     ${idx + 1}. ${offer.monthly_price}kr/md, ${offer.mileage_per_year}km/yr, down: ${offer.first_payment}kr`)
      })
    }
    console.log()

    // Compare with extracted data
    const extractedOffers = changeData.extracted_data.offers || []
    console.log('📋 Extracted data:')
    console.log(`   Total extracted offers: ${extractedOffers.length}`)
    if (extractedOffers.length > 0) {
      console.log('   First 3 offers:')
      extractedOffers.slice(0, 3).forEach((offer, idx) => {
        console.log(`     ${idx + 1}. ${offer.monthly_price}kr/md, ${offer.mileage_per_year}km/yr, down: ${offer.first_payment}kr`)
      })
    }
    console.log()

    // Check if data matches
    console.log('🔍 Data matching analysis:')
    
    if (extractedOffers.length > 0 && currentListing.lease_pricing && currentListing.lease_pricing.length > 0) {
      const firstExtracted = extractedOffers[0]
      const firstCurrent = currentListing.lease_pricing.find(p => 
        p.monthly_price == firstExtracted.monthly_price &&
        p.mileage_per_year == firstExtracted.mileage_per_year
      )
      
      if (firstCurrent) {
        console.log('✅ MATCH FOUND! The extracted data IS in the database:')
        console.log(`   Extracted: ${firstExtracted.monthly_price}kr/md, ${firstExtracted.mileage_per_year}km/yr`)
        console.log(`   Database: ${firstCurrent.monthly_price}kr/md, ${firstCurrent.mileage_per_year}km/yr`)
        console.log('   This means the PostgreSQL function IS working correctly!')
        console.log()
        
        // The issue might be with our extraction comparison logic
        console.log('🤔 Potential issue: The comparison logic might be faulty')
        console.log('   The function is working, but our tests expected different data.')
        
        // Let's test with a fresh extraction to confirm this
        console.log()
        console.log('💡 Recommendation: Test with a genuinely new extraction to confirm')
        console.log('   the function works for changes that haven\'t been applied yet.')
        
      } else {
        console.log('❌ NO MATCH: Extracted data is not in database')
        console.log('   This confirms the function has a bug.')
      }
    } else {
      console.log('⚠️  Cannot compare: Missing extracted or current data')
    }

    // Check if we can find the specific pricing that shows in full_listing_view
    console.log()
    console.log('🔍 Investigating monthly_price discrepancy:')
    console.log(`   full_listing_view.monthly_price: ${currentListing.monthly_price}`)
    
    if (currentListing.lease_pricing && currentListing.lease_pricing.length > 0) {
      const lowestPriceOffer = currentListing.lease_pricing.reduce((lowest, current) => 
        current.monthly_price < lowest.monthly_price ? current : lowest
      )
      console.log(`   Lowest lease_pricing offer: ${lowestPriceOffer.monthly_price}`)
      
      if (currentListing.monthly_price === lowestPriceOffer.monthly_price) {
        console.log('✅ monthly_price matches lowest offer (this is correct)')
      } else {
        console.log('❌ monthly_price does NOT match lowest offer')
        console.log('   This suggests full_listing_view aggregation might be wrong')
      }
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    process.exit(1)
  }
}

// Run the verification
verifyFunctionWorking()