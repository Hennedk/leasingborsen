#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function findSkodaDealers() {
  console.log('🔍 Looking for Skoda dealers...')
  
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, name, email')
    .or('name.ilike.%skoda%, email.ilike.%skoda%')
  
  if (error) {
    console.error('❌ Error finding Skoda dealers:', error)
    return []
  }
  
  console.log(`📍 Found ${sellers.length} Skoda dealer(s):`)
  sellers.forEach(seller => {
    console.log(`  - ${seller.name} (${seller.email}) - ID: ${seller.id}`)
  })
  
  return sellers
}

async function countListingsForSeller(sellerId) {
  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
  
  if (error) {
    console.error('❌ Error counting listings:', error)
    return 0
  }
  
  return count || 0
}

async function removeListingsForSeller(sellerId, sellerName) {
  console.log(`🗑️  Removing listings for ${sellerName}...`)
  
  // First, remove lease pricing data
  const { error: pricingError } = await supabase
    .from('lease_pricing')
    .delete()
    .in('listing_id', 
      supabase
        .from('listings')
        .select('id')
        .eq('seller_id', sellerId)
    )
  
  if (pricingError) {
    console.error('❌ Error removing lease pricing:', pricingError)
    return false
  }
  
  // Then remove listings
  const { error: listingsError } = await supabase
    .from('listings')
    .delete()
    .eq('seller_id', sellerId)
  
  if (listingsError) {
    console.error('❌ Error removing listings:', listingsError)
    return false
  }
  
  console.log(`✅ Successfully removed all listings for ${sellerName}`)
  return true
}

async function main() {
  try {
    console.log('🚀 Starting Skoda listings removal process...')
    
    // Find Skoda dealers
    const skodaDealers = await findSkodaDealers()
    
    if (skodaDealers.length === 0) {
      console.log('ℹ️  No Skoda dealers found')
      return
    }
    
    // Process each dealer
    for (const dealer of skodaDealers) {
      const listingCount = await countListingsForSeller(dealer.id)
      console.log(`📊 ${dealer.name} has ${listingCount} listing(s)`)
      
      if (listingCount > 0) {
        console.log(`⚠️  About to remove ${listingCount} listing(s) for ${dealer.name}`)
        console.log('⏳ Proceeding with removal...')
        
        const success = await removeListingsForSeller(dealer.id, dealer.name)
        
        if (success) {
          // Verify removal
          const remainingCount = await countListingsForSeller(dealer.id)
          if (remainingCount === 0) {
            console.log(`✅ Confirmed: All listings removed for ${dealer.name}`)
          } else {
            console.log(`⚠️  Warning: ${remainingCount} listing(s) still remain for ${dealer.name}`)
          }
        }
      } else {
        console.log(`ℹ️  No listings to remove for ${dealer.name}`)
      }
    }
    
    console.log('🎉 Skoda listings removal process completed')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the script
main()