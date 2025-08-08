import { describe, it, expect } from 'vitest'
import type { CarListing, SortOrder } from '@/types'

// Test data for sorting logic
const mockListingsData: CarListing[] = [
  {
    id: '1',
    listing_id: 'listing-1',
    make: 'BMW',
    model: 'X3',
    variant: '2.0d',
    year: 2024,
    monthly_price: 5000,
    retail_price: 450000,
    lease_score: 85,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    body_type: 'SUV',
    horsepower: 190,
    seats: 5,
    doors: 5,
    seller_id: 'seller-1',
    seller_name: 'Test Dealer 1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '2', 
    listing_id: 'listing-2',
    make: 'Audi',
    model: 'A4',
    variant: '2.0 TDI',
    year: 2024,
    monthly_price: 4500,
    retail_price: 400000,
    lease_score: 72,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    body_type: 'Sedan',
    horsepower: 150,
    seats: 5,
    doors: 4,
    seller_id: 'seller-2',
    seller_name: 'Test Dealer 2',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '3',
    listing_id: 'listing-3', 
    make: 'Mercedes',
    model: 'C-Class',
    variant: '200d',
    year: 2024,
    monthly_price: 5500,
    retail_price: 500000,
    lease_score: undefined, // No score
    fuel_type: 'Diesel',
    transmission: 'Automatic', 
    body_type: 'Sedan',
    horsepower: 160,
    seats: 5,
    doors: 4,
    seller_id: 'seller-3',
    seller_name: 'Test Dealer 3',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '4',
    listing_id: 'listing-4',
    make: 'Tesla',
    model: 'Model 3',
    variant: 'Long Range',
    year: 2024,
    monthly_price: 6000,
    retail_price: 550000,
    lease_score: 91,
    fuel_type: 'Electric',
    transmission: 'Automatic',
    body_type: 'Sedan', 
    horsepower: 350,
    seats: 5,
    doors: 4,
    seller_id: 'seller-4',
    seller_name: 'Test Dealer 4',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

/**
 * This function simulates the sorting logic that will be implemented
 * in CarListingQueries.getListings
 */
function applySorting(data: CarListing[], sortOrder: SortOrder): CarListing[] {
  let sortedData = [...data]

  if (sortOrder === 'lease_score_desc') {
    // Filter out listings without scores
    sortedData = sortedData.filter(listing => 
      listing.lease_score !== null && 
      listing.lease_score !== undefined
    )
    
    // Sort by score (highest first), then by price as tiebreaker
    sortedData.sort((a, b) => {
      const scoreDiff = (b.lease_score || 0) - (a.lease_score || 0)
      if (scoreDiff !== 0) return scoreDiff
      return (a.monthly_price || 0) - (b.monthly_price || 0) // Price as tiebreaker
    })
  } else if (sortOrder === 'desc') {
    // Sort by price descending
    sortedData.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0))
  } else {
    // Sort by price ascending (default)
    sortedData.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0))
  }

  return sortedData
}

describe('Lease Score Sorting Logic', () => {
  it('should sort by lease score descending (highest scores first)', () => {
    const result = applySorting(mockListingsData, 'lease_score_desc')
    
    // Should exclude listing without score and sort by score descending
    expect(result).toHaveLength(3) // Excludes Mercedes without score
    expect(result[0].lease_score).toBe(91) // Tesla (highest)
    expect(result[1].lease_score).toBe(85) // BMW
    expect(result[2].lease_score).toBe(72) // Audi (lowest)
    
    // Should not include listings without scores
    expect(result.every(listing => listing.lease_score !== null && listing.lease_score !== undefined)).toBe(true)
  })

  it('should exclude listings without scores when sorting by score', () => {
    const result = applySorting(mockListingsData, 'lease_score_desc')
    
    // Mercedes has null score, should be excluded
    const mercedesListing = result.find(listing => listing.make === 'Mercedes')
    expect(mercedesListing).toBeUndefined()
    
    // All remaining listings should have scores
    expect(result.every(listing => typeof listing.lease_score === 'number')).toBe(true)
  })

  it('should use price as tiebreaker for identical scores', () => {
    const identicalScoreData = [
      { ...mockListingsData[0], lease_score: 85, monthly_price: 6000 },
      { ...mockListingsData[1], lease_score: 85, monthly_price: 4000 },
    ]
    
    const result = applySorting(identicalScoreData, 'lease_score_desc')
    
    // When scores are identical, should sort by price (ascending as tiebreaker)
    expect(result[0].monthly_price).toBe(4000) // Lower price first
    expect(result[1].monthly_price).toBe(6000) // Higher price second
  })

  it('should handle regular price sorting when not sorting by score', () => {
    const result = applySorting(mockListingsData, 'desc')
    
    // Should include all listings (even those without scores)
    expect(result).toHaveLength(4)
    
    // Should sort by price descending
    expect(result[0].monthly_price).toBe(6000) // Tesla (highest price)
    expect(result[3].monthly_price).toBe(4500) // Audi (lowest price)
    
    // Mercedes without score should still be included
    const mercedesListing = result.find(listing => listing.make === 'Mercedes')
    expect(mercedesListing).toBeDefined()
  })

  it('should handle ascending price sort', () => {
    const result = applySorting(mockListingsData, '')
    
    // Should include all listings
    expect(result).toHaveLength(4)
    
    // Should sort by price ascending
    expect(result[0].monthly_price).toBe(4500) // Audi (lowest price)
    expect(result[3].monthly_price).toBe(6000) // Tesla (highest price)
  })

  it('should handle empty array gracefully', () => {
    const result = applySorting([], 'lease_score_desc')
    expect(result).toEqual([])
  })

  it('should handle array with all null scores when sorting by score', () => {
    const dataWithoutScores = mockListingsData.map(listing => ({
      ...listing,
      lease_score: undefined
    }))
    
    const result = applySorting(dataWithoutScores, 'lease_score_desc')
    expect(result).toEqual([]) // Should be empty after filtering
  })

  it('should validate SortOrder type includes lease_score_desc', () => {
    // This test ensures our type extension is correct
    const validSortOrders: SortOrder[] = ['', 'desc', 'lease_score_desc']
    
    validSortOrders.forEach(sortOrder => {
      expect(() => applySorting(mockListingsData, sortOrder)).not.toThrow()
    })
  })
})