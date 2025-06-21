import { createClient } from '@supabase/supabase-js'
import type { 
  CarListing, 
  FilterOptions, 
  Make, 
  Model, 
  BodyType, 
  FuelType, 
  Transmission, 
  Colour,
  SupabaseResponse,
  SupabaseSingleResponse
} from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


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

// Shared filter application function to reduce code duplication
function applyFilters(query: any, filters: Partial<FilterOptions>) {
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

  return query
}

// Export types for external use
export type { CarListing, FilterOptions, Make, Model, BodyType, FuelType, Transmission, Colour, SupabaseResponse, SupabaseSingleResponse }

// Query Builders with Types
export class CarListingQueries {
  static async getListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder = '', offset = 0): Promise<SupabaseResponse<CarListing>> {
    // Use a subquery to get unique listings with their lowest monthly price
    // This prevents duplicates from the full_listing_view which has one row per pricing option
    let query = supabase
      .from('full_listing_view')
      .select('*')
      .not('monthly_price', 'is', null) // Only show listings with offers

    // Apply filters using shared function
    query = applyFilters(query, filters)

    // Get all data first, then deduplicate in JavaScript to get unique listings with lowest price
    const { data: allData, error } = await query.order('monthly_price', { ascending: true })

    if (error) {
      return { data: null, error }
    }

    if (!allData) {
      return { data: [], error: null }
    }

    // Deduplicate by listing_id, keeping the one with lowest monthly_price (already sorted ascending)
    const uniqueListings = new Map<string, CarListing>()
    allData.forEach((listing: CarListing) => {
      if (listing.listing_id && !uniqueListings.has(listing.listing_id)) {
        uniqueListings.set(listing.listing_id, listing)
      }
    })

    // Convert back to array and apply sorting based on sortOrder
    let deduplicatedData = Array.from(uniqueListings.values())
    
    // Apply final sorting
    const isDescending = sortOrder === 'desc'
    deduplicatedData.sort((a, b) => {
      if (isDescending) {
        return (b.monthly_price || 0) - (a.monthly_price || 0)
      } else {
        return (a.monthly_price || 0) - (b.monthly_price || 0)
      }
    })

    // Apply pagination to deduplicated data
    const paginatedData = deduplicatedData.slice(offset, offset + limit)

    return { data: paginatedData as CarListing[], error: null }
  }

  static async getListingById(id: string): Promise<SupabaseSingleResponse<CarListing>> {
    // Get all rows for this listing (there may be multiple due to multiple pricing options)
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('listing_id', id)
      .not('monthly_price', 'is', null) // Only show listings with offers
      .order('monthly_price', { ascending: true }) // Get lowest price first

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('Listing not found') }
    }

    // Return the first result (which has the lowest price due to ordering)
    return { data: data[0] as CarListing, error: null }
  }

  static async getListingCount(filters: Partial<FilterOptions> = {}): Promise<{ data: number; error: any }> {
    // Get unique listing IDs to count properly (since full_listing_view has duplicates)
    let query = supabase
      .from('full_listing_view')
      .select('listing_id')
      .not('monthly_price', 'is', null) // Only count listings with offers

    // Apply same filters using shared function
    query = applyFilters(query, filters)

    const { data, error } = await query

    if (error) {
      return { data: 0, error }
    }

    if (!data) {
      return { data: 0, error: null }
    }

    // Count unique listing IDs
    const uniqueListingIds = new Set(data.map((item: any) => item.listing_id))
    return { data: uniqueListingIds.size, error: null }
  }
}

export class ReferenceDataQueries {
  static async getMakes(): Promise<SupabaseResponse<Make>> {
    const { data, error } = await supabase
      .from('makes')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as Make[] | null, error }
  }

  static async getModels(makeId?: string): Promise<SupabaseResponse<Model>> {
    let query = supabase
      .from('models')
      .select('*')

    if (makeId) {
      query = query.eq('make_id', makeId)
    }

    const { data, error } = await query.order('name', { ascending: true })
    return { data: data as Model[] | null, error }
  }

  static async getBodyTypes(): Promise<SupabaseResponse<BodyType>> {
    const { data, error } = await supabase
      .from('body_types')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as BodyType[] | null, error }
  }

  static async getFuelTypes(): Promise<SupabaseResponse<FuelType>> {
    const { data, error } = await supabase
      .from('fuel_types')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as FuelType[] | null, error }
  }

  static async getTransmissions(): Promise<SupabaseResponse<Transmission>> {
    const { data, error } = await supabase
      .from('transmissions')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as Transmission[] | null, error }
  }

  static async getColours(): Promise<SupabaseResponse<Colour>> {
    const { data, error } = await supabase
      .from('colours')
      .select('*')
      .order('name', { ascending: true })

    return { data: data as Colour[] | null, error }
  }
}