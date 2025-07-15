// Tests for Responses API migration

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { validateExtractionResponse } from "../schema.ts"
import { VariantResolver } from "../variantResolver.ts"
import { FeatureFlagManager } from "../featureFlags.ts"
import type { CompactExtractedVehicle, ExtractionContext } from "../types.ts"

// Test data
const mockExistingListings = {
  existing_listings: [
    {
      make: "Toyota",
      model: "Corolla",
      variant: "1.8 Hybrid Active Plus",
      horsepower: 140,
      fuel_type: "Hybrid - Petrol",
      transmission: "Automatic"
    },
    {
      make: "Toyota",
      model: "Yaris",
      variant: "1.5 Hybrid Active",
      horsepower: 116,
      fuel_type: "Hybrid - Petrol",
      transmission: "Automatic"
    }
  ]
}

const mockExtractedVehicle: CompactExtractedVehicle = {
  make: "Toyota",
  model: "Corolla",
  variant: "1.8 Hybrid Active Plus Automatik", // Should match existing without "Automatik"
  hp: 140,
  ft: 2, // Hybrid - Petrol
  tr: 1, // Automatic
  bt: 2, // Hatchback
  wltp: 80,
  co2: 90,
  l100: 4.5,
  tax: 420,
  offers: [
    [3500, 25000, 36, 15000, 151000]
  ]
}

Deno.test("Schema validation - valid response", () => {
  const validResponse = {
    cars: [
      {
        make: "Toyota",
        model: "Corolla",
        variant: "1.8 Hybrid Active Plus",
        hp: 140,
        ft: 2,
        tr: 1,
        bt: 2,
        wltp: 80,
        co2: 90,
        l100: 4.5,
        tax: 420,
        offers: [
          [3500, 25000, 36, 15000, 151000]
        ]
      }
    ]
  }
  
  const result = validateExtractionResponse(validResponse)
  assertEquals(result.valid, true)
  assertEquals(result.errors, undefined)
})

Deno.test("Schema validation - invalid fuel type", () => {
  const invalidResponse = {
    cars: [
      {
        make: "Toyota",
        model: "Corolla",
        variant: "1.8 Hybrid",
        hp: 140,
        ft: 8, // Invalid fuel type code
        tr: 1,
        bt: 2,
        offers: [[3500, 25000, 36, 15000, null]]
      }
    ]
  }
  
  const result = validateExtractionResponse(invalidResponse)
  assertEquals(result.valid, false)
  assertExists(result.errors)
  assertEquals(result.errors[0].includes("invalid fuel type code"), true)
})

Deno.test("Schema validation - missing offers", () => {
  const invalidResponse = {
    cars: [
      {
        make: "Toyota",
        model: "Corolla",
        variant: "1.8 Hybrid",
        hp: 140,
        ft: 2,
        tr: 1,
        bt: 2,
        offers: [] // Empty offers array
      }
    ]
  }
  
  const result = validateExtractionResponse(invalidResponse)
  assertEquals(result.valid, false)
  assertExists(result.errors)
  assertEquals(result.errors[0].includes("must have at least one offer"), true)
})

Deno.test("Variant resolver - matches existing listing", async () => {
  const context: ExtractionContext = {
    dealerName: "Toyota Denmark",
    existingListings: mockExistingListings
  }
  
  const resolver = new VariantResolver(context)
  const resolution = await resolver.resolveVariant(mockExtractedVehicle)
  
  assertEquals(resolution.source, "existing")
  assertEquals(resolution.suggestedVariant, "1.8 Hybrid Active Plus")
  assertEquals(resolution.confidence >= 0.8, true)
  assertExists(resolution.matchDetails)
})

