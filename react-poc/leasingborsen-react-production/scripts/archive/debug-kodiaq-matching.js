#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

// Enhanced fuzzy matching utilities (from the Edge Function)
function extractSpecsFromVariant(variant) {
  const original = variant.toLowerCase()
  let coreVariant = variant
  let horsepower
  let transmission
  let awd = false

  // Extract horsepower (150 HK, 150HK, 150 hp)
  const hpMatch = original.match(/(\d+)\s*(?:hk|hp)\b/i)
  if (hpMatch) {
    horsepower = parseInt(hpMatch[1])
    coreVariant = coreVariant.replace(new RegExp(hpMatch[0], 'gi'), '').trim()
  }

  // Extract transmission info
  if (original.includes('dsg') || original.includes('s tronic') || original.includes('automatgear')) {
    transmission = 'automatic'
    coreVariant = coreVariant.replace(/\b(?:dsg\d*|s[\s-]?tronic|automatgear)\b/gi, '').trim()
  } else if (original.includes('manual')) {
    transmission = 'manual'
    coreVariant = coreVariant.replace(/\bmanual\b/gi, '').trim()
  }

  // Check for AWD/4WD indicators
  if (original.includes('quattro') || original.includes('4motion') || original.includes('awd') || 
      original.includes('4wd') || original.includes('xdrive') || original.includes('allrad')) {
    awd = true
    coreVariant = coreVariant.replace(/\b(?:quattro|4motion|awd|4wd|xdrive|allrad)\b/gi, '').trim()
  }

  // Remove fuel type modifiers that are redundant
  coreVariant = coreVariant
    .replace(/\b(mild\s*hybrid|hybrid|phev|ev|e-tron)\b/gi, '')
    .replace(/\b(tsi|tfsi|tdi|fsi|etsi)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .trim()

  return { coreVariant, horsepower, transmission, awd }
}

function generateCompositeKey(make, model, variant, horsepower, transmission) {
  const specs = extractSpecsFromVariant(variant)
  const hp = horsepower || specs.horsepower
  const trans = transmission || specs.transmission
  
  let key = `${make}|${model}|${specs.coreVariant}`.toLowerCase()
  if (hp) key += `|${hp}hp`
  if (trans) key += `|${trans}`
  if (specs.awd) key += `|awd`
  
  return key
}

async function debugKodiaqMatching() {
  try {
    console.log('🔍 Debugging Kodiaq Matching Issue')
    console.log('==================================')
    
    // 1. Get all Kodiaq listings from database
    const { data: kodiaqListings, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('make', 'Skoda')
      .eq('model', 'Kodiaq')
      .eq('seller_id', '11327fb8-4305-4156-8897-ddedb23e508b')
    
    if (error) throw error
    
    console.log(`\n📋 Found ${kodiaqListings.length} Kodiaq listings in database:`)
    
    kodiaqListings.forEach((listing, i) => {
      console.log(`${i + 1}. "${listing.variant}" (${listing.horsepower} HP, ${listing.transmission})`)
      console.log(`   ID: ${listing.listing_id}`)
      console.log(`   Exact key: ${listing.make.toLowerCase()}|${listing.model.toLowerCase()}|${listing.variant.toLowerCase()}`)
      
      const compositeKey = generateCompositeKey(listing.make, listing.model, listing.variant, listing.horsepower, listing.transmission)
      console.log(`   Composite key: ${compositeKey}`)
      console.log()
    })
    
    // 2. Simulate the problematic extracted car
    const extractedCar = {
      make: 'Skoda',
      model: 'Kodiaq',
      variant: 'Selection 2.0 TDI DSG7 150 HK',
      horsepower: 150,
      transmission: 'automatic'
    }
    
    console.log('🚗 Extracted Car (from production logs):')
    console.log(`   "${extractedCar.variant}" (${extractedCar.horsepower} HP, ${extractedCar.transmission})`)
    
    const extractedExactKey = `${extractedCar.make}|${extractedCar.model}|${extractedCar.variant}`.toLowerCase()
    const extractedCompositeKey = generateCompositeKey(extractedCar.make, extractedCar.model, extractedCar.variant, extractedCar.horsepower, extractedCar.transmission)
    
    console.log(`   Exact key: ${extractedExactKey}`)
    console.log(`   Composite key: ${extractedCompositeKey}`)
    console.log()
    
    // 3. Test matching logic
    console.log('🔍 Testing Matching Logic:')
    console.log('-------------------------')
    
    let level1Match = null
    let level2Match = null
    
    // Level 1: Exact match
    kodiaqListings.forEach(listing => {
      const listingExactKey = `${listing.make}|${listing.model}|${listing.variant}`.toLowerCase()
      if (listingExactKey === extractedExactKey) {
        level1Match = listing
      }
    })
    
    console.log('Level 1 - Exact match:', level1Match ? `✅ MATCH with "${level1Match.variant}"` : '❌ NO MATCH')
    
    // Level 2: Composite key match
    kodiaqListings.forEach(listing => {
      const listingCompositeKey = generateCompositeKey(listing.make, listing.model, listing.variant, listing.horsepower, listing.transmission)
      if (listingCompositeKey === extractedCompositeKey) {
        level2Match = listing
      }
    })
    
    console.log('Level 2 - Composite match:', level2Match ? `✅ MATCH with "${level2Match.variant}"` : '❌ NO MATCH')
    
    if (level2Match) {
      console.log(`   Matched listing ID: ${level2Match.listing_id}`)
      console.log(`   Match confidence: 95%`)
    }
    
    // 4. Detailed analysis
    console.log('\n🔬 Detailed Variant Analysis:')
    console.log('-----------------------------')
    
    kodiaqListings.forEach(listing => {
      const listingSpecs = extractSpecsFromVariant(listing.variant)
      const extractedSpecs = extractSpecsFromVariant(extractedCar.variant)
      
      console.log(`\nComparing with: "${listing.variant}"`)
      console.log(`  Listing specs:`, listingSpecs)
      console.log(`  Extracted specs:`, extractedSpecs)
      console.log(`  Core variants match:`, listingSpecs.coreVariant.toLowerCase() === extractedSpecs.coreVariant.toLowerCase())
      console.log(`  HP match:`, (listing.horsepower || listingSpecs.horsepower) === (extractedCar.horsepower || extractedSpecs.horsepower))
      console.log(`  Transmission match:`, (listing.transmission || listingSpecs.transmission) === (extractedCar.transmission || extractedSpecs.transmission))
    })
    
    // 5. Expected outcome
    console.log('\n🎯 Expected Outcome:')
    console.log('-------------------')
    if (level1Match) {
      console.log('✅ Should be treated as UPDATE (exact match)')
    } else if (level2Match) {
      console.log('✅ Should be treated as UPDATE (composite key match)')
    } else {
      console.log('❌ Would be treated as CREATE (no match found)')
      console.log('🚨 This indicates a problem with the production matching logic!')
    }
    
  } catch (error) {
    console.error('❌ Error debugging:', error.message)
  }
}

debugKodiaqMatching()