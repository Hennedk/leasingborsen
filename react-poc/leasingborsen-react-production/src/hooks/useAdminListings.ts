import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CarListingQueries, type FilterOptions } from '@/lib/supabase'
import { queryKeys, queryInvalidation } from '@/lib/queryKeys'
import { supabase } from '@/lib/supabase'
import type { CarListing } from '@/lib/supabase'

/**
 * Admin-specific hooks for listings management
 * Extends the existing useListings patterns with admin functionality
 */

export function useAdminListings(filters: Partial<FilterOptions> = {}) {
  return useQuery({
    queryKey: queryKeys.adminListings(filters),
    queryFn: async () => {
      // Get listings with offer count
      const { data: listings, error } = await supabase
        .from('full_listing_view')
        .select(`
          *,
          offer_count:lease_pricing(count)
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      // Transform the data to include offer count
      const transformedListings = listings?.map(listing => ({
        ...listing,
        offer_count: listing.offer_count?.[0]?.count || 0
      })) || []

      return { data: transformedListings, error: null }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for admin to see updates quickly
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
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
  if (listing.co2_emission !== undefined) validFields.co2_emission = listing.co2_emission
  if (listing.co2_tax_half_year !== undefined) validFields.co2_tax_half_year = listing.co2_tax_half_year
  if (listing.wltp !== undefined) validFields.wltp = listing.wltp
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
      // Update the specific listing in cache
      queryClient.setQueryData(queryKeys.listingDetail(id), { data, error: null })
      
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