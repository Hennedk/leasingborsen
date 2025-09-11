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
import { calculateLeaseScoreSimple } from '@/lib/leaseScore'

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
  
  // Mileage filtering removed - handled client-side via selectBestOffer
  // The lease_pricing column is type 'json' not 'jsonb', so PostgREST containment operators don't work
  // Client-side filtering in selectBestOffer with strictMode handles this correctly

  return query
}

// Helper function for selecting the best offer based on mileage and term preferences
function selectBestOffer(
  leasePricing: any,
  targetMileage: number,
  targetDeposit: number = 35000, // Changed from 0 to 35000 kr as balanced middle-ground
  targetTerm?: number, // NEW: Allow specifying preferred term
  strictMode: boolean = true,
  isUserSpecified: boolean = true // NEW: Whether these are user selections or defaults
): any {
  if (!Array.isArray(leasePricing) || leasePricing.length === 0) {
    return null
  }
  
  let matchingOffers: any[]
  let isExactMileageFlexible = false
  
  if (strictMode) {
    // Original strict behavior - only exact matches
    if (targetMileage === 35000) {
      // 35k+ group - accept any of these mileages
      const acceptableMileages = [35000, 40000, 45000, 50000]
      matchingOffers = leasePricing.filter(offer => 
        acceptableMileages.includes(offer.mileage_per_year)
      )
    } else {
      // Exact match for other mileage options
      matchingOffers = leasePricing.filter(offer => 
        offer.mileage_per_year === targetMileage
      )
    }
    
    if (matchingOffers.length === 0) {
      return null // No offers at target mileage - exclude listing in strict mode
    }
  } else {
    // Flexible mode - find closest mileage to target
    const availableMileages = [...new Set(leasePricing.map(offer => offer.mileage_per_year))]
    
    if (availableMileages.length === 0) {
      return null
    }
    
    // Find the closest mileage(s) to target
    const closestDistance = Math.min(...availableMileages.map(mileage => 
      Math.abs(mileage - targetMileage)
    ))
    
    const closestMileages = availableMileages.filter(mileage => 
      Math.abs(mileage - targetMileage) === closestDistance
    )
    
    // If multiple equally close, prefer the lower one
    const selectedMileage = Math.min(...closestMileages)
    isExactMileageFlexible = selectedMileage === targetMileage
    
    // Filter to offers with the selected mileage
    matchingOffers = leasePricing.filter(offer => 
      offer.mileage_per_year === selectedMileage
    )
  }
  
  // Term preference order: prioritize user's targetTerm, then fallback to [36, 24, 48]
  const termPreference = Array.from(
    new Set(
      targetTerm ? [targetTerm, 36, 24, 48] : [36, 24, 48]
    )
  )
  
  for (const preferredTerm of termPreference) {
    const termOffers = matchingOffers.filter(offer => 
      offer.period_months === preferredTerm
    )
    
    if (termOffers.length > 0) {
      // NEW LOGIC: Find offer closest to target deposit (35k kr)
      let selectedOffer = termOffers.find(offer => 
        offer.first_payment === targetDeposit
      )
      
      if (!selectedOffer) {
        // Find deposit closest to target (35k kr)
        const depositDistances = termOffers.map(offer => ({
          offer,
          distance: Math.abs(offer.first_payment - targetDeposit)
        }))
        
        // Sort by distance to target deposit, then by monthly price if tied
        depositDistances.sort((a, b) => {
          if (a.distance !== b.distance) {
            return a.distance - b.distance // Closest to target first
          }
          return a.offer.monthly_price - b.offer.monthly_price // Lower monthly if tied
        })
        
        selectedOffer = depositDistances[0].offer
      }
      
      if (strictMode) {
        return {
          ...selectedOffer,
          selection_method: !isUserSpecified ? 'default' : (preferredTerm === targetTerm ? 'exact' : 'fallback')
        }
      } else {
        return {
          ...selectedOffer,
          selection_method: !isUserSpecified ? 'default' : (isExactMileageFlexible ? (preferredTerm === targetTerm ? 'exact' : 'fallback') : 'closest')
        }
      }
    }
  }
  
  // Fallback: no offers with preferred terms
  if (strictMode) {
    return null // Exclude listing in strict mode
  } else {
    // In flexible mode, find any offer with the closest mileage
    // Sort by deposit distance to target, then by monthly price
    const bestOffer = matchingOffers
      .map(offer => ({
        offer,
        depositDistance: Math.abs(offer.first_payment - targetDeposit)
      }))
      .sort((a, b) => {
        // First, prefer 36 months if available
        if (a.offer.period_months === 36 && b.offer.period_months !== 36) return -1
        if (b.offer.period_months === 36 && a.offer.period_months !== 36) return 1
        
        // Then sort by deposit distance to target
        if (a.depositDistance !== b.depositDistance) {
          return a.depositDistance - b.depositDistance
        }
        
        // Finally by monthly price
        return a.offer.monthly_price - b.offer.monthly_price
      })[0]?.offer
    
    return {
      ...bestOffer,
      selection_method: !isUserSpecified ? 'default' : (isExactMileageFlexible ? 'exact' : 'closest')
    }
  }
}

// Export types for external use
export type { CarListing, FilterOptions, Make, Model, BodyType, FuelType, Transmission, Colour, SupabaseResponse, SupabaseSingleResponse }

