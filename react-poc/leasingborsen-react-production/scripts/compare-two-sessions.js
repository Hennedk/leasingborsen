#!/usr/bin/env node

/**
 * Compare Two Extraction Sessions
 * 
 * Compares the extracted data from two sessions that allegedly used the same PDF
 * to identify why the comparison function failed to detect them as identical.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const SESSION_1 = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7' // Original session (applied)
const SESSION_2 = '809454fa-f2c8-468f-8354-f5f243591144' // New session (same PDF)

async function compareSessionDetails() {
  console.log('🔍 COMPARING EXTRACTION SESSIONS')
  console.log('='.repeat(80))
  
  // Get details for both sessions
  const { data: sessions } = await supabase
    .from('extraction_sessions')
    .select('*')
    .in('id', [SESSION_1, SESSION_2])
    .order('created_at')
  
  if (!sessions || sessions.length !== 2) {
    console.error('❌ Could not fetch both sessions')
    return
  }
  
  const [session1, session2] = sessions
  
  console.log('📊 SESSION COMPARISON:')
  console.log(`Session 1 (${SESSION_1.substring(0, 8)}...):`)
  console.log(`  Created: ${session1.created_at}`)
  console.log(`  Status: ${session1.status}`)
  console.log(`  Applied: ${session1.applied_at}`)
  console.log(`  Updates: ${session1.total_updated || 0}`)
  
  console.log(`\nSession 2 (${SESSION_2.substring(0, 8)}...):`)
  console.log(`  Created: ${session2.created_at}`)
  console.log(`  Status: ${session2.status}`)
  console.log(`  Applied: ${session2.applied_at || 'Not applied'}`)
  console.log(`  Updates: ${session2.total_updated || 0}`)
  
  // Calculate time difference
  const timeDiff = new Date(session2.created_at) - new Date(session1.applied_at)
  const hoursDiff = timeDiff / (1000 * 60 * 60)
  console.log(`\n⏰ Time gap: ${hoursDiff.toFixed(1)} hours between Session 1 application and Session 2 creation`)
  
  return { session1, session2 }
}

async function compareExtractedData() {
  console.log('\n🔍 COMPARING EXTRACTED DATA')
  console.log('='.repeat(80))
  
  // Get extraction changes for both sessions (focus on updates)
  const { data: changes1 } = await supabase
    .from('extraction_listing_changes')
    .select('id, existing_listing_id, extracted_data, change_type')
    .eq('session_id', SESSION_1)
    .eq('change_type', 'update')
    .order('existing_listing_id')
  
  const { data: changes2 } = await supabase
    .from('extraction_listing_changes')
    .select('id, existing_listing_id, extracted_data, change_type')
    .eq('session_id', SESSION_2)
    .eq('change_type', 'update')
    .order('existing_listing_id')
  
  console.log(`Session 1 Updates: ${changes1?.length || 0}`)
  console.log(`Session 2 Updates: ${changes2?.length || 0}`)
  
  if (!changes1 || !changes2) {
    console.error('❌ Could not fetch changes for both sessions')
    return
  }
  
  // Compare first few changes in detail
  const maxCompare = Math.min(3, changes1.length, changes2.length)
  
  for (let i = 0; i < maxCompare; i++) {
    const change1 = changes1[i]
    const change2 = changes2.find(c => c.existing_listing_id === change1.existing_listing_id)
    
    console.log(`\n--- COMPARING CHANGE ${i + 1} ---`)
    console.log(`Listing ID: ${change1.existing_listing_id}`)
    
    if (!change2) {
      console.log('❌ Corresponding change not found in Session 2')
      continue
    }
    
    console.log(`Session 1 Change ID: ${change1.id}`)
    console.log(`Session 2 Change ID: ${change2.id}`)
    
    // Compare offers arrays
    const offers1 = change1.extracted_data?.offers || []
    const offers2 = change2.extracted_data?.offers || []
    
    console.log(`\nOffers comparison:`)
    console.log(`  Session 1: ${offers1.length} offers`)
    console.log(`  Session 2: ${offers2.length} offers`)
    
    if (offers1.length !== offers2.length) {
      console.log('❌ Different number of offers')
      continue
    }
    
    // Sort both by monthly_price for comparison
    const sorted1 = [...offers1].sort((a, b) => a.monthly_price - b.monthly_price)
    const sorted2 = [...offers2].sort((a, b) => a.monthly_price - b.monthly_price)
    
    let offersMatch = true
    for (let j = 0; j < sorted1.length; j++) {
      const offer1 = sorted1[j]
      const offer2 = sorted2[j]
      
      const matches = 
        offer1.monthly_price === offer2.monthly_price &&
        offer1.first_payment === offer2.first_payment &&
        offer1.period_months === offer2.period_months &&
        offer1.mileage_per_year === offer2.mileage_per_year
      
      if (!matches) {
        console.log(`❌ Offer ${j + 1} differs:`)
        console.log(`    Session 1: ${offer1.monthly_price}kr, ${offer1.first_payment}kr first, ${offer1.period_months}mo, ${offer1.mileage_per_year}km`)
        console.log(`    Session 2: ${offer2.monthly_price}kr, ${offer2.first_payment}kr first, ${offer2.period_months}mo, ${offer2.mileage_per_year}km`)
        offersMatch = false
      }
    }
    
    if (offersMatch) {
      console.log('✅ All offers match perfectly')
      console.log('🔴 BUG CONFIRMED: Identical data detected as UPDATE instead of UNCHANGED')
    }
    
    // Compare other fields
    const fields = ['variant', 'horsepower', 'wltp', 'co2_emission']
    fields.forEach(field => {
      const val1 = change1.extracted_data?.[field]
      const val2 = change2.extracted_data?.[field]
      if (val1 !== val2) {
        console.log(`❌ ${field} differs: "${val1}" vs "${val2}"`)
      }
    })
  }
  
  return { changes1, changes2 }
}

async function identifyComparisonIssue() {
  console.log('\n🔍 IDENTIFYING COMPARISON ISSUE')
  console.log('='.repeat(80))
  
  // The key insight: if Session 1 was applied successfully, then running the 
  // same PDF should result in ALL changes being detected as "unchanged"
  // The fact that Session 2 shows 14 "updates" suggests one of these issues:
  
  console.log('🔍 POSSIBLE ROOT CAUSES:')
  console.log('1. 📅 Timestamp-based comparison issue')
  console.log('2. 🔄 Data format changes between extractions') 
  console.log('3. 📊 Comparison function not using current database state')
  console.log('4. 🏷️  Reference data changes (make/model IDs)')
  console.log('5. 🔢 Precision/rounding differences in numeric fields')
  console.log('6. 📦 Database view caching issues')
  
  // Check if the comparison is using the right baseline
  console.log('\n🔍 CHECKING CURRENT DATABASE STATE:')
  
  // Get a sample listing that was updated in Session 1
  const { data: session1Change } = await supabase
    .from('extraction_listing_changes')
    .select('existing_listing_id, extracted_data')
    .eq('session_id', SESSION_1)
    .eq('change_type', 'update')
    .limit(1)
    .single()
  
  if (session1Change) {
    const listingId = session1Change.existing_listing_id
    console.log(`\nAnalyzing listing: ${listingId}`)
    
    // Get current state from database
    const { data: currentState } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('id', listingId)
      .limit(1)
    
    const { data: currentPricing } = await supabase
      .from('lease_pricing')
      .select('monthly_price, first_payment, period_months, mileage_per_year')
      .eq('listing_id', listingId)
      .order('monthly_price')
    
    console.log(`Current pricing records: ${currentPricing?.length || 0}`)
    
    // Get what Session 2 extracted for this same listing
    const { data: session2Change } = await supabase
      .from('extraction_listing_changes')
      .select('extracted_data')
      .eq('session_id', SESSION_2)
      .eq('existing_listing_id', listingId)
      .single()
    
    if (session2Change) {
      const extractedOffers = session2Change.extracted_data?.offers || []
      console.log(`Session 2 extracted offers: ${extractedOffers.length}`)
      
      // This is the key comparison that should have detected "unchanged"
      if (currentPricing && extractedOffers.length === currentPricing.length) {
        console.log('\n🔍 CRITICAL COMPARISON:')
        console.log('If these match, the comparison function has a bug:')
        
        const sortedCurrent = [...currentPricing].sort((a, b) => a.monthly_price - b.monthly_price)
        const sortedExtracted = [...extractedOffers].sort((a, b) => a.monthly_price - b.monthly_price)
        
        let allMatch = true
        for (let i = 0; i < sortedCurrent.length; i++) {
          const current = sortedCurrent[i]
          const extracted = sortedExtracted[i]
          
          const match = 
            current.monthly_price === extracted.monthly_price &&
            current.first_payment === extracted.first_payment &&
            current.period_months === extracted.period_months &&
            current.mileage_per_year === extracted.mileage_per_year
          
          console.log(`Offer ${i + 1}: ${match ? '✅' : '❌'}`)
          console.log(`  Current:   ${current.monthly_price}kr, ${current.first_payment}kr, ${current.period_months}mo, ${current.mileage_per_year}km`)
          console.log(`  Extracted: ${extracted.monthly_price}kr, ${extracted.first_payment}kr, ${extracted.period_months}mo, ${extracted.mileage_per_year}km`)
          
          if (!match) allMatch = false
        }
        
        if (allMatch) {
          console.log('\n🔴 BUG CONFIRMED: Comparison function failed to detect identical data')
          console.log('💡 The issue is in the compare-extracted-listings Edge Function')
        } else {
          console.log('\n🤔 Data actually differs - not a comparison bug')
        }
      }
    }
  }
}

async function runComparison() {
  try {
    await compareSessionDetails()
    await compareExtractedData()
    await identifyComparisonIssue()
    
    console.log('\n' + '='.repeat(80))
    console.log('📋 INVESTIGATION SUMMARY')
    console.log('='.repeat(80))
    console.log('If identical data was detected as "updates" instead of "unchanged",')
    console.log('this confirms a bug in the comparison logic that needs to be fixed.')
    
    console.log('\n🔧 NEXT STEPS:')
    console.log('1. Fix the comparison function to properly detect identical data')
    console.log('2. Add automated tests to prevent regression')
    console.log('3. Re-run Session 2 to verify it now shows "unchanged"')
    
  } catch (error) {
    console.error('❌ Error in comparison:', error)
  }
}

runComparison().catch(console.error)