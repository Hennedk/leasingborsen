import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts"
import { 
  createExistingListingMaps,
  findBestMatch
} from "../utils/comparison.ts"
import { generateLargeDataset } from "./test-data.ts"
import type { ExtractedCar, ExistingListing, ListingMatch } from "../types.ts"

describe("Performance Tests", () => {
  describe("Large Dataset Handling", () => {
    it("should handle 1000 listings efficiently", () => {
      const { existing, extracted } = generateLargeDataset(1000)
      
      const startTime = Date.now()
      
      // Create lookup maps
      const { existingByExactKey, existingByCompositeKey } = createExistingListingMaps(existing)
      
      const mapCreationTime = Date.now() - startTime
      console.log(`Map creation for 1000 listings: ${mapCreationTime}ms`)
      assertEquals(mapCreationTime < 100, true) // Should be very fast
      
      // Perform matching
      const matches: ListingMatch[] = []
      const alreadyMatchedIds = new Set<string>()
      
      const matchStartTime = Date.now()
      
      for (const car of extracted) {
        const { existingMatch, matchMethod, confidence } = findBestMatch(
          car,
          existingByExactKey,
          existingByCompositeKey,
          alreadyMatchedIds
        )
        
        if (existingMatch) {
          alreadyMatchedIds.add(existingMatch.id)
          matches.push({
            extracted: car,
            existing: existingMatch,
            confidence,
            matchMethod,
            changeType: 'update' // Simplified for performance test
          })
        } else {
          matches.push({
            extracted: car,
            existing: null,
            confidence: 1.0,
            matchMethod: 'unmatched',
            changeType: 'create'
          })
        }
      }
      
      const matchingTime = Date.now() - matchStartTime
      console.log(`Matching ${extracted.length} cars: ${matchingTime}ms`)
      
      // Total time should be under 2 seconds
      const totalTime = Date.now() - startTime
      console.log(`Total processing time: ${totalTime}ms`)
      assertEquals(totalTime < 2000, true)
      
      // Verify results
      const creates = matches.filter(m => m.changeType === 'create').length
      const updates = matches.filter(m => m.changeType === 'update').length
      
      console.log(`Results: ${creates} creates, ${updates} updates`)
      assertEquals(creates > 0, true)
      assertEquals(updates > 0, true)
    })

    it("should handle 5000 listings within reasonable time", () => {
      const { existing, extracted } = generateLargeDataset(5000)
      
      const startTime = Date.now()
      
      // Create lookup maps
      const { existingByExactKey, existingByCompositeKey } = createExistingListingMaps(existing)
      
      // Perform matching
      const alreadyMatchedIds = new Set<string>()
      let matchCount = 0
      let createCount = 0
      
      for (const car of extracted) {
        const { existingMatch } = findBestMatch(
          car,
          existingByExactKey,
          existingByCompositeKey,
          alreadyMatchedIds
        )
        
        if (existingMatch) {
          alreadyMatchedIds.add(existingMatch.id)
          matchCount++
        } else {
          createCount++
        }
      }
      
      const totalTime = Date.now() - startTime
      console.log(`Processing 5000 listings: ${totalTime}ms`)
      console.log(`Matched: ${matchCount}, New: ${createCount}`)
      
      // Should complete within 10 seconds
      assertEquals(totalTime < 10000, true)
    })
  })

  describe("Map Lookup Performance", () => {
    it("should have O(1) lookup time for exact matches", () => {
      const listings: ExistingListing[] = []
      
      // Create 10000 listings
      for (let i = 0; i < 10000; i++) {
        listings.push({
          id: `listing-${i}`,
          make: `Make${i % 100}`,
          model: `Model${i % 50}`,
          variant: `Variant${i % 25}`,
          transmission: i % 2 === 0 ? 'manual' : 'automatic',
          fuel_type: 'benzin',
          body_type: 'sedan',
          offers: []
        })
      }
      
      const { existingByExactKey } = createExistingListingMaps(listings)
      
      // Test lookup performance
      const lookupStartTime = Date.now()
      const numLookups = 10000
      
      for (let i = 0; i < numLookups; i++) {
        const key = `make${i % 100}|model${i % 50}|variant${i % 25}|${i % 2 === 0 ? 'manual' : 'automatic'}`
        existingByExactKey.get(key)
      }
      
      const lookupTime = Date.now() - lookupStartTime
      const avgLookupTime = lookupTime / numLookups
      
      console.log(`${numLookups} lookups in ${lookupTime}ms (avg: ${avgLookupTime.toFixed(3)}ms)`)
      
      // Average lookup should be under 0.1ms
      assertEquals(avgLookupTime < 0.1, true)
    })
  })

  describe("Memory Efficiency", () => {
    it("should handle deduplication efficiently", () => {
      // Create listings with duplicates (simulating full_listing_view)
      const rawListings: any[] = []
      const uniqueCount = 1000
      
      // Each unique listing appears 3 times (simulating JOIN with lease_pricing)
      for (let i = 0; i < uniqueCount; i++) {
        const listing = {
          id: `listing-${i}`,
          make: `Make${i % 10}`,
          model: `Model${i % 5}`,
          variant: `Variant${i % 3}`,
          transmission: 'automatic',
          fuel_type: 'benzin',
          body_type: 'sedan',
          monthly_price: 3000 + i,
          offers: []
        }
        
        // Add 3 copies
        rawListings.push(listing)
        rawListings.push({ ...listing })
        rawListings.push({ ...listing })
      }
      
      assertEquals(rawListings.length, uniqueCount * 3)
      
      // Deduplicate
      const startTime = Date.now()
      const uniqueListings = new Map()
      
      rawListings.forEach(listing => {
        if (!uniqueListings.has(listing.id)) {
          uniqueListings.set(listing.id, listing)
        }
      })
      
      const deduplicatedListings = Array.from(uniqueListings.values())
      const deduplicationTime = Date.now() - startTime
      
      console.log(`Deduplication of ${rawListings.length} to ${deduplicatedListings.length} listings: ${deduplicationTime}ms`)
      
      assertEquals(deduplicatedListings.length, uniqueCount)
      assertEquals(deduplicationTime < 50, true) // Should be very fast
    })
  })

  describe("Worst Case Scenarios", () => {
    it("should handle all new vehicles scenario", () => {
      const extracted: ExtractedCar[] = []
      
      // All 1000 vehicles are new
      for (let i = 0; i < 1000; i++) {
        extracted.push({
          make: `NewMake${i}`,
          model: `NewModel${i}`,
          variant: `NewVariant${i}`,
          transmission: 'automatic',
          fuel_type: 'el',
          body_type: 'suv'
        })
      }
      
      const startTime = Date.now()
      const { existingByExactKey, existingByCompositeKey } = createExistingListingMaps([])
      const alreadyMatchedIds = new Set<string>()
      
      let createCount = 0
      
      for (const car of extracted) {
        const { existingMatch } = findBestMatch(
          car,
          existingByExactKey,
          existingByCompositeKey,
          alreadyMatchedIds
        )
        
        if (!existingMatch) {
          createCount++
        }
      }
      
      const totalTime = Date.now() - startTime
      console.log(`Processing 1000 all-new vehicles: ${totalTime}ms`)
      
      assertEquals(createCount, 1000)
      assertEquals(totalTime < 100, true) // Should be fast since no matching needed
    })

    it("should handle all deletions scenario", () => {
      const existing: ExistingListing[] = []
      
      // 1000 existing vehicles
      for (let i = 0; i < 1000; i++) {
        existing.push({
          id: `delete-${i}`,
          make: `Make${i}`,
          model: `Model${i}`,
          variant: `Variant${i}`,
          transmission: 'manual',
          fuel_type: 'benzin',
          body_type: 'sedan',
          offers: []
        })
      }
      
      // No extracted vehicles (all will be marked for deletion)
      const extracted: ExtractedCar[] = []
      
      const startTime = Date.now()
      const alreadyMatchedIds = new Set<string>()
      
      // In real scenario, unmatched existing would be marked for deletion
      const unmatchedCount = existing.filter(e => !alreadyMatchedIds.has(e.id)).length
      
      const totalTime = Date.now() - startTime
      console.log(`Identifying 1000 deletions: ${totalTime}ms`)
      
      assertEquals(unmatchedCount, 1000)
      assertEquals(totalTime < 10, true) // Should be instant
    })
  })
})