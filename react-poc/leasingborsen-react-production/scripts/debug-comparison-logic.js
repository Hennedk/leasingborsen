#!/usr/bin/env node

/**
 * Debug Comparison Logic
 * 
 * This script replicates the exact comparison logic from compare-extracted-listings
 * to understand why identical data is being detected as changes.
 */

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const PROBLEM_SESSION_ID = '64ad98ac-06fc-40ad-9cef-6c0aeb6323b7'

/**
 * Replicate the exact compareOfferArrays function from compare-extracted-listings
 */
function compareOfferArrays(extractedOffers, existingOffers) {
  console.log('\n🔍 DETAILED COMPARISON ANALYSIS')
  console.log('='.repeat(60))
  
  console.log('Extracted offers:', JSON.stringify(extractedOffers, null, 2))
  console.log('Existing offers:', JSON.stringify(existingOffers, null, 2))
  
  if (!extractedOffers || !existingOffers) {
    console.log('❌ One or both offer arrays are null/undefined')
    return true
  }
  
  if (extractedOffers.length !== existingOffers.length) {
    console.log(`❌ Length mismatch: extracted=${extractedOffers.length}, existing=${existingOffers.length}`)
    return true
  }
  
  console.log(`✅ Both arrays have ${extractedOffers.length} offers`)
  
  // Sort both arrays by monthly_price for consistent comparison
  const sortedExtracted = [...extractedOffers].sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0))
  const sortedExisting = [...existingOffers].sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0))
  
  console.log('\nAfter sorting:')
  console.log('Sorted extracted:', JSON.stringify(sortedExtracted, null, 2))
  console.log('Sorted existing:', JSON.stringify(sortedExisting, null, 2))
  
  // Compare each offer
  for (let i = 0; i < sortedExtracted.length; i++) {
    const extracted = sortedExtracted[i]
    const existing = sortedExisting[i]
    
    console.log(`\n--- Comparing offer ${i + 1} ---`)
    console.log(`Extracted: monthly_price=${extracted.monthly_price} (${typeof extracted.monthly_price})`)
    console.log(`Existing:  monthly_price=${existing.monthly_price} (${typeof existing.monthly_price})`)
    
    // Compare key pricing fields with detailed logging
    if (extracted.monthly_price !== existing.monthly_price) {
      console.log(`❌ Monthly price mismatch: ${extracted.monthly_price} !== ${existing.monthly_price}`)
      console.log(`   Types: ${typeof extracted.monthly_price} vs ${typeof existing.monthly_price}`)
      console.log(`   Strict equality: ${extracted.monthly_price === existing.monthly_price}`)
      console.log(`   Loose equality: ${extracted.monthly_price == existing.monthly_price}`)
      return true
    }
    
    console.log(`First payment: extracted=${extracted.first_payment} (${typeof extracted.first_payment}), existing=${existing.first_payment} (${typeof existing.first_payment})`)
    if (extracted.first_payment !== existing.first_payment) {
      console.log(`❌ First payment mismatch: ${extracted.first_payment} !== ${existing.first_payment}`)
      return true
    }
    
    console.log(`Period: extracted=${extracted.period_months} (${typeof extracted.period_months}), existing=${existing.period_months} (${typeof existing.period_months})`)
    if (extracted.period_months !== existing.period_months) {
      console.log(`❌ Period mismatch: ${extracted.period_months} !== ${existing.period_months}`)
      return true
    }
    
    console.log(`Mileage: extracted=${extracted.mileage_per_year} (${typeof extracted.mileage_per_year}), existing=${existing.mileage_per_year} (${typeof existing.mileage_per_year})`)
    if (extracted.mileage_per_year !== existing.mileage_per_year) {
      console.log(`❌ Mileage mismatch: ${extracted.mileage_per_year} !== ${existing.mileage_per_year}`)
      return true
    }
    
    console.log(`✅ Offer ${i + 1} matches perfectly`)
  }
  
  console.log('\n✅ All offers match - should be detected as UNCHANGED')
  return false
}

/**
 * Replicate the detectFieldChanges function logic for offers
 */
