import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type FilterOptions } from '@/lib/supabase'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { CarListing } from '@/lib/supabase'
import type { AdminListing } from '@/types/admin'

/**
 * Admin-specific hooks for listings management
 * Extends the existing useListings patterns with admin functionality
 */

export function useAdminListings(filters: Partial<FilterOptions> = {}) {
  return useQuery({
    queryKey: queryKeys.adminListings(filters),
    queryFn: async () => {
      // Use listings table directly with joins to avoid view duplication issue
      // The full_listing_view creates one row per lease pricing option, causing duplicates
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          id,
          created_at,
          updated_at,
          variant,
          year,
          mileage,
          horsepower,
          description,
          image,
          make_id,
          model_id,
          seller_id,
          body_type_id,
          fuel_type_id,
          transmission_id,
          seats,
          doors,
          co2_emission,
          co2_tax_half_year,
          wltp,
          consumption_l_100km,
          consumption_kwh_100km,
          makes!inner(name),
          models!inner(name),
          sellers!inner(name),
          body_types!left(name),
          fuel_types!left(name),
          transmissions!left(name),
          lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      // Transform the data to include admin metadata for draft detection
      const transformedListings: AdminListing[] = listings?.map((listing) => {
        const firstPricing = listing.lease_pricing?.[0]
        
        // Determine draft status based on missing required fields
        const missingFields: string[] = []
        if (!firstPricing?.monthly_price) missingFields.push('Månedspris')
        if (!(listing.body_types as any)?.name) missingFields.push('Biltype')
        if (!(listing.fuel_types as any)?.name) missingFields.push('Brændstof')
        if (!(listing.transmissions as any)?.name) missingFields.push('Gearkasse')
        
        const adminListing: AdminListing = {
          listing_id: listing.id,
          make: (listing.makes as any)?.name || 'Ukendt',
          model: (listing.models as any)?.name || 'Ukendt',
          variant: listing.variant,
          year: listing.year,
          mileage: listing.mileage,
          horsepower: listing.horsepower,
          description: listing.description,
          image: listing.image,
          body_type: (listing.body_types as any)?.name || null,
          fuel_type: (listing.fuel_types as any)?.name || null,
          transmission: (listing.transmissions as any)?.name || null,
          seller_name: (listing.sellers as any)?.name || null,
          monthly_price: firstPricing?.monthly_price || null,
          first_payment: firstPricing?.first_payment || null,
          period_months: firstPricing?.period_months || null,
          mileage_per_year: firstPricing?.mileage_per_year || null,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
          offer_count: listing.lease_pricing?.length || 0,
          is_draft: missingFields.length > 0,
          missing_fields: missingFields,
          // Car specifications
          seats: listing.seats,
          doors: listing.doors,
          co2_emission: listing.co2_emission,
          co2_tax_half_year: listing.co2_tax_half_year,
          wltp: listing.wltp,
          consumption_l_100km: listing.consumption_l_100km,
          consumption_kwh_100km: listing.consumption_kwh_100km,
          // Raw IDs for editing
          make_id: listing.make_id,
          model_id: listing.model_id,
          seller_id: listing.seller_id,
          body_type_id: listing.body_type_id,
          fuel_type_id: listing.fuel_type_id,
          transmission_id: listing.transmission_id
        }
        
        return adminListing
      }) || []

      console.log(`📊 Admin listings loaded: ${transformedListings.length} listings`)
      
      return { data: transformedListings, error: null }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - very short for admin to see draft updates quickly
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

// Admin version of single listing fetch that works with both published and draft listings
export function useAdminListing(id: string) {
  return useQuery({
    queryKey: ['admin', 'listing', id], // Use admin-specific key to avoid cache conflicts
    queryFn: async () => {
      if (!id) return { data: null, error: null }
      
      console.log('🔍 Admin fetching listing:', id)
      
      // Admin-first approach: Query raw listings table with all joins to get complete data
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          id,
          created_at,
          variant,
          year,
          mileage,
          horsepower,
          description,
          image,
          make_id,
          model_id,
          seller_id,
          body_type_id,
          fuel_type_id,
          transmission_id,
          seats,
          doors,
          co2_emission,
          co2_tax_half_year,
          wltp,
          consumption_l_100km,
          consumption_kwh_100km,
          makes!left(name),
          models!left(name),
          sellers!left(name),
          body_types!left(name),
          fuel_types!left(name),
          transmissions!left(name),
          lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
        `)
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Admin listing fetch failed:', error)
        return { data: null, error }
      }
      
      if (listing) {
        console.log('✅ Admin listing retrieved successfully')
        
        // Transform to match CarListing interface
        const listingAny = listing as any
        const firstPricing = listingAny.lease_pricing?.[0]
        
        // Determine if this is a draft (missing required reference data)
        const isDraft = !listingAny.body_type_id || !listingAny.fuel_type_id || !listingAny.transmission_id
        
        const transformedListing = {
          listing_id: listingAny.id,
          make: listingAny.makes?.name || 'Ukendt',
          model: listingAny.models?.name || 'Ukendt',
          variant: listingAny.variant,
          year: listingAny.year,
          mileage: listingAny.mileage,
          horsepower: listingAny.horsepower,
          description: listingAny.description,
          image: listingAny.image,
          body_type: listingAny.body_types?.name || null,
          fuel_type: listingAny.fuel_types?.name || null,
          transmission: listingAny.transmissions?.name || null,
          seller_name: listingAny.sellers?.name || null,
          monthly_price: firstPricing?.monthly_price || null,
          first_payment: firstPricing?.first_payment || null,
          period_months: firstPricing?.period_months || null,
          mileage_per_year: firstPricing?.mileage_per_year || null,
          created_at: listingAny.created_at,
          updated_at: listingAny.created_at,
          // Car specifications
          seats: listingAny.seats,
          doors: listingAny.doors,
          co2_emission: listingAny.co2_emission,
          co2_tax_half_year: listingAny.co2_tax_half_year,
          wltp: listingAny.wltp,
          consumption_l_100km: listingAny.consumption_l_100km,
          consumption_kwh_100km: listingAny.consumption_kwh_100km,
          // Raw IDs for form editing
          make_id: listingAny.make_id,
          model_id: listingAny.model_id,
          seller_id: listingAny.seller_id,
          body_type_id: listingAny.body_type_id,
          fuel_type_id: listingAny.fuel_type_id,
          transmission_id: listingAny.transmission_id,
          // Admin metadata
          offer_count: listingAny.lease_pricing?.length || 0,
          is_draft: isDraft
        }
        
        console.log(`📋 Listing type: ${isDraft ? 'DRAFT' : 'PUBLISHED'}`)
        return { data: transformedListing, error: null }
      }
      
      return { data: null, error: { message: 'Listing not found' } }
    },
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  })
}

// Hook to get draft listings that don't appear in full_listing_view
export function useAdminDraftListings() {
  return useQuery({
    queryKey: ['admin', 'draft-listings'],
    queryFn: async () => {
      // Get all listing IDs that appear in full_listing_view
      const { data: publishedIds } = await supabase
        .from('full_listing_view')
        .select('listing_id')
      
      const existingIds = publishedIds?.map(l => l.listing_id) || []
      
      // Query for listings that don't appear in the view
      let draftQuery = supabase
        .from('listings')
        .select(`
          id,
          created_at,
          updated_at,
          variant,
          year,
          mileage,
          horsepower,
          seats,
          doors,
          co2_emission,
          co2_tax_half_year,
          wltp,
          consumption_l_100km,
          consumption_kwh_100km,
          makes!left(name),
          models!left(name),
          sellers!left(name),
          body_types!left(name),
          fuel_types!left(name),
          transmissions!left(name),
          lease_pricing!left(monthly_price, first_payment, period_months, mileage_per_year)
        `)
        
      // Only filter if there are existing IDs to avoid empty filter
      if (existingIds.length > 0) {
        draftQuery = draftQuery.not('id', 'in', `(${existingIds.join(',')})`) 
      }
      
      const { data: draftListings, error } = await draftQuery
        .order('created_at', { ascending: false })
        .limit(50) // Limit drafts to reasonable number
        
      if (error) {
        console.warn('Could not fetch draft listings:', error.message)
        return { data: [], error: null }
      }
      
      // Transform draft listings to match admin interface
      const transformedDrafts = draftListings?.map((listing: any) => {
        const firstPricing = listing.lease_pricing?.[0]
        const missingFields = []
        
        if (!firstPricing?.monthly_price) missingFields.push('Månedspris')
        if (!(listing.body_types as any)?.name) missingFields.push('Biltype')
        if (!(listing.fuel_types as any)?.name) missingFields.push('Brændstof')
        if (!(listing.transmissions as any)?.name) missingFields.push('Gearkasse')
        
        return {
          listing_id: listing.id,
          make: listing.makes?.name || 'Ukendt',
          model: listing.models?.name || 'Ukendt',
          variant: listing.variant,
          year: listing.year,
          mileage: listing.mileage,
          horsepower: listing.horsepower,
          monthly_price: firstPricing?.monthly_price || null,
          first_payment: firstPricing?.first_payment || null,
          period_months: firstPricing?.period_months || null,
          mileage_per_year: firstPricing?.mileage_per_year || null,
          body_type: (listing.body_types as any)?.name || null,
          fuel_type: (listing.fuel_types as any)?.name || null,
          transmission: (listing.transmissions as any)?.name || null,
          seller_name: (listing.sellers as any)?.name || null,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
          offer_count: listing.lease_pricing?.length || 0,
          is_draft: true, // All results from this query are drafts
          missing_fields: missingFields,
          // Car specifications
          seats: listing.seats,
          doors: listing.doors,
          co2_emission: listing.co2_emission,
          co2_tax_half_year: listing.co2_tax_half_year,
          wltp: listing.wltp,
          consumption_l_100km: listing.consumption_l_100km,
          consumption_kwh_100km: listing.consumption_kwh_100km
        }
      }) || []
      
      return { data: transformedDrafts, error: null }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  })
}

// Combined hook for all admin listings (published + drafts)
export function useAllAdminListings(filters: Partial<FilterOptions> = {}) {
  const publishedQuery = useAdminListings(filters)
  const draftQuery = useAdminDraftListings()
  
  return {
    data: {
      data: [
        ...(publishedQuery.data?.data || []),
        ...(draftQuery.data?.data || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      error: null
    },
    isLoading: publishedQuery.isLoading || draftQuery.isLoading,
    error: publishedQuery.error || draftQuery.error,
    refetch: () => {
      publishedQuery.refetch()
      draftQuery.refetch()
    }
  }
}

export function useAdminListingStats() {
  return useQuery({
    queryKey: ['admin', 'listing-stats'],
    queryFn: async () => {
      // Get total count
      const { count: totalCount } = await supabase
        .from('full_listing_view')
        .select('*', { count: 'exact', head: true })

      // Get count by status or other metrics
      const { data: recentListings } = await supabase
        .from('full_listing_view')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      // Get unique makes count
      const { data: makes } = await supabase
        .from('full_listing_view')
        .select('make')
        .not('make', 'is', null)

      const uniqueMakes = new Set(makes?.map(item => item.make)).size

      return {
        totalCount: totalCount || 0,
        recentCount: recentListings?.length || 0,
        uniqueMakes,
        avgMonthlyAdditions: Math.round((recentListings?.length || 0) / 30 * 30) // Approximate monthly average
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  })
}

export function useBulkDeleteListings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (listingIds: string[]) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .in('id', listingIds)

      if (error) throw error
      return { deletedIds: listingIds }
    },
    onSuccess: (data) => {
      // Remove all deleted listings from cache
      data.deletedIds.forEach(id => {
        queryClient.removeQueries({ queryKey: queryKeys.listingDetail(id) })
      })
      
      // Invalidate all listings queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      console.error('Failed to bulk delete listings:', error)
    }
  })
}

export function useBulkUpdateListings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      listingIds, 
      updates 
    }: { 
      listingIds: string[]
      updates: Partial<CarListing>
    }) => {
      const promises = listingIds.map(id => 
        supabase
          .from('listings')
          .update(updates)
          .eq('id', id)
          .select()
          .single()
      )

      const results = await Promise.all(promises)
      
      // Check for errors
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} listings`)
      }

      return results.map(result => result.data)
    },
    onSuccess: (updatedListings, { listingIds }) => {
      // Update individual listing caches
      updatedListings.forEach((listing, index) => {
        if (listing) {
          queryClient.setQueryData(
            queryKeys.listingDetail(listingIds[index]), 
            { data: listing, error: null }
          )
        }
      })
      
      // Invalidate all listings queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      console.error('Failed to bulk update listings:', error)
    }
  })
}

export function useAdminCreateListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (listing: Partial<CarListing>) => {
      const validListing = getValidListingFields(listing)
      
      const { data, error } = await supabase
        .from('listings')
        .insert({
          ...validListing,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all listings and admin queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      console.error('Failed to create listing:', error)
    }
  })
}

// Helper function to convert CarListing data to valid listings table fields
const getValidListingFields = (listing: Partial<CarListing>) => {
  // Fields that exist directly in the listings table
  const validFields: Record<string, any> = {}
  
  // Direct text fields
  if (listing.variant !== undefined) validFields.variant = listing.variant
  if (listing.description !== undefined) validFields.description = listing.description
  if (listing.image !== undefined) validFields.image = listing.image
  
  // Numeric fields
  if (listing.year !== undefined) validFields.year = listing.year
  if (listing.mileage !== undefined) validFields.mileage = listing.mileage
  if (listing.horsepower !== undefined) validFields.horsepower = listing.horsepower
  if (listing.seats !== undefined) validFields.seats = listing.seats
  if (listing.doors !== undefined) validFields.doors = listing.doors
  if (listing.co2_emission !== undefined) validFields.co2_emission = listing.co2_emission
  if (listing.co2_tax_half_year !== undefined) validFields.co2_tax_half_year = listing.co2_tax_half_year
  if (listing.wltp !== undefined) validFields.wltp = listing.wltp
  if (listing.consumption_l_100km !== undefined) validFields.consumption_l_100km = listing.consumption_l_100km
  if (listing.consumption_kwh_100km !== undefined) validFields.consumption_kwh_100km = listing.consumption_kwh_100km
  if (listing.drive_type !== undefined) validFields.drive_type = listing.drive_type

  // Note: make, model, body_type, fuel_type, transmission require ID lookups
  // These will need special handling to convert names to IDs

  return validFields
}

export function useAdminUpdateListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string
      updates: Partial<CarListing>
    }) => {
      const validUpdates = getValidListingFields(updates)
      
      console.log('Attempting to update listing with fields:', Object.keys(validUpdates))
      console.log('Update data:', validUpdates)
      
      const { data, error } = await supabase
        .from('listings')
        .update({
          ...validUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }
      return data
    },
    onSuccess: (data, { id }) => {
      // Update the admin listing in cache
      queryClient.setQueryData(['admin', 'listing', id], { data, error: null })
      
      // Invalidate listings queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      console.error('Failed to update listing:', error)
    }
  })
}

