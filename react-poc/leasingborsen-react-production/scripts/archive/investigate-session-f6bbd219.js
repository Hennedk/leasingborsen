#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const sessionId = 'f6bbd219-1270-4aa5-97b7-399746be55ac'

// Latest fixed compareOfferArrays function (handles both array and object formats)
function compareOfferArrays(extractedOffers, existingOffers) {
  if (!extractedOffers || !existingOffers) return true
  if (extractedOffers.length !== existingOffers.length) return true
  
  // Handle both array format [monthly_price, first_payment, period_months, mileage_per_year] 
  // and object format {monthly_price, first_payment, period_months, mileage_per_year}
  const normalizeOffer = (offer) => {
    if (Array.isArray(offer)) {
      return {
        monthly_price: offer[0] || 0,
        first_payment: offer[1] || 0,
        period_months: offer[2] || 36,
        mileage_per_year: offer[3] || 15000
      }
    }
    return {
      monthly_price: offer.monthly_price || 0,
      first_payment: offer.first_payment || 0,
      period_months: offer.period_months || 36,
      mileage_per_year: offer.mileage_per_year || 15000
    }
  }
  
  // Normalize both arrays to object format
  const normalizedExtracted = extractedOffers.map(normalizeOffer)
  const normalizedExisting = existingOffers.map(normalizeOffer)
  
  // Sort both arrays by multiple fields for consistent comparison
  const sortComparator = (a, b) => {
    // Primary sort: monthly_price
    if (a.monthly_price !== b.monthly_price) return a.monthly_price - b.monthly_price
    // Secondary sort: first_payment (for same monthly price)
    if (a.first_payment !== b.first_payment) return a.first_payment - b.first_payment
    // Tertiary sort: mileage_per_year (for same monthly price and down payment)
    return a.mileage_per_year - b.mileage_per_year
  }
  
  const sortedExtracted = [...normalizedExtracted].sort(sortComparator)
  const sortedExisting = [...normalizedExisting].sort(sortComparator)
  
  // Compare each offer
  for (let i = 0; i < sortedExtracted.length; i++) {
    const extracted = sortedExtracted[i]
    const existing = sortedExisting[i]
    
    // Compare key pricing fields
    if (extracted.monthly_price !== existing.monthly_price) {
      console.log(`   ❌ Offer ${i+1} monthly_price differs: ${extracted.monthly_price} vs ${existing.monthly_price}`)
      return true
    }
    if (extracted.first_payment !== existing.first_payment) {
      console.log(`   ❌ Offer ${i+1} first_payment differs: ${extracted.first_payment} vs ${existing.first_payment}`)
      return true
    }
    if (extracted.period_months !== existing.period_months) {
      console.log(`   ❌ Offer ${i+1} period_months differs: ${extracted.period_months} vs ${existing.period_months}`)
      return true
    }
    if (extracted.mileage_per_year !== existing.mileage_per_year) {
      console.log(`   ❌ Offer ${i+1} mileage_per_year differs: ${extracted.mileage_per_year} vs ${existing.mileage_per_year}`)
      return true
    }
  }
  
  return false
}

