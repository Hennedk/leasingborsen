#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function debugLatestExtraction() {
  try {
    console.log('🔍 Debugging Latest Extraction Response Structure')
    console.log('================================================')
    
    // Get the most recent processing job
    const { data: latestJob, error: jobError } = await supabase
      .from('processing_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (jobError) throw jobError
    
    if (!latestJob || latestJob.length === 0) {
      console.log('❌ No processing jobs found')
      return
    }
    
    const job = latestJob[0]
    console.log('📋 Latest Job:')
    console.log('  ID:', job.id)
    console.log('  Status:', job.status)
    console.log('  Items Processed:', job.items_processed)
    console.log('  Created:', job.created_at)
    console.log()
    
    // Check the result structure
    if (job.result) {
      console.log('📤 Job Result Structure:')
      console.log('  Type:', typeof job.result)
      console.log('  Keys:', Object.keys(job.result))
      console.log()
      
      // Check for summary data
      if (job.result.summary) {
        console.log('📊 Summary Data Found:')
        console.log('  Summary:', job.result.summary)
        console.log()
      } else {
        console.log('❌ No summary data in job.result')
        console.log('  Full result:', JSON.stringify(job.result, null, 2))
        console.log()
      }
      
      // Check for cars data
      if (job.result.cars) {
        console.log('🚗 Cars Data Found:')
        console.log('  Total cars:', job.result.cars?.length || 0)
        if (job.result.cars && job.result.cars.length > 0) {
          console.log('  First car:', job.result.cars[0])
        }
        console.log()
      }
      
      // Check for other possible data structures
      const resultKeys = Object.keys(job.result)
      console.log('🔍 All Result Keys:', resultKeys)
      
      resultKeys.forEach(key => {
        const value = job.result[key]
        console.log(`  ${key}:`, typeof value, Array.isArray(value) ? `(array of ${value.length})` : '')
      })
      
    } else {
      console.log('❌ No result data in job')
    }
    
    // Also check the most recent extraction session
    console.log('\n📋 Checking Latest Extraction Session:')
    console.log('=====================================')
    
    const { data: latestSession, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (sessionError) throw sessionError
    
    if (latestSession && latestSession.length > 0) {
      const session = latestSession[0]
      console.log('  Session ID:', session.id)
      console.log('  Status:', session.status)
      console.log('  Total Extracted:', session.total_extracted)
      console.log('  Created:', session.created_at)
      
      if (session.processing_result) {
        console.log('  Processing Result Keys:', Object.keys(session.processing_result))
        console.log('  Processing Result:', JSON.stringify(session.processing_result, null, 2))
      }
    } else {
      console.log('❌ No extraction sessions found')
    }
    
  } catch (error) {
    console.error('❌ Error debugging:', error.message)
  }
}

debugLatestExtraction()