export function useAdminDeleteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id }
    },
    onSuccess: (_, id) => {
      // Remove the listing from cache
      queryClient.removeQueries({ queryKey: queryKeys.listingDetail(id) })
      
      // Invalidate listings queries
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      console.error('Failed to delete listing:', error)
    }
  })
}

export function useAdminDuplicateListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // First, fetch the original listing with all its data
      const { data: originalListing, error: fetchError } = await supabase
        .from('listings')
        .select(`
          variant,
          year,
          mileage,
          horsepower,
          description,
          image,
          make_id,
          model_id,
          seller_id,
          body_type_id,
          fuel_type_id,
          transmission_id,
          seats,
          doors,
          co2_emission,
          co2_tax_half_year,
          wltp,
          consumption_l_100km,
          consumption_kwh_100km,
          drive_type
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (!originalListing) throw new Error('Original listing not found')

      // Create the new listing without the ID
      const { variant, year, mileage, horsepower, description, image, ...restListing } = originalListing
      const duplicatedListing = {
        ...restListing,
        variant: variant ? `${variant} (Kopi)` : 'Kopi',
        year,
        mileage,
        horsepower,
        description: description ? `${description}\n\n[Kopieret fra original annonce]` : '[Kopieret fra original annonce]',
        image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Insert the new listing
      const { data: newListing, error: insertError } = await supabase
        .from('listings')
        .insert(duplicatedListing)
        .select()
        .single()

      if (insertError) throw insertError

      // Fetch and duplicate lease pricing separately
      const { data: originalPricing } = await supabase
        .from('lease_pricing')
        .select('*')
        .eq('listing_id', id)

      if (originalPricing && originalPricing.length > 0) {
        const pricingData = originalPricing.map((pricing: any) => ({
          listing_id: newListing.id,
          monthly_price: pricing.monthly_price,
          first_payment: pricing.first_payment,
          period_months: pricing.period_months,
          mileage_per_year: pricing.mileage_per_year,
          ownership_fee: pricing.ownership_fee,
          administrative_fee: pricing.administrative_fee,
          overage_fee_per_km: pricing.overage_fee_per_km,
          large_maintenance_included: pricing.large_maintenance_included,
          small_maintenance_included: pricing.small_maintenance_included,
          replacement_car_included: pricing.replacement_car_included,
          insurance_included: pricing.insurance_included,
          tire_included: pricing.tire_included
        }))

        const { error: pricingError } = await supabase
          .from('lease_pricing')
          .insert(pricingData)

        if (pricingError) {
          console.warn('Failed to duplicate lease pricing:', pricingError)
          // Don't throw here as the main listing was created successfully
        }
      }

      return newListing
    },
    onSuccess: () => {
      // Invalidate all listings queries to show the new duplicate
      queryClient.invalidateQueries({ queryKey: queryInvalidation.invalidateAllListings() })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      console.error('Failed to duplicate listing:', error)
    }
  })
}