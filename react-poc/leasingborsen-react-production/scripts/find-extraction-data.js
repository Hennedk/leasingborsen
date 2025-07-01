#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function findExtractionData() {
  try {
    console.log('🔍 Finding Where Extraction Data is Stored')
    console.log('==========================================')
    
    const sessionId = '2f1f6547-d837-4996-af54-e46b627d7dbd'
    
    // Try different possible table names for extraction changes
    const possibleTables = [
      'extraction_listing_changes',
      'listing_changes',
      'extraction_changes',
      'extraction_items',
      'extracted_listings'
    ]
    
    for (const tableName of possibleTables) {
      try {
        console.log(`\n🔍 Checking table: ${tableName}`)
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`  ❌ Error: ${error.message}`)
        } else {
          console.log(`  ✅ Table exists! Found ${data?.length || 0} records`)
          if (data && data.length > 0) {
            console.log(`  📋 Sample record keys:`, Object.keys(data[0]))
          }
        }
      } catch (e) {
        console.log(`  ❌ Failed to query ${tableName}`)
      }
    }
    
    // Check if there are any records linked to this session ID in any table
    console.log('\n🔗 Searching for Session ID in Various Tables:')
    console.log('===============================================')
    
    // Try to find tables that might reference the session
    const searchTables = [
      'listings',
      'processing_jobs',
      'extraction_sessions'
    ]
    
    for (const tableName of searchTables) {
      try {
        // Try different possible column names for session reference
        const possibleColumns = [
          'extraction_session_id',
          'session_id',
          'batch_id',
          'job_id'
        ]
        
        for (const column of possibleColumns) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .eq(column, sessionId)
              .limit(5)
            
            if (!error && data && data.length > 0) {
              console.log(`\n✅ Found ${data.length} records in ${tableName}.${column}`)
              console.log(`  First record keys:`, Object.keys(data[0]))
              if (data[0].make) {
                console.log(`  Sample: ${data[0].make} ${data[0].model || ''} ${data[0].variant || ''}`)
              }
            }
          } catch (e) {
            // Column doesn't exist, continue
          }
        }
      } catch (e) {
        console.log(`  ❌ Could not search ${tableName}`)
      }
    }
    
    // Check what data the Edge Function is supposed to return
    console.log('\n🎯 Root Cause Analysis:')
    console.log('======================')
    console.log('The modal expects aiResult.summary with:')
    console.log('  - totalNew')
    console.log('  - totalUpdated')
    console.log('  - totalDeleted')
    console.log('  - totalExtracted')
    console.log()
    console.log('But the extract-cars-generic function might not be returning this summary.')
    console.log('The summary data might be generated later in the processing pipeline.')
    console.log()
    console.log('💡 Possible Solutions:')
    console.log('1. Update the Edge Function to return summary immediately')
    console.log('2. Update the modal to show basic stats and get detailed stats later')
    console.log('3. Use the extraction session total_extracted for now')
    
  } catch (error) {
    console.error('❌ Error finding extraction data:', error.message)
  }
}

findExtractionData()