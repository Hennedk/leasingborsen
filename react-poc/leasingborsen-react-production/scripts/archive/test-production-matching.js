#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function testProductionMatching() {
  try {
    console.log('🧪 Testing Current Production Matching Logic')
    console.log('============================================')
    
    // Simulate the exact extracted car that was reported as "unmatched"
    const testExtractedCars = [
      {
        make: 'Skoda',
        model: 'Kodiaq',
        variant: 'Selection 2.0 TDI DSG7 150 HK',
        horsepower: 150,
        transmission: 'automatic',
        fuel_type: 'diesel',
        body_type: 'SUV',
        monthly_price: 5500
      }
    ]
    
    console.log('📤 Testing with extracted car:')
    console.log('  Make:', testExtractedCars[0].make)
    console.log('  Model:', testExtractedCars[0].model)
    console.log('  Variant:', testExtractedCars[0].variant)
    console.log('  HP:', testExtractedCars[0].horsepower)
    console.log('  Transmission:', testExtractedCars[0].transmission)
    console.log()
    
    // Call the production comparison function
    const { data, error } = await supabase.functions.invoke('compare-extracted-listings', {
      body: {
        extractedCars: testExtractedCars,
        sellerId: '11327fb8-4305-4156-8897-ddedb23e508b'
      }
    })
    
    if (error) {
      console.error('❌ Function call error:', error)
      return
    }
    
    console.log('📥 Production Function Results:')
    console.log('==============================')
    console.log('Total extracted:', data.summary.totalExtracted)
    console.log('New listings:', data.summary.newListings)
    console.log('Potential updates:', data.summary.potentialUpdates)
    console.log()
    
    if (data.newListings.length > 0) {
      console.log('🆕 New Listings (should be empty if matching works):')
      data.newListings.forEach((car, i) => {
        console.log(`  ${i + 1}. ${car.make} ${car.model} "${car.variant}"`)
      })
      console.log()
    }
    
    if (data.potentialUpdates.length > 0) {
      console.log('🔄 Potential Updates (should contain our test car):')
      data.potentialUpdates.forEach((update, i) => {
        console.log(`  ${i + 1}. "${update.extracted.variant}"`)
        console.log(`     → Matches existing: "${update.existing.variant}"`)
        console.log(`     → Method: ${update.matchMethod}`)
        console.log(`     → Confidence: ${(update.confidence * 100).toFixed(1)}%`)
        console.log(`     → Existing ID: ${update.existing.id}`)
      })
    }
    
    // Analyze the result
    console.log('\n🎯 Analysis:')
    console.log('------------')
    
    const kodiaqInNewListings = data.newListings.find(car => 
      car.make === 'Skoda' && 
      car.model === 'Kodiaq' && 
      car.variant === 'Selection 2.0 TDI DSG7 150 HK'
    )
    
    const kodiaqInUpdates = data.potentialUpdates.find(update => 
      update.extracted.make === 'Skoda' && 
      update.extracted.model === 'Kodiaq' && 
      update.extracted.variant === 'Selection 2.0 TDI DSG7 150 HK'
    )
    
    if (kodiaqInNewListings) {
      console.log('❌ PROBLEM: Kodiaq is in new listings (should be update)')
      console.log('   This means the production function is NOT using enhanced matching')
    } else if (kodiaqInUpdates) {
      console.log('✅ CORRECT: Kodiaq is in potential updates')
      console.log(`   Match method: ${kodiaqInUpdates.matchMethod}`)
      console.log(`   Confidence: ${(kodiaqInUpdates.confidence * 100).toFixed(1)}%`)
    } else {
      console.log('❓ UNEXPECTED: Kodiaq not found in either category')
    }
    
  } catch (error) {
    console.error('❌ Error testing production matching:', error.message)
  }
}

testProductionMatching()