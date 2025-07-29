#!/usr/bin/env node

/**
 * Test Comparison After Fix
 * 
 * Tests the comparison logic after the full_listing_view fix is applied
 * to verify that identical extractions are now properly detected as "unchanged".
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const SESSION_2 = '809454fa-f2c8-468f-8354-f5f243591144' // Session that should show "unchanged"

async function testComparisonAfterFix() {
  console.log('🧪 TESTING COMPARISON LOGIC AFTER FIX')
  console.log('='.repeat(80))
  
  try {
    // 1. Verify the fix is applied
    console.log('1️⃣ VERIFYING VIEW FIX...')
    
    const testListingId = '9bf521d2-1d52-4d86-ae1a-ef9f59276e48'
    
    const { data: viewTest, error: viewError } = await supabase
      .from('full_listing_view')
      .select('id, lease_pricing')
      .eq('id', testListingId)
    
    if (viewError) {
      console.error(`❌ View fix not applied: ${viewError.message}`)
      console.log('\n🔧 APPLY THE FIX FIRST:')
      console.log('1. Go to Supabase Dashboard → SQL Editor')
      console.log('2. Run the migration from: scripts/apply-full-listing-view-fix.js')
      return
    }
    
    if (!viewTest || viewTest.length !== 1) {
      console.error(`❌ View still returns ${viewTest?.length || 0} rows instead of 1`)
      return
    }
    
    const listing = viewTest[0]
    if (!listing.lease_pricing || !Array.isArray(listing.lease_pricing)) {
      console.error(`❌ lease_pricing field issue: ${typeof listing.lease_pricing}`)
      return
    }
    
    console.log(`✅ View fix applied: 1 row with ${listing.lease_pricing.length} pricing options`)
    
    // 2. Test the comparison logic with the fixed data
    console.log('\n2️⃣ TESTING COMPARISON LOGIC...')
    
    // Get extracted data from Session 2
    const { data: session2Change } = await supabase
      .from('extraction_listing_changes')
      .select('existing_listing_id, extracted_data')
      .eq('session_id', SESSION_2)
      .eq('existing_listing_id', testListingId)
      .single()
    
    if (!session2Change) {
      console.error('❌ Could not find Session 2 change for test listing')
      return
    }
    
    const extractedOffers = session2Change.extracted_data?.offers || []
    const viewOffers = listing.lease_pricing
    
    console.log(`📊 Comparison test:`)
    console.log(`   Extracted offers: ${extractedOffers.length}`)
    console.log(`   View offers: ${viewOffers.length}`)
    
    // 3. Replicate the exact comparison logic
    if (extractedOffers.length !== viewOffers.length) {
      console.log('❌ STILL LENGTH MISMATCH - bug not fully fixed')
      return
    }
    
    console.log('✅ Same number of offers, testing content...')
    
    // Sort both arrays by monthly_price for comparison (same logic as Edge Function)
    const sortedExtracted = [...extractedOffers].sort((a, b) => a.monthly_price - b.monthly_price)
    const sortedView = [...viewOffers].sort((a, b) => a.monthly_price - b.monthly_price)
    
    let allMatch = true
    for (let i = 0; i < sortedExtracted.length; i++) {
      const extracted = sortedExtracted[i]
      const view = sortedView[i]
      
      const match = 
        extracted.monthly_price === view.monthly_price &&
        extracted.first_payment === view.first_payment &&
        extracted.period_months === view.period_months &&
        extracted.mileage_per_year === view.mileage_per_year
      
      console.log(`   Offer ${i + 1}: ${match ? '✅' : '❌'}`)
      
      if (!match) {
        console.log(`     Extracted: ${extracted.monthly_price}kr, ${extracted.first_payment}kr, ${extracted.period_months}mo, ${extracted.mileage_per_year}km`)
        console.log(`     View:      ${view.monthly_price}kr, ${view.first_payment}kr, ${view.period_months}mo, ${view.mileage_per_year}km`)
        allMatch = false
      }
    }
    
    if (allMatch) {
      console.log('\n🎉 SUCCESS: All offers match perfectly!')
      console.log('✅ The comparison function should now detect this as UNCHANGED')
      
      // 4. Test with a larger sample
      console.log('\n3️⃣ TESTING LARGER SAMPLE...')
      
      const { data: allSession2Changes } = await supabase
        .from('extraction_listing_changes')
        .select('existing_listing_id, change_type')
        .eq('session_id', SESSION_2)
        .eq('change_type', 'update')
      
      if (allSession2Changes && allSession2Changes.length > 0) {
        console.log(`📊 Session 2 currently shows: ${allSession2Changes.length} UPDATE changes`)
        console.log('🔮 After re-running extraction with fixed view, these should all be UNCHANGED')
        
        console.log('\n🎯 RECOMMENDED NEXT STEPS:')
        console.log('1. Re-run the same PDF extraction to create a new session')
        console.log('2. Verify that the new session shows 0 updates and all "unchanged"')
        console.log('3. This will confirm the bug is fully resolved')
      }
      
    } else {
      console.log('\n❌ Content still differs - there may be additional issues')
    }
    
  } catch (error) {
    console.error('❌ Error testing comparison:', error)
  }
}

testComparisonAfterFix().catch(console.error)