#!/usr/bin/env node
/**
 * Script to check if lease score fields are available in full_listing_view
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking if lease score fields are available in full_listing_view...\n')
    
    // Try to query lease score fields from the view
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('id, retail_price, lease_score, lease_score_calculated_at, lease_score_breakdown')
      .limit(1)
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('⚠️  MIGRATION NEEDED')
        console.log('━'.repeat(50))
        console.log('The full_listing_view does not include lease score fields.')
        console.log('Please apply the migration manually through Supabase Dashboard:')
        console.log('')
        console.log('1. Go to: https://supabase.com/dashboard/project/hqqouszbgskteivjoems/sql')
        console.log('2. Run this SQL:')
        console.log('')
        console.log('CREATE OR REPLACE VIEW full_listing_view AS')
        console.log('SELECT ')
        console.log('  l.*,')
        console.log('  l.processed_image_grid,')
        console.log('  l.processed_image_detail,')
        console.log('  l.images,')
        console.log('  l.retail_price,')
        console.log('  l.lease_score,')
        console.log('  l.lease_score_calculated_at,')
        console.log('  l.lease_score_breakdown,')
        console.log('  lp.monthly_price,')
        console.log('  lp.first_payment,')
        console.log('  lp.period_months,')
        console.log('  lp.mileage_per_year,')
        console.log('  s.name as seller_name,')
        console.log('  s.phone as seller_phone,')
        console.log('  s.address as seller_location')
        console.log('FROM listings l')
        console.log('LEFT JOIN lease_pricing lp ON l.id = lp.listing_id')
        console.log('LEFT JOIN sellers s ON l.seller_id = s.id;')
        console.log('')
        console.log('3. Click "Run" to execute the migration')
        console.log('━'.repeat(50))
        return false
      } else {
        console.error('❌ Unexpected error querying view:', error)
        return false
      }
    }
    
    console.log('✅ MIGRATION COMPLETE')
    console.log('━'.repeat(50))
    console.log('Lease score fields are available in full_listing_view!')
    
    if (data && data.length > 0) {
      const sampleRecord = data[0]
      console.log('\n📊 Available fields:')
      Object.keys(sampleRecord).forEach(key => {
        const value = sampleRecord[key]
        const status = value !== null ? '✓' : '○'
        console.log(`  ${status} ${key}: ${value !== null ? (typeof value === 'object' ? '[object]' : value) : 'null'}`)
      })
      
      // Check if any listings have retail prices
      const { data: retailPriceData } = await supabase
        .from('full_listing_view')
        .select('id, retail_price')
        .not('retail_price', 'is', null)
        .limit(5)
      
      if (retailPriceData && retailPriceData.length > 0) {
        console.log(`\n💰 Found ${retailPriceData.length} listings with retail prices (ready for score calculation)`)
      } else {
        console.log('\n⚠️  No listings found with retail_price - scores cannot be calculated yet')
        console.log('   Add retail prices to listings to enable score calculation')
      }
    }
    console.log('━'.repeat(50))
    return true
    
  } catch (err) {
    console.error('💥 Unexpected error:', err)
    return false
  }
}

// Run the check
checkMigrationStatus().then(success => {
  process.exit(success ? 0 : 1)
})