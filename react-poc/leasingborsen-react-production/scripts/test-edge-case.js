// Test the edge case that should have matched but didn't
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
  }

  // Remove fuel type modifiers
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

// Test the actual edge case from production
const existing = {
  make: 'Skoda',
  model: 'Kodiaq', 
  variant: 'Selection 2.0 TDI DSG7',
  horsepower: 150,
  transmission: 'automatic'
}

const extracted = {
  make: 'Skoda',
  model: 'Kodiaq',
  variant: 'Selection 2.0 TDI DSG7 150 HK', 
  horsepower: 150,
  transmission: 'automatic'
}

console.log('🔍 Edge Case Analysis: Same Car Treated as Different')
console.log('=====================================================')
console.log('Existing variant:', existing.variant)
console.log('Extracted variant:', extracted.variant)
console.log('Both have 150 HP and automatic transmission')
console.log()

const existingSpecs = extractSpecsFromVariant(existing.variant)
const extractedSpecs = extractSpecsFromVariant(extracted.variant)

console.log('📊 Variant Processing:')
console.log('Existing specs:', existingSpecs)
console.log('Extracted specs:', extractedSpecs)
console.log()

const existingKey = generateCompositeKey(existing.make, existing.model, existing.variant, existing.horsepower, existing.transmission)
const extractedKey = generateCompositeKey(extracted.make, extracted.model, extracted.variant, extracted.horsepower, extracted.transmission)

console.log('🔑 Composite Keys:')
console.log('Existing key:', existingKey)
console.log('Extracted key:', extractedKey)
console.log('Keys match:', existingKey === extractedKey ? '✅ YES' : '❌ NO')
console.log()

const confidence = calculateMatchConfidence(extracted, existing)
console.log('🎯 Confidence Calculation:')
console.log('Match confidence:', (confidence * 100).toFixed(1) + '%')
console.log('Would match algorithmically:', confidence >= 0.8 ? '✅ YES' : '❌ NO')
console.log()

console.log('🐛 Root Cause Analysis:')
if (existingKey === extractedKey) {
  console.log('✅ Composite keys match - should have been Level 2 match')
} else if (confidence >= 0.8) {
  console.log('✅ High confidence - should have been Level 3 match')
} else {
  console.log('❌ Neither composite keys nor confidence matching worked')
  console.log('🔍 Debugging:')
  console.log('   Core variants match:', existingSpecs.coreVariant.toLowerCase() === extractedSpecs.coreVariant.toLowerCase())
  console.log('   HP match:', existing.horsepower === extracted.horsepower)
  console.log('   Transmission match:', existing.transmission === extracted.transmission)
}