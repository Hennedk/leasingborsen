#!/usr/bin/env node

/**
 * Test Enhanced Fuzzy Matching for Skoda Octavia Case
 * 
 * This script demonstrates how the improved fuzzy identification system
 * would handle the "Skoda Octavia Combi Sportline 1.5 eTSI Mild Hybrid DSG7 150 HK" case
 */

// Mock functions that replicate the logic from compare-extracted-listings
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
    .replace(/\b(tsi|tfsi|tdi|fsi|etsi)\b/gi, '') // Remove engine type codes
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

function calculateMatchConfidence(extracted, existing) {
  let confidence = 0.0

  // Core variant similarity (most important)
  const extractedSpecs = extractSpecsFromVariant(extracted.variant)
  const existingSpecs = extractSpecsFromVariant(existing.variant)
  
  if (extractedSpecs.coreVariant.toLowerCase() === existingSpecs.coreVariant.toLowerCase()) {
    confidence += 0.4
  } else if (extractedSpecs.coreVariant.toLowerCase().includes(existingSpecs.coreVariant.toLowerCase()) ||
             existingSpecs.coreVariant.toLowerCase().includes(extractedSpecs.coreVariant.toLowerCase())) {
    confidence += 0.2
  }

  // Horsepower match (critical differentiator)
  const extractedHp = extracted.horsepower || extractedSpecs.horsepower
  const existingHp = existing.horsepower || existingSpecs.horsepower
  
  if (extractedHp && existingHp) {
    if (extractedHp === existingHp) {
      confidence += 0.3
    } else if (Math.abs(extractedHp - existingHp) <= 5) {
      confidence += 0.15 // Close HP might be rounding difference
    }
  }

  // Transmission match (critical differentiator)
  const extractedTrans = extracted.transmission || extractedSpecs.transmission
  const existingTrans = existing.transmission || existingSpecs.transmission
  
  if (extractedTrans && existingTrans) {
    if (extractedTrans === existingTrans) {
      confidence += 0.2
    }
  }

  // AWD match
  if (extractedSpecs.awd === existingSpecs.awd) {
    confidence += 0.1
  }

  return Math.min(confidence, 1.0)
}

// Test scenarios
console.log('🚗 Enhanced Fuzzy Matching Test for Skoda Octavia Case')
console.log('====================================================')

// Scenario 1: Existing listing with shorter variant name
const existingListing = {
  make: 'Skoda',
  model: 'Octavia',
  variant: 'Combi Sportline 1.5 eTSI',
  horsepower: 150,
  transmission: 'automatic',
  fuel_type: 'petrol'
}

// Scenario 2: Extracted from PDF with full details in variant
const extractedCar = {
  make: 'Skoda',
  model: 'Octavia', 
  variant: 'Combi Sportline 1.5 eTSI Mild Hybrid DSG7 150 HK',
  horsepower: 150,
  transmission: 'automatic',
  fuel_type: 'petrol'
}

console.log('\n📊 Testing Variant Processing:')
console.log('-------------------------------')
const existingSpecs = extractSpecsFromVariant(existingListing.variant)
const extractedSpecs = extractSpecsFromVariant(extractedCar.variant)

console.log('Existing listing specs:', existingSpecs)
console.log('Extracted car specs:', extractedSpecs)

console.log('\n🔑 Testing Key Generation:')
console.log('---------------------------')
const existingKey = generateCompositeKey(existingListing.make, existingListing.model, existingListing.variant, existingListing.horsepower, existingListing.transmission)
const extractedKey = generateCompositeKey(extractedCar.make, extractedCar.model, extractedCar.variant, extractedCar.horsepower, extractedCar.transmission)

console.log('Existing composite key:', existingKey)
console.log('Extracted composite key:', extractedKey)
console.log('Keys match:', existingKey === extractedKey ? '✅ YES' : '❌ NO')

console.log('\n🎯 Testing Confidence Calculation:')
console.log('-----------------------------------')
const confidence = calculateMatchConfidence(extractedCar, existingListing)
console.log('Match confidence:', (confidence * 100).toFixed(1) + '%')
console.log('High confidence match:', confidence >= 0.8 ? '✅ YES' : '❌ NO')

console.log('\n🔍 Multi-Level Matching Test:')
console.log('------------------------------')

// Test exact match on original variant
const exactKey1 = `${existingListing.make}|${existingListing.model}|${existingListing.variant}`.toLowerCase()
const exactKey2 = `${extractedCar.make}|${extractedCar.model}|${extractedCar.variant}`.toLowerCase()
console.log('Level 1 - Exact variant match:', exactKey1 === exactKey2 ? '✅ YES' : '❌ NO')

