#!/usr/bin/env node

/**
 * Debug Offers Construction
 * 
 * The bug is likely in how the compare-extracted-listings function constructs
 * the offers array from the full_listing_view data vs. lease_pricing table.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugOffersConstruction() {
  console.log('🔍 DEBUGGING OFFERS CONSTRUCTION BUG')
  console.log('='.repeat(80))
  
  // Test with the same listing we analyzed before
  const testListingId = '9bf521d2-1d52-4d86-ae1a-ef9f59276e48'
  
  console.log(`📋 Analyzing listing: ${testListingId}`)
  
  // 1. Get data from full_listing_view (what comparison function sees)
  const { data: fullListingView } = await supabase
    .from('full_listing_view')
    .select('*')
    .eq('id', testListingId)
  
  console.log(`\n🔍 full_listing_view results: ${fullListingView?.length || 0} rows`)
  
  if (fullListingView && fullListingView.length > 0) {
    console.log('First row from full_listing_view:')
    const firstRow = fullListingView[0]
    console.log(`  lease_pricing field: ${JSON.stringify(firstRow.lease_pricing)}`)
    console.log(`  monthly_price field: ${firstRow.monthly_price}`)
    console.log(`  first_payment field: ${firstRow.first_payment}`)
    console.log(`  period_months field: ${firstRow.period_months}`)
    
    // This is the critical code from the Edge Function (lines 460-466):
    console.log('\n🔧 EDGE FUNCTION OFFERS CONSTRUCTION:')
    const offers = firstRow.lease_pricing || (firstRow.monthly_price ? [{
      monthly_price: firstRow.monthly_price,
      first_payment: firstRow.first_payment,
      period_months: firstRow.period_months || 36,
      mileage_per_year: firstRow.mileage_per_year || 15000,
      total_price: (firstRow.period_months || 36) * firstRow.monthly_price + (firstRow.first_payment || 0)
    }] : [])
    
    console.log(`Constructed offers array: ${offers.length} offers`)
    console.log(JSON.stringify(offers, null, 2))
  }
  
  // 2. Get data from lease_pricing table directly (ground truth)
  const { data: leasePricing } = await supabase
    .from('lease_pricing')
    .select('monthly_price, first_payment, period_months, mileage_per_year')
    .eq('listing_id', testListingId)
    .order('monthly_price')
  
  console.log(`\n🔍 Direct lease_pricing query: ${leasePricing?.length || 0} records`)
  if (leasePricing) {
    console.log('Direct lease_pricing data:')
    console.log(JSON.stringify(leasePricing, null, 2))
  }
  
  // 3. The issue analysis
  console.log('\n' + '='.repeat(80))
  console.log('🔍 ISSUE ANALYSIS')
  console.log('='.repeat(80))
  
  if (fullListingView && fullListingView.length > 1) {
    console.log('🔴 POTENTIAL BUG: full_listing_view returned multiple rows')
    console.log(`   Expected: 1 row per listing`)
    console.log(`   Actual: ${fullListingView.length} rows`)
    console.log('   This suggests the VIEW is JOINing with lease_pricing and creating duplicates')
    console.log('   The deduplication in the Edge Function only keeps the FIRST row!')
    
    console.log('\n📊 All rows from full_listing_view:')
    fullListingView.forEach((row, index) => {
      console.log(`Row ${index + 1}:`)
      console.log(`  monthly_price: ${row.monthly_price}`)
      console.log(`  first_payment: ${row.first_payment}`) 
      console.log(`  period_months: ${row.period_months}`)
      console.log(`  lease_pricing: ${JSON.stringify(row.lease_pricing)}`)
    })
    
    console.log('\n💡 HYPOTHESIS:')
    console.log('The full_listing_view is returning one row per lease_pricing record,')
    console.log('but the deduplication logic only keeps the first row, losing the other offers.')
    console.log('This causes the comparison to see only 1 offer instead of 6!')
    
  } else if (fullListingView && fullListingView.length === 1) {
    const row = fullListingView[0]
    if (!row.lease_pricing && row.monthly_price) {
      console.log('🔴 POTENTIAL BUG: lease_pricing field is null/empty')
      console.log('   The view is not properly aggregating the lease_pricing records')
      console.log('   Falling back to individual fields creates only 1 offer')
      console.log('   But the listing actually has multiple pricing options!')
    } else if (row.lease_pricing && Array.isArray(row.lease_pricing)) {
      console.log('✅ lease_pricing field contains array - this looks correct')
      if (row.lease_pricing.length !== (leasePricing?.length || 0)) {
        console.log(`🔴 COUNT MISMATCH: view shows ${row.lease_pricing.length}, direct query shows ${leasePricing?.length || 0}`)
      }
    }
  }
  
  // 4. Test the exact matching logic
  console.log('\n🔍 TESTING MATCHING LOGIC')
  console.log('='.repeat(80))
  
  // Get what Session 2 extracted
  const { data: session2Change } = await supabase
    .from('extraction_listing_changes')
    .select('extracted_data')
    .eq('session_id', '809454fa-f2c8-468f-8354-f5f243591144')
    .eq('existing_listing_id', testListingId)
    .single()
  
  if (session2Change) {
    const extractedOffers = session2Change.extracted_data?.offers || []
    console.log(`\nExtracted offers (Session 2): ${extractedOffers.length}`)
    
    if (fullListingView && fullListingView.length > 0) {
      const row = fullListingView[0]
      const viewOffers = row.lease_pricing || (row.monthly_price ? [row] : [])
      console.log(`View offers (what comparison sees): ${viewOffers.length}`)
      
      if (extractedOffers.length !== viewOffers.length) {
        console.log('🔴 LENGTH MISMATCH FOUND!')
        console.log(`   Extracted: ${extractedOffers.length} offers`)
        console.log(`   View: ${viewOffers.length} offers`)
        console.log('   This will ALWAYS trigger the "offers changed" logic!')
        console.log('   Even if the content is identical, different counts = detected as UPDATE')
      }
    }
  }
}

debugOffersConstruction().catch(console.error)