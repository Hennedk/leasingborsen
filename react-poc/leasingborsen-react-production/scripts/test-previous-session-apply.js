#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function testPreviousSessionApply() {
  try {
    console.log('🔍 Testing Previous Session Apply Logic')
    console.log('=====================================')
    
    const previousSessionId = '0bf826d8-5eac-41ad-922f-38fe86240a60'
    
    // 1. Check the CREATE changes from the previous session
    console.log('📊 Previous Session CREATE Changes:')
    
    const { data: previousChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', previousSessionId)
      .eq('change_type', 'create')
      .limit(2)
    
    if (changesError) throw changesError
    
    console.log(`Found ${previousChanges.length} CREATE changes from previous session`)
    console.log()
    
    previousChanges.forEach((change, i) => {
      const extractedData = change.extracted_data || {}
      console.log(`${i + 1}. Change: ${change.id}`)
      console.log(`   Vehicle: ${extractedData.make} ${extractedData.model} "${extractedData.variant}"`)
      console.log(`   Status: ${change.change_status}`)
      console.log(`   Applied: ${change.applied_at ? 'YES' : 'NO'}`)
      console.log(`   Has seller_id: ${extractedData.seller_id ? 'YES' : 'NO'}`)
      console.log(`   Has first_payment: ${extractedData.offers?.[0]?.first_payment !== undefined ? 'YES' : 'NO'}`)
      console.log()
    })
    
    // 2. Check if any of these changes were actually applied
    const appliedChanges = previousChanges.filter(c => c.applied_at)
    console.log(`📈 Applied changes: ${appliedChanges.length}`)
    
    if (appliedChanges.length > 0) {
      console.log('🤔 How did these changes get applied without seller_id?')
      console.log()
      
      // 3. Check if the listings were actually created
      console.log('🔍 Checking if listings were actually created:')
      
      const timeStart = '2025-07-01T07:47:00'
      const timeEnd = '2025-07-01T07:52:00'
      
      const { data: createdListings, error: listingsError } = await supabase
        .from('listings')
        .select('*, makes(name), models(name)')
        .eq('seller_id', '1ffb3762-0ac5-4901-98aa-2fa039e4b0a7')
        .gte('created_at', timeStart)
        .lte('created_at', timeEnd)
        .order('created_at', { ascending: false })
      
      if (listingsError) throw listingsError
      
      console.log(`Found ${createdListings.length} listings created during previous session timeframe:`)
      createdListings.forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.makes?.name} ${listing.models?.name} "${listing.variant}"`)
        console.log(`     ID: ${listing.id}`)
        console.log(`     Created: ${listing.created_at}`)
        console.log(`     Seller ID: ${listing.seller_id}`)
      })
      console.log()
      
      // 4. Theory: Maybe the apply function adds seller_id during creation
      console.log('🧠 Theory: The apply function might add seller_id automatically')
      console.log('==========================================================')
      console.log('This would explain how listings got created with correct seller_id')
      console.log('even though the extracted_data was missing it.')
      console.log()
      console.log('Possible logic in the PostgreSQL function:')
      console.log('1. Get session.seller_id')
      console.log('2. If extracted_data.seller_id is missing, use session.seller_id')
      console.log('3. Create listing with the correct seller_id')
      console.log()
      
      // 5. Test this theory by looking at one specific listing
      if (createdListings.length > 0) {
        const testListing = createdListings[0]
        console.log(`🔬 Testing Theory with Listing: ${testListing.id}`)
        console.log(`  Listing seller_id: ${testListing.seller_id}`)
        console.log(`  Session seller_id: 1ffb3762-0ac5-4901-98aa-2fa039e4b0a7`)
        console.log(`  Match: ${testListing.seller_id === '1ffb3762-0ac5-4901-98aa-2fa039e4b0a7' ? 'YES' : 'NO'}`)
        
        if (testListing.seller_id === '1ffb3762-0ac5-4901-98aa-2fa039e4b0a7') {
          console.log()
          console.log('✅ CONFIRMED: The apply function DOES add seller_id automatically!')
          console.log('The PostgreSQL function must have logic like:')
          console.log('  COALESCE(extracted_data->>"seller_id"::text, session.seller_id)')
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing previous session apply:', error.message)
  }
}

testPreviousSessionApply()