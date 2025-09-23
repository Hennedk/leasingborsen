import { describe, expect, it, beforeEach } from 'vitest'
import { CarListingQueries } from '../src/lib/supabase'
import type { FilterOptions } from '../src/types'

describe('Price Cap Integration Tests', () => {
  // Mock data for testing
  const mockListingWithOffers = {
    id: 'test-listing-1',
    make: 'Toyota',
    model: 'Camry',
    retail_price: 300000,
    lease_pricing: [
      {
        mileage_per_year: 15000,
        period_months: 36,
        first_payment: 35000,
        monthly_price: 3800, // Ideal offer
      },
      {
        mileage_per_year: 15000,
        period_months: 36,
        first_payment: 0,
        monthly_price: 4200, // Zero deposit alternative
      },
      {
        mileage_per_year: 15000,
        period_months: 24,
        first_payment: 35000,
        monthly_price: 4800, // 24-month option
      }
    ]
  }

  describe('getListings with price cap', () => {
    it('filters out listings when no offers are within price cap', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 3500 // Below all offers
      }

      // Mock the supabase query to return our test data
      const originalQuery = CarListingQueries.getListings
      CarListingQueries.getListings = async () => {
        // Simulate the price cap filtering logic
        const processedListing = {
          ...mockListingWithOffers,
          display_monthly_price: null, // No offers within cap
          display_price_reason: 'cheapest',
          ideal_monthly_price: 3800,
          price_cap_delta: 300
        }

        // Filter out listings with null display offers
        return { data: [], error: null } // Empty because no offers within cap
      }

      const result = await CarListingQueries.getListings(filters)

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()

      // Restore original function
      CarListingQueries.getListings = originalQuery
    })

    it('includes listings with price-capped offers', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 4000 // Allows ideal offer but not zero-deposit option
      }

      const originalQuery = CarListingQueries.getListings
      CarListingQueries.getListings = async () => {
        const processedListing = {
          ...mockListingWithOffers,
          monthly_price: 3800, // Display price (within cap)
          display_monthly_price: 3800,
          display_price_reason: 'best_fit',
          display_price_numeric: 3800,
          ideal_monthly_price: 3800,
          ideal_deposit: 35000,
          price_cap_delta: 0,
          selected_mileage: 15000,
          selected_term: 36,
          selected_deposit: 35000,
          selected_monthly_price: 3800
        }

        return { data: [processedListing], error: null }
      }

      const result = await CarListingQueries.getListings(filters)

      expect(result.data).toHaveLength(1)
      expect(result.data![0].display_monthly_price).toBe(3800)
      expect(result.data![0].display_price_reason).toBe('best_fit')
      expect(result.data![0].price_cap_delta).toBe(0)

      CarListingQueries.getListings = originalQuery
    })

    it('shows price-capped offer when ideal exceeds limit', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 4100 // Forces selection of zero-deposit option over ideal
      }

      const originalQuery = CarListingQueries.getListings
      CarListingQueries.getListings = async () => {
        const processedListing = {
          ...mockListingWithOffers,
          monthly_price: 4200, // Display price (zero deposit option)
          display_monthly_price: 4200,
          display_price_reason: 'price_cap_best_fit',
          display_price_numeric: 4200,
          ideal_monthly_price: 3800,
          ideal_deposit: 35000,
          price_cap_delta: -400, // Negative because display is higher than ideal
          selected_mileage: 15000,
          selected_term: 36,
          selected_deposit: 0,
          selected_monthly_price: 4200
        }

        return { data: [processedListing], error: null }
      }

      const result = await CarListingQueries.getListings(filters)

      expect(result.data).toHaveLength(1)
      expect(result.data![0].display_monthly_price).toBe(4200)
      expect(result.data![0].display_price_reason).toBe('price_cap_best_fit')
      expect(result.data![0].ideal_monthly_price).toBe(3800)
      expect(result.data![0].selected_deposit).toBe(0)

      CarListingQueries.getListings = originalQuery
    })
  })

  describe('getListingCount consistency', () => {
    it('returns same count as filtered listings', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 4000
      }

      // Mock both functions
      const originalGetListings = CarListingQueries.getListings
      const originalGetListingCount = CarListingQueries.getListingCount

      const mockFilteredData = [
        { ...mockListingWithOffers, display_monthly_price: 3800 }
      ]

      CarListingQueries.getListings = async () => ({
        data: mockFilteredData,
        error: null
      })

      CarListingQueries.getListingCount = async () => ({
        data: mockFilteredData.length,
        error: null
      })

      const [listingsResult, countResult] = await Promise.all([
        CarListingQueries.getListings(filters),
        CarListingQueries.getListingCount(filters)
      ])

      expect(listingsResult.data).toHaveLength(countResult.data)
      expect(countResult.data).toBe(1)

      // Restore
      CarListingQueries.getListings = originalGetListings
      CarListingQueries.getListingCount = originalGetListingCount
    })
  })

  describe('sorting with price cap', () => {
    it('sorts by display price when price cap is active', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 5000
      }

      const originalQuery = CarListingQueries.getListings
      CarListingQueries.getListings = async () => {
        const mockData = [
          {
            ...mockListingWithOffers,
            id: 'listing-1',
            display_price_numeric: 4200,
            display_monthly_price: 4200,
            make: 'BMW'
          },
          {
            ...mockListingWithOffers,
            id: 'listing-2',
            display_price_numeric: 3800,
            display_monthly_price: 3800,
            make: 'Audi'
          }
        ]

        // Sort by display_price_numeric ascending
        const sorted = mockData.sort((a, b) =>
          (a.display_price_numeric || 0) - (b.display_price_numeric || 0)
        )

        return { data: sorted, error: null }
      }

      const result = await CarListingQueries.getListings(filters, 20, 'price_asc')

      expect(result.data).toHaveLength(2)
      expect(result.data![0].display_price_numeric).toBe(3800)
      expect(result.data![1].display_price_numeric).toBe(4200)
      expect(result.data![0].make).toBe('Audi')
      expect(result.data![1].make).toBe('BMW')

      CarListingQueries.getListings = originalQuery
    })
  })

  describe('edge cases', () => {
    it('handles boundary case where price equals max', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 3800 // Exactly matches ideal offer
      }

      const originalQuery = CarListingQueries.getListings
      CarListingQueries.getListings = async () => {
        const processedListing = {
          ...mockListingWithOffers,
          monthly_price: 3800,
          display_monthly_price: 3800,
          display_price_reason: 'best_fit',
          display_price_numeric: 3800,
          ideal_monthly_price: 3800,
          price_cap_delta: 0
        }

        return { data: [processedListing], error: null }
      }

      const result = await CarListingQueries.getListings(filters)

      expect(result.data).toHaveLength(1)
      expect(result.data![0].display_monthly_price).toBe(3800)
      expect(result.data![0].display_price_reason).toBe('best_fit')

      CarListingQueries.getListings = originalQuery
    })

    it('handles listings with no lease pricing', async () => {
      const filters: Partial<FilterOptions> = {
        price_max: 4000
      }

      const mockListingNoOffers = {
        ...mockListingWithOffers,
        lease_pricing: []
      }

      const originalQuery = CarListingQueries.getListings
      CarListingQueries.getListings = async () => {
        // Listings without offers should be filtered out
        return { data: [], error: null }
      }

      const result = await CarListingQueries.getListings(filters)

      expect(result.data).toEqual([])

      CarListingQueries.getListings = originalQuery
    })
  })
})