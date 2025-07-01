#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkApplyFunction() {
  try {
    console.log('🔍 Testing apply_extraction_session_changes Function')
    console.log('==================================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // First, let's try to call the function to see what happens
    console.log('📞 Calling apply_extraction_session_changes...')
    
    try {
      const { data, error } = await supabase
        .rpc('apply_extraction_session_changes', {
          p_session_id: sessionId,
          p_applied_by: 'admin'
        })
      
      if (error) {
        console.log('❌ Function Error:', error.message)
        console.log('Error details:', error)
      } else {
        console.log('✅ Function Success!')
        console.log('Response:', data)
      }
    } catch (err) {
      console.log('❌ Function Call Failed:', err.message)
    }
    
    // Check the changes again to see if anything was applied
    console.log('\n📊 Checking Changes After Function Call:')
    console.log('=======================================')
    
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'create')
    
    if (changesError) throw changesError
    
    console.log(`Found ${changes.length} CREATE changes:`)
    
    changes.forEach((change, i) => {
      const extracted = change.extracted_data
      console.log(`${i + 1}. ${extracted?.make} ${extracted?.model} "${extracted?.variant}"`)
      console.log(`   Status: ${change.change_status}`)
      console.log(`   Applied: ${change.applied_at ? 'YES' : 'NO'}`)
      console.log(`   Seller ID in data: ${extracted?.seller_id || 'MISSING'}`)
      console.log()
    })
    
    // Check if any new listings were created
    const { data: newListings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .gte('created_at', '2025-07-01T07:57:00')
      .order('created_at', { ascending: false })
    
    if (listingsError) throw listingsError
    
    console.log(`\n📋 New Listings Created Today: ${newListings.length}`)
    if (newListings.length > 0) {
      newListings.forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.variant} (Created: ${listing.created_at})`)
      })
    }
    
    console.log('\n🎯 Diagnosis:')
    console.log('=============')
    console.log('1. The apply function was called and seemed to succeed')
    console.log('2. But CREATE changes are still pending and not applied')
    console.log('3. Missing seller_id in extracted_data is likely the issue')
    console.log('4. The apply function should either:')
    console.log('   a) Add the seller_id from the session before creating')
    console.log('   b) Return an error explaining what\'s missing')
    console.log('   c) Skip changes with missing required data')
    
  } catch (error) {
    console.error('❌ Error checking apply function:', error.message)
  }
}

checkApplyFunction()