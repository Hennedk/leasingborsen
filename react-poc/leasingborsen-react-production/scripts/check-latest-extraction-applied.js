#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkLatestExtractionApplied() {
  try {
    console.log('🔍 Checking if Latest Extraction Session was Applied')
    console.log('====================================================')
    
    // Get the latest extraction session
    const { data: sessions, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
    
    if (sessionError) throw sessionError
    
    if (!sessions || sessions.length === 0) {
      console.log('❌ No extraction sessions found')
      return
    }
    
    const latestSession = sessions[0]
    
    console.log('📋 Latest Extraction Session:')
    console.log('  ID:', latestSession.id)
    console.log('  Session Name:', latestSession.session_name)
    console.log('  Status:', latestSession.status)
    console.log('  Created:', latestSession.created_at)
    console.log('  PDF URL:', latestSession.pdf_url)
    console.log('  Seller ID:', latestSession.seller_id)
    console.log()
    
    // Check if session has the expected ID format
    if (latestSession.id.startsWith('77b139e2-21bc-42e3-8b9c-040b7b6ea996')) {
      console.log('✅ Found the session ID you mentioned!')
    } else {
      console.log('ℹ️  Session ID does not match the one you mentioned (77b139e2-21bc-42e3-8b9c-040b7b6ea996)')
      console.log('   This might be a different session or a newer one.')
    }
    
    // Check extraction totals
    console.log('📊 Extraction Totals:')
    console.log('  Total Extracted:', latestSession.total_extracted)
    console.log('  Total Matched:', latestSession.total_matched)
    console.log('  Total New:', latestSession.total_new)
    console.log('  Total Updated:', latestSession.total_updated)
    console.log('  Total Unchanged:', latestSession.total_unchanged)
    console.log('  Total Deleted:', latestSession.total_deleted)
    console.log()
    
    // Check if session was applied
    if (latestSession.applied_at) {
      console.log('✅ Session WAS APPLIED!')
      console.log('  Applied At:', latestSession.applied_at)
    } else {
      console.log('⚠️  Session NOT YET APPLIED')
      console.log('  This means the extraction was successful but changes are pending approval.')
    }
    
    // Check for extraction listing changes
    const { data: listingChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('extraction_session_id', latestSession.id)
      .order('created_at', { ascending: false })
    
    if (changesError) throw changesError
    
    console.log('\n🔄 Extraction Listing Changes:')
    console.log('=============================')
    console.log(`  Found ${listingChanges?.length || 0} listing changes`)
    
    if (listingChanges && listingChanges.length > 0) {
      // Group changes by type
      const changesByType = listingChanges.reduce((acc, change) => {
        acc[change.change_type] = (acc[change.change_type] || 0) + 1
        return acc
      }, {})
      
      console.log('  Change Types:')
      Object.entries(changesByType).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`)
      })
      
      // Show first few changes
      console.log('\n  First 5 Changes:')
      listingChanges.slice(0, 5).forEach((change, i) => {
        console.log(`    ${i + 1}. ${change.change_type}: ${change.make} ${change.model} "${change.variant}"`)
        console.log(`       Status: ${change.status}`)
        if (change.applied_at) {
          console.log(`       Applied: ${change.applied_at}`)
        }
      })
      
      // Check if any changes were applied
      const appliedChanges = listingChanges.filter(change => change.applied_at)
      console.log(`\n  Applied Changes: ${appliedChanges.length}`)
      console.log(`  Pending Changes: ${listingChanges.length - appliedChanges.length}`)
    }
    
    // Check for new listings in the main listings table
    console.log('\n📝 Recent Listings Check:')
    console.log('========================')
    
    const { data: recentListings, error: listingsError } = await supabase
      .from('listings')
      .select('id, make, model, variant, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (listingsError) throw listingsError
    
    console.log(`  Found ${recentListings?.length || 0} recent listings`)
    
    if (recentListings && recentListings.length > 0) {
      console.log('  Most Recent Listings:')
      recentListings.slice(0, 5).forEach((listing, i) => {
        console.log(`    ${i + 1}. ${listing.make} ${listing.model} "${listing.variant}"`)
        console.log(`       Created: ${listing.created_at}`)
        console.log(`       Updated: ${listing.updated_at}`)
      })
    }
    
    // Check if we can find the sophisticated Danish extraction logic
    console.log('\n🤖 AI Extraction Validation:')
    console.log('============================')
    
    // Check AI usage logs for this session
    const { data: aiUsage, error: aiError } = await supabase
      .from('ai_usage_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (aiError) {
      console.log('  ⚠️  Could not fetch AI usage logs:', aiError.message)
    } else if (aiUsage && aiUsage.length > 0) {
      console.log('  ✅ Recent AI Usage Found:')
      aiUsage.forEach((log, i) => {
        console.log(`    ${i + 1}. Model: ${log.model}`)
        console.log(`       Tokens: ${log.tokens_used}`)
        console.log(`       Cost: $${log.cost}`)
        console.log(`       Success: ${log.success}`)
        console.log(`       Created: ${log.created_at}`)
      })
    } else {
      console.log('  ❌ No recent AI usage found')
    }
    
    // Summary and recommendations
    console.log('\n📋 Summary:')
    console.log('==========')
    if (latestSession.status === 'completed') {
      console.log('✅ Latest extraction session completed successfully')
    } else {
      console.log('❌ Latest extraction session not completed')
    }
    
    if (latestSession.applied_at) {
      console.log('✅ Changes from latest session have been applied to listings')
    } else {
      console.log('⚠️  Changes from latest session are pending - need to be applied manually')
      console.log('   You can apply changes via the admin interface or by running the apply script')
    }
    
    if (listingChanges && listingChanges.length > 0) {
      console.log('✅ Extraction successfully identified changes to listings')
    } else {
      console.log('❌ No listing changes found - extraction may not have worked properly')
    }
    
    // Show other recent sessions for comparison
    if (sessions.length > 1) {
      console.log('\n📊 Other Recent Sessions:')
      console.log('=========================')
      sessions.slice(1).forEach((session, i) => {
        console.log(`  ${i + 2}. ${session.session_name}`)
        console.log(`     ID: ${session.id}`)
        console.log(`     Status: ${session.status}`)
        console.log(`     Applied: ${session.applied_at ? 'Yes' : 'No'}`)
        console.log(`     Created: ${session.created_at}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking extraction session:', error.message)
    console.error('Stack:', error.stack)
  }
}

checkLatestExtractionApplied()