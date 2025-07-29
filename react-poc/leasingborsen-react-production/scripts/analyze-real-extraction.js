#!/usr/bin/env node

/**
 * Analyze Real Extraction Session
 * 
 * Reviews a real-life extraction session to verify the comparison logic
 * is working correctly with the fixed full_listing_view.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const EXTRACTION_SESSION = '915f9196-d1fa-4a3b-829b-fe9afade2d31'

async function analyzeRealExtraction() {
  console.log('🔍 ANALYZING REAL EXTRACTION SESSION')
  console.log('='.repeat(80))
  console.log(`📋 Session: ${EXTRACTION_SESSION}`)
  
  try {
    // 1. Get session overview
    console.log('\n1️⃣ SESSION OVERVIEW')
    console.log('-'.repeat(40))
    
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', EXTRACTION_SESSION)
      .single()
    
    if (sessionError) {
      console.error('❌ Session not found:', sessionError.message)
      return
    }
    
    console.log(`📊 Status: ${session.status}`)
    console.log(`📅 Created: ${session.created_at}`)
    console.log(`📈 Summary:`)
    console.log(`   Creates: ${session.total_created || 0}`)
    console.log(`   Updates: ${session.total_updated || 0}`)
    console.log(`   Deletes: ${session.total_deleted || 0}`)
    console.log(`   Applied: ${session.applied_at || 'Not applied'}`)
    
    // 2. Get change breakdown
    console.log('\n2️⃣ CHANGE BREAKDOWN')
    console.log('-'.repeat(40))
    
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('change_type, change_status')
      .eq('session_id', EXTRACTION_SESSION)
    
    if (changesError) {
      console.error('❌ Error fetching changes:', changesError.message)
      return
    }
    
    // Group changes by type and status
    const changeStats = changes.reduce((acc, change) => {
      const key = `${change.change_type}_${change.change_status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 Change Statistics:')
    Object.entries(changeStats).forEach(([key, count]) => {
      const [type, status] = key.split('_')
      console.log(`   ${type.toUpperCase()} (${status}): ${count}`)
    })
    
    // 3. Analyze UPDATE changes in detail
    const updateChanges = changes.filter(c => c.change_type === 'update')
    if (updateChanges.length > 0) {
      console.log('\n3️⃣ UPDATE CHANGES ANALYSIS')
      console.log('-'.repeat(40))
      console.log(`📋 Found ${updateChanges.length} UPDATE changes`)
      
      // Get detailed info for first few update changes
      const { data: detailedUpdates, error: detailsError } = await supabase
        .from('extraction_listing_changes')
        .select('id, existing_listing_id, extracted_data, change_status')
        .eq('session_id', EXTRACTION_SESSION)
        .eq('change_type', 'update')
        .limit(3)
      
      if (detailsError) {
        console.error('❌ Error fetching update details:', detailsError.message)
        return
      }
      
      for (let i = 0; i < detailedUpdates.length; i++) {
        const change = detailedUpdates[i]
        console.log(`\n📝 UPDATE ${i + 1}: ${change.existing_listing_id.substring(0, 8)}...`)
        console.log(`   Status: ${change.change_status}`)
        
        // Get current database state for this listing
        const { data: currentView, error: viewError } = await supabase
          .from('full_listing_view')
          .select('id, lease_pricing, make, model, variant')
          .eq('id', change.existing_listing_id)
          .single()
        
        if (viewError) {
          console.log(`   ❌ Error fetching current state: ${viewError.message}`)
          continue
        }
        
        const extractedOffers = change.extracted_data?.offers || []
        const currentOffers = currentView.lease_pricing || []
        
        console.log(`   Vehicle: ${currentView.make} ${currentView.model} ${currentView.variant}`)
        console.log(`   Current offers: ${currentOffers.length}`)
        console.log(`   Extracted offers: ${extractedOffers.length}`)
        
        // This is the critical test with the fixed view
        if (currentOffers.length !== extractedOffers.length) {
          console.log(`   🔴 LENGTH MISMATCH: Different number of offers detected`)
          console.log(`   ✅ UPDATE detection is CORRECT (genuine change)`)
        } else {
          console.log(`   ✅ Same number of offers, checking content...`)
          
          // Compare content
          const sortedCurrent = [...currentOffers].sort((a, b) => a.monthly_price - b.monthly_price)
          const sortedExtracted = [...extractedOffers].sort((a, b) => a.monthly_price - b.monthly_price)
          
          let contentDiffers = false
          let differences = []
          
          for (let j = 0; j < sortedCurrent.length; j++) {
            const current = sortedCurrent[j]
            const extracted = sortedExtracted[j]
            
            if (current.monthly_price !== extracted.monthly_price) {
              contentDiffers = true
              differences.push(`Offer ${j + 1} monthly_price: ${current.monthly_price} → ${extracted.monthly_price}`)
            }
            if (current.first_payment !== extracted.first_payment) {
              contentDiffers = true
              differences.push(`Offer ${j + 1} first_payment: ${current.first_payment} → ${extracted.first_payment}`)
            }
            if (current.period_months !== extracted.period_months) {
              contentDiffers = true
              differences.push(`Offer ${j + 1} period_months: ${current.period_months} → ${extracted.period_months}`)
            }
            if (current.mileage_per_year !== extracted.mileage_per_year) {
              contentDiffers = true
              differences.push(`Offer ${j + 1} mileage_per_year: ${current.mileage_per_year} → ${extracted.mileage_per_year}`)
            }
          }
          
          if (contentDiffers) {
            console.log(`   🔴 CONTENT DIFFERS: Genuine changes detected`)
            console.log(`   ✅ UPDATE detection is CORRECT`)
            differences.slice(0, 3).forEach(diff => console.log(`      - ${diff}`))
            if (differences.length > 3) {
              console.log(`      ... and ${differences.length - 3} more differences`)
            }
          } else {
            console.log(`   🟡 IDENTICAL CONTENT: Should be UNCHANGED`)
            console.log(`   🚨 This suggests the comparison logic may still have issues`)
            console.log(`   🔍 OR the extraction actually found legitimate updates`)
          }
        }
      }
    }
    
    // 4. Final assessment
    console.log('\n4️⃣ EXTRACTION LOGIC ASSESSMENT')
    console.log('-'.repeat(40))
    
    const totalChanges = changes.length
    const updateCount = updateChanges.length
    const createCount = changes.filter(c => c.change_type === 'create').length
    const deleteCount = changes.filter(c => c.change_type === 'delete').length
    const unchangedCount = changes.filter(c => c.change_type === 'unchanged').length
    
    console.log('📊 FINAL BREAKDOWN:')
    console.log(`   Creates: ${createCount} (new vehicles)`)
    console.log(`   Updates: ${updateCount} (changed pricing/specs)`)
    console.log(`   Deletes: ${deleteCount} (removed vehicles)`)
    console.log(`   Unchanged: ${unchangedCount} (identical vehicles)`)
    console.log(`   Total: ${totalChanges}`)
    
    if (updateCount > 0) {
      console.log('\n💡 INTERPRETATION:')
      console.log('   If this is the same PDF as previous sessions:')
      console.log('   - UPDATEs should be 0 (with the fix applied)')
      console.log('   - All should be UNCHANGED')
      console.log('')
      console.log('   If this is a new/different PDF:')
      console.log('   - UPDATEs are expected for changed pricing')
      console.log('   - This indicates the system is working correctly')
    } else {
      console.log('\n🎉 PERFECT: No updates detected!')
      console.log('   This suggests either:')
      console.log('   - Same PDF as before (fix working correctly)')
      console.log('   - No pricing changes in new PDF')
    }
    
    console.log('\n🔧 RECOMMENDATION:')
    if (!session.applied_at) {
      console.log('   Changes have not been applied yet.')
      console.log('   Review the changes above to determine if they are legitimate.')
      console.log('   Apply only if the UPDATEs represent genuine changes.')
    } else {
      console.log('   Changes have already been applied.')
      console.log('   The system behavior above reflects the current logic.')
    }
    
  } catch (error) {
    console.error('❌ Error analyzing extraction:', error)
  }
}

analyzeRealExtraction().catch(console.error)