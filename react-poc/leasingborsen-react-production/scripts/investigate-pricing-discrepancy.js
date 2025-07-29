#!/usr/bin/env node

/**
 * Investigate the pricing data discrepancy
 * The diagnostic found a match but our comparison shows different data
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function investigatePricingDiscrepancy() {
  console.log('🔍 Investigating pricing data discrepancy...\n')

  try {
    const listingId = '153a86c7-97cb-415a-91e7-50ad6e117c69'

    // Get raw lease_pricing data
    console.log('📋 1. Raw lease_pricing table data:')
    const { data: rawPricing, error: rawError } = await supabase
      .from('lease_pricing')
      .select('*')
      .eq('listing_id', listingId)
      .order('monthly_price', { ascending: true })

    if (rawError) {
      throw new Error(`Error fetching raw pricing: ${rawError.message}`)
    }

    console.log(`   Total records: ${rawPricing.length}`)
    rawPricing.slice(0, 5).forEach((pricing, idx) => {
      console.log(`   ${idx + 1}. ${pricing.monthly_price}kr/md, ${pricing.mileage_per_year}km/yr, first_payment: ${pricing.first_payment}kr, id: ${pricing.id}`)
    })
    console.log()

    // Get full_listing_view data  
    console.log('📋 2. full_listing_view aggregated data:')
    const { data: viewData, error: viewError } = await supabase
      .from('full_listing_view')
      .select('id, monthly_price, lease_pricing')
      .eq('id', listingId)
      .single()

    if (viewError) {
      throw new Error(`Error fetching view data: ${viewError.message}`)
    }

    console.log(`   monthly_price (aggregated): ${viewData.monthly_price}`)
    console.log(`   lease_pricing array length: ${viewData.lease_pricing?.length}`)
    if (viewData.lease_pricing) {
      viewData.lease_pricing.slice(0, 5).forEach((pricing, idx) => {
        console.log(`   ${idx + 1}. ${pricing.monthly_price}kr/md, ${pricing.mileage_per_year}km/yr, first_payment: ${pricing.first_payment}kr`)
      })
    }
    console.log()

    // Compare the two datasets
    console.log('📋 3. Data comparison analysis:')
    
    if (rawPricing.length !== viewData.lease_pricing?.length) {
      console.log(`❌ Record count mismatch: ${rawPricing.length} raw vs ${viewData.lease_pricing?.length} aggregated`)
    } else {
      console.log(`✅ Record counts match: ${rawPricing.length}`)
    }

    // Check if the extracted offer is in raw data
    const targetMonthlyPrice = 4395
    const targetMileage = 10000
    
    const rawMatch = rawPricing.find(p => 
      p.monthly_price == targetMonthlyPrice && 
      p.mileage_per_year == targetMileage
    )
    
    const viewMatch = viewData.lease_pricing?.find(p => 
      p.monthly_price == targetMonthlyPrice && 
      p.mileage_per_year == targetMileage
    )

    console.log(`🔍 Looking for extracted offer: ${targetMonthlyPrice}kr/md, ${targetMileage}km/yr`)
    console.log(`   Raw table match: ${rawMatch ? '✅ FOUND' : '❌ NOT FOUND'}`)
    console.log(`   View match: ${viewMatch ? '✅ FOUND' : '❌ NOT FOUND'}`)

    if (rawMatch && !viewMatch) {
      console.log('❌ ISSUE: Data exists in raw table but not in view!')
      console.log('   This suggests a bug in full_listing_view aggregation')
    } else if (!rawMatch && viewMatch) {
      console.log('❌ ISSUE: Data exists in view but not in raw table!')
      console.log('   This is impossible and suggests data corruption')
    } else if (rawMatch && viewMatch) {
      console.log('✅ Data exists in both raw table and view')
      
      // Compare the details
      console.log('\n🔍 Detailed comparison:')
      console.log(`   Raw: ${rawMatch.monthly_price}kr/md, ${rawMatch.mileage_per_year}km/yr, payment: ${rawMatch.first_payment}kr`)
      console.log(`   View: ${viewMatch.monthly_price}kr/md, ${viewMatch.mileage_per_year}km/yr, payment: ${viewMatch.first_payment}kr`)
      
      if (rawMatch.first_payment !== viewMatch.first_payment) {
        console.log('❌ Payment amounts differ between raw and view!')
      }
    } else {
      console.log('❌ Extracted offer not found in either raw table or view')
      console.log('   This confirms the PostgreSQL function did NOT update the database')
    }

    // Check what the lowest price actually is
    console.log()
    console.log('📋 4. Monthly price calculation verification:')
    const lowestRawPrice = Math.min(...rawPricing.map(p => p.monthly_price))
    console.log(`   Lowest raw price: ${lowestRawPrice}`)
    console.log(`   View monthly_price: ${viewData.monthly_price}`)
    console.log(`   Match: ${lowestRawPrice === viewData.monthly_price ? '✅' : '❌'}`)

    // Final analysis
    console.log()
    console.log('📋 5. CONCLUSION:')
    if (!rawMatch) {
      console.log('❌ The PostgreSQL function DID NOT update the database')
      console.log('   The extracted offer (4395kr/md, 10000km/yr) is NOT in the raw lease_pricing table')
      console.log('   Our original bug diagnosis was CORRECT')
    } else {
      console.log('✅ The PostgreSQL function DID update the database')
      console.log('   The extracted offer is present in the raw data')
      console.log('   The issue may be with our comparison logic or test expectations')
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error.message)
    process.exit(1)
  }
}

// Run the investigation
investigatePricingDiscrepancy()