#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkExtractedData() {
  try {
    console.log('🔍 Checking Extracted Data Structure')
    console.log('===================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // 1. Get session details to see what seller_id should be
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (sessionError) throw sessionError
    
    console.log('📋 Session Details:')
    console.log('  Session ID:', session.id)
    console.log('  Seller ID:', session.seller_id)
    console.log('  Session Name:', session.session_name)
    console.log()
    
    // 2. Get a sample CREATE change to see extracted_data structure
    const { data: createChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'create')
      .limit(2)
    
    if (changesError) throw changesError
    
    console.log('🔍 Sample CREATE Changes:')
    console.log('========================')
    
    createChanges.forEach((change, i) => {
      console.log(`${i + 1}. Change ID: ${change.id}`)
      console.log(`   Status: ${change.change_status}`)
      console.log(`   Vehicle: ${change.extracted_data?.make} ${change.extracted_data?.model} "${change.extracted_data?.variant}"`)
      console.log(`   Applied: ${change.applied_at ? 'YES' : 'NO'}`)
      console.log()
      console.log('   Extracted Data Keys:', Object.keys(change.extracted_data || {}))
      console.log('   Has seller_id:', 'seller_id' in (change.extracted_data || {}))
      console.log('   Has make_id:', 'make_id' in (change.extracted_data || {}))
      console.log('   Has model_id:', 'model_id' in (change.extracted_data || {}))
      console.log()
      console.log('   Full extracted_data:')
      console.log(JSON.stringify(change.extracted_data, null, 2))
      console.log()
      console.log('   ---')
      console.log()
    })
    
    console.log('🎯 Analysis:')
    console.log('============')
    console.log(`1. Session seller_id: ${session.seller_id}`)
    console.log(`2. CREATE changes should include seller_id: ${session.seller_id}`)
    console.log('3. Missing seller_id prevents CREATE changes from being applied')
    console.log('4. Need to fix the Edge Function to include seller_id in extracted_data')
    
  } catch (error) {
    console.error('❌ Error checking extracted data:', error.message)
  }
}

checkExtractedData()