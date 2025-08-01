#!/usr/bin/env node

// Test the fixed comparison logic with your exact data

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
  
  console.log('\n🔧 Sorted arrays for comparison:')
  console.log('Extracted (first 3):')
  sortedExtracted.slice(0, 3).forEach((offer, i) => {
    console.log(`  ${i+1}. [${offer.monthly_price}, ${offer.first_payment}, ${offer.period_months}, ${offer.mileage_per_year}]`)
  })
  console.log('Existing (first 3):')
  sortedExisting.slice(0, 3).forEach((offer, i) => {
    console.log(`  ${i+1}. [${offer.monthly_price}, ${offer.first_payment}, ${offer.period_months}, ${offer.mileage_per_year}]`)
  })
  
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

// Your exact data - Existing offers (sorted by down payment first)
const existingOffers = [
  [4995, 4995, 36, 10000],
  [4895, 14995, 36, 10000],
  [4095, 29995, 36, 10000],
  [3395, 49995, 36, 10000],
  [5345, 4995, 36, 15000],
  [5695, 4995, 36, 20000],
  [6145, 4995, 36, 25000],
  [6595, 4995, 36, 30000],
  [5245, 14995, 36, 15000],
  [5595, 14995, 36, 20000],
  [6045, 14995, 36, 25000],
  [6495, 14995, 36, 30000],
  [4445, 29995, 36, 15000],
  [4795, 29995, 36, 20000],
  [5245, 29995, 36, 25000],
  [5695, 29995, 36, 30000],
  [3745, 49995, 36, 15000],
  [4095, 49995, 36, 20000],
  [4545, 49995, 36, 25000],
  [4995, 49995, 36, 30000]
]

// Your exact data - Extracted offers (sorted by mileage first)  
const extractedOffers = [
  [4995, 4995, 36, 10000],
  [5345, 4995, 36, 15000],
  [5695, 4995, 36, 20000],
  [6845, 4995, 36, 25000], // NOTE: This differs from existing (6145 vs 6845)
  [8295, 4995, 36, 30000], // NOTE: This differs from existing (6595 vs 8295)
  [4895, 14995, 36, 10000],
  [5245, 14995, 36, 15000],
  [5595, 14995, 36, 20000],
  [6745, 14995, 36, 25000], // NOTE: This differs from existing (6045 vs 6745)
  [8195, 14995, 36, 30000], // NOTE: This differs from existing (6495 vs 8195)
  [4095, 29995, 36, 10000],
  [4445, 29995, 36, 15000],
  [4795, 29995, 36, 20000],
  [5945, 29995, 36, 25000], // NOTE: This differs from existing (5245 vs 5945)
  [7395, 29995, 36, 30000], // NOTE: This differs from existing (5695 vs 7395)
  [3395, 49995, 36, 10000],
  [3745, 49995, 36, 15000],
  [4095, 49995, 36, 20000],
  [5245, 49995, 36, 25000], // NOTE: This differs from existing (4545 vs 5245)
  [6695, 49995, 36, 30000]  // NOTE: This differs from existing (4995 vs 6695)
]

console.log('🧪 Testing comparison with your exact data...')
console.log(`Existing offers: ${existingOffers.length}`)
console.log(`Extracted offers: ${extractedOffers.length}`)

const result = compareOfferArrays(extractedOffers, existingOffers)

if (result) {
  console.log('\n❌ Arrays detected as DIFFERENT')
} else {
  console.log('\n✅ Arrays detected as IDENTICAL')
}