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
  make: string
  model: string
  body_type: string
  fuel_type: string
  transmission: string
  price_min: number | null
  price_max: number | null
  seats_min: number | null
  seats_max: number | null
  horsepower: number | null
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

// Query Builders with Types
export class CarListingQueries {
  static async getListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder = '') {
    let query = supabase
      .from('full_listing_view')
      .select('*')

    // Apply filters
    if (filters.make) {
      query = query.ilike('make', `%${filters.make}%`)
    }
    if (filters.model) {
      query = query.ilike('model', `%${filters.model}%`)
    }
    if (filters.body_type) {
      query = query.eq('body_type', filters.body_type)
    }
    if (filters.fuel_type) {
      query = query.eq('fuel_type', filters.fuel_type)
    }
    if (filters.transmission) {
      query = query.eq('transmission', filters.transmission)
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
    if (filters.horsepower !== null && filters.horsepower !== undefined) {
      query = query.gte('horsepower', filters.horsepower)
    }

    // Apply sorting
    const isDescending = sortOrder === 'desc'
    query = query.order('monthly_price', { ascending: !isDescending })

    const { data, error } = await query.limit(limit)

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

    // Apply same filters as getListings
    if (filters.make) {
      query = query.ilike('make', `%${filters.make}%`)
    }
    if (filters.model) {
      query = query.ilike('model', `%${filters.model}%`)
    }
    if (filters.body_type) {
      query = query.eq('body_type', filters.body_type)
    }
    if (filters.fuel_type) {
      query = query.eq('fuel_type', filters.fuel_type)
    }
    if (filters.transmission) {
      query = query.eq('transmission', filters.transmission)
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
    if (filters.horsepower !== null && filters.horsepower !== undefined) {
      query = query.gte('horsepower', filters.horsepower)
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