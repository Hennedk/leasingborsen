import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface CarListing {
  listing_id?: string
  id?: string
  offer_id?: string
  make: string
  model: string
  variant?: string
  body_type: string
  fuel_type: string
  transmission: string
  colour?: string
  color?: string // Alias for colour
  year?: number
  mileage?: number
  horsepower?: number
  drive_type?: 'fwd' | 'rwd' | 'awd'
  condition?: string
  listing_status?: string
  status?: string // Alias for listing_status
  availability_date?: string
  security_deposit?: number
  final_payment?: number
  excess_km_rate?: number
  total_lease_cost?: number
  mileage_per_year?: number
  first_payment?: number
  period_months?: number
  monthly_price?: number
  image?: string
  thumbnail_base64?: string
  seats?: number
  co2_emission?: number
  co2_tax_half_year?: number
  wltp?: number
  description?: string
  seller_name?: string
  seller_location?: string
}

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

export interface Transmission {
  name: string
}

export interface Colour {
  name: string
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

// Body type mapping - maps consolidated categories to database values
const BODY_TYPE_MAPPING: Record<string, string[]> = {
  'Mikro': ['Microcar', 'Test karosseri'],
  'Stationcar': ['Stationcar', 'Station Wagon'],
  'SUV': ['SUV'],
  'Crossover (CUV)': ['CUV', 'Crossover'],
  'Minibus (MPV)': ['Minivan', 'MPV'],
  'Sedan': ['Sedan', 'Personbil'],
  'Hatchback': ['Hatchback'],
  'Cabriolet': ['Cabriolet'],
  'Coupe': ['Coupe']
}

// Fuel type mapping - maps consolidated categories to database values
const FUEL_TYPE_MAPPING: Record<string, string[]> = {
  'Electric': ['Electric', 'Elektrisk', 'EV', 'Battery Electric', 'BEV'],
  'Hybrid': ['Hybrid', 'Plugin Hybrid', 'PHEV', 'Mild Hybrid', 'HEV', 'Plug-in Hybrid'],
  'Benzin': ['Benzin', 'Gasoline', 'Petrol', 'Gas'],
  'Diesel': ['Diesel'],
  'Others': ['Gas', 'CNG', 'LPG', 'Hydrogen', 'Fuel Cell', 'Other', 'Andre']
}

// Helper function to convert consolidated body types to database values
function expandBodyTypes(consolidatedTypes: string[]): string[] {
  const expandedTypes: string[] = []
  consolidatedTypes.forEach(type => {
    const mappedTypes = BODY_TYPE_MAPPING[type] || [type]
    expandedTypes.push(...mappedTypes)
  })
  return [...new Set(expandedTypes)] // Remove duplicates
}

// Helper function to convert consolidated fuel types to database values
function expandFuelTypes(consolidatedTypes: string[]): string[] {
  const expandedTypes: string[] = []
  consolidatedTypes.forEach(type => {
    const mappedTypes = FUEL_TYPE_MAPPING[type] || [type]
    expandedTypes.push(...mappedTypes)
  })
  return [...new Set(expandedTypes)] // Remove duplicates
}

// Query Builders with Types
export class CarListingQueries {
  static async getListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder = '', offset = 0) {
    let query = supabase
      .from('full_listing_view')
      .select('*')

    // Apply make filters
    if (filters.makes && filters.makes.length > 0) {
      query = query.in('make', filters.makes)
    }
    
    // Apply model filters
    if (filters.models && filters.models.length > 0) {
      query = query.in('model', filters.models)
    }
    if (filters.body_type && filters.body_type.length > 0) {
      const expandedBodyTypes = expandBodyTypes(filters.body_type)
      query = query.in('body_type', expandedBodyTypes)
    }
    if (filters.fuel_type && filters.fuel_type.length > 0) {
      const expandedFuelTypes = expandFuelTypes(filters.fuel_type)
      query = query.in('fuel_type', expandedFuelTypes)
    }
    if (filters.transmission && filters.transmission.length > 0) {
      query = query.in('transmission', filters.transmission)
    }
    if (filters.price_min !== null && filters.price_min !== undefined) {
      query = query.gte('monthly_price', filters.price_min)
    }
    if (filters.price_max !== null && filters.price_max !== undefined) {
      query = query.lte('monthly_price', filters.price_max)
    }
    if (filters.seats_min !== null && filters.seats_min !== undefined) {
      query = query.gte('seats', filters.seats_min)
    }
    if (filters.seats_max !== null && filters.seats_max !== undefined) {
      query = query.lte('seats', filters.seats_max)
    }
    if (filters.horsepower_min !== null && filters.horsepower_min !== undefined) {
      query = query.gte('horsepower', filters.horsepower_min)
    }
    if (filters.horsepower_max !== null && filters.horsepower_max !== undefined) {
      query = query.lte('horsepower', filters.horsepower_max)
    }

    // Apply sorting
    const isDescending = sortOrder === 'desc'
    query = query.order('monthly_price', { ascending: !isDescending })

    const { data, error } = await query.range(offset, offset + limit - 1)

    return { data: data as CarListing[] | null, error }
  }

