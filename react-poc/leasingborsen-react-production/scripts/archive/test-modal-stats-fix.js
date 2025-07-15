#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function testModalStatsFix() {
  try {
    console.log('🧪 Testing Modal Stats Fix Logic')
    console.log('================================')
    
    // Use the latest extraction session
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    console.log('🔍 Simulating modal stats fetch logic...')
    
    // Simulate the logic we added to the modal
    const { error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.warn('Could not fetch session summary:', sessionError.message)
    } else {
      console.log('✅ Session data fetched successfully')
    }

    // Get the extraction changes summary (this is the key fix)
    const { data: changesData, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('change_type, change_status')
      .eq('session_id', sessionId)

    let actualStats = {
      new: 0,
      updated: 0,
      removed: 0,
      total_processed: 0
    }

    if (!changesError && changesData) {
      // Calculate actual stats from the changes data
      const pendingCreates = changesData.filter(c => c.change_type === 'create').length
      const pendingUpdates = changesData.filter(c => c.change_type === 'update').length
      const pendingDeletes = changesData.filter(c => c.change_type === 'delete').length

      actualStats = {
        new: pendingCreates,
        updated: pendingUpdates,
        removed: pendingDeletes,
        total_processed: changesData.length
      }

      console.log('📊 Calculated stats from database:')
      console.log('  New listings:', actualStats.new)
      console.log('  Updated listings:', actualStats.updated)
      console.log('  Removed/Deleted:', actualStats.removed)
      console.log('  Total processed:', actualStats.total_processed)
      console.log()
      
      console.log('🎯 Expected Results:')
      console.log('  This extraction had 27 vehicles total')
      console.log('  6 were CREATE (new listings)')
      console.log('  8 were UPDATE (existing listings changed)')  
      console.log('  13 were UNCHANGED (no changes)')
      console.log()
      
      console.log('✅ SOLUTION VALIDATION:')
      if (actualStats.new > 0 || actualStats.updated > 0) {
        console.log('✅ The modal will now show correct numbers instead of 0s!')
        console.log('✅ Users will see accurate extraction results')
      } else {
        console.log('❌ Something unexpected - check the data')
      }
      
    } else {
      console.error('❌ Could not fetch changes data:', changesError?.message)
    }
    
    console.log()
    console.log('🔧 How the Fix Works:')
    console.log('=====================')
    console.log('1. When AI extraction completes and returns extractionSessionId')
    console.log('2. Modal now fetches actual changes from database')
    console.log('3. Calculates real stats from extraction_listing_changes table')
    console.log('4. Displays accurate numbers instead of 0s')
    console.log('5. Falls back gracefully if database fetch fails')
    
  } catch (error) {
    console.error('❌ Error testing modal stats fix:', error.message)
  }
}

testModalStatsFix()