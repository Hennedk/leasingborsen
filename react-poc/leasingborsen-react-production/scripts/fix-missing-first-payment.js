#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function fixMissingFirstPayment() {
  try {
    console.log('🔧 Fixing Missing first_payment in CREATE Changes')
    console.log('==============================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // Get all CREATE changes
    const { data: createChanges, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'create')
    
    if (changesError) throw changesError
    
    console.log(`📊 Found ${createChanges.length} CREATE changes to check`)
    console.log()
    
    let fixedCount = 0
    let alreadyOkCount = 0
    
    for (const change of createChanges) {
      const extractedData = change.extracted_data || {}
      const offers = extractedData.offers || []
      
      console.log(`🔍 Change ${change.id}: ${extractedData.make} ${extractedData.model} "${extractedData.variant}"`)
      
      if (!Array.isArray(offers) || offers.length === 0) {
        console.log('  ❌ No offers found')
        continue
      }
      
      let needsUpdate = false
      const updatedOffers = offers.map(offer => {
        console.log(`  📋 Offer: ${JSON.stringify(offer)}`)
        
        if (offer.first_payment === undefined || offer.first_payment === null) {
          console.log('    ❌ Missing first_payment')
          needsUpdate = true
          
          // Set first_payment to monthly_price if missing (common default)
          return {
            ...offer,
            first_payment: offer.monthly_price || 0
          }
        } else {
          console.log('    ✅ Has first_payment')
          return offer
        }
      })
      
      if (needsUpdate) {
        // Update the change with fixed offers
        const updatedExtractedData = {
          ...extractedData,
          offers: updatedOffers
        }
        
        const { error: updateError } = await supabase
          .from('extraction_listing_changes')
          .update({
            extracted_data: updatedExtractedData
          })
          .eq('id', change.id)
        
        if (updateError) {
          console.error(`  ❌ Error updating change: ${updateError.message}`)
        } else {
          console.log('  ✅ Fixed missing first_payment fields')
          fixedCount++
        }
      } else {
        console.log('  ✅ All offers already have first_payment')
        alreadyOkCount++
      }
      
      console.log()
    }
    
    console.log('📈 Summary:')
    console.log(`  Total changes: ${createChanges.length}`)
    console.log(`  Fixed: ${fixedCount}`)
    console.log(`  Already OK: ${alreadyOkCount}`)
    console.log()
    
    if (fixedCount > 0) {
      console.log('🔄 Testing apply function again...')
      
      const { data: applyResult, error: applyError } = await supabase
        .rpc('apply_extraction_session_changes', {
          p_session_id: sessionId,
          p_applied_by: 'admin'
        })
      
      if (applyError) {
        console.error('❌ Apply function error:', applyError.message)
      } else {
        console.log('✅ Apply function result:')
        console.log(JSON.stringify(applyResult, null, 2))
        
        if (Array.isArray(applyResult) && applyResult.length > 0) {
          const result = applyResult[0]
          console.log(`\n📊 Results:`)
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
            console.log('\n🎉 SUCCESS! New listings were created!')
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing missing first_payment:', error.message)
  }
}

fixMissingFirstPayment()