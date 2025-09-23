import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { CarListingQueries } from '../src/lib/supabase'

// Mock Supabase client
const mockSupabaseQuery = {
  from: vi.fn(),
  select: vi.fn(),
  not: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  in: vi.fn(),
  ilike: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  range: vi.fn()
}

// Create a chainable mock that returns itself for most methods
Object.keys(mockSupabaseQuery).forEach(key => {
  if (key !== 'from') {
    mockSupabaseQuery[key as keyof typeof mockSupabaseQuery] = vi.fn().mockReturnValue(mockSupabaseQuery)
  }
})

const mockSupabase = {
  from: vi.fn().mockReturnValue(mockSupabaseQuery)
}

// Mock the entire supabase module
vi.mock('../src/lib/supabase', async () => {
  const actual = await vi.importActual('../src/lib/supabase')
  return {
    ...actual,
    supabase: mockSupabase
  }
})

describe('Price Cap Integration Tests', () => {
  const mockListingData = [
    {
      id: 'listing-1',
      listing_id: 'listing-1',
      make: 'Toyota',
      model: 'Corolla',
      monthly_price: 4000,
      retail_price: 200000,
      mileage_per_year: 15000,
      period_months: 36,
      first_payment: 35000,
      updated_at: '2025-01-01T00:00:00Z',
      lease_pricing: [
        {
          mileage_per_year: 15000,
          period_months: 36,
          first_payment: 35000,
          monthly_price: 4000
        },
        {
          mileage_per_year: 15000,
          period_months: 36,
          first_payment: 0,
          monthly_price: 4400 // Zero deposit option
        }
      ]
    },
    {
      id: 'listing-2',
      listing_id: 'listing-2',
      make: 'Honda',
      model: 'Civic',
      monthly_price: 3500,
      retail_price: 180000,
      mileage_per_year: 15000,
      period_months: 36,
      first_payment: 35000,
      updated_at: '2025-01-02T00:00:00Z',
      lease_pricing: [
        {
          mileage_per_year: 15000,
          period_months: 36,
          first_payment: 35000,
          monthly_price: 3500
        }
      ]
    },
    {
      id: 'listing-3',
      listing_id: 'listing-3',
      make: 'BMW',
      model: 'X3',
      monthly_price: 5000,
      retail_price: 350000,
      mileage_per_year: 15000,
      period_months: 36,
      first_payment: 35000,
      updated_at: '2025-01-03T00:00:00Z',
      lease_pricing: [
        {
          mileage_per_year: 15000,
          period_months: 36,
          first_payment: 35000,
          monthly_price: 5000
        }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock response
    mockSupabaseQuery.from.mockResolvedValue({
      data: mockListingData,
      error: null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getListings with price cap', () => {
    it('should filter out listings above price cap', async () => {
      // Mock the final query result
      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: mockListingData,
        error: null
      })

      const filters = {
        price_max: 4200,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListings(filters, { offset: 0, limit: 20 })

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()

      // Should include listings 1 and 2 but exclude listing 3 (5000 > 4200)
      const returnedIds = result.data!.map(listing => listing.id)
      expect(returnedIds).toContain('listing-1')
      expect(returnedIds).toContain('listing-2')
      expect(returnedIds).not.toContain('listing-3')
    })

    it('should include price cap metadata for affected listings', async () => {
      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: mockListingData,
        error: null
      })

      const filters = {
        price_max: 4200,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListings(filters, { offset: 0, limit: 20 })

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()

      const toyotaListing = result.data!.find(listing => listing.make === 'Toyota')
      expect(toyotaListing).toBeDefined()

      // Toyota should show the zero-deposit option (4400) but ideal should be 35k deposit (4000)
      expect(toyotaListing!.display_price_reason).toMatch(/price_cap/)
      expect(toyotaListing!.ideal_monthly_price).toBe(4000)
      expect(toyotaListing!.ideal_deposit).toBe(35000)
    })

    it('should apply stable sorting with updated_at as tie-breaker', async () => {
      // Create listings with same price but different updated_at
      const samePrice = [
        {
          id: 'listing-a',
          monthly_price: 4000,
          updated_at: '2025-01-01T00:00:00Z',
          lease_pricing: [{ mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 4000 }]
        },
        {
          id: 'listing-b',
          monthly_price: 4000,
          updated_at: '2025-01-02T00:00:00Z',
          lease_pricing: [{ mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 4000 }]
        }
      ]

      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: samePrice,
        error: null
      })

      const filters = {
        price_max: 4500,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListings(filters, { offset: 0, limit: 20 }, 'price_asc')

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()

      // Should be sorted by updated_at desc (newer first) when prices are equal
      expect(result.data![0].id).toBe('listing-b') // More recent
      expect(result.data![1].id).toBe('listing-a') // Older
    })

    it('should handle pagination correctly after filtering', async () => {
      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: mockListingData.slice(0, 1), // Only first listing
        error: null
      })

      const filters = {
        price_max: 4200,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListings(filters, { offset: 0, limit: 1 })

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data!.length).toBe(1)

      // Should have called range with correct pagination
      expect(mockSupabaseQuery.range).toHaveBeenCalledWith(0, 0) // limit 1 = range(0, 0)
    })
  })

  describe('getListingCount with price cap', () => {
    it('should return correct count excluding listings above price cap', async () => {
      mockSupabaseQuery.from.mockResolvedValue({
        data: mockListingData,
        error: null
      })

      const filters = {
        price_max: 4200,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListingCount(filters)

      expect(result.error).toBeNull()
      expect(result.data).toBe(2) // Only listings 1 and 2 should count (listing 3 excluded by price cap)
    })

    it('should handle empty results gracefully', async () => {
      mockSupabaseQuery.from.mockResolvedValue({
        data: [],
        error: null
      })

      const filters = {
        price_max: 1000, // Very low price cap
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListingCount(filters)

      expect(result.error).toBeNull()
      expect(result.data).toBe(0)
    })

    it('should match getListings count for consistency', async () => {
      mockSupabaseQuery.from.mockResolvedValue({
        data: mockListingData,
        error: null
      })

      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: mockListingData,
        error: null
      })

      const filters = {
        price_max: 4200,
        mileage_selected: 15000
      }

      const [countResult, listingsResult] = await Promise.all([
        CarListingQueries.getListingCount(filters),
        CarListingQueries.getListings(filters, { offset: 0, limit: 100 })
      ])

      expect(countResult.error).toBeNull()
      expect(listingsResult.error).toBeNull()
      expect(countResult.data).toBe(listingsResult.data!.length)
    })
  })

  describe('deduplication logic', () => {
    it('should deduplicate listings by ID correctly', async () => {
      // Mock data with duplicate listing IDs (can happen with multiple lease options)
      const duplicateData = [
        {
          id: 'listing-1',
          monthly_price: 4000,
          lease_pricing: [{ mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 4000 }]
        },
        {
          id: 'listing-1', // Duplicate
          monthly_price: 4000,
          lease_pricing: [{ mileage_per_year: 15000, period_months: 24, first_payment: 35000, monthly_price: 4200 }]
        },
        {
          id: 'listing-2',
          monthly_price: 3500,
          lease_pricing: [{ mileage_per_year: 15000, period_months: 36, first_payment: 35000, monthly_price: 3500 }]
        }
      ]

      mockSupabaseQuery.from.mockResolvedValue({
        data: duplicateData,
        error: null
      })

      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: duplicateData,
        error: null
      })

      const filters = {
        price_max: 5000,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListings(filters, { offset: 0, limit: 20 })

      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()

      // Should only have 2 unique listings despite 3 rows in data
      expect(result.data!.length).toBe(2)
      const uniqueIds = new Set(result.data!.map(listing => listing.id))
      expect(uniqueIds.size).toBe(2)
      expect(uniqueIds.has('listing-1')).toBe(true)
      expect(uniqueIds.has('listing-2')).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      mockSupabaseQuery.range = vi.fn().mockResolvedValue({
        data: null,
        error: mockError
      })

      const filters = {
        price_max: 4200,
        mileage_selected: 15000
      }

      const result = await CarListingQueries.getListings(filters, { offset: 0, limit: 20 })

      expect(result.data).toBeNull()
      expect(result.error).toBe(mockError)
    })
  })
})