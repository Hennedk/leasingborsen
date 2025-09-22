// Core database entity types
export interface Make {
  id: string
  name: string
}

export interface Model {
  id: string
  name: string
  make_id: string
}

export interface BodyType {
  id?: string
  name: string
}

export interface FuelType {
  id?: string
  name: string
}

export interface Transmission {
  id: string
  name: string
}

// Lease configuration types for URL sync
export interface LeaseConfigState {
  km: number          // Mileage per year (always defaults to 15000)
  mdr: number         // Term in months  
  udb: number         // Upfront deposit/payment
}

export interface LeaseConfigSearchParams {
  selectedDeposit?: number
  selectedMileage?: number
  selectedTerm?: number
}

export interface Colour {
  id: string
  name: string
}

// Reference data structure
export interface ReferenceData {
  makes?: Make[]
  models?: Model[]
  bodyTypes?: BodyType[]
  fuelTypes?: FuelType[]
  transmissions?: Transmission[]
}

// Car selection types for multi-select
export interface CarSelection {
  makeId: string
  makeName: string
  models: {
    id: string
    name: string
    makeId: string
    makeName: string
  }[]
}

// Filter options for searching (enhanced from original Filters)
export interface FilterOptions {
  makes: string[]
  models: string[]
  body_type: string[]
  fuel_type: string[]
  transmission: string[]
  price_min: number | null
  price_max: number | null
  seats_min: number | null
  seats_max: number | null
  horsepower_min: number | null
  horsepower_max: number | null
  mileage_selected: number | null  // Selected annual mileage (10000, 15000, etc.)
}

// Mileage filter types
export type MileageOption = 10000 | 15000 | 20000 | 25000 | 30000 | 35000 // 35000 represents 35k+
export const MILEAGE_OPTIONS: MileageOption[] = [10000, 15000, 20000, 25000, 30000, 35000]

// Legacy alias for backward compatibility
export type Filters = FilterOptions

// Car listing core data
export interface CarListingCore {
  listing_id?: string
  id?: string
  offer_id?: string
  make: string
  model: string
  variant?: string
  body_type: string
  fuel_type: string
  transmission: string
}

// Car listing database IDs
export interface CarListingIds {
  make_id?: string
  model_id?: string
  body_type_id?: string
  fuel_type_id?: string
  transmission_id?: string
  seller_id?: string
}

// Car specifications
export interface CarSpecifications {
  colour?: string
  color?: string // Alias for colour
  year?: number
  mileage?: number
  horsepower?: number
  drive_type?: 'fwd' | 'rwd' | 'awd'
  seats?: number
  doors?: number
  co2_emission?: number
  co2_tax_half_year?: number
  wltp?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
}

// Car listing status
export interface CarListingStatus {
  condition?: string
  listing_status?: string
  status?: string // Alias for listing_status
  availability_date?: string
}

// Lease pricing information
export interface LeasePricing {
  monthly_price?: number
  security_deposit?: number
  final_payment?: number
  excess_km_rate?: number
  total_lease_cost?: number
  mileage_per_year?: number
  first_payment?: number
  period_months?: number
  retail_price?: number
}

// Media and presentation
export interface CarMedia {
  image?: string
  images?: string[]
  processed_image_grid?: string
  processed_image_detail?: string
  thumbnail_base64?: string
  description?: string
  external_url?: string
}

// Seller information
export interface SellerInfo {
  seller_name?: string
  seller_phone?: string
  seller_location?: string
}

// Complete car listing (combination of all interfaces)
export interface CarListing extends 
  CarListingCore, 
  CarListingIds, 
  CarSpecifications, 
  CarListingStatus, 
  LeasePricing, 
  CarMedia, 
  SellerInfo {
  // Supabase timestamp fields
  created_at?: string
  updated_at?: string
  
  // Lease score fields
  lease_score?: number
  lease_score_calculated_at?: string
  lease_score_breakdown?: {
    totalScore: number
    monthlyRateScore: number
    monthlyRatePercent: number
    mileageScore: number
    mileageNormalized: number
    flexibilityScore: number
    pricing_id?: string
    calculation_version?: string
  }
  
  // Multiple offers tracking
  offer_count?: number
  has_multiple_offers?: boolean
  
  // Selected offer details (populated by query logic)
  selected_mileage?: number
  selected_term?: number
  selected_deposit?: number
  selected_monthly_price?: number
  selected_lease_score?: number | null
  offer_selection_method?: 'exact' | 'fallback' | 'closest' | 'none' | 'default'
  offer_selection_stage?: 'strict' | 'flexible' | 'cheapest'
  
  // Preserve original pricing for reference
  all_lease_pricing?: unknown[]
}

// API Response Types
export type SupabaseResponse<T> = {
  data: T[] | null
  error: Error | null
}

export type SupabaseSingleResponse<T> = {
  data: T | null
  error: Error | null
}

// Legacy response types for backward compatibility
export interface ListingsResponse {
  data: CarListing[]
  count?: number
  error?: string
}

export interface CountResponse {
  data: number
  error?: string
}

// Filter chip type
export interface FilterChip {
  key: string
  label: string
  value: string | number
}

// Sort options
export type SortOrder = 'price_asc' | 'price_desc' | 'newest' | 'score_desc' | 'lease_score_desc' | 'asc' | 'desc'

export interface SortOption {
  value: SortOrder
  label: string
}

// Lease option interface
export interface LeaseOption {
  mileage_per_year: number
  period_months: number
  first_payment: number
  monthly_price: number
}

// Lease option with calculated score
export interface LeaseOptionWithScore extends LeaseOption {
  lease_score?: number
}

// Basic seller info interface (renamed to avoid conflict with database Seller entity)
export interface SellerContact {
  name: string
  website: string
  phone: string
  email: string
  description: string
}

// Similar cars Edge Function types
export interface ScoredListing {
  listing_id: string
  make: string
  model: string
  variant: string
  monthly_price: number
  body_type: string
  fuel_type: string
  transmission: string
  score: number
  tier: string
  match_reasons: string[]
  image_url?: string
  horsepower?: number
  first_payment?: number
  period_months?: number
  mileage_per_year?: number
  selected_mileage?: number
  selected_term?: number
  selected_deposit?: number
  selected_lease_score?: number
  retail_price?: number
}

export interface SimilarCarsDebugInfo {
  source_car: unknown
  tier_results: {
    tier1: { candidates: number; selected: number; results: ScoredListing[] }
    tier2: { candidates: number; selected: number; results: ScoredListing[] }
    tier3: { candidates: number; selected: number; results: ScoredListing[] }
  }
  config_used: unknown
  performance: {
    query_time_ms: number
    processing_time_ms: number
    total_time_ms: number
  }
}

export interface SimilarCarsResponse {
  similar_cars: ScoredListing[]
  debug_info?: SimilarCarsDebugInfo
  total_results: number
  tiers_used: string[]
}
