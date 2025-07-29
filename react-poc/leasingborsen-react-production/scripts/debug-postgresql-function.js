#!/usr/bin/env node

/**
 * Debug script to investigate the PostgreSQL function bug
 * Analyzes the exact data being processed and the function logic
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugPostgreSQLFunction() {
  console.log('🔍 Debugging PostgreSQL function logic...\n')

  try {
    // Get a detailed view of the extraction data
    console.log('📋 1. Analyzing extracted data structure...')
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', '915f9196-d1fa-4a3b-829b-fe9afade2d31')
      .eq('change_type', 'update')  
      .eq('change_status', 'applied')
      .limit(3)

    if (changesError) {
      throw new Error(`Error fetching changes: ${changesError.message}`)
    }

    console.log(`✅ Found ${changes.length} applied UPDATE changes`)
    console.log()

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i]
      console.log(`📝 Change ${i + 1}: ${change.id}`)
      console.log(`   - Listing ID: ${change.existing_listing_id}`)
      console.log(`   - Change status: ${change.change_status}`)
      console.log(`   - Applied at: ${change.applied_at}`)
      console.log(`   - Applied by: ${change.applied_by}`)
      console.log()
      
      // Show extracted data structure
      console.log('   🔍 Extracted data:')
      if (change.extracted_data) {
        const data = change.extracted_data
        console.log(`      - make: ${data.make}`)
        console.log(`      - model: ${data.model}`)
        console.log(`      - year: ${data.year}`)
        console.log(`      - monthly_price: ${data.monthly_price}`)
        console.log(`      - retail_price: ${data.retail_price}`)
        console.log(`      - body_type: ${data.body_type}`)
        console.log(`      - fuel_type: ${data.fuel_type}`)
        console.log(`      - transmission: ${data.transmission}`)
        console.log(`      - mileage: ${data.mileage}`)
        
        if (data.offers && Array.isArray(data.offers)) {
          console.log(`      - offers: ${data.offers.length} offers`)
          data.offers.forEach((offer, idx) => {
            console.log(`        ${idx + 1}. ${offer.monthly_price}kr/md, ${offer.period_months}mo, ${offer.mileage_per_year}km/yr, down: ${offer.down_payment}kr`)
          })
        } else {
          console.log(`      - offers: ${data.offers} (not array or undefined)`)
        }
      } else {
        console.log('      - No extracted data found!')
      }
      console.log()

      // Check current database state
      console.log('   💾 Current database state:')
      const { data: currentListing, error: listingError } = await supabase
        .from('full_listing_view')
        .select('id, make, model, year, monthly_price, retail_price, body_type, fuel_type, transmission, mileage, lease_pricing')
        .eq('id', change.existing_listing_id)
        .single()

      if (listingError) {
        console.log(`      ❌ Error fetching listing: ${listingError.message}`)
      } else {
        console.log(`      - make: ${currentListing.make}`)
        console.log(`      - model: ${currentListing.model}`)
        console.log(`      - year: ${currentListing.year}`)
        console.log(`      - monthly_price: ${currentListing.monthly_price}`)
        console.log(`      - retail_price: ${currentListing.retail_price}`)
        console.log(`      - body_type: ${currentListing.body_type}`)
        console.log(`      - fuel_type: ${currentListing.fuel_type}`)
        console.log(`      - transmission: ${currentListing.transmission}`)
        console.log(`      - mileage: ${currentListing.mileage}`)
        
        if (currentListing.lease_pricing && currentListing.lease_pricing.length > 0) {
          console.log(`      - lease_pricing: ${currentListing.lease_pricing.length} offers`)
          currentListing.lease_pricing.slice(0, 3).forEach((offer, idx) => {
            console.log(`        ${idx + 1}. ${offer.monthly_price}kr/md, ${offer.period_months}mo, ${offer.mileage_per_year}km/yr, down: ${offer.down_payment}kr`)
          })
        } else {
          console.log(`      - lease_pricing: No offers found`)
        }
      }
      console.log()

      // Compare key fields
      if (change.extracted_data && currentListing) {
        console.log('   🔍 Field comparison:')
        const extracted = change.extracted_data
        const current = currentListing
        
        const comparisons = [
          { field: 'monthly_price', extracted: extracted.monthly_price, current: current.monthly_price },
          { field: 'retail_price', extracted: extracted.retail_price, current: current.retail_price },
          { field: 'make', extracted: extracted.make, current: current.make },
          { field: 'model', extracted: extracted.model, current: current.model },
          { field: 'year', extracted: extracted.year, current: current.year },
          { field: 'body_type', extracted: extracted.body_type, current: current.body_type },
          { field: 'fuel_type', extracted: extracted.fuel_type, current: current.fuel_type },
          { field: 'mileage', extracted: extracted.mileage, current: current.mileage }
        ]
        
        comparisons.forEach(comp => {
          const matches = comp.extracted == comp.current
          const status = matches ? '✅' : '❌'
          console.log(`      ${status} ${comp.field}: ${comp.extracted} vs ${comp.current}`)
        })
        
        // Check offers comparison
        if (extracted.offers && Array.isArray(extracted.offers) && current.lease_pricing && Array.isArray(current.lease_pricing)) {
          console.log(`      📊 Offers comparison: ${extracted.offers.length} extracted vs ${current.lease_pricing.length} current`)
          
          // Compare first offer details
          if (extracted.offers.length > 0 && current.lease_pricing.length > 0) {
            const extOffer = extracted.offers[0]
            const currOffer = current.lease_pricing[0]
            console.log(`         First offer extracted: ${extOffer.monthly_price}kr/md, ${extOffer.period_months}mo, ${extOffer.mileage_per_year}km/yr`)
            console.log(`         First offer current:   ${currOffer.monthly_price}kr/md, ${currOffer.period_months}mo, ${currOffer.mileage_per_year}km/yr`)
            
            const offerMatches = extOffer.monthly_price == currOffer.monthly_price && 
                               extOffer.period_months == currOffer.period_months &&
                               extOffer.mileage_per_year == currOffer.mileage_per_year
            console.log(`         Offers match: ${offerMatches ? '✅' : '❌'}`)
          }
        }
      }
      
      console.log('\n' + '='.repeat(80) + '\n')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
    process.exit(1)
  }
}

// Run the debug
debugPostgreSQLFunction()