async function investigateSession() {
  console.log(`🔍 Investigating session: ${sessionId}\n`)
  
  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message)
      return
    }
    
    console.log(`📋 Session: ${session.session_name}`)
    console.log(`   Created: ${session.created_at}`)
    console.log(`   Status: ${session.status}`)
    
    // Convert timestamp to CET for timeline analysis
    const sessionTime = new Date(session.created_at)
    const cetTime = sessionTime.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
    console.log(`   Created (CET): ${cetTime}`)
    
    // Determine if this was before or after our fixes
    const fixTime1 = new Date('2025-07-28T18:00:00Z') // Approximate first fix time
    const fixTime2 = new Date('2025-07-28T18:30:00Z') // Approximate second fix time
    
    if (sessionTime < fixTime1) {
      console.log(`   ⚠️  TIMELINE: Session created BEFORE first comparison fix`)
    } else if (sessionTime < fixTime2) {
      console.log(`   ⚠️  TIMELINE: Session created AFTER first fix but BEFORE second fix`)
    } else {
      console.log(`   ✅ TIMELINE: Session created AFTER both fixes - should be accurate`)
    }
    
    // Get all update changes
    const { data: changes, error: changesError } = await supabase
      .from('extraction_listing_changes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('change_type', 'update')
      .order('created_at', { ascending: true })
    
    if (changesError) {
      console.log('❌ Changes error:', changesError.message)
      return
    }
    
    console.log(`\n📊 Found ${changes.length} UPDATE changes`)
    
    // Analyze first few changes
    const samplesToCheck = Math.min(3, changes.length)
    
    for (let i = 0; i < samplesToCheck; i++) {
      const change = changes[i]
      console.log(`\n🔍 Change ${i + 1}:`)
      console.log(`   Change ID: ${change.id}`)
      console.log(`   Listing ID: ${change.existing_listing_id}`)
      
      // Get current listing
      const { data: listing, error: listingError } = await supabase
        .from('full_listing_view')
        .select('make, model, variant, lease_pricing')
        .eq('id', change.existing_listing_id)
        .single()
      
      if (listingError) {
        console.log(`   ❌ Listing error: ${listingError.message}`)
        continue
      }
      
      console.log(`   Vehicle: ${listing.make} ${listing.model} ${listing.variant}`)
      
      const extractedOffers = change.extracted_data?.offers || []
      const existingOffers = listing.lease_pricing || []
      
      console.log(`   Extracted offers: ${extractedOffers.length}`)
      console.log(`   Existing offers: ${existingOffers.length}`)
      
      if (extractedOffers.length !== existingOffers.length) {
        console.log(`   ✅ LEGITIMATE CHANGE: Different offer counts`)
        continue
      }
      
      // Convert array format to object format if needed
      let processedExtracted = extractedOffers
      if (extractedOffers.length > 0 && Array.isArray(extractedOffers[0])) {
        processedExtracted = extractedOffers.map(offer => ({
          monthly_price: offer[0],
          first_payment: offer[1], 
          period_months: offer[2],
          mileage_per_year: offer[3]
        }))
      }
      
      // Test with our fixed comparison
      console.log(`   🧪 Testing with fixed comparison logic...`)
      const offersChanged = compareOfferArrays(processedExtracted, existingOffers)
      
      if (offersChanged) {
        console.log(`   ❌ STILL SHOWS AS CHANGED`)
        
        // Show first few offers for debugging
        console.log(`\n   📊 First 2 extracted offers:`)
        processedExtracted.slice(0, 2).forEach((offer, idx) => {
          console.log(`     ${idx + 1}. [${offer.monthly_price}, ${offer.first_payment}, ${offer.period_months}, ${offer.mileage_per_year}]`)
        })
        
        console.log(`\n   📊 First 2 existing offers:`)
        existingOffers.slice(0, 2).forEach((offer, idx) => {
          console.log(`     ${idx + 1}. [${offer.monthly_price}, ${offer.first_payment}, ${offer.period_months}, ${offer.mileage_per_year}]`)
        })
        
        // Check what the change summary says
        if (change.change_summary) {
          console.log(`\n   📋 Change summary: ${change.change_summary}`)
        }
        
        if (change.field_changes) {
          console.log(`   📋 Field changes:`)
          Object.entries(change.field_changes).forEach(([field, changes]) => {
            console.log(`     ${field}: ${changes.old} → ${changes.new}`)
          })
        }
        
      } else {
        console.log(`   ✅ CORRECTLY IDENTIFIED AS IDENTICAL (False positive from old logic)`)
      }
    }
    
    // Summary
    console.log(`\n📊 Session Analysis Summary:`)
    if (sessionTime > fixTime2) {
      console.log(`   ✅ This session was processed AFTER both fixes`)
      console.log(`   ❌ If still showing false positives, there may be additional bugs`)
      console.log(`   🔍 Recommend investigating specific comparison failures above`)
    } else {
      console.log(`   ⚠️  This session was processed BEFORE the fixes were complete`)
      console.log(`   ✅ Changes stored with old buggy logic - this is expected`)
      console.log(`   💡 Test with a NEW extraction to verify fixes are working`)
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message)
  }
}

investigateSession()