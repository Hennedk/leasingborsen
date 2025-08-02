// Enhanced interface with variant tracking
export interface ExtractedCar {
  make: string
  model: string
  variant: string
  horsepower?: number
  fuel_type: string
  transmission: string
  seats?: number
  doors?: number
  year?: number
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  monthly_price?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  offers?: Array<{
    monthly_price: number
    first_payment?: number
    period_months?: number
    mileage_per_year?: number
  }>
  // Variant tracking fields
  variantSource?: "existing" | "reference" | "inferred"
  variantConfidence?: number
  variantMatchDetails?: {
    matchedId?: string
    matchScore?: number
    matchCriteria?: string[]
  }
  // For enrichment
  make_id?: string
  model_id?: string
}

export interface ExistingListing {
  id: string
  make: string
  model: string
  variant: string
  horsepower?: number
  fuel_type: string
  transmission: string
  year?: number
  wltp?: number
  co2_emission?: number
  co2_tax_half_year?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  monthly_price?: number
  offers: any[]
}

export interface ListingMatch {
  extracted: ExtractedCar | null
  existing: ExistingListing | null
  confidence: number
  matchMethod: string
  changeType: 'create' | 'update' | 'unchanged' | 'missing_model' | 'delete'
  changes?: Record<string, { old: any; new: any }>
  // Variant tracking fields
  variantTracking?: {
    source: "existing" | "reference" | "inferred" | "unknown"
    confidence: number
    details?: any
  }
}

export interface ComparisonRequest {
  extractedCars: ExtractedCar[]
  sellerId?: string
  sessionName?: string
}

export interface ComparisonResult {
  matches: ListingMatch[]
  summary: {
    totalExtracted: number
    totalExisting: number
    totalMatched: number
    totalNew: number
    totalUpdated: number
    totalUnchanged: number
    totalDeleted: number
    totalMissingModels: number
    exactMatches: number
    fuzzyMatches: number
    // Variant tracking summary
    variantSources?: {
      existing: number
      reference: number
      inferred: number
      unknown: number
    }
    avgVariantConfidence?: number
  }
}