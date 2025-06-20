#!/usr/bin/env node

// Script to delete listings from the database

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables from .env file manually
let supabaseUrl, supabaseKey
try {
  const envFile = readFileSync('.env', 'utf8')
  const envLines = envFile.split('\n')
  
  envLines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim()
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim()
    }
  })
} catch (err) {
  console.error('❌ Could not read .env file:', err.message)
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function showCurrentListings() {
  console.log('📊 Current Listings Status')
  console.log('=========================\n')
  
  try {
    // Count total listings
    const { count: totalListings, error: totalError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) throw totalError
    
    // Get some sample listings to show variety
    const { data: sampleListings, error: sampleError } = await supabase
      .from('listings')
      .select('make_id, model_id, variant, year')
      .limit(5)
    
    if (sampleError) throw sampleError
    
    // Count lease pricing entries
    const { count: pricingCount, error: pricingError } = await supabase
      .from('lease_pricing')
      .select('*', { count: 'exact', head: true })
    
    if (pricingError) throw pricingError
    
    console.log(`📝 Total Listings: ${totalListings || 0}`)
    console.log(`💰 Lease Pricing Entries: ${pricingCount || 0}`)
    
    if (sampleListings && sampleListings.length > 0) {
      console.log(`\n📋 Sample Listings:`)
      sampleListings.forEach((listing, i) => {
        console.log(`   ${i + 1}. Make ID: ${listing.make_id}, Model ID: ${listing.model_id}, Variant: ${listing.variant || 'N/A'}, Year: ${listing.year || 'N/A'}`)
      })
    }
    console.log(``)
    
    return { totalListings: totalListings || 0, pricingCount: pricingCount || 0 }
    
  } catch (error) {
    console.error('❌ Error checking listings:', error)
    return { totalListings: 0, pricingCount: 0 }
  }
}

async function deleteAllListings() {
  console.log('🗑️  Deleting All Listings')
  console.log('========================\n')
  
  try {
    // 1. Delete all lease pricing first (foreign key constraint)
    console.log('1. Deleting lease pricing entries...')
    const { error: pricingError, count: pricingCount } = await supabase
      .from('lease_pricing')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows (always true condition)
    
    if (pricingError) {
      console.error('❌ Error deleting lease pricing:', pricingError)
      throw pricingError
    }
    
    console.log(`✅ Deleted ${pricingCount || 'all'} lease pricing entries\n`)
    
    // 2. Delete all listings
    console.log('2. Deleting listings...')
    const { error: listingsError, count: listingsCount } = await supabase
      .from('listings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows (always true condition)
    
    if (listingsError) {
      console.error('❌ Error deleting listings:', listingsError)
      throw listingsError
    }
    
    console.log(`✅ Deleted ${listingsCount || 'all'} listings\n`)
    
    console.log('🎉 All listings deleted successfully!')
    console.log('The listings table is now empty.')
    
  } catch (error) {
    console.error('❌ Failed to delete listings:', error)
    process.exit(1)
  }
}

async function deleteRecentListings() {
  console.log('🗑️  Deleting Recent Listings (Last 24 Hours)')
  console.log('============================================\n')
  
  try {
    // Get recent listing IDs (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: recentListings, error: getRecentError } = await supabase
      .from('listings')
      .select('id, created_at')
      .gte('created_at', oneDayAgo)
    
    if (getRecentError) throw getRecentError
    
    if (!recentListings || recentListings.length === 0) {
      console.log('ℹ️  No recent listings found to delete.')
      return
    }
    
    const recentIds = recentListings.map(l => l.id)
    console.log(`Found ${recentIds.length} recent listings (created in last 24 hours)`)
    
    // 1. Delete lease pricing for recent listings
    console.log('1. Deleting lease pricing for recent listings...')
    const { error: pricingError, count: pricingCount } = await supabase
      .from('lease_pricing')
      .delete()
      .in('listing_id', recentIds)
    
    if (pricingError) {
      console.error('❌ Error deleting lease pricing:', pricingError)
      throw pricingError
    }
    
    console.log(`✅ Deleted ${pricingCount || 0} lease pricing entries for recent listings\n`)
    
    // 2. Delete recent listings
    console.log('2. Deleting recent listings...')
    const { error: listingsError, count: listingsCount } = await supabase
      .from('listings')
      .delete()
      .in('id', recentIds)
    
    if (listingsError) {
      console.error('❌ Error deleting recent listings:', listingsError)
      throw listingsError
    }
    
    console.log(`✅ Deleted ${listingsCount || 0} recent listings\n`)
    
    console.log('🎉 Recent listings deleted successfully!')
    console.log('Older listings remain untouched.')
    
  } catch (error) {
    console.error('❌ Failed to delete recent listings:', error)
    process.exit(1)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'status'
  
  if (command === 'status' || command === '--status') {
    await showCurrentListings()
  } else if (command === 'all' || command === '--all') {
    await showCurrentListings()
    console.log('⚠️  WARNING: This will delete ALL listings (both draft and published)!')
    console.log('Press Ctrl+C within 3 seconds to cancel...\n')
    
    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    await deleteAllListings()
    await showCurrentListings()
  } else if (command === 'recent' || command === '--recent') {
    await showCurrentListings()
    console.log('⚠️  This will delete listings created in the last 24 hours.')
    console.log('Press Ctrl+C within 2 seconds to cancel...\n')
    
    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    await deleteRecentListings()
    await showCurrentListings()
  } else {
    console.log('📖 Usage:')
    console.log('  node delete-listings.js status    # Show current listings count')
    console.log('  node delete-listings.js recent    # Delete recent listings (last 24h)')
    console.log('  node delete-listings.js all       # Delete ALL listings')
    console.log('')
    console.log('Examples:')
    console.log('  node delete-listings.js           # Shows status (default)')
    console.log('  node delete-listings.js recent    # Removes listings from last 24 hours')
    console.log('  node delete-listings.js all       # Removes everything')
  }
}

main()