Deno.test("Variant resolver - inferred variant", async () => {
  const unknownVehicle: CompactExtractedVehicle = {
    make: "Tesla",
    model: "Model Y",
    variant: "Long Range AWD",
    hp: 450,
    ft: 1, // Electric
    tr: 1, // Automatic
    bt: 1, // SUV
    wltp: 533,
    co2: 0,
    kwh100: 16.9,
    offers: [[5000, 50000, 36, 20000, 230000]]
  }
  
  const context: ExtractionContext = {
    dealerName: "Generic Dealer",
    existingListings: mockExistingListings
  }
  
  const resolver = new VariantResolver(context)
  const resolution = await resolver.resolveVariant(unknownVehicle)
  
  assertEquals(resolution.source, "inferred")
  assertEquals(resolution.confidence <= 0.5, true)
  assertEquals(resolution.suggestedVariant, "Long Range AWD")
})

Deno.test("Variant resolver - batch resolution statistics", async () => {
  const vehicles: CompactExtractedVehicle[] = [
    mockExtractedVehicle, // Should match existing
    {
      make: "Toyota",
      model: "Yaris",
      variant: "1.5 Hybrid Active", // Exact match
      hp: 116,
      ft: 2,
      tr: 1,
      bt: 2,
      offers: [[2500, 20000, 36, 15000, 110000]]
    },
    {
      make: "Unknown",
      model: "Model",
      variant: "Base",
      hp: 100,
      ft: 3,
      tr: 2,
      bt: 2,
      offers: [[1500, 10000, 24, 15000, 46000]]
    }
  ]
  
  const context: ExtractionContext = {
    dealerName: "Toyota Denmark",
    existingListings: mockExistingListings
  }
  
  const resolver = new VariantResolver(context)
  const resolutions = await resolver.resolveVariants(vehicles)
  const stats = resolver.getResolutionStats(resolutions)
  
  assertEquals(stats.total, 3)
  assertEquals(stats.existing, 2)
  assertEquals(stats.inferred, 1)
  assertEquals(stats.inferenceRate, 1/3)
})

Deno.test("Feature flags - hash-based rollout", async () => {
  // Mock environment
  Deno.env.set("USE_RESPONSES_API", "true")
  Deno.env.set("MIGRATION_PHASE", "1") // 5% rollout
  
  FeatureFlagManager.initialize()
  
  // Test multiple dealer IDs to verify distribution
  const dealerIds = Array.from({ length: 100 }, (_, i) => `dealer-${i}`)
  let responsesApiCount = 0
  
  for (const dealerId of dealerIds) {
    if (await FeatureFlagManager.shouldUseResponsesAPI(dealerId)) {
      responsesApiCount++
    }
  }
  
  // Should be approximately 5% (allowing some variance)
  assertEquals(responsesApiCount >= 2 && responsesApiCount <= 10, true)
  
  // Cleanup
  Deno.env.delete("USE_RESPONSES_API")
  Deno.env.delete("MIGRATION_PHASE")
})

Deno.test("Feature flags - dealer overrides", async () => {
  // Mock environment
  Deno.env.set("USE_RESPONSES_API", "true")
  Deno.env.set("MIGRATION_PHASE", "1")
  Deno.env.set("RESPONSES_API_DEALER_OVERRIDES", "special-dealer-1,special-dealer-2")
  
  FeatureFlagManager.initialize()
  
  // Override dealers should always use Responses API
  assertEquals(await FeatureFlagManager.shouldUseResponsesAPI("special-dealer-1"), true)
  assertEquals(await FeatureFlagManager.shouldUseResponsesAPI("special-dealer-2"), true)
  
  // Cleanup
  Deno.env.delete("USE_RESPONSES_API")
  Deno.env.delete("MIGRATION_PHASE")
  Deno.env.delete("RESPONSES_API_DEALER_OVERRIDES")
})

Deno.test("Feature flags - emergency disable", async () => {
  // Mock environment
  Deno.env.set("USE_RESPONSES_API", "true")
  Deno.env.set("RESPONSES_API_EMERGENCY_DISABLE", "true")
  
  FeatureFlagManager.initialize()
  
  assertEquals(await FeatureFlagManager.isEmergencyDisabled(), true)
  
  // Should not use Responses API when emergency disabled
  assertEquals(await FeatureFlagManager.shouldUseResponsesAPI("any-dealer"), false)
  
  // Cleanup
  Deno.env.delete("USE_RESPONSES_API")
  Deno.env.delete("RESPONSES_API_EMERGENCY_DISABLE")
})