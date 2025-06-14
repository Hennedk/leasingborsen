// Database entity types
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
  name: string
}

export interface FuelType {
  name: string
}

// Reference data structure
export interface ReferenceData {
  makes?: Make[]
  models?: Model[]
  bodyTypes?: BodyType[]
  fuelTypes?: FuelType[]
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

// Filter types
export interface Filters {
  makes: string[]
  models: string[]
  body_type: string[]
  fuel_type: string[]
  transmission: string[]
  price_min: number | null
  price_max: number | null
  seats_min: number | null
  seats_max: number | null
}

// Car listing types
export interface CarListing {
  listing_id?: string
  id?: string
  make: string
  model: string
  variant?: string
  monthly_price?: number
  mileage_per_year?: number
  first_payment?: number
  fuel_type?: string
  transmission?: string
  body_type?: string
  horsepower?: number
  seats?: number
  image?: string
  thumbnail_base64?: string
  year?: number
  colour?: string
  color?: string
  doors?: number
  drive_type?: string
  wltp?: number
  co2_emission?: number
  consumption_l_100km?: number
  consumption_kwh_100km?: number
  co2_tax_half_year?: number
  period_months?: number
  description?: string
}

// API response types
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

// Seller interface
export interface Seller {
  name: string
  website: string
  phone: string
  email: string
  description: string
}