// Test composite key match  
console.log('Level 2 - Composite key match:', existingKey === extractedKey ? '✅ YES' : '❌ NO')

// Test algorithmic confidence
console.log('Level 3 - Algorithmic confidence ≥80%:', confidence >= 0.8 ? '✅ YES' : '❌ NO')

console.log('\n🏁 Summary:')
console.log('-----------')
if (exactKey1 === exactKey2) {
  console.log('✅ Would match at Level 1 (exact variant)')
} else if (existingKey === extractedKey) {
  console.log('✅ Would match at Level 2 (composite key)')
} else if (confidence >= 0.8) {
  console.log('✅ Would match at Level 3 (algorithmic fuzzy)')
} else {
  console.log('⚠️  Would require Level 4 (AI fuzzy matching)')
}

console.log('\nThis demonstrates how the enhanced system would properly identify')
console.log('"Skoda Octavia Combi Sportline 1.5 eTSI Mild Hybrid DSG7 150 HK"')
console.log('as an UPDATE to "Skoda Octavia Combi Sportline 1.5 eTSI" instead of a NEW listing.')

// Additional test cases
console.log('\n\n🧪 Additional Test Cases:')
console.log('=========================')

// Test Case 2: Different HP should be different cars
const test2Existing = {
  make: 'Volkswagen',
  model: 'Golf',
  variant: 'Style 1.5 TSI',
  horsepower: 130,
  transmission: 'manual'
}

const test2Extracted = {
  make: 'Volkswagen',
  model: 'Golf',
  variant: 'Style 1.5 TSI 150 HK',
  horsepower: 150,
  transmission: 'manual'
}

const test2Key1 = generateCompositeKey(test2Existing.make, test2Existing.model, test2Existing.variant, test2Existing.horsepower, test2Existing.transmission)
const test2Key2 = generateCompositeKey(test2Extracted.make, test2Extracted.model, test2Extracted.variant, test2Extracted.horsepower, test2Extracted.transmission)

console.log('\nTest Case 2: Different HP = Different Cars')
console.log('Existing:', test2Existing.variant, `(${test2Existing.horsepower} HP)`)
console.log('Extracted:', test2Extracted.variant)
console.log('Keys match:', test2Key1 === test2Key2 ? '❌ NO (ERROR - should be different!)' : '✅ NO (correct - different HP)')

// Test Case 3: AWD vs FWD should be different
const test3Existing = {
  make: 'Audi',
  model: 'A4',
  variant: 'Sport 2.0 TFSI',
  horsepower: 190,
  transmission: 'automatic'
}

const test3Extracted = {
  make: 'Audi',
  model: 'A4',
  variant: 'Sport 2.0 TFSI quattro',
  horsepower: 190,
  transmission: 'automatic'
}

const test3Key1 = generateCompositeKey(test3Existing.make, test3Existing.model, test3Existing.variant, test3Existing.horsepower, test3Existing.transmission)
const test3Key2 = generateCompositeKey(test3Extracted.make, test3Extracted.model, test3Extracted.variant, test3Extracted.horsepower, test3Extracted.transmission)

console.log('\nTest Case 3: AWD vs FWD = Different Cars')
console.log('Existing:', test3Existing.variant, '(FWD)')
console.log('Extracted:', test3Extracted.variant, '(AWD)')
console.log('Keys match:', test3Key1 === test3Key2 ? '❌ NO (ERROR - should be different!)' : '✅ NO (correct - different drivetrain)')

// Test Case 4: Manual vs Automatic should be different
const test4Existing = {
  make: 'Toyota',
  model: 'Corolla',
  variant: 'Active 1.8 Hybrid',
  horsepower: 140,
  transmission: 'automatic'
}

const test4Extracted = {
  make: 'Toyota',
  model: 'Corolla',
  variant: 'Active 1.8 Hybrid Manual',
  horsepower: 140,
  transmission: 'manual'
}

const test4Key1 = generateCompositeKey(test4Existing.make, test4Existing.model, test4Existing.variant, test4Existing.horsepower, test4Existing.transmission)
const test4Key2 = generateCompositeKey(test4Extracted.make, test4Extracted.model, test4Extracted.variant, test4Extracted.horsepower, test4Extracted.transmission)

console.log('\nTest Case 4: Manual vs Automatic = Different Cars')
console.log('Existing:', test4Existing.variant, `(${test4Existing.transmission})`)
console.log('Extracted:', test4Extracted.variant)
console.log('Keys match:', test4Key1 === test4Key2 ? '❌ NO (ERROR - should be different!)' : '✅ NO (correct - different transmission)')