  static async getListingById(id: string) {
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('listing_id', id)
      .single()

    return { data: data as CarListing | null, error }
  }

  static async getListingCount(filters: Partial<FilterOptions> = {}) {
    let query = supabase
      .from('full_listing_view')
      .select('*', { count: 'exact', head: true })

    // Apply same make/model filters as getListings
    if (filters.makes && filters.makes.length > 0) {
      query = query.in('make', filters.makes)
    }
    
    if (filters.models && filters.models.length > 0) {
      query = query.in('model', filters.models)
    }
    if (filters.body_type && filters.body_type.length > 0) {
      const expandedBodyTypes = expandBodyTypes(filters.body_type)
      query = query.in('body_type', expandedBodyTypes)
    }
    if (filters.fuel_type && filters.fuel_type.length > 0) {
      const expandedFuelTypes = expandFuelTypes(filters.fuel_type)
      query = query.in('fuel_type', expandedFuelTypes)
    }
    if (filters.transmission && filters.transmission.length > 0) {
      query = query.in('transmission', filters.transmission)
    }
    if (filters.price_min !== null && filters.price_min !== undefined) {
      query = query.gte('monthly_price', filters.price_min)
    }
    if (filters.price_max !== null && filters.price_max !== undefined) {
      query = query.lte('monthly_price', filters.price_max)
    }
    if (filters.seats_min !== null && filters.seats_min !== undefined) {
      query = query.gte('seats', filters.seats_min)
    }
    if (filters.seats_max !== null && filters.seats_max !== undefined) {
      query = query.lte('seats', filters.seats_max)
    }
    if (filters.horsepower_min !== null && filters.horsepower_min !== undefined) {
      query = query.gte('horsepower', filters.horsepower_min)
    }
    if (filters.horsepower_max !== null && filters.horsepower_max !== undefined) {
      query = query.lte('horsepower', filters.horsepower_max)
    }

    const { count, error } = await query
    return { data: count || 0, error }
  }
}

export class ReferenceDataQueries {
  static async getMakes() {
    const { data, error } = await supabase
      .from('makes')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as Make[] | null, error }
  }

  static async getModels(makeId?: string) {
    let query = supabase
      .from('models')
      .select('*')

    if (makeId) {
      query = query.eq('make_id', makeId)
    }

    const { data, error } = await query.order('name', { ascending: true })
    return { data: data as Model[] | null, error }
  }

  static async getBodyTypes() {
    const { data, error } = await supabase
      .from('body_types')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as BodyType[] | null, error }
  }

  static async getFuelTypes() {
    const { data, error } = await supabase
      .from('fuel_types')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as FuelType[] | null, error }
  }

  static async getTransmissions() {
    const { data, error } = await supabase
      .from('transmissions')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as Transmission[] | null, error }
  }

  static async getColours() {
    const { data, error } = await supabase
      .from('colours')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as Colour[] | null, error }
  }
}