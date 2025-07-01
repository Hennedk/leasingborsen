#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function investigateSellerIdInconsistency() {
  try {
    console.log('🔍 Investigating seller_id Inconsistency')
    console.log('=======================================')
    
    const problematicSessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    const sellerId = '1ffb3762-0ac5-4901-98aa-2fa039e4b0a7'
    
    // 1. Check recent extraction sessions for this seller
    console.log('📊 Recent Extraction Sessions for this Seller:')
    console.log('==============================================')
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('seller_id', sellerId)
      .gte('created_at', '2025-07-01T07:00:00')
      .order('created_at', { ascending: false })
    
    if (sessionsError) throw sessionsError
    
    sessions.forEach((session, i) => {
      console.log(`${i + 1}. Session: ${session.id}`)
      console.log(`   Name: ${session.session_name}`)
      console.log(`   Created: ${session.created_at}`)
      console.log(`   Status: ${session.status}`)
      console.log(`   Total Extracted: ${session.total_extracted}`)
      console.log(`   Applied: ${session.applied_at ? 'YES' : 'NO'}`)
      console.log()
    })
    
    // 2. Compare extraction changes between sessions
    console.log('🔍 Comparing Extraction Changes Between Sessions:')
    console.log('===============================================')
    
    if (sessions.length >= 2) {
      const recentSession = sessions[0] // The problematic one
      const previousSession = sessions[1] // The successful one
      
      console.log(`Recent Session (problematic): ${recentSession.id}`)
      console.log(`Previous Session (successful): ${previousSession.id}`)
      console.log()
      
      // Check CREATE changes in both sessions
      for (const [label, sessionId] of [
        ['Previous (successful)', previousSession.id],
        ['Recent (problematic)', recentSession.id]
      ]) {
        console.log(`📋 ${label} Session CREATE Changes:`)
        
        const { data: changes, error: changesError } = await supabase
          .from('extraction_listing_changes')
          .select('*')
          .eq('session_id', sessionId)
          .eq('change_type', 'create')
          .limit(3)
        
        if (changesError) throw changesError
        
        console.log(`  Total CREATE changes: ${changes.length}`)
        
        if (changes.length > 0) {
          const sampleChange = changes[0]
          const extractedData = sampleChange.extracted_data || {}
          
          console.log(`  Sample change:`)
          console.log(`    Vehicle: ${extractedData.make} ${extractedData.model} "${extractedData.variant}"`)
          console.log(`    Has seller_id: ${extractedData.seller_id ? 'YES' : 'NO'}`)
          console.log(`    Has first_payment: ${extractedData.offers?.[0]?.first_payment !== undefined ? 'YES' : 'NO'}`)
          console.log(`    Extracted data keys: ${Object.keys(extractedData).slice(0, 10).join(', ')}...`)
          
          if (extractedData.seller_id) {
            console.log(`    seller_id value: ${extractedData.seller_id}`)
          }
          
          if (extractedData.offers && extractedData.offers[0]) {
            console.log(`    Sample offer: ${JSON.stringify(extractedData.offers[0])}`)
          }
        }
        console.log()
      }
    }
    
    // 3. Check if there's a pattern in how the data was created
    console.log('🤔 Analysis - Potential Causes:')
    console.log('==============================')
    
    if (sessions.length >= 2) {
      const recentSession = sessions[0]
      const previousSession = sessions[1]
      
      console.log('1. Timing difference:')
      console.log(`   Previous: ${previousSession.created_at}`)
      console.log(`   Recent:   ${recentSession.created_at}`)
      
      const timeDiff = new Date(recentSession.created_at) - new Date(previousSession.created_at)
      console.log(`   Gap: ${Math.round(timeDiff / 1000 / 60)} minutes`)
      console.log()
      
      console.log('2. Possible explanations:')
      console.log('   a) Edge Function code was updated between sessions')
      console.log('   b) Different extraction method/path was used')
      console.log('   c) Different request payload structure')
      console.log('   d) Edge Function deployment issue')
      console.log('   e) Database schema change between sessions')
      console.log()
      
      // 4. Check if there were any recent listings created (from the previous session)
      console.log('🔍 Checking Recent Listings Created:')
      console.log('===================================')
      
      const { data: recentListings, error: listingsError } = await supabase
        .from('listings')
        .select('*, makes(name), models(name)')
        .eq('seller_id', sellerId)
        .gte('created_at', '2025-07-01T07:00:00')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (listingsError) throw listingsError
      
      console.log(`Found ${recentListings.length} listings created today for this seller:`)
      recentListings.forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.makes?.name} ${listing.models?.name} "${listing.variant}"`)
        console.log(`     Created: ${listing.created_at}`)
      })
      console.log()
      
      console.log('🎯 Conclusion:')
      console.log('==============')
      console.log('The difference suggests that either:')
      console.log('1. The Edge Function was modified between the two extractions')
      console.log('2. Different extraction parameters were used')
      console.log('3. A bug was introduced that only affects newer extractions')
      console.log('4. The seller_id was accidentally removed from the extraction payload')
    }
    
  } catch (error) {
    console.error('❌ Error investigating seller_id inconsistency:', error.message)
  }
}

investigateSellerIdInconsistency()