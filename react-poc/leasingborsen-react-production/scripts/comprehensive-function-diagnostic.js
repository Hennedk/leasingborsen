#!/usr/bin/env node

/**
 * Comprehensive diagnostic script to identify the exact PostgreSQL function bug
 * Tests column mapping, data types, and transaction behavior
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function comprehensiveDiagnostic() {
  console.log('🔍 Comprehensive PostgreSQL Function Diagnostic\n')

  try {
    // Use our test change
    const changeId = '8c885eb4-9cf5-41f8-918b-2103877c97a4'
    const listingId = '153a86c7-97cb-415a-91e7-50ad6e117c69'

    console.log('📋 1. COLUMN MAPPING ANALYSIS')
    console.log('=' .repeat(50))

    // Get the extracted data structure
    const { data: changeData, error: changeError } = await supabase
      .from('extraction_listing_changes')
      .select('extracted_data')
      .eq('id', changeId)
      .single()

    if (changeError) {
      throw new Error(`Error fetching change: ${changeError.message}`)
    }

    const extractedData = changeData.extracted_data
    console.log('🔍 Extracted data structure:')
    
    // Check main listing fields
    const listingFields = ['make', 'model', 'variant', 'year', 'horsepower', 'mileage', 'body_type', 'fuel_type', 'transmission']
    listingFields.forEach(field => {
      const value = extractedData[field]
      console.log(`   ${field}: ${value} (${typeof value})`)
    })
    
    console.log()
    console.log('🔍 Offers structure analysis:')
    if (extractedData.offers && Array.isArray(extractedData.offers)) {
      console.log(`   Total offers: ${extractedData.offers.length}`)
      
      const firstOffer = extractedData.offers[0]
      console.log('   First offer fields:')
      Object.keys(firstOffer).forEach(key => {
        const value = firstOffer[key]
        console.log(`     ${key}: ${value} (${typeof value})`)
      })
      
      // Check for column name inconsistencies
      const hasFirstPayment = firstOffer.hasOwnProperty('first_payment')
      const hasDownPayment = firstOffer.hasOwnProperty('down_payment')
      console.log(`   Has 'first_payment': ${hasFirstPayment}`)
      console.log(`   Has 'down_payment': ${hasDownPayment}`)
      
      if (!hasFirstPayment && !hasDownPayment) {
        console.log('   ⚠️  WARNING: No payment field found!')
      }
    }
    
    console.log('\n📋 2. DATABASE SCHEMA ANALYSIS')
    console.log('=' .repeat(50))
    
    // Check lease_pricing table schema
    const { data: currentPricing, error: pricingError } = await supabase
      .from('lease_pricing')
      .select('*')
      .eq('listing_id', listingId)
      .limit(1)

    if (pricingError) {
      console.log(`❌ Error fetching pricing: ${pricingError.message}`)
    } else if (currentPricing && currentPricing.length > 0) {
      console.log('🔍 Database lease_pricing schema:')
      const pricing = currentPricing[0]
      Object.keys(pricing).forEach(key => {
        const value = pricing[key]
        console.log(`   ${key}: ${value} (${typeof value})`)
      })
    }

    console.log('\n📋 3. DATA TYPE CASTING TEST')
    console.log('=' .repeat(50))
    
    if (extractedData.offers && extractedData.offers.length > 0) {
      const testOffer = extractedData.offers[0]
      
      console.log('🧪 Testing data type conversions:')
      
      // Test monthly_price conversion
      try {
        const monthlyPrice = parseFloat(testOffer.monthly_price)
        console.log(`   ✅ monthly_price: ${testOffer.monthly_price} -> ${monthlyPrice} (DECIMAL)`)
      } catch (e) {
        console.log(`   ❌ monthly_price: ${testOffer.monthly_price} -> FAILED: ${e.message}`)
      }
      
      // Test period_months conversion
      try {
        const periodMonths = parseInt(testOffer.period_months)
        console.log(`   ✅ period_months: ${testOffer.period_months} -> ${periodMonths} (INTEGER)`)
      } catch (e) {
        console.log(`   ❌ period_months: ${testOffer.period_months} -> FAILED: ${e.message}`)
      }
      
      // Test mileage_per_year conversion
      try {
        const mileage = parseInt(testOffer.mileage_per_year)
        console.log(`   ✅ mileage_per_year: ${testOffer.mileage_per_year} -> ${mileage} (INTEGER)`)
      } catch (e) {
        console.log(`   ❌ mileage_per_year: ${testOffer.mileage_per_year} -> FAILED: ${e.message}`)
      }
      
      // Test payment field conversion
      const paymentField = testOffer.first_payment || testOffer.down_payment
      if (paymentField !== undefined) {
        try {
          const payment = parseFloat(paymentField)
          console.log(`   ✅ payment field: ${paymentField} -> ${payment} (DECIMAL)`)
        } catch (e) {
          console.log(`   ❌ payment field: ${paymentField} -> FAILED: ${e.message}`)
        }
      } else {
        console.log(`   ⚠️  payment field: undefined (will use NULL)`)
      }
    }

    console.log('\n📋 4. FIELD-BY-FIELD COMPARISON')
    console.log('=' .repeat(50))
    
    // Get current listing state
    const { data: currentListing, error: listingError } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('id', listingId)
      .single()

    if (listingError) {
      throw new Error(`Error fetching listing: ${listingError.message}`)
    }

    console.log('🔍 Listing field comparison:')
    listingFields.forEach(field => {
      const extracted = extractedData[field]
      const current = currentListing[field]
      const matches = extracted == current // Use loose equality to handle type differences
      const status = matches ? '✅' : (extracted === undefined ? '⚪' : '❌')
      console.log(`   ${status} ${field}: "${extracted}" vs "${current}"`)
    })

    console.log('\n🔍 Pricing comparison (first 3 offers):')
    const currentOffers = currentListing.lease_pricing || []
    const extractedOffers = extractedData.offers || []
    
    for (let i = 0; i < Math.min(3, Math.max(currentOffers.length, extractedOffers.length)); i++) {
      const current = currentOffers[i]
      const extracted = extractedOffers[i]
      
      console.log(`   Offer ${i + 1}:`)
      if (current && extracted) {
        console.log(`     Monthly: ${extracted.monthly_price} vs ${current.monthly_price} ${extracted.monthly_price == current.monthly_price ? '✅' : '❌'}`)
        console.log(`     Period: ${extracted.period_months} vs ${current.period_months} ${extracted.period_months == current.period_months ? '✅' : '❌'}`)
        console.log(`     Mileage: ${extracted.mileage_per_year} vs ${current.mileage_per_year} ${extracted.mileage_per_year == current.mileage_per_year ? '✅' : '❌'}`)
        
        const extractedPayment = extracted.first_payment || extracted.down_payment
        const currentPayment = current.first_payment || current.down_payment
        console.log(`     Payment: ${extractedPayment} vs ${currentPayment} ${extractedPayment == currentPayment ? '✅' : '❌'}`)
      } else if (extracted) {
        console.log(`     ❌ Missing in database: ${extracted.monthly_price}kr/md`)
      } else if (current) {
        console.log(`     ❌ Extra in database: ${current.monthly_price}kr/md`)
      }
    }

    console.log('\n📋 5. CONSTRAINT VALIDATION')
    console.log('=' .repeat(50))
    
    // Check if listing exists
    const { data: listingExists, error: existsError } = await supabase
      .from('listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .single()

    if (existsError) {
      console.log(`❌ Listing constraint issue: ${existsError.message}`)
    } else {
      console.log(`✅ Listing exists: ${listingExists.id}`)
      console.log(`✅ Seller ID: ${listingExists.seller_id}`)
    }

    // Check for unique constraint conflicts in lease_pricing
    if (extractedData.offers && extractedData.offers.length > 0) {
      console.log('\n🔍 Checking for unique constraint conflicts:')
      for (let i = 0; i < Math.min(3, extractedData.offers.length); i++) {
        const offer = extractedData.offers[i]
        
        const { data: conflictCheck, error: conflictError } = await supabase
          .from('lease_pricing')
          .select('id')
          .eq('listing_id', listingId)
          .eq('monthly_price', offer.monthly_price)
          .eq('period_months', offer.period_months || 36)
          .eq('mileage_per_year', offer.mileage_per_year || 15000)

        if (conflictError) {
          console.log(`   ❌ Error checking offer ${i + 1}: ${conflictError.message}`)
        } else {
          const conflictCount = conflictCheck ? conflictCheck.length : 0
          console.log(`   ${conflictCount > 0 ? '⚠️ ' : '✅'} Offer ${i + 1}: ${conflictCount} existing records`)
        }
      }
    }

    console.log('\n📋 6. RECOMMENDED FIXES')
    console.log('=' .repeat(50))
    
    const fixes = []
    
    // Check for payment field mapping issue
    if (extractedData.offers && extractedData.offers[0]) {
      const hasFirstPayment = extractedData.offers[0].hasOwnProperty('first_payment')
      const hasDownPayment = extractedData.offers[0].hasOwnProperty('down_payment')
      
      if (hasFirstPayment && !hasDownPayment) {
        fixes.push('🔧 Map first_payment to first_payment column (or add down_payment handling)')
      }
    }
    
    // Check for missing field updates
    const fieldsToUpdate = listingFields.filter(field => {
      const extracted = extractedData[field]
      const current = currentListing[field]
      return extracted !== undefined && extracted != current
    })
    
    if (fieldsToUpdate.length > 0) {
      fixes.push(`🔧 Ensure UPDATE query includes: ${fieldsToUpdate.join(', ')}`)
    }
    
    // Check pricing differences
    const pricingNeedsUpdate = extractedData.offers && 
      currentListing.lease_pricing && 
      (extractedData.offers.length !== currentListing.lease_pricing.length ||
       extractedData.offers[0]?.monthly_price != currentListing.lease_pricing[0]?.monthly_price)
    
    if (pricingNeedsUpdate) {
      fixes.push('🔧 Fix lease pricing DELETE/INSERT operations')
    }
    
    if (fixes.length === 0) {
      fixes.push('✅ No obvious issues found - check transaction rollback behavior')
    }
    
    fixes.forEach(fix => console.log(`   ${fix}`))

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message)
    process.exit(1)
  }
}

// Run the diagnostic
comprehensiveDiagnostic()