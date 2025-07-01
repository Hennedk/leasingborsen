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
}

// Legacy alias for backward compatibility
export interface Filters extends FilterOptions {}

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
}

// Media and presentation
export interface CarMedia {
  image?: string
  thumbnail_base64?: string
  description?: string
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
  SellerInfo {}

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
export type SortOrder = '' | 'desc'

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

// Basic seller info interface (renamed to avoid conflict with database Seller entity)
export interface SellerContact {
  name: string
  website: string
  phone: string
  email: string
  description: string
}