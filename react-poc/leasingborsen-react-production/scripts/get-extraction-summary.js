#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function getExtractionSummary() {
  try {
    console.log('📊 Getting Extraction Summary for Latest Session')
    console.log('===============================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // Get all extraction changes for this session
    const { data: changes, error } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
    
    if (error) throw error
    
    console.log(`📋 Found ${changes?.length || 0} extraction changes`)
    
    if (!changes || changes.length === 0) {
      console.log('❌ No changes found for this session')
      return
    }
    
    // Calculate summary statistics
    const summary = changes.reduce((acc, change) => {
      const changeType = change.change_type
      acc[changeType] = (acc[changeType] || 0) + 1
      acc.total++
      return acc
    }, { total: 0 })
    
    console.log('\n📊 Summary Statistics:')
    console.log('=====================')
    Object.entries(summary).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
    
    // Show sample changes
    console.log('\n🚗 Sample Changes:')
    console.log('=================')
    changes.slice(0, 5).forEach((change, i) => {
      const extractedData = change.extracted_data
      console.log(`${i + 1}. ${change.change_type}: ${extractedData?.make || 'Unknown'} ${extractedData?.model || ''} "${extractedData?.variant || ''}"`)
      console.log(`   Match method: ${change.match_method || 'unknown'}`)
      console.log(`   Confidence: ${change.confidence_score || 'N/A'}`)
    })
    
    // Create the summary structure that the modal expects
    const modalSummary = {
      totalExtracted: changes.length,
      totalNew: summary.create || 0,
      totalUpdated: summary.update || 0,
      totalDeleted: summary.delete || 0,
      totalMatched: (summary.update || 0) + (summary.unchanged || 0),
      totalExisting: changes.length
    }
    
    console.log('\n✅ Modal-Expected Summary:')
    console.log('=========================')
    console.log('totalExtracted:', modalSummary.totalExtracted)
    console.log('totalNew:', modalSummary.totalNew)
    console.log('totalUpdated:', modalSummary.totalUpdated)  
    console.log('totalDeleted:', modalSummary.totalDeleted)
    console.log()
    
    console.log('🎯 The Issue:')
    console.log('=============')
    console.log('The Edge Function (ai-extract-vehicles) returns immediately with:')
    console.log('  - extractionSessionId')
    console.log('  - itemsProcessed: 27')
    console.log('  - But NO summary data')
    console.log()
    console.log('The summary data only exists after processing completes in the database.')
    console.log('The modal needs to either:')
    console.log('1. Show basic stats initially (27 extracted, details pending)')
    console.log('2. Fetch summary from extraction_listing_changes after completion')
    console.log('3. Update Edge Function to return summary immediately')
    
  } catch (error) {
    console.error('❌ Error getting extraction summary:', error.message)
  }
}

getExtractionSummary()