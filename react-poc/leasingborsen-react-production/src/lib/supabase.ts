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
import { getEnvironmentConfig } from '@/config/environments'

const config = getEnvironmentConfig()

// Show current environment in development/debug mode
if (config.features.debugMode) {
  console.log(`🔧 Supabase Environment: ${config.name}`)
  console.log(`📍 Supabase URL: ${config.supabase.url}`)
}

if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(config.supabase.url, config.supabase.anonKey)


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
  'Electric': ['Electric'],
  'Benzin': ['Petrol'],  // Map UI "Benzin" to database "Petrol"
  'Diesel': ['Diesel'],
  'Hybrid': ['Hybrid - Petrol', 'Hybrid - Diesel', 'Plug-in - Petrol']  // All hybrid variants in database
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

    // Add offer metadata since full_listing_view already aggregates by listing
    const enrichedData = allData.map((listing: any) => {
      // The lease_pricing field contains all pricing options as JSON array
      const leasePricingArray = Array.isArray(listing.lease_pricing) ? listing.lease_pricing : []
      const offerCount = leasePricingArray.length
      
      return {
        ...listing,
        offer_count: offerCount,
        has_multiple_offers: offerCount > 1
      }
    })

    // Convert to array and apply sorting based on sortOrder
    let deduplicatedData = enrichedData
    
    // Apply final sorting based on sortOrder
    if (sortOrder === 'lease_score_desc') {
      // Filter out listings without scores when sorting by score
      deduplicatedData = deduplicatedData.filter(listing => 
        listing.lease_score !== null && 
        listing.lease_score !== undefined
      )
      
      // Sort by score (highest first), then by price as tiebreaker
      deduplicatedData.sort((a, b) => {
        const scoreDiff = (b.lease_score || 0) - (a.lease_score || 0)
        if (scoreDiff !== 0) return scoreDiff
        return (a.monthly_price || 0) - (b.monthly_price || 0) // Price as tiebreaker
      })
    } else {
      // Handle regular price sorting
      const isDescending = sortOrder === 'desc'
      deduplicatedData.sort((a, b) => {
        if (isDescending) {
          return (b.monthly_price || 0) - (a.monthly_price || 0)
        } else {
          return (a.monthly_price || 0) - (b.monthly_price || 0)
        }
      })
    }

    // Apply pagination to deduplicated data
    const paginatedData = deduplicatedData.slice(offset, offset + limit)

    return { data: paginatedData as CarListing[], error: null }
  }

  static async getListingById(id: string): Promise<SupabaseSingleResponse<CarListing>> {
    // Get all rows for this listing (there may be multiple due to multiple pricing options)
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('id', id)
      .not('monthly_price', 'is', null) // Only show listings with offers
      .order('monthly_price', { ascending: true }) // Get lowest price first

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('Listing not found') }
    }

    // Get the listing (full_listing_view already returns lowest price and aggregated data)
    const listing = data[0] as any
    const leasePricingArray = Array.isArray(listing.lease_pricing) ? listing.lease_pricing : []
    const offerCount = leasePricingArray.length
    
    // Add offer metadata
    const enrichedListing = {
      ...listing,
      offer_count: offerCount,
      has_multiple_offers: offerCount > 1
    }

    return { data: enrichedListing as CarListing, error: null }
  }

  static async getListingCount(filters: Partial<FilterOptions> = {}, sortOrder = ''): Promise<{ data: number; error: any }> {
    // When sorting by lease score, we need to exclude listings without scores
    // to match the behavior of getListings method
    if (sortOrder === 'lease_score_desc') {
      // For lease score sorting, we need to get actual data to filter out null scores
      // since PostgreSQL count with complex filtering is less reliable
      let query = supabase
        .from('full_listing_view')
        .select('id, lease_score')
        .not('monthly_price', 'is', null) // Only count listings with offers
        .not('lease_score', 'is', null) // Only count listings with lease scores

      // Apply same filters using shared function
      query = applyFilters(query, filters)

      const { data, error } = await query

      if (error) {
        return { data: 0, error }
      }

      return { data: data?.length || 0, error: null }
    } else {
      // For other sort orders, use the standard count approach
      let query = supabase
        .from('full_listing_view')
        .select('id', { count: 'exact', head: true })
        .not('monthly_price', 'is', null) // Only count listings with offers

      // Apply same filters using shared function
      query = applyFilters(query, filters)

      const { count, error } = await query

      if (error) {
        return { data: 0, error }
      }

      return { data: count || 0, error: null }
    }
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