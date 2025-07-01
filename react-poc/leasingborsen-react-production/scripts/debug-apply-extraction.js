#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugApplyExtraction() {
  try {
    console.log('🔍 Debugging Why New Listings Aren\'t Created When Applied')
    console.log('========================================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // 1. Check the extraction session status
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (sessionError) throw sessionError
    
    console.log('📋 Extraction Session Status:')
    console.log('  ID:', session.id)
    console.log('  Status:', session.status)
    console.log('  Total Extracted:', session.total_extracted)
    console.log('  Applied At:', session.applied_at || 'Not applied')
    console.log('  Applied By:', session.applied_by || 'Nobody')
    console.log()
    
    // 2. Check all extraction changes
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
    
    if (changesError) throw changesError
    
    console.log('📊 All Extraction Changes:')
    console.log('  Total changes:', changes.length)
    
    // Group by change type and status
    const byType = changes.reduce((acc, change) => {
      const key = `${change.change_type}_${change.change_status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    
    console.log('\n📈 Changes by Type and Status:')
    Object.entries(byType).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`)
    })
    
    // 3. Focus on CREATE changes specifically
    const createChanges = changes.filter(c => c.change_type === 'create')
    console.log(`\n🆕 CREATE Changes (${createChanges.length}):`)
    console.log('==========================================')
    
    createChanges.forEach((change, i) => {
      const extracted = change.extracted_data
      console.log(`${i + 1}. Status: ${change.change_status}`)
      console.log(`   Vehicle: ${extracted?.make} ${extracted?.model} "${extracted?.variant}"`)
      console.log(`   Applied: ${change.applied_at ? 'YES' : 'NO'}`)
      console.log(`   Reviewed: ${change.reviewed_at ? 'YES' : 'NO'}`)
      console.log()
    })
    
    // 4. Check if any listings were actually created in the listings table
    console.log('🔍 Checking Listings Table for New Entries:')
    console.log('===========================================')
    
    // Look for listings created around the same time as the extraction
    const extractionTime = new Date(session.created_at)
    const timeWindow = new Date(extractionTime.getTime() + 30 * 60 * 1000) // 30 minutes after
    
    const { data: recentListings, error: listingsError } = await supabase
      .from('listings')
      .select('*, makes(name), models(name)')
      .gte('created_at', session.created_at)
      .lte('created_at', timeWindow.toISOString())
      .order('created_at', { ascending: false })
    
    if (listingsError) throw listingsError
    
    console.log(`  Found ${recentListings.length} listings created after extraction time`)
    
    if (recentListings.length > 0) {
      console.log('  Recent listings:')
      recentListings.forEach((listing, i) => {
        console.log(`    ${i + 1}. ${listing.makes?.name} ${listing.models?.name} "${listing.variant}"`)
        console.log(`       Created: ${listing.created_at}`)
      })
    }
    
    // 5. Check what happens when extraction is applied
    console.log('\n🎯 Possible Issues:')
    console.log('==================')
    
    if (session.status !== 'completed') {
      console.log('❌ Session is not completed - may need completion first')
    }
    
    if (!session.applied_at) {
      console.log('❌ Session has not been applied yet')
      console.log('   This could mean:')
      console.log('   1. Apply button hasn\'t been clicked')
      console.log('   2. Apply function failed silently')
      console.log('   3. Apply function has bugs')
    }
    
    const pendingCreates = createChanges.filter(c => c.change_status === 'pending')
    if (pendingCreates.length > 0) {
      console.log(`❌ ${pendingCreates.length} CREATE changes are still pending`)
      console.log('   These should be applied when extraction is approved')
    }
    
    const appliedCreates = createChanges.filter(c => c.applied_at)
    if (appliedCreates.length === 0) {
      console.log('❌ No CREATE changes have been applied yet')
      console.log('   Check the apply extraction function for bugs')
    } else {
      console.log(`✅ ${appliedCreates.length} CREATE changes have been applied`)
    }
    
    // 6. Check for missing required data
    console.log('\n🔍 Checking CREATE Changes for Missing Data:')
    console.log('===========================================')
    
    createChanges.forEach((change, i) => {
      const extracted = change.extracted_data
      const missing = []
      
      if (!extracted?.make_id) missing.push('make_id')
      if (!extracted?.model_id) missing.push('model_id')
      if (!extracted?.seller_id) missing.push('seller_id')
      if (!extracted?.variant) missing.push('variant')
      
      if (missing.length > 0) {
        console.log(`❌ Change ${i + 1} missing: ${missing.join(', ')}`)
      } else {
        console.log(`✅ Change ${i + 1} has all required fields`)
      }
    })
    
  } catch (error) {
    console.error('❌ Error debugging apply extraction:', error.message)
  }
}

debugApplyExtraction()