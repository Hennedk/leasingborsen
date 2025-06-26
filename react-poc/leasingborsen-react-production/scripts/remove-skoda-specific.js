#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const SKODA_DEALER_ID = '11327fb8-4305-4156-8897-ddedb23e508b'
const SKODA_DEALER_NAME = 'Škoda Privatleasing'

async function removeSkodaListings() {
  console.log(`🗑️  Removing all listings for ${SKODA_DEALER_NAME}...`)
  
  // First, get the listing IDs to delete lease pricing
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id')
    .eq('seller_id', SKODA_DEALER_ID)
  
  if (listingsError) {
    console.error('❌ Error fetching listings:', listingsError)
    return false
  }
  
  console.log(`📊 Found ${listings.length} listings to remove`)
  
  if (listings.length === 0) {
    console.log('ℹ️  No listings to remove')
    return true
  }
  
  const listingIds = listings.map(l => l.id)
  
  // Remove lease pricing data first
  console.log('🗑️  Removing lease pricing data...')
  const { error: pricingError } = await supabase
    .from('lease_pricing')
    .delete()
    .in('listing_id', listingIds)
  
  if (pricingError) {
    console.error('❌ Error removing lease pricing:', pricingError)
    return false
  }
  
  console.log('✅ Lease pricing data removed')
  
  // Then remove listings
  console.log('🗑️  Removing listings...')
  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .eq('seller_id', SKODA_DEALER_ID)
  
  if (deleteError) {
    console.error('❌ Error removing listings:', deleteError)
    return false
  }
  
  console.log('✅ All listings removed')
  
  // Verify removal
  const { count, error: countError } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', SKODA_DEALER_ID)
  
  if (countError) {
    console.error('❌ Error verifying removal:', countError)
    return false
  }
  
  if (count === 0) {
    console.log(`✅ Confirmed: All listings removed for ${SKODA_DEALER_NAME}`)
    return true
  } else {
    console.log(`⚠️  Warning: ${count} listing(s) still remain`)
    return false
  }
}

async function main() {
  console.log('🚀 Starting Škoda listings removal...')
  
  const success = await removeSkodaListings()
  
  if (success) {
    console.log('🎉 Škoda listings removal completed successfully')
  } else {
    console.log('❌ Škoda listings removal failed')
    process.exit(1)
  }
}

main().catch(console.error)