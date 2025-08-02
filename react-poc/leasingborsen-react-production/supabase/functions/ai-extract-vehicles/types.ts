// TypeScript interfaces for AI Extraction with Responses API

// Individual vehicle offer interface
export interface VehicleOffer {
  monthly_price: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  total_price?: number | null  // Calculated dynamically, not extracted
}

// Individual extracted vehicle interface with variant tracking
export interface ExtractedVehicle {
  make: string
  model: string
  variant: string
  horsepower?: number
  fuel_type: string
  transmission: string
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  offers: VehicleOffer[]
  
  // Variant tracking fields
  variantSource: "existing" | "reference" | "inferred"
  variantConfidence: number
  variantMatchDetails?: {
    matchedId?: string
    matchScore?: number
    matchCriteria?: string[]
  }
}

// Main extraction response interface
export interface ExtractionResponse {
  cars: ExtractedVehicle[]
  metadata?: {
    extractionTime: number
    tokensUsed: number
    apiVersion: string
  }
}

// Compact format for AI output (using numeric codes)
export interface CompactVehicleOffer extends Array<any> {
  0: number  // monthly_price
  1: number  // first_payment
  2: number  // period_months
  3: number  // mileage_per_year
}

export interface CompactExtractedVehicle {
  make: string
  model: string
  variant: string
  hp?: number
  ft: number  // fuel_type code
  tr: number  // transmission code
  wltp?: number
  co2?: number
  l100?: number
  kwh100?: number
  tax?: number
  offers: CompactVehicleOffer[]
}

export interface CompactExtractionResponse {
  cars: CompactExtractedVehicle[]
}

// Mapping constants
export const FUEL_TYPE_MAP = {
  1: 'Electric',
  2: 'Hybrid - Petrol',
  3: 'Petrol',
  4: 'Diesel',
  5: 'Hybrid - Diesel',
  6: 'Plug-in - Petrol',
  7: 'Plug-in - Diesel'
} as const

export const TRANSMISSION_MAP = {
  1: 'Automatic',
  2: 'Manual'
} as const

// BODY_TYPE_MAP removed - body type no longer extracted from PDFs
// Body types can still be set manually through admin interface

// Responses API specific types
export interface ResponsesAPIConfig {
  promptId: string
  promptVersion: number
  useResponsesAPI: boolean
}

// Context data for dynamic injection
export interface ExtractionContext {
  dealerName?: string
  fileName?: string
  referenceData?: {
    makes_models?: Record<string, any>
    fuel_types?: string[]
    transmissions?: string[]
  }
  existingListings?: {
    existing_listings: Array<{
      make: string
      model: string
      variant: string
      horsepower?: number
      fuel_type: string
      transmission: string
    }>
  }
}

// Variant resolution result
export interface VariantResolution {
  source: "existing" | "reference" | "inferred"
  confidence: number
  matchDetails?: {
    matchedId?: string
    matchScore?: number
    matchCriteria?: string[]
  }
  suggestedVariant?: string
  reason?: string
}

// Feature flag configuration
export interface FeatureFlagConfig {
  enabled: boolean
  rolloutPercentage: number
  dealerOverrides?: string[]
  excludedDealers?: string[]
}

// Monitoring interface removed - migration_metrics table no longer exists
// Core monitoring continues via api_call_logs in responsesConfigManager.ts

// Error types specific to Responses API
export interface ResponsesAPIError {
  type: 'schema_validation' | 'prompt_not_found' | 'version_mismatch' | 'api_error'
  message: string
  details?: any
  fallbackUsed: boolean
}