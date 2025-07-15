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

// Test data - simulate extracted cars with different offer scenarios
const testScenarios = [
  {
    name: "New car with multiple offers",
    extracted: {
      make: "Audi",
      model: "A3", 
      variant: "Sportback 35 TFSI",
      fuel_type: "gasoline",
      offers: [
        { monthly_price: 4299, period_months: 36, mileage_per_year: 15000 },
        { monthly_price: 3899, period_months: 48, mileage_per_year: 10000 }
      ]
    }
  },
  {
    name: "Price change on existing car",
    extracted: {
      make: "Toyota",
      model: "Yaris",
      variant: "1.5 Hybrid",
      fuel_type: "hybrid",
      offers: [
        { monthly_price: 3199, period_months: 36, mileage_per_year: 15000 }, // Changed from 3099
        { monthly_price: 2899, period_months: 48, mileage_per_year: 10000 }  // New offer
      ]
    }
  },
  {
    name: "Offer removed scenario",
    extracted: {
      make: "Volkswagen",
      model: "Golf",
      variant: "1.5 TSI",
      fuel_type: "gasoline", 
      offers: [
        { monthly_price: 3499, period_months: 36, mileage_per_year: 15000 } // Only one offer now
      ]
    }
  }
]

// Mock existing listings data
const mockExistingListings = [
  {
    make: "Toyota",
    model: "Yaris", 
    variant: "1.5 Hybrid",
    fuel_type: "hybrid",
    offers: [
      { monthly_price: 3099, period_months: 36, mileage_per_year: 15000 }
    ]
  },
  {
    make: "Volkswagen",
    model: "Golf",
    variant: "1.5 TSI", 
    fuel_type: "gasoline",
    offers: [
      { monthly_price: 3499, period_months: 36, mileage_per_year: 15000 },
      { monthly_price: 3199, period_months: 48, mileage_per_year: 10000 }
    ]
  }
]

// Simulate the offer comparison function
function compareOffers(existingOffers = [], extractedOffers = []) {
  const changes = {}
  let hasChanges = false

  console.log(`    Comparing ${existingOffers.length} existing offers with ${extractedOffers.length} extracted offers`)

  // If different number of offers, that's a change
  if (existingOffers.length !== extractedOffers.length) {
    hasChanges = true
    changes['offer_count'] = { 
      old: existingOffers.length, 
      new: extractedOffers.length 
    }
    console.log(`    ✅ Offer count change: ${existingOffers.length} → ${extractedOffers.length}`)
  }

  // Compare each offer position (sorted by monthly price)
  const sortedExisting = [...existingOffers].sort((a, b) => a.monthly_price - b.monthly_price)
  const sortedExtracted = [...extractedOffers].sort((a, b) => a.monthly_price - b.monthly_price)

  const maxOffers = Math.max(sortedExisting.length, sortedExtracted.length)
  
  for (let i = 0; i < maxOffers; i++) {
    const existing = sortedExisting[i]
    const extracted = sortedExtracted[i]
    
    if (!existing && extracted) {
      // New offer added
      hasChanges = true
      changes[`offer_${i + 1}_new`] = {
        old: null,
        new: `${extracted.monthly_price} kr/md (${extracted.period_months || '?'} mdr, ${extracted.mileage_per_year || '?'} km/år)`
      }
      console.log(`    ✅ New offer: ${extracted.monthly_price} kr/md`)
    } else if (existing && !extracted) {
      // Offer removed
      hasChanges = true
      changes[`offer_${i + 1}_removed`] = {
        old: `${existing.monthly_price} kr/md (${existing.period_months || '?'} mdr, ${existing.mileage_per_year || '?'} km/år)`,
        new: null
      }
      console.log(`    ✅ Removed offer: ${existing.monthly_price} kr/md`)
    } else if (existing && extracted) {
      // Compare offer details
      const fieldsToCompare = [
        { field: 'monthly_price', label: 'monthly_price' },
        { field: 'first_payment', label: 'first_payment' },
        { field: 'period_months', label: 'period_months' },
        { field: 'mileage_per_year', label: 'mileage_per_year' }
      ]

      for (const { field, label } of fieldsToCompare) {
        if (existing[field] !== extracted[field]) {
          hasChanges = true
          changes[`offer_${i + 1}_${label}`] = {
            old: existing[field] || '–',
            new: extracted[field] || '–'
          }
          console.log(`    ✅ ${label} change: ${existing[field]} → ${extracted[field]}`)
        }
      }
    }
  }

  // Add summary
  if (hasChanges) {
    const priceChanges = Object.entries(changes)
      .filter(([key]) => key.includes('monthly_price'))
      .map(([key, change]) => `${change.old} → ${change.new}`)
    
    if (priceChanges.length > 0) {
      changes['pricing_summary'] = {
        old: `${existingOffers.length} tilbud`,
        new: `${extractedOffers.length} tilbud (ændringer: ${priceChanges.slice(0, 3).join(', ')}${priceChanges.length > 3 ? '...' : ''})`
      }
    }
  }

  return { hasChanges, changes }
}

async function testOfferComparison() {
  console.log('🧪 Testing Enhanced Offer Comparison Logic\n')
  
  for (const scenario of testScenarios) {
    console.log(`📋 Testing: ${scenario.name}`)
    console.log(`   Car: ${scenario.extracted.make} ${scenario.extracted.model} ${scenario.extracted.variant}`)
    
    // Find matching existing listing
    const existingKey = `${scenario.extracted.make}|${scenario.extracted.model}|${scenario.extracted.variant}`.toLowerCase()
    const existing = mockExistingListings.find(listing => 
      `${listing.make}|${listing.model}|${listing.variant}`.toLowerCase() === existingKey
    )
    
    if (existing) {
      console.log(`   Found existing listing with ${existing.offers.length} offer(s)`)
      const comparison = compareOffers(existing.offers, scenario.extracted.offers)
      
      if (comparison.hasChanges) {
        console.log(`   🔄 Changes detected:`)
        for (const [field, change] of Object.entries(comparison.changes)) {
          if (field !== 'pricing_summary') {
            console.log(`     • ${field}: ${change.old} → ${change.new}`)
          }
        }
        if (comparison.changes.pricing_summary) {
          console.log(`   📊 Summary: ${comparison.changes.pricing_summary.new}`)
        }
      } else {
        console.log(`   ✅ No changes detected`)
      }
    } else {
      console.log(`   ➕ New car (not in existing listings)`)
    }
    
    console.log('')
  }
  
  console.log('🎉 Offer comparison test completed!')
}

async function main() {
  await testOfferComparison()
}

main().catch(console.error)