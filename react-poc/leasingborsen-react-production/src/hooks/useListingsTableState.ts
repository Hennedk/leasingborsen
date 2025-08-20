import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdminListing } from '@/types/admin'

interface PricingOption {
  monthly_price: number
  first_payment?: number
  period_months: number
  mileage_per_year: number
}

interface UseListingsTableStateProps {
  onBulkAction?: (selectedListings: AdminListing[], action: string) => void
}

/**
 * useListingsTableState - Centralized state management for ListingsTable
 * Handles selection, expansion, and pricing data loading
 */
export const useListingsTableState = ({ onBulkAction }: UseListingsTableStateProps = {}) => {
  const [selectedListings, setSelectedListings] = useState<AdminListing[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [pricingData, setPricingData] = useState<Record<string, PricingOption[]>>({})
  const [loadingPricing, setLoadingPricing] = useState<Set<string>>(new Set())

  // Load pricing options for a specific listing
  const loadPricingOptions = useCallback(async (listingId: string) => {
    setLoadingPricing(prev => new Set(prev).add(listingId))
    
    try {
      const { data, error } = await supabase
        .from('lease_pricing')
        .select('monthly_price, first_payment, period_months, mileage_per_year')
        .eq('listing_id', listingId)
        .order('monthly_price', { ascending: true })

      if (error) throw error

      setPricingData(prev => ({
        ...prev,
        [listingId]: data || []
      }))
    } catch (error) {
      console.error('Error loading pricing options:', error)
    } finally {
      setLoadingPricing(prev => {
        const newSet = new Set(prev)
        newSet.delete(listingId)
        return newSet
      })
    }
  }, [])

  // Toggle row expansion and load pricing if needed
  const toggleRowExpansion = useCallback(async (listingId: string) => {
    const newExpanded = new Set(expandedRows)
    
    if (newExpanded.has(listingId)) {
      newExpanded.delete(listingId)
      setExpandedRows(newExpanded)
    } else {
      newExpanded.add(listingId)
      setExpandedRows(newExpanded)
      
      // Load pricing data if not already loaded
      if (!pricingData[listingId]) {
        await loadPricingOptions(listingId)
      }
    }
  }, [expandedRows, pricingData, loadPricingOptions])

  // Toggle individual listing selection
  const toggleListingSelection = useCallback((listing: AdminListing) => {
    const isSelected = selectedListings.some(l => l.listing_id === listing.listing_id)
    if (isSelected) {
      setSelectedListings(prev => prev.filter(l => l.listing_id !== listing.listing_id))
    } else {
      setSelectedListings(prev => [...prev, listing])
    }
  }, [selectedListings])

  // Toggle select all listings
  const toggleSelectAll = useCallback((listings: AdminListing[]) => {
    if (selectedListings.length === listings.length) {
      setSelectedListings([])
    } else {
      setSelectedListings(listings)
    }
  }, [selectedListings.length])

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedListings.length > 0 && onBulkAction) {
      onBulkAction(selectedListings, action)
    }
  }, [selectedListings, onBulkAction])

  // Check if listing is selected
  const isListingSelected = useCallback((listing: AdminListing) => 
    selectedListings.some(l => l.listing_id === listing.listing_id),
    [selectedListings]
  )

  // Check if row is expanded
  const isRowExpanded = useCallback((listingId: string) => 
    expandedRows.has(listingId),
    [expandedRows]
  )

  // Get pricing data for listing
  const getListingPricing = useCallback((listingId: string) => 
    pricingData[listingId] || [],
    [pricingData]
  )

  // Check if pricing is loading for listing
  const isPricingLoading = useCallback((listingId: string) => 
    loadingPricing.has(listingId),
    [loadingPricing]
  )

  return {
    // State
    selectedListings,
    expandedRows,
    pricingData,
    loadingPricing,
    
    // Actions
    toggleRowExpansion,
    toggleListingSelection,
    toggleSelectAll,
    handleBulkAction,
    
    // Getters
    isListingSelected,
    isRowExpanded,
    getListingPricing,
    isPricingLoading,
    
    // Utils
    formatPrice: (price?: number) => price ? `${price.toLocaleString('da-DK')} kr./md.` : '–'
  }
}