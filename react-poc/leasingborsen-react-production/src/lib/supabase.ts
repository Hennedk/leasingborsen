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
import { calculateLeaseScore } from '@/hooks/useLeaseCalculator'

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
  
  // Mileage filtering - prefer scalar column for performance
  if (filters.mileage_selected) {
    if (filters.mileage_selected === 35000) {
      // 35k+ includes 35k, 40k, 45k, 50k - use IN clause
      query = query.in('mileage_per_year', [35000, 40000, 45000, 50000])
    } else {
      // Exact match for other mileage options
      query = query.eq('mileage_per_year', filters.mileage_selected)
    }
  }

  return query
}

// Helper function for selecting the best offer based on mileage and term preferences
function selectBestOffer(
  leasePricing: any,
  targetMileage: number,
  standardDeposit: number = 0
): any {
  if (!Array.isArray(leasePricing) || leasePricing.length === 0) {
    return null
  }
  
  // Handle 35k+ group - accept any of these mileages
  const acceptableMileages = targetMileage === 35000 
    ? [35000, 40000, 45000, 50000]
    : [targetMileage]
  
  // Filter to matching mileage options
  const matchingOffers = leasePricing.filter(offer => 
    acceptableMileages.includes(offer.mileage_per_year)
  )
  
  if (matchingOffers.length === 0) {
    return null // No offers at target mileage - exclude listing
  }
  
  // Term preference order: 36 → 24 → 48
  const termPreference = [36, 24, 48]
  
  for (const preferredTerm of termPreference) {
    const termOffers = matchingOffers.filter(offer => 
      offer.period_months === preferredTerm
    )
    
    if (termOffers.length > 0) {
      // Find offer with standard deposit (0 kr) or closest higher
      let selectedOffer = termOffers.find(offer => 
        offer.first_payment === standardDeposit
      )
      
      if (!selectedOffer) {
        // Get offer with lowest deposit that's >= standard
        const validOffers = termOffers
          .filter(offer => offer.first_payment >= standardDeposit)
          .sort((a, b) => a.first_payment - b.first_payment)
        
        // If no deposit >= standard, take the lowest available
        selectedOffer = validOffers[0] || termOffers
          .sort((a, b) => a.first_payment - b.first_payment)[0]
      }
      
      return {
        ...selectedOffer,
        selection_method: preferredTerm === 36 ? 'exact' : 'fallback'
      }
    }
  }
  
  // No offers with preferred terms - exclude listing
  return null
}

// Export types for external use
export type { CarListing, FilterOptions, Make, Model, BodyType, FuelType, Transmission, Colour, SupabaseResponse, SupabaseSingleResponse }

