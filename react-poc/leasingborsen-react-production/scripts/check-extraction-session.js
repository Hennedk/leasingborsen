#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkExtractionSession() {
  try {
    console.log('🔍 Checking Latest Extraction Session Details')
    console.log('============================================')
    
    // Get the latest extraction session
    const { data: sessions, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (sessionError) throw sessionError
    
    if (!sessions || sessions.length === 0) {
      console.log('❌ No extraction sessions found')
      return
    }
    
    const session = sessions[0]
    console.log('📋 Latest Extraction Session:')
    console.log('  ID:', session.id)
    console.log('  Status:', session.status)
    console.log('  Total Extracted:', session.total_extracted)
    console.log('  Seller ID:', session.seller_id)
    console.log('  Created:', session.created_at)
    console.log()
    
    // Check processing result
    if (session.processing_result) {
      console.log('📊 Processing Result Structure:')
      console.log('  Type:', typeof session.processing_result)
      console.log('  Keys:', Object.keys(session.processing_result))
      console.log()
      
      // Look for summary data
      if (session.processing_result.summary) {
        console.log('✅ Summary Found in Session:')
        console.log('  Summary:', session.processing_result.summary)
      } else {
        console.log('❌ No summary in processing_result')
      }
      
      // Look for comparison data
      if (session.processing_result.comparison) {
        console.log('✅ Comparison Found in Session:')
        console.log('  Comparison:', session.processing_result.comparison)
      }
      
      // Show full processing result
      console.log('\n📄 Full Processing Result:')
      console.log(JSON.stringify(session.processing_result, null, 2))
    } else {
      console.log('❌ No processing_result in session')
    }
    
    // Check if there are any extracted items
    const { data: extractedItems, error: itemsError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('extraction_session_id', session.id)
      .limit(5)
    
    if (itemsError) throw itemsError
    
    console.log('\n🚗 Extracted Items:')
    console.log('=================')
    console.log(`  Found ${extractedItems?.length || 0} extraction listing changes`)
    
    if (extractedItems && extractedItems.length > 0) {
      console.log('  First few items:')
      extractedItems.slice(0, 3).forEach((item, i) => {
        console.log(`    ${i + 1}. ${item.change_type}: ${item.make} ${item.model} "${item.variant}"`)
      })
    }
    
    // Check the breakdown by change type
    if (extractedItems && extractedItems.length > 0) {
      const breakdown = extractedItems.reduce((acc, item) => {
        acc[item.change_type] = (acc[item.change_type] || 0) + 1
        return acc
      }, {})
      
      console.log('\n📊 Change Type Breakdown:')
      Object.entries(breakdown).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking extraction session:', error.message)
  }
}

checkExtractionSession()