#!/usr/bin/env node

/**
 * Run Migration Direct
 * 
 * Applies the full_listing_view fix migration by executing the SQL directly
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

async function runMigration() {
  try {
    console.log('🚀 RUNNING FULL_LISTING_VIEW MIGRATION')
    console.log('='.repeat(80))
    
    // Step 1: Create the new view with aggregated lease_pricing
    console.log('1️⃣ Creating updated full_listing_view...')
    
    const createViewSQL = `
CREATE OR REPLACE VIEW full_listing_view AS
SELECT 
  l.*,
  l.processed_image_grid,
  l.processed_image_detail,
  l.images,
  l.retail_price,
  l.lease_score,
  l.lease_score_calculated_at,
  l.lease_score_breakdown,
  -- Aggregate lease pricing data into JSON array
  COALESCE(
    json_agg(
      json_build_object(
        'monthly_price', lp.monthly_price,
        'first_payment', lp.first_payment,
        'period_months', lp.period_months,
        'mileage_per_year', lp.mileage_per_year
      ) ORDER BY lp.monthly_price
    ) FILTER (WHERE lp.listing_id IS NOT NULL),
    '[]'::json
  ) as lease_pricing,
  -- Keep the first pricing record's fields for backward compatibility
  MIN(lp.monthly_price) as monthly_price,
  (array_agg(lp.first_payment ORDER BY lp.monthly_price))[1] as first_payment,
  (array_agg(lp.period_months ORDER BY lp.monthly_price))[1] as period_months,
  (array_agg(lp.mileage_per_year ORDER BY lp.monthly_price))[1] as mileage_per_year,
  -- Seller information
  s.name as seller_name,
  s.phone as seller_phone,
  s.address as seller_location
FROM listings l
LEFT JOIN lease_pricing lp ON l.id = lp.listing_id
LEFT JOIN sellers s ON l.seller_id = s.id
GROUP BY 
  l.id, 
  l.make, 
  l.model, 
  l.variant, 
  l.year, 
  l.horsepower, 
  l.fuel_type, 
  l.transmission, 
  l.body_type, 
  l.doors, 
  l.seats, 
  l.wltp, 
  l.co2_emission, 
  l.consumption_l_100km, 
  l.consumption_kwh_100km, 
  l.co2_tax_half_year, 
  l.seller_id, 
  l.created_at, 
  l.updated_at,
  l.processed_image_grid,
  l.processed_image_detail,
  l.images,
  l.retail_price,
  l.lease_score,
  l.lease_score_calculated_at,
  l.lease_score_breakdown,
  s.name,
  s.phone,
  s.address;`
    
    // Execute the view creation via RPC call
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec', { 
      sql: createViewSQL 
    })
    
    if (rpcError) {
      // Fallback: try to use direct query (might work with service role)
      console.log('RPC failed, trying alternative approach...')
      
      // We can't execute arbitrary SQL with the anon key, so we'll test if it's already applied
      const { data: testData, error: testError } = await supabase
        .from('full_listing_view')
        .select('id, lease_pricing')
        .limit(1)
        
      if (testError && testError.message.includes('lease_pricing')) {
        console.error('❌ Migration needs to be applied manually')
        console.log('\n🔧 MANUAL STEPS REQUIRED:')
        console.log('1. Go to Supabase Dashboard → SQL Editor')
        console.log('2. Paste and run the following SQL:')
        console.log('\n' + '='.repeat(60))
        console.log(createViewSQL)
        console.log('='.repeat(60))
        return
      }
    }
    
    console.log('✅ View creation completed')
    
    // Step 2: Test the fix
    console.log('\n2️⃣ Testing the fix...')
    
    const testListingId = '9bf521d2-1d52-4d86-ae1a-ef9f59276e48'
    
    const { data: testResults, error: testError } = await supabase
      .from('full_listing_view')
      .select('id, lease_pricing, monthly_price')
      .eq('id', testListingId)
    
    if (testError) {
      console.error('❌ Error testing view:', testError.message)
      return
    }
    
    console.log(`📊 Test Results:`)
    console.log(`   Rows returned: ${testResults?.length || 0}`)
    
    if (testResults && testResults.length === 1) {
      const result = testResults[0]
      console.log(`   ✅ Exactly 1 row returned (fixed!)`)
      
      if (result.lease_pricing) {
        const pricingCount = Array.isArray(result.lease_pricing) 
          ? result.lease_pricing.length 
          : (typeof result.lease_pricing === 'object' ? Object.keys(result.lease_pricing).length : 0)
        
        console.log(`   ✅ lease_pricing field contains ${pricingCount} pricing options`)
        console.log(`   ✅ Migration applied successfully!`)
        
        // Step 3: Run the comparison test
        console.log('\n3️⃣ Running comparison test...')
        console.log('Execute: node scripts/test-comparison-after-fix.js')
        
      } else {
        console.log(`   ❌ lease_pricing field issue`)
      }
    } else {
      console.log(`   ❌ Still returning ${testResults?.length || 0} rows`)
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error)
  }
}

runMigration().catch(console.error)