#!/usr/bin/env node

/**
 * Apply Full Listing View Fix
 * 
 * Applies the migration to fix the full_listing_view aggregation issue
 * that was causing identical extractions to be detected as updates.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyFix() {
  try {
    console.log('🔧 APPLYING FULL_LISTING_VIEW FIX')
    console.log('='.repeat(80))
    
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250128_fix_full_listing_view_lease_pricing_aggregation.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📜 Loaded migration SQL...')
    console.log(`📁 File: ${migrationPath}`)
    
    // Since Supabase client doesn't have a direct SQL execution method,
    // we'll need to execute this via the service role
    console.log('\n⚠️  MANUAL APPLICATION REQUIRED:')
    console.log('This migration needs to be applied manually via the Supabase Dashboard.')
    console.log('Steps:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Copy and paste the migration SQL')
    console.log('3. Run the migration')
    
    console.log('\n📋 MIGRATION SQL:')
    console.log('='.repeat(40))
    console.log(migrationSQL)
    console.log('='.repeat(40))
    
    // However, we can test if the fix has been applied
    console.log('\n🧪 TESTING IF FIX IS ALREADY APPLIED...')
    
    const testListingId = '9bf521d2-1d52-4d86-ae1a-ef9f59276e48'
    
    const { data: testResults, error: testError } = await supabase
      .from('full_listing_view')
      .select('id, lease_pricing, monthly_price')
      .eq('id', testListingId)
    
    if (testError) {
      console.error('❌ Error testing view:', testError.message)
      return
    }
    
    console.log(`\n📊 Test Results for listing ${testListingId}:`)
    console.log(`   Rows returned: ${testResults?.length || 0}`)
    
    if (testResults && testResults.length === 1) {
      const result = testResults[0]
      console.log(`   ✅ Exactly 1 row returned (fixed!)`)
      
      if (result.lease_pricing && Array.isArray(result.lease_pricing)) {
        console.log(`   ✅ lease_pricing is array with ${result.lease_pricing.length} items`)
        console.log(`   ✅ View has been fixed!`)
        
        console.log('\n🎯 NEXT STEP: Test the comparison function')
        console.log('Run: node scripts/test-comparison-after-fix.js')
        
      } else if (result.lease_pricing && typeof result.lease_pricing === 'object') {
        console.log(`   📊 lease_pricing is object (probably JSON)`)
        console.log(`   Content: ${JSON.stringify(result.lease_pricing)}`)
      } else {
        console.log(`   ❌ lease_pricing field: ${result.lease_pricing}`)
        console.log(`   🔧 Fix may not be fully applied`)
      }
    } else {
      console.log(`   ❌ Still returning ${testResults?.length || 0} rows instead of 1`)
      console.log(`   🔧 Fix needs to be applied`)
    }
    
  } catch (error) {
    console.error('❌ Error applying fix:', error)
  }
}

applyFix().catch(console.error)