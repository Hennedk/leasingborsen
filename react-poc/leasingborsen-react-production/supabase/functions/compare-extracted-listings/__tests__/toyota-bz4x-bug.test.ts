import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts"
import { 
  generateExactKey,
  createExistingListingMaps,
  findBestMatch
} from "../utils/comparison.ts"
import type { ExtractedCar, ExistingListing } from "../types.ts"

describe("Toyota bZ4X Duplicate Create/Delete Bug", () => {
  it("should match Toyota bZ4X Executive Panorama correctly", () => {
    // Simulate existing Toyota bZ4X
    const existing: ExistingListing[] = [
      {
        id: "existing-bz4x-1",
        make: "Toyota",
        model: "bZ4X",
        variant: "Executive Panorama",
        transmission: "automatic", // Electric cars are typically automatic
        fuel_type: "el",
        horsepower: 204,
        offers: []
      }
    ]
    
    // Simulate extracted Toyota bZ4X
    const extracted: ExtractedCar = {
      make: "Toyota",
      model: "bZ4X",
      variant: "Executive Panorama",
      transmission: "automatic",
      fuel_type: "el",
      horsepower: 204
    }
    
    // Test exact key generation
    const existingKey = generateExactKey(
      existing[0].make,
      existing[0].model,
      existing[0].variant
    )
    
    const extractedKey = generateExactKey(
      extracted.make,
      extracted.model,
      extracted.variant
    )
    
    console.log(`Existing key: "${existingKey}"`)
    console.log(`Extracted key: "${extractedKey}"`)
    
    assertEquals(existingKey, extractedKey, "Keys should match since transmission is not part of the key")
    assertEquals(existingKey, "toyota|bz4x|executive panorama")
    
    // Test the actual matching
    const { existingByExactKey, existingByCompositeKey } = createExistingListingMaps(existing)
    const alreadyMatchedIds = new Set<string>()
    
    const { existingMatch, matchMethod } = findBestMatch(
      extracted,
      existingByExactKey,
      existingByCompositeKey,
      alreadyMatchedIds
    )
    
    assertEquals(existingMatch?.id, "existing-bz4x-1", "Should find the existing listing")
    assertEquals(matchMethod, "exact", "Should be an exact match")
  })
  
  it("should handle case sensitivity issues", () => {
    // Test with different case variations
    const existing: ExistingListing = {
      id: "existing-1",
      make: "Toyota",
      model: "bZ4X", // Note the specific casing
      variant: "Executive Panorama",
      transmission: "automatic",
      fuel_type: "el",
      offers: []
    }
    
    const extracted: ExtractedCar = {
      make: "Toyota",
      model: "BZ4X", // Different casing
      variant: "Executive Panorama",
      transmission: "automatic",
      fuel_type: "el",
    }
    
    // Keys should still match due to toLowerCase()
    const existingKey = generateExactKey(
      existing.make,
      existing.model,
      existing.variant
    )
    
    const extractedKey = generateExactKey(
      extracted.make,
      extracted.model,
      extracted.variant
    )
    
    assertEquals(existingKey, "toyota|bz4x|executive panorama")
    assertEquals(extractedKey, "toyota|bz4x|executive panorama")
    assertEquals(existingKey, extractedKey)
  })
  
  it("should handle null or undefined transmission", () => {
    const existing: ExistingListing = {
      id: "existing-1",
      make: "Toyota",
      model: "bZ4X",
      variant: "Executive Panorama",
      transmission: null as any, // Null transmission
      fuel_type: "el",
      offers: []
    }
    
    const extracted: ExtractedCar = {
      make: "Toyota",
      model: "bZ4X",
      variant: "Executive Panorama",
      transmission: "automatic",
      fuel_type: "el",
    }
    
    const existingKey = generateExactKey(
      existing.make,
      existing.model,
      existing.variant
    )
    
    const extractedKey = generateExactKey(
      extracted.make,
      extracted.model,
      extracted.variant
    )
    
    console.log(`Existing key with null transmission: "${existingKey}"`)
    console.log(`Extracted key: "${extractedKey}"`)
    
    // These WILL match now because transmission is not part of the key
    assertEquals(existingKey === extractedKey, true, "Should match regardless of transmission")
  })
  
  it("should now correctly match listings regardless of transmission", () => {
    // This was the bug scenario - now it should work correctly
    const existingListings: ExistingListing[] = [
      {
        id: "bz4x-1",
        make: "Toyota",
        model: "bZ4X",
        variant: "Executive Panorama",
        transmission: "", // Empty transmission
        fuel_type: "el",
        offers: []
      }
    ]
    
    const extractedCars: ExtractedCar[] = [
      {
        make: "Toyota",
        model: "bZ4X",
        variant: "Executive Panorama",
        transmission: "automatic",
        fuel_type: "el",
      }
    ]
    
    // Create maps
    const { existingByExactKey } = createExistingListingMaps(existingListings)
    const alreadyMatchedIds = new Set<string>()
    
    // Try to match
    const { existingMatch, matchMethod } = findBestMatch(
      extractedCars[0],
      existingByExactKey,
      new Map(),
      alreadyMatchedIds
    )
    
    // Check the keys
    const existingKey = generateExactKey(
      existingListings[0].make,
      existingListings[0].model,
      existingListings[0].variant
    )
    
    const extractedKey = generateExactKey(
      extractedCars[0].make,
      extractedCars[0].model,
      extractedCars[0].variant
    )
    
    console.log(`Existing key: "${existingKey}"`)
    console.log(`Extracted key: "${extractedKey}"`)
    console.log(`Keys match: ${existingKey === extractedKey}`)
    
    // Now it SHOULD find a match since transmission is not part of the key
    assertEquals(existingMatch?.id, "bz4x-1", "Should find the existing listing")
    assertEquals(matchMethod, "exact", "Should be an exact match")
    assertEquals(existingKey, extractedKey, "Keys should match")
  })
})