// Query Builders with Types
export class CarListingQueries {
  static async getListings(filters: Partial<FilterOptions> = {}, limit = 20, sortOrder = '', offset = 0): Promise<SupabaseResponse<CarListing>> {
    // Determine target mileage and mode
    const selectedMileage = filters.mileage_selected ?? 15000 // Use 15k as target for closest match
    const strictMode = filters.mileage_selected != null
    
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
        35000, // Target 35k kr deposit for balanced rates
        undefined, // No specific term preference in listings view
        strictMode,
        strictMode // In listings, user-specified = mileage filter was applied
      )
      
      if (!selectedOffer) {
        return null // Exclude listings without matching offers
      }
      
      // Calculate lease score using v2.0 formula with deposit-based scoring
      const leaseScore = selectedOffer.monthly_price && listing.retail_price
        ? calculateLeaseScoreSimple({
            monthlyPrice: selectedOffer.monthly_price,
            retailPrice: listing.retail_price,
            mileagePerYear: selectedOffer.mileage_per_year,
            firstPayment: selectedOffer.first_payment || 0,
            contractMonths: selectedOffer.period_months // Included for compatibility but ignored in v2
          })
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
        if (a.selected_lease_score != null && b.selected_lease_score == null) return -1
        if (a.selected_lease_score == null && b.selected_lease_score != null) return 1
        
        // Both have scores: sort by score descending
        if (a.selected_lease_score != null && b.selected_lease_score != null) {
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
        if (a.selected_lease_score != null && b.selected_lease_score != null) {
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
        if (a.selected_lease_score != null && b.selected_lease_score != null) {
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

  static async getListingById(
    id: string, 
    offerSettings?: {
      targetMileage?: number
      targetDeposit?: number
      targetTerm?: number
    }
  ): Promise<SupabaseSingleResponse<CarListing>> {
    // Get all rows for this listing (there may be multiple due to multiple pricing options)
    const { data, error } = await supabase
      .from('full_listing_view')
      .select('*')
      .eq('id', id)
      .not('monthly_price', 'is', null) // Only show listings with offers

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: null, error: new Error('Listing not found') }
    }

    // Get the listing data from the first row
    const baseListing = data[0] as any
    const leasePricingArray = Array.isArray(baseListing.lease_pricing) ? baseListing.lease_pricing : []
    const offerCount = leasePricingArray.length
    
    let finalListing = baseListing

    // If offer settings are provided, use selectBestOffer to choose the appropriate pricing
    if (offerSettings && leasePricingArray.length > 0) {
      // Detect if parameters are user-specified (not null/undefined) or using defaults
      const isMileageUserSpecified = offerSettings.targetMileage != null
      const isDepositUserSpecified = offerSettings.targetDeposit != null
      const isTermUserSpecified = offerSettings.targetTerm != null
      
      // Only consider it user-specified if at least one parameter was explicitly set
      const isUserSpecified = isMileageUserSpecified || isDepositUserSpecified || isTermUserSpecified
      
      const selectedOffer = selectBestOffer(
        leasePricingArray,
        offerSettings.targetMileage ?? 15000, // Default to 15k if not specified
        offerSettings.targetDeposit ?? 35000,  // Default to 35k if not specified
        offerSettings.targetTerm,              // Pass through user's target term
        true, // strict mode
        isUserSpecified // Whether these are user selections or defaults
      )

      if (selectedOffer) {
        // Calculate lease score for the specifically selected offer (aligns with listings grid)
        const selectedLeaseScore = baseListing.retail_price && selectedOffer.monthly_price
          ? calculateLeaseScoreSimple({
              monthlyPrice: selectedOffer.monthly_price,
              retailPrice: baseListing.retail_price,
              mileagePerYear: selectedOffer.mileage_per_year,
              firstPayment: selectedOffer.first_payment || 0,
              contractMonths: selectedOffer.period_months
            })
          : null

        // Override the listing data with the selected offer values
        finalListing = {
          ...baseListing,
          monthly_price: selectedOffer.monthly_price,
          mileage_per_year: selectedOffer.mileage_per_year,
          period_months: selectedOffer.period_months,
          first_payment: selectedOffer.first_payment,
          
          // Add metadata about selection
          selected_mileage: selectedOffer.mileage_per_year,
          selected_term: selectedOffer.period_months,
          selected_deposit: selectedOffer.first_payment,
          selected_monthly_price: selectedOffer.monthly_price,
          selected_lease_score: selectedLeaseScore,
          offer_selection_method: selectedOffer.selection_method
        }
      }
    }
    
    // Add offer metadata
    const enrichedListing = {
      ...finalListing,
      offer_count: offerCount,
      has_multiple_offers: offerCount > 1,
      // Preserve all available offers for UI selection
      all_lease_pricing: leasePricingArray
    }

    return { data: enrichedListing as CarListing, error: null }
  }

  static async getListingCount(filters: Partial<FilterOptions> = {}): Promise<{ data: number; error: any }> {
    const selectedMileage = filters.mileage_selected ?? 15000
    const strictMode = filters.mileage_selected != null
    
    let query = supabase
      .from('full_listing_view')
      .select('id, lease_pricing')
      .not('monthly_price', 'is', null)

    // Apply same filters as getListings
    query = applyFilters(query, filters)

    const { data, error } = await query

    if (error) {
      return { data: 0, error }
    }

    // Always do client-side counting to align with selection logic
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
        35000, // Target 35k kr deposit for balanced rates
        undefined, // No specific term preference in listings view
        strictMode,
        strictMode // In listings count, user-specified = mileage filter was applied
      )
      return selectedOffer !== null
    })
    
    return { data: validListings.length, error: null }
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
