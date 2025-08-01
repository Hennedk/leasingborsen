/**
 * Calculate total price consistently using the formula: (period_months × monthly_price) + first_payment
 */
export function calculateTotalPrice(monthlyPrice: number, periodMonths: number, firstPayment?: number): number {
  return (periodMonths * monthlyPrice) + (firstPayment || 0)
}

/**
 * Normalize offer data from either array or object format
 */
export function normalizeOffer(offer: any) {
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

/**
 * Compare two offer arrays to detect if content has changed
 */
export function compareOfferArrays(extractedOffers: any[], existingOffers: any[]): boolean {
  if (!extractedOffers || !existingOffers) return true
  if (extractedOffers.length !== existingOffers.length) return true
  
  // Normalize both arrays to object format
  const normalizedExtracted = extractedOffers.map(normalizeOffer)
  const normalizedExisting = existingOffers.map(normalizeOffer)
  
  // Sort both arrays by multiple fields for consistent comparison
  const sortComparator = (a: any, b: any) => {
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
    if (extracted.monthly_price !== existing.monthly_price) return true
    if (extracted.first_payment !== existing.first_payment) return true
    if (extracted.period_months !== existing.period_months) return true
    if (extracted.mileage_per_year !== existing.mileage_per_year) return true
  }
  
  return false
}

/**
 * Check if two offers are equal
 */
export function offersEqual(offer1: any, offer2: any): boolean {
  const normalized1 = normalizeOffer(offer1)
  const normalized2 = normalizeOffer(offer2)
  
  return normalized1.monthly_price === normalized2.monthly_price &&
         normalized1.first_payment === normalized2.first_payment &&
         normalized1.period_months === normalized2.period_months &&
         normalized1.mileage_per_year === normalized2.mileage_per_year
}