// Query Builders with Types
export class CarListingQueries {
  static async getListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder = '', offset = 0): Promise<SupabaseResponse<CarListing>> {
    // Set default mileage if not provided
    const selectedMileage = filters.mileage_selected || 15000
    
    let query = supabase
      .from('full_listing_view')
      .select('*')
      .not('monthly_price', 'is', null)

    // Apply filters including mileage
    query = applyFilters(query, filters)

    const { data: allData, error } = await query.order('id') // Ensure deterministic order

    if (error) {
      return { data: null, error }
    }

    if (!allData) {
      return { data: [], error: null }
    }

    // CRITICAL FIX: Deduplicate by listing ID first
    const deduplicatedMap = new Map<string, any>()
    
    allData.forEach((listing: any) => {
      const listingId = listing.id
      if (!deduplicatedMap.has(listingId)) {
        deduplicatedMap.set(listingId, listing)
      }
    })
    
    const uniqueListings = Array.from(deduplicatedMap.values())

    // Process each unique listing to select appropriate offer
    const processedData = uniqueListings.map((listing: any) => {
      const selectedOffer = selectBestOffer(
        listing.lease_pricing,
        selectedMileage,
        0 // Standard deposit (0 kr default)
      )
      
      if (!selectedOffer) {
        return null // Exclude listings without matching offers
      }
      
      // CRITICAL FIX: Correct lease score parameter order
      const leaseScore = selectedOffer.monthly_price && listing.retail_price
        ? calculateLeaseScore(
            selectedOffer.monthly_price,  // FIXED: monthlyPrice first
            listing.retail_price,         // FIXED: retailPrice second
            selectedOffer.mileage_per_year,
            selectedOffer.period_months
          )
        : null
      
      return {
        ...listing,
        // Override with selected offer values
        monthly_price: selectedOffer.monthly_price,
        mileage_per_year: selectedOffer.mileage_per_year,
        period_months: selectedOffer.period_months,
        first_payment: selectedOffer.first_payment,
        lease_score: leaseScore,
        
        // Add metadata about selection
        selected_mileage: selectedOffer.mileage_per_year,
        selected_term: selectedOffer.period_months,
        selected_deposit: selectedOffer.first_payment,
        selected_monthly_price: selectedOffer.monthly_price,
        selected_lease_score: leaseScore,
        offer_selection_method: selectedOffer.selection_method,
        
        // Preserve original pricing array for reference
        all_lease_pricing: listing.lease_pricing,
        offer_count: Array.isArray(listing.lease_pricing) ? listing.lease_pricing.length : 0,
        has_multiple_offers: Array.isArray(listing.lease_pricing) && listing.lease_pricing.length > 1
      }
    }).filter(Boolean) // Remove nulls (listings without matching offers)
    
    // Apply sorting based on selected offer values
    let sortedData = processedData
    
    if (sortOrder === 'lease_score_desc') {
      sortedData = sortedData.sort((a, b) => {
        // Listings with scores come first
        if (a.selected_lease_score !== null && b.selected_lease_score === null) return -1
        if (a.selected_lease_score === null && b.selected_lease_score !== null) return 1
        
        // Both have scores: sort by score descending
        if (a.selected_lease_score !== null && b.selected_lease_score !== null) {
          const scoreDiff = b.selected_lease_score - a.selected_lease_score
          if (scoreDiff !== 0) return scoreDiff
        }
        
        // Tie-breaker: lower monthly price
        const priceDiff = (a.selected_monthly_price || 0) - (b.selected_monthly_price || 0)
        if (priceDiff !== 0) return priceDiff
        
        // Final tie-breaker: alphabetical by make+model
        const makeModelA = `${a.make} ${a.model}`.toLowerCase()
        const makeModelB = `${b.make} ${b.model}`.toLowerCase()
        return makeModelA.localeCompare(makeModelB, 'da-DK')
      })
    } else if (sortOrder === 'price_asc' || sortOrder === 'asc') {
      sortedData = sortedData.sort((a, b) => {
        // Sort by price ascending
        const priceDiff = (a.selected_monthly_price || 0) - (b.selected_monthly_price || 0)
        if (priceDiff !== 0) return priceDiff
        
        // Tie-breaker: higher lease score
        if (a.selected_lease_score !== null && b.selected_lease_score !== null) {
          const scoreDiff = b.selected_lease_score - a.selected_lease_score
          if (scoreDiff !== 0) return scoreDiff
        }
        
        // Final tie-breaker: alphabetical by make+model
        const makeModelA = `${a.make} ${a.model}`.toLowerCase()
        const makeModelB = `${b.make} ${b.model}`.toLowerCase()
        return makeModelA.localeCompare(makeModelB, 'da-DK')
      })
    } else {
      // Default sort: price descending
      sortedData = sortedData.sort((a, b) => {
        const priceDiff = (b.selected_monthly_price || 0) - (a.selected_monthly_price || 0)
        if (priceDiff !== 0) return priceDiff
        
        // Tie-breaker: higher lease score
        if (a.selected_lease_score !== null && b.selected_lease_score !== null) {
          const scoreDiff = b.selected_lease_score - a.selected_lease_score
          if (scoreDiff !== 0) return scoreDiff
        }
        
        // Final tie-breaker: alphabetical by make+model
        const makeModelA = `${a.make} ${a.model}`.toLowerCase()
        const makeModelB = `${b.make} ${b.model}`.toLowerCase()
        return makeModelA.localeCompare(makeModelB, 'da-DK')
      })
    }
    
    // Apply pagination after sorting unique listings
    const paginatedData = sortedData.slice(offset, offset + limit)
    
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

  static async getListingCount(filters: Partial<FilterOptions> = {}): Promise<{ data: number; error: any }> {
    const selectedMileage = filters.mileage_selected || 15000
    
    let query = supabase
      .from('full_listing_view')
      .select('id, lease_pricing', { count: 'exact' })
      .not('monthly_price', 'is', null)

    // Apply same filters as getListings
    query = applyFilters(query, filters)

    const { data, count, error } = await query

    if (error) {
      return { data: 0, error }
    }

    // For mileage filtering with offer selection, we need to count client-side
    // since we exclude listings without matching offers
    if (filters.mileage_selected) {
      if (!data) return { data: 0, error: null }
      
      // Deduplicate by listing ID
      const deduplicatedMap = new Map<string, any>()
      data.forEach((listing: any) => {
        const listingId = listing.id
        if (!deduplicatedMap.has(listingId)) {
          deduplicatedMap.set(listingId, listing)
        }
      })
      
      const uniqueListings = Array.from(deduplicatedMap.values())
      
      // Count listings that have matching offers
      const validListings = uniqueListings.filter((listing: any) => {
        const selectedOffer = selectBestOffer(
          listing.lease_pricing,
          selectedMileage,
          0
        )
        return selectedOffer !== null
      })
      
      return { data: validListings.length, error: null }
    }

    // For other filtering, use the database count
    return { data: count || 0, error: null }
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