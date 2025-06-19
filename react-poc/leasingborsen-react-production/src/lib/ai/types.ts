// AI Extraction Types for Vehicle Data
export interface AIExtractedVehicle {
  make: string
  model: string
  variant: string
  horsepower?: number
  
  // Technical specifications
  specifications: {
    co2_emission?: number
    fuel_consumption?: string
    range_km?: number
    is_electric: boolean
    transmission?: string
    fuel_type?: string
  }
  
  // Leasing offers
  offers: Array<{
    duration_months: number
    mileage_km: number
    monthly_price: number
    deposit?: number
    total_cost?: number
    min_price_12_months?: number
  }>
  
  // Extraction metadata
  confidence: number
  source_text?: string
}

export interface AIExtractionResult {
  vehicles: AIExtractedVehicle[]
  extraction_method: 'pattern' | 'ai' | 'hybrid'
  tokens_used?: number
  cost_estimate?: number
  processing_time_ms: number
  confidence_score: number
}

export interface AIUsageLog {
  id?: string
  batch_id?: string
  model: string
  tokens_used: number
  cost: number
  success: boolean
  error_message?: string
  created_at?: Date
}

export interface PromptTemplate {
  system: string
  user: string
  examples?: Array<{
    input: string
    output: AIExtractedVehicle
  }>
}

export interface CostLimits {
  monthly_budget: number
  per_pdf_limit: number
  warning_threshold: number
}