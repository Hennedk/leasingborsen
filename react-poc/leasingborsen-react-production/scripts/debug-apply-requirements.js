#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugApplyRequirements() {
  try {
    console.log('🔍 Debugging Apply Requirements')
    console.log('==============================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // 1. Check current state of CREATE changes
    const { data: createChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'create')
    
    if (changesError) throw changesError
    
    console.log(`📊 CREATE Changes Status:`)
    console.log(`  Total CREATE changes: ${createChanges.length}`)
    
    // Group by status
    const byStatus = createChanges.reduce((acc, change) => {
      acc[change.change_status] = (acc[change.change_status] || 0) + 1
      return acc
    }, {})
    
    console.log('  Status breakdown:')
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`)
    })
    console.log()
    
    // 2. Check what the apply function expects
    console.log('🔍 Checking Apply Function Behavior:')
    console.log('===================================')
    
    // Look at a successful UPDATE change to see what makes it different
    const { data: updateChanges, error: updateError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'update')
      .eq('change_status', 'applied')
      .limit(1)
    
    if (updateError) throw updateError
    
    if (updateChanges.length > 0) {
      const updateChange = updateChanges[0]
      console.log('✅ Successful UPDATE change:')
      console.log(`  Status: ${updateChange.change_status}`)
      console.log(`  Applied at: ${updateChange.applied_at}`)
      console.log(`  Has seller_id: ${'seller_id' in (updateChange.extracted_data || {})}`)
      console.log(`  Extracted data keys: ${Object.keys(updateChange.extracted_data || {}).join(', ')}`)
      console.log()
    }
    
    // 3. Check a CREATE change in detail
    const createChange = createChanges[0]
    console.log('🔍 Sample CREATE change analysis:')
    console.log('================================')
    console.log(`  Change ID: ${createChange.id}`)
    console.log(`  Status: ${createChange.change_status}`)
    console.log(`  Applied at: ${createChange.applied_at || 'NULL'}`)
    console.log(`  Reviewed at: ${createChange.reviewed_at || 'NULL'}`)
    console.log()
    
    const extractedData = createChange.extracted_data || {}
    console.log('  Required fields check:')
    console.log(`    seller_id: ${extractedData.seller_id || 'MISSING'}`)
    console.log(`    make_id: ${extractedData.make_id || 'MISSING'}`)
    console.log(`    model_id: ${extractedData.model_id || 'MISSING'}`)
    console.log(`    variant: ${extractedData.variant || 'MISSING'}`)
    console.log(`    offers: ${Array.isArray(extractedData.offers) ? `${extractedData.offers.length} offers` : 'MISSING'}`)
    console.log()
    
    // 4. Check if CREATE changes need to be approved first
    console.log('🤔 Hypothesis Testing:')
    console.log('======================')
    console.log('Maybe CREATE changes need to be approved before they can be applied?')
    console.log('Let us try approving one and then applying...')
    console.log()
    
    // Try approving one CREATE change
    const testChange = createChanges[0]
    console.log(`🧪 Test: Approving change ${testChange.id}...`)
    
    const { error: approveError } = await supabase
      .from('extraction_listing_changes')
      .update({
        change_status: 'approved',
        reviewed_at: new Date().toISOString(),
        review_notes: 'Auto-approved for testing'
      })
      .eq('id', testChange.id)
    
    if (approveError) {
      console.error('❌ Error approving change:', approveError.message)
    } else {
      console.log('✅ Change approved')
      
      // Now try applying again
      console.log('🔄 Testing apply function with approved change...')
      
      const { data: applyResult, error: applyError } = await supabase
        .rpc('apply_extraction_session_changes', {
          p_session_id: sessionId,
          p_applied_by: 'admin'
        })
      
      if (applyError) {
        console.error('❌ Apply function error:', applyError.message)
      } else {
        console.log('✅ Apply function result:', applyResult)
        
        if (Array.isArray(applyResult) && applyResult.length > 0) {
          const result = applyResult[0]
          console.log(`   Applied creates: ${result.applied_creates || 0}`)
          console.log(`   Applied updates: ${result.applied_updates || 0}`)
          console.log(`   Applied deletes: ${result.applied_deletes || 0}`)
          
          if (result.applied_creates > 0) {
            console.log('🎉 SUCCESS! CREATE changes need to be approved first!')
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging apply requirements:', error.message)
  }
}

debugApplyRequirements()