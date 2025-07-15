#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function checkApplyErrors() {
  try {
    console.log('🔍 Checking Apply Function Errors')
    console.log('=================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    console.log('🔄 Calling apply function to see detailed errors...')
    
    const { data: applyResult, error: applyError } = await supabase
      .rpc('apply_extraction_session_changes', {
        p_session_id: sessionId,
        p_applied_by: 'admin'
      })
    
    if (applyError) {
      console.error('❌ Apply function error:', applyError)
      return
    }
    
    console.log('📊 Apply function response:')
    console.log(JSON.stringify(applyResult, null, 2))
    
    if (Array.isArray(applyResult) && applyResult.length > 0) {
      const result = applyResult[0]
      
      console.log(`\n📈 Summary:`)
      console.log(`  Applied creates: ${result.applied_creates || 0}`)
      console.log(`  Applied updates: ${result.applied_updates || 0}`)
      console.log(`  Applied deletes: ${result.applied_deletes || 0}`)
      
      if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
        console.log(`\n❌ Errors (${result.errors.length}):`)
        result.errors.forEach((error, i) => {
          console.log(`${i + 1}. ${JSON.stringify(error, null, 2)}`)
        })
      } else {
        console.log('\n✅ No errors reported')
      }
    }
    
    // Also check the current state of changes
    console.log('\n📊 Current Change Status:')
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('id, change_type, change_status, applied_at, extracted_data')
      .eq('session_id', sessionId)
      .order('change_type')
    
    if (changesError) throw changesError
    
    const statusCounts = changes.reduce((acc, change) => {
      const key = `${change.change_type}_${change.change_status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    
    console.log('Status breakdown:')
    Object.entries(statusCounts).forEach(([key, count]) => {
      console.log(`  ${key}: ${count}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking apply errors:', error.message)
  }
}

checkApplyErrors()