function detectFieldChanges(extracted, existing) {
  console.log('\n🔍 FIELD CHANGE DETECTION')
  console.log('='.repeat(60))
  
  const changes = {}
  
  // Focus on offers comparison
  const extractedHasOffers = extracted.offers && extracted.offers.length > 0
  const existingHasOffers = existing.offers && existing.offers.length > 0
  
  console.log(`Extracted has offers: ${extractedHasOffers} (count: ${extracted.offers?.length || 0})`)
  console.log(`Existing has offers: ${existingHasOffers} (count: ${existing.offers?.length || 0})`)
  
  if (extractedHasOffers || existingHasOffers) {
    const extractedOfferCount = extracted.offers?.length || 0
    const existingOfferCount = existing.offers?.length || 0
    
    if (extractedOfferCount !== existingOfferCount) {
      console.log(`❌ Offer count changed: ${existingOfferCount} → ${extractedOfferCount}`)
      changes.offers = { 
        old: existingHasOffers ? `${existingOfferCount} tilbud` : 'Ingen tilbud', 
        new: extractedHasOffers ? `${extractedOfferCount} tilbud` : 'Ingen tilbud' 
      }
    } else if (extractedHasOffers && existingHasOffers) {
      console.log(`✅ Same number of offers (${extractedOfferCount}), checking content...`)
      
      // Same number of offers - compare content
      const offersChanged = compareOfferArrays(extracted.offers, existing.offers)
      if (offersChanged) {
        console.log('❌ Offers content has changed')
        changes.offers = {
          old: `${existingOfferCount} tilbud (indhold ændret)`,
          new: `${extractedOfferCount} tilbud (nye priser/vilkår)`
        }
      } else {
        console.log('✅ Offers content is identical')
      }
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null
}

async function debugComparisonLogic() {
  console.log('🚀 Starting Comparison Logic Debug')
  console.log(`📋 Target Session: ${PROBLEM_SESSION_ID}`)
  
  try {
    // Get the first UPDATE change from our session
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('id, existing_listing_id, extracted_data, change_status')
      .eq('session_id', PROBLEM_SESSION_ID)
      .eq('change_type', 'update')
      .limit(1)
    
    if (changesError) {
      console.error('Error fetching changes:', changesError)
      return
    }
    
    if (!changes || changes.length === 0) {
      console.log('No update changes found')
      return
    }
    
    const change = changes[0]
    console.log(`\n📊 Analyzing change: ${change.id}`)
    console.log(`   Listing ID: ${change.existing_listing_id}`)
    console.log(`   Status: ${change.change_status}`)
    
    // Get current pricing for this listing
    const { data: currentPricing, error: pricingError } = await supabase
      .from('lease_pricing')
      .select('monthly_price, period_months, mileage_per_year, first_payment')
      .eq('listing_id', change.existing_listing_id)
      .order('monthly_price')
    
    if (pricingError) {
      console.error('Error fetching current pricing:', pricingError)
      return
    }
    
    console.log(`\n💰 Current pricing: ${currentPricing?.length || 0} records`)
    
    // Extract the offers from the change data
    const extractedOffers = change.extracted_data?.offers || []
    console.log(`📋 Extracted offers: ${extractedOffers.length} records`)
    
    // Create mock objects similar to what the comparison function would receive
    const extractedMock = {
      offers: extractedOffers
    }
    
    const existingMock = {
      offers: currentPricing || []
    }
    
    // Run the comparison logic
    console.log('\n' + '='.repeat(80))
    console.log('🔍 RUNNING COMPARISON LOGIC')
    console.log('='.repeat(80))
    
    const fieldChanges = detectFieldChanges(extractedMock, existingMock)
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL RESULTS')
    console.log('='.repeat(80))
    
    if (fieldChanges) {
      console.log('❌ CHANGES DETECTED:')
      console.log(JSON.stringify(fieldChanges, null, 2))
      console.log('\n🔧 This explains why the AI keeps detecting this as a change!')
    } else {
      console.log('✅ NO CHANGES DETECTED')
      console.log('\n🤔 If no changes are detected here, the issue might be elsewhere in the comparison logic')
    }
    
    // Additional debugging - show raw data format differences
    console.log('\n' + '='.repeat(80))
    console.log('🔍 RAW DATA ANALYSIS')
    console.log('='.repeat(80))
    
    if (extractedOffers.length > 0 && currentPricing && currentPricing.length > 0) {
      console.log('\nFirst extracted offer:')
      Object.entries(extractedOffers[0]).forEach(([key, value]) => {
        console.log(`  ${key}: ${value} (${typeof value})`)
      })
      
      console.log('\nFirst current pricing:')
      Object.entries(currentPricing[0]).forEach(([key, value]) => {
        console.log(`  ${key}: ${value} (${typeof value})`)
      })
    }
    
  } catch (error) {
    console.error('Error in debug script:', error)
  }
}

debugComparisonLogic().catch(console.error)