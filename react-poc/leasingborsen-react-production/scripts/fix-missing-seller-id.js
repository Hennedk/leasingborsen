#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function fixMissingSellerIds() {
  try {
    console.log('🔧 Fixing Missing seller_id in CREATE Changes')
    console.log('==============================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // 1. Get session details to see the seller_id
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (sessionError) throw sessionError
    
    console.log('📋 Session Details:')
    console.log('  Session ID:', session.id)
    console.log('  Seller ID:', session.seller_id)
    console.log()
    
    // 2. Get all CREATE changes that are missing seller_id
    const { data: createChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'create')
      .eq('change_status', 'pending')
    
    if (changesError) throw changesError
    
    console.log(`📊 Found ${createChanges.length} CREATE changes to fix`)
    console.log()
    
    // 3. Update each change to include seller_id
    let fixedCount = 0
    let errorCount = 0
    
    for (const change of createChanges) {
      try {
        const extractedData = change.extracted_data || {}
        
        // Check if seller_id is already present
        if (extractedData.seller_id) {
          console.log(`✅ Change ${change.id} already has seller_id`)
          continue
        }
        
        // Add seller_id to extracted_data
        const updatedExtractedData = {
          ...extractedData,
          seller_id: session.seller_id
        }
        
        // Update the change
        const { error: updateError } = await supabase
          .from('extraction_listing_changes')
          .update({
            extracted_data: updatedExtractedData
          })
          .eq('id', change.id)
        
        if (updateError) throw updateError
        
        console.log(`✅ Fixed change ${change.id}: ${extractedData.make} ${extractedData.model} "${extractedData.variant}"`)
        fixedCount++
        
      } catch (error) {
        console.error(`❌ Error fixing change ${change.id}:`, error.message)
        errorCount++
      }
    }
    
    console.log()
    console.log('📈 Summary:')
    console.log(`  Total changes: ${createChanges.length}`)
    console.log(`  Fixed: ${fixedCount}`)
    console.log(`  Errors: ${errorCount}`)
    console.log()
    
    if (fixedCount > 0) {
      console.log('🎯 Next Steps:')
      console.log('1. CREATE changes now have seller_id and can be applied')
      console.log('2. Run the apply extraction function again')
      console.log('3. New listings should be created successfully')
      console.log()
      console.log('🔄 Testing the apply function again...')
      
      // 4. Test applying the changes again
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
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing missing seller IDs:', error.message)
  }
}

fixMissingSellerIds()