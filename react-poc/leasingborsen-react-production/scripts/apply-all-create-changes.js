#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function applyAllCreateChanges() {
  try {
    console.log('🚀 Applying All Remaining CREATE Changes')
    console.log('=======================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // 1. Get all pending CREATE changes
    const { data: pendingChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'create')
      .eq('change_status', 'pending')
    
    if (changesError) throw changesError
    
    console.log(`📊 Found ${pendingChanges.length} pending CREATE changes`)
    console.log()
    
    if (pendingChanges.length === 0) {
      console.log('✅ No pending CREATE changes to apply')
      return
    }
    
    // 2. Approve all pending CREATE changes
    console.log('📝 Approving all pending CREATE changes...')
    
    const changeIds = pendingChanges.map(c => c.id)
    const { error: approveError } = await supabase
      .from('extraction_listing_changes')
      .update({
        change_status: 'approved',
        reviewed_at: new Date().toISOString(),
        review_notes: 'Auto-approved - all issues resolved'
      })
      .in('id', changeIds)
    
    if (approveError) {
      console.error('❌ Error approving changes:', approveError.message)
      return
    }
    
    console.log(`✅ Approved ${changeIds.length} CREATE changes`)
    console.log()
    
    // 3. Apply the changes
    console.log('🔄 Applying changes...')
    
    const { data: applyResult, error: applyError } = await supabase
      .rpc('apply_extraction_session_changes', {
        p_session_id: sessionId,
        p_applied_by: 'admin'
      })
    
    if (applyError) {
      console.error('❌ Apply function error:', applyError.message)
      return
    }
    
    console.log('✅ Apply function result:')
    console.log(JSON.stringify(applyResult, null, 2))
    
    if (Array.isArray(applyResult) && applyResult.length > 0) {
      const result = applyResult[0]
      console.log(`\n📊 Final Results:`)
      console.log(`  Applied creates: ${result.applied_creates || 0}`)
      console.log(`  Applied updates: ${result.applied_updates || 0}`)
      console.log(`  Applied deletes: ${result.applied_deletes || 0}`)
      
      if (result.errors && result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`)
        result.errors.forEach((error, i) => {
          console.log(`    ${i + 1}. ${error.error_message}`)
        })
      } else {
        console.log('  ✅ No errors!')
      }
      
      if (result.applied_creates > 0) {
        console.log(`\n🎉 SUCCESS! ${result.applied_creates} new listings were created!`)
        
        // 4. Check how many new listings were actually created in the database
        console.log('\n🔍 Verifying new listings in database...')
        
        const { data: newListings, error: listingsError } = await supabase
          .from('listings')
          .select('*, makes(name), models(name)')
          .gte('created_at', '2025-07-01T07:00:00')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (listingsError) {
          console.error('❌ Error checking new listings:', listingsError.message)
        } else {
          console.log(`📋 Found ${newListings.length} new listings created today:`)
          newListings.forEach((listing, i) => {
            console.log(`  ${i + 1}. ${listing.makes?.name} ${listing.models?.name} "${listing.variant}"`)
            console.log(`     Created: ${listing.created_at}`)
          })
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error applying CREATE changes:', error.message)
  }
}

applyAllCreateChanges()