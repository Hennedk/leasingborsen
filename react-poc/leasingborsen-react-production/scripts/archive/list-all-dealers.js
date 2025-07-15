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

async function main() {
  console.log('📋 Listing all dealers and their listing counts...')
  
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select(`
      id, 
      name, 
      email,
      listings(count)
    `)
    .order('name')
  
  if (error) {
    console.error('❌ Error fetching dealers:', error)
    return
  }
  
  console.log(`\n📊 Found ${sellers.length} dealer(s):\n`)
  
  for (const seller of sellers) {
    const listingCount = seller.listings?.[0]?.count || 0
    console.log(`• ${seller.name}`)
    console.log(`  Email: ${seller.email}`)
    console.log(`  Listings: ${listingCount}`)
    console.log(`  ID: ${seller.id}`)
    console.log('')
  }
  
  const totalListings = sellers.reduce((sum, seller) => 
    sum + (seller.listings?.[0]?.count || 0), 0)
  
  console.log(`📈 Total listings across all dealers: ${totalListings}`)
}

main().catch(console.error)