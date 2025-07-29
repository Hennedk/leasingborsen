#!/usr/bin/env node

/**
 * Automated Extraction Diagnostics Runner
 * 
 * Runs diagnostic SQL queries to analyze extraction change issues without manual intervention.
 * Focuses on the ongoing Issue 3: Offers/lease pricing updates failing silently.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
  console.error('Make sure you have a .env.local file with these variables')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey)

// Session ID for ongoing Issue 3
const PROBLEM_SESSION_ID = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'

async function runDirectQuery(description, queryBuilder) {
  try {
    console.log(`\n🔍 ${description}`)
    console.log('=' .repeat(60))
    
    const { data, error } = await queryBuilder()
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error.message)
      return null
    }
    
    // Format and display results
    if (Array.isArray(data)) {
      data.forEach((row, index) => {
        console.log(`\nResult ${index + 1}:`)
        Object.entries(row).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            console.log(`  ${key}: ${JSON.stringify(value, null, 2)}`)
          } else {
            console.log(`  ${key}: ${value}`)
          }
        })
      })
    } else {
      console.log('Result:', data)
    }
    
    return data
    
  } catch (err) {
    console.error(`❌ Error running ${description}:`, err.message)
    return null
  }
}

async function runComprehensiveDiagnostics() {
  console.log('🚀 Starting Extraction Diagnostics Analysis')
  console.log(`📋 Target Session: ${PROBLEM_SESSION_ID}`)
  console.log(`🕒 Started at: ${new Date().toISOString()}`)

  // Test database connection first
  try {
    console.log('\n🔗 Testing database connection...')
    const { data, error } = await supabase
      .from('extraction_sessions')
      .select('id')
      .eq('id', PROBLEM_SESSION_ID)
      .single()
    
    if (error) {
      console.error('❌ Database connection failed:', error)
      process.exit(1)
    }
    
    if (!data) {
      console.error(`❌ Session ${PROBLEM_SESSION_ID} not found`)
      process.exit(1)
    }
    
    console.log('✅ Database connection established and session found')
  } catch (err) {
    console.error('❌ Connection test failed:', err.message)
    process.exit(1)
  }

  const diagnostics = []

  // 1. Session Status Overview
  const sessionOverview = await runDirectQuery(
    'Session Status Overview',
    () => supabase
      .from('extraction_sessions')
      .select('id, status, total_created, total_updated, total_deleted, applied_at, created_at')
      .eq('id', PROBLEM_SESSION_ID)
      .single()
  )
  diagnostics.push({ type: 'session_overview', data: sessionOverview })

  // 2. Change Status Breakdown - using Edge Function for complex query
  const changeStatus = await runDirectQuery(
    'Change Status Breakdown',
    async () => {
      // Get all changes for this session
      const { data: changes, error } = await supabase
        .from('extraction_listing_changes')
        .select('change_type, change_status')
        .eq('session_id', PROBLEM_SESSION_ID)
      
      if (error) throw error
      
      // Group by change_type and change_status
      const grouped = changes.reduce((acc, change) => {
        const key = `${change.change_type}_${change.change_status}`
        if (!acc[key]) {
          acc[key] = {
            change_type: change.change_type,
            change_status: change.change_status,
            count: 0
          }
        }
        acc[key].count++
        return acc
      }, {})
      
      return { data: Object.values(grouped), error: null }
    }
  )
  diagnostics.push({ type: 'change_status', data: changeStatus })

  // 3. Detailed UPDATE Changes Analysis
  const updateAnalysis = await runDirectQuery(
    'UPDATE Changes Detailed Analysis',
    () => supabase
      .from('extraction_listing_changes')
      .select('id, existing_listing_id, change_status, extracted_data')
      .eq('session_id', PROBLEM_SESSION_ID)
      .eq('change_type', 'update')
      .limit(5)
  )
  diagnostics.push({ type: 'update_analysis', data: updateAnalysis })

  // 4. Get current pricing for the first few update changes
  let pricingComparison = null
  if (updateAnalysis && updateAnalysis.length > 0) {
    const firstUpdate = updateAnalysis[0]
    if (firstUpdate.existing_listing_id) {
      pricingComparison = await runDirectQuery(
        'Current Pricing for First Update',
        () => supabase
          .from('lease_pricing')
          .select('monthly_price, period_months, mileage_per_year, first_payment')
          .eq('listing_id', firstUpdate.existing_listing_id)
      )
    }
  }
  diagnostics.push({ type: 'pricing_comparison', data: pricingComparison })

  // 5. Check if listings exist for update changes
  const listingCheck = await runDirectQuery(
    'Listing Existence Check',
    async () => {
      if (updateAnalysis && updateAnalysis.length > 0) {
        const listingIds = updateAnalysis.map(change => change.existing_listing_id).filter(Boolean)
        if (listingIds.length > 0) {
          return supabase
            .from('listings')
            .select('id, make, model, variant')
            .in('id', listingIds)
        }
      }
      return { data: [], error: null }
    }
  )
  diagnostics.push({ type: 'listing_check', data: listingCheck })

  // Summary Report
  console.log('\n' + '='.repeat(80))
  console.log('📊 DIAGNOSTIC SUMMARY REPORT')
  console.log('='.repeat(80))

  // Analyze results programmatically
  let issuesFound = []

  if (sessionOverview) {
    console.log(`📊 Session Status: ${sessionOverview.status}`)
    console.log(`📈 Total Updated: ${sessionOverview.total_updated || 0}`)
    console.log(`📅 Applied At: ${sessionOverview.applied_at || 'Not applied'}`)
  }

  if (changeStatus) {
    const appliedUpdates = changeStatus.find(row => 
      row.change_type === 'update' && row.change_status === 'applied'
    )
    if (appliedUpdates && appliedUpdates.count > 0) {
      console.log(`✅ Found ${appliedUpdates.count} applied UPDATE changes`)
    }
    
    const pendingUpdates = changeStatus.find(row => 
      row.change_type === 'update' && row.change_status === 'pending'
    )
    if (pendingUpdates && pendingUpdates.count > 0) {
      issuesFound.push(`⚠️  WARNING: ${pendingUpdates.count} UPDATE changes still pending`)
    }
  }

  if (updateAnalysis && updateAnalysis.length > 0) {
    console.log(`🔍 Analyzed ${updateAnalysis.length} UPDATE changes`)
    
    const appliedChanges = updateAnalysis.filter(change => change.change_status === 'applied')
    const pendingChanges = updateAnalysis.filter(change => change.change_status === 'pending')
    
    console.log(`  - Applied: ${appliedChanges.length}`)
    console.log(`  - Pending: ${pendingChanges.length}`)
    
    // Check if we have extracted offers
    updateAnalysis.forEach((change, index) => {
      const offers = change.extracted_data?.offers
      if (offers) {
        console.log(`  - Change ${index + 1}: Has ${offers.length || 0} extracted offers`)
      }
    })
  }

  if (pricingComparison && pricingComparison.length > 0) {
    console.log(`💰 Current pricing found: ${pricingComparison.length} records`)
    pricingComparison.forEach((pricing, index) => {
      console.log(`  - Pricing ${index + 1}: ${pricing.monthly_price} kr/md, ${pricing.period_months} months`)
    })
  } else if (updateAnalysis && updateAnalysis.length > 0) {
    issuesFound.push(`🔴 CRITICAL: No current pricing found for listings that should have pricing`)
  }

  // Final recommendations
  console.log('\n📋 RECOMMENDATIONS:')
  if (issuesFound.length > 0) {
    issuesFound.forEach(issue => console.log(issue))
    console.log('\n🔧 NEXT STEPS:')
    console.log('1. Run enhanced function update with improved error tracking')
    console.log('2. Add transaction integrity checks for pricing updates')
    console.log('3. Implement separate error handling for pricing operations')
  } else {
    console.log('✅ No obvious data inconsistencies found')
    console.log('🔍 May need deeper function-level debugging')
  }

  console.log(`\n✅ Diagnostics completed at: ${new Date().toISOString()}`)

  return diagnostics
}

// Run diagnostics
runComprehensiveDiagnostics().catch(console.error)