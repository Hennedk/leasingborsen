// Test the production fix for the Skoda edge case
// This simulates the enhanced fuzzy matching logic now in ai-extract-vehicles

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

function calculateMatchConfidence(extractedCar, existingListing) {
  let confidence = 0.0

  // Core variant similarity (most important)
  const extractedSpecs = extractSpecsFromVariant(extractedCar.variant)
  const existingSpecs = extractSpecsFromVariant(existingListing.variant)
  
  if (extractedSpecs.coreVariant.toLowerCase() === existingSpecs.coreVariant.toLowerCase()) {
    confidence += 0.4
  } else if (extractedSpecs.coreVariant.toLowerCase().includes(existingSpecs.coreVariant.toLowerCase()) ||
             existingSpecs.coreVariant.toLowerCase().includes(extractedSpecs.coreVariant.toLowerCase())) {
    confidence += 0.2
  }

  // Horsepower match (critical differentiator)
  const extractedHp = extractedCar.horsepower || extractedSpecs.horsepower
  const existingHp = existingListing.horsepower || existingSpecs.horsepower
  
  if (extractedHp && existingHp) {
    if (extractedHp === existingHp) {
      confidence += 0.3
    } else if (Math.abs(extractedHp - existingHp) <= 5) {
      confidence += 0.15 // Close HP might be rounding difference
    }
  }

  // Transmission match (critical differentiator)
  const extractedTrans = extractedCar.transmission || extractedSpecs.transmission
  const existingTrans = existingListing.transmission || existingSpecs.transmission
  
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

// Simulate the production edge case that failed
console.log('🚀 Testing Production Fix for Skoda Edge Case')
console.log('==============================================')

// Simulate existing listing in database
const existingListing = {
  make: 'Skoda',
  model: 'Kodiaq',
  variant: 'Selection 2.0 TDI DSG7',
  horsepower: 150,
  transmission: 'automatic',
  listing_id: '86d7ffa9-96d2-409f-93ce-dca0b2c3a958'
}

// Simulate extracted car from PDF
const extractedCar = {
  make: 'Skoda',
  model: 'Kodiaq',
  variant: 'Selection 2.0 TDI DSG7 150 HK',
  horsepower: 150,
  transmission: 'automatic'
}

console.log('📋 Test Scenario:')
console.log('Existing DB:', `"${existingListing.variant}" (${existingListing.horsepower} HP)`)
console.log('Extracted:', `"${extractedCar.variant}" (${extractedCar.horsepower} HP)`)
console.log()

// Simulate the enhanced multi-level matching
console.log('🔍 Multi-Level Matching Simulation:')
console.log()

// Level 1: Exact match
const exactKey1 = `${existingListing.make}|${existingListing.model}|${existingListing.variant}`.toLowerCase()
const exactKey2 = `${extractedCar.make}|${extractedCar.model}|${extractedCar.variant}`.toLowerCase()
const level1Match = exactKey1 === exactKey2

console.log('Level 1 - Exact variant match:', level1Match ? '✅ MATCH' : '❌ NO MATCH')

if (!level1Match) {
  // Level 2: Composite key match
  const existingComposite = generateCompositeKey(
    existingListing.make,
    existingListing.model,
    existingListing.variant,
    existingListing.horsepower,
    existingListing.transmission
  )
  
  const extractedComposite = generateCompositeKey(
    extractedCar.make,
    extractedCar.model,
    extractedCar.variant,
    extractedCar.horsepower,
    extractedCar.transmission
  )
  
  const level2Match = existingComposite === extractedComposite
  console.log('Level 2 - Composite key match:', level2Match ? '✅ MATCH (95% confidence)' : '❌ NO MATCH')
  console.log('  Existing composite:', existingComposite)
  console.log('  Extracted composite:', extractedComposite)
  
  if (!level2Match) {
    // Level 3: Algorithmic confidence
    const confidence = calculateMatchConfidence(extractedCar, existingListing)
    const level3Match = confidence >= 0.8
    console.log('Level 3 - Algorithmic match:', level3Match ? `✅ MATCH (${(confidence * 100).toFixed(1)}% confidence)` : '❌ NO MATCH')
  }
}

console.log()
console.log('🎯 Expected Result with Enhanced Logic:')
console.log('--------------------------------------')

const compositeKeyMatch = generateCompositeKey(
  existingListing.make,
  existingListing.model,
  existingListing.variant,
  existingListing.horsepower,
  existingListing.transmission
) === generateCompositeKey(
  extractedCar.make,
  extractedCar.model,
  extractedCar.variant,
  extractedCar.horsepower,
  extractedCar.transmission
)

if (compositeKeyMatch) {
  console.log('✅ Would match at Level 2 (composite key)')
  console.log('📝 Change type: UPDATE (not CREATE)')
  console.log('🔧 Match method: fuzzy')
  console.log('📊 Confidence: 95%')
  console.log('📋 Field changes: variant name updated')
} else {
  const confidence = calculateMatchConfidence(extractedCar, existingListing)
  if (confidence >= 0.8) {
    console.log('✅ Would match at Level 3 (algorithmic)')
    console.log('📝 Change type: UPDATE (not CREATE)')
    console.log('🔧 Match method: fuzzy')
    console.log(`📊 Confidence: ${(confidence * 100).toFixed(1)}%`)
  } else {
    console.log('❌ Would still not match - needs further investigation')
  }
}

console.log()
console.log('🏁 Summary:')
console.log('The enhanced fuzzy matching logic in ai-extract-vehicles should now')
console.log('correctly identify "Selection 2.0 TDI DSG7 150 HK" as an UPDATE to')
console.log('"Selection 2.0 TDI DSG7" instead of creating a NEW listing.')