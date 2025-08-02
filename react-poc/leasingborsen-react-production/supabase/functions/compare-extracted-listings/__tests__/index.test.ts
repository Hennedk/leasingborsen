import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts"
import { 
  generateExactKey, 
  generateCompositeKey, 
  extractSpecsFromVariant,
  calculateMatchConfidence,
  detectFieldChanges,
  createExistingListingMaps,
  findBestMatch
} from "../utils/comparison.ts"
import { compareOfferArrays, normalizeOffer } from "../utils/offers.ts"
import type { ExtractedCar, ExistingListing } from "../types.ts"

describe("Comparison Engine - Critical Bug Prevention Tests", () => {
  describe("Matching Logic (Updated Business Rules)", () => {
    it("should match listings with same make/model/variant regardless of transmission", () => {
      const existing: ExistingListing[] = [
        { 
          id: "1",
          make: "Toyota", 
          model: "AYGO X", 
          variant: "Pulse", 
          transmission: "manual",
          fuel_type: "benzin",
          monthly_price: 2195,
          offers: []
        }
      ]
      
      const extracted: ExtractedCar[] = [
        { 
          make: "Toyota", 
          model: "AYGO X", 
          variant: "Pulse", 
          transmission: "automatic",
          fuel_type: "benzin",
          monthly_price: 2395
        }
      ]
      
      // Create lookup maps
      const { existingByExactKey } = createExistingListingMaps(existing)
      const alreadyMatchedIds = new Set<string>()
      
      // Try to find match for the automatic version
      const { existingMatch, matchMethod } = findBestMatch(
        extracted[0],
        existingByExactKey,
        new Map(), // empty composite map for this test
        alreadyMatchedIds
      )
      
      // Should match because transmission is no longer part of the key
      assertEquals(existingMatch?.id, "1")
      assertEquals(matchMethod, "exact")
    })

    it("exact key should NOT include transmission", () => {
      const key1 = generateExactKey("Toyota", "AYGO X", "Pulse")
      const key2 = generateExactKey("Toyota", "AYGO X", "Pulse")
      
      assertEquals(key1, "toyota|aygo x|pulse")
      assertEquals(key2, "toyota|aygo x|pulse")
      assertEquals(key1 === key2, true)
    })

    it("should handle Toyota transmission variants in variant name", () => {
      const specs1 = extractSpecsFromVariant("Active 72 HK")
      const specs2 = extractSpecsFromVariant("Active 72 HK Automatik")
      
      assertEquals(specs1.coreVariant, "Active")
      assertEquals(specs1.horsepower, 72)
      assertEquals(specs1.transmission, undefined)
      
      assertEquals(specs2.coreVariant, "Active") // "Automatik" should be removed
      assertEquals(specs2.horsepower, 72)
      assertEquals(specs2.transmission, "automatic")
    })
  })

  describe("Multiple Offers Comparison", () => {
    it("should correctly compare vehicles with multiple lease offers", () => {
      const existing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "ID.4",
        variant: "GTX",
        transmission: "automatic",
        fuel_type: "el",
        offers: [
          { monthly_price: 4999, mileage_per_year: 15000, first_payment: 0, period_months: 36 },
          { monthly_price: 5499, mileage_per_year: 20000, first_payment: 0, period_months: 36 }
        ]
      }
      
      const extracted: ExtractedCar = {
        make: "VW",
        model: "ID.4",
        variant: "GTX",
        transmission: "automatic",
        fuel_type: "el",
        offers: [
          { monthly_price: 5499, mileage_per_year: 20000, first_payment: 0, period_months: 36 }, // Same offers, different order
          { monthly_price: 4999, mileage_per_year: 15000, first_payment: 0, period_months: 36 }
        ]
      }
      
      // Test offer comparison
      const offersChanged = compareOfferArrays(extracted.offers!, existing.offers)
      assertEquals(offersChanged, false) // Should detect as unchanged despite different order
      
      // Test field change detection
      const changes = detectFieldChanges(extracted, existing)
      assertEquals(changes, null) // No changes should be detected
    })

    it("should detect when offer content has changed", () => {
      const existingOffers = [
        { monthly_price: 4999, mileage_per_year: 15000, first_payment: 0, period_months: 36 }
      ]
      
      const extractedOffers = [
        { monthly_price: 5299, mileage_per_year: 15000, first_payment: 0, period_months: 36 } // Price changed
      ]
      
      const offersChanged = compareOfferArrays(extractedOffers, existingOffers)
      assertEquals(offersChanged, true)
    })

    it("should handle array format offers", () => {
      const existingOffers = [
        [4999, 0, 36, 15000], // array format
        [5499, 0, 36, 20000]
      ]
      
      const extractedOffers = [
        { monthly_price: 5499, first_payment: 0, period_months: 36, mileage_per_year: 20000 },
        { monthly_price: 4999, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
      ]
      
      const offersChanged = compareOfferArrays(extractedOffers, existingOffers)
      assertEquals(offersChanged, false) // Should handle format differences
    })
  })

  describe("Exact Key Matching", () => {
    it("should generate consistent exact keys without transmission", () => {
      const cases = [
        { make: "VW", model: "Golf", variant: "GTI", expected: "vw|golf|gti" },
        { make: "BMW", model: "X3", variant: "xDrive30d", expected: "bmw|x3|xdrive30d" },
        { make: "Mercedes", model: "GLC", variant: "300 d", expected: "mercedes|glc|300 d" }
      ]
      
      cases.forEach(testCase => {
        const key = generateExactKey(testCase.make, testCase.model, testCase.variant)
        assertEquals(key, testCase.expected)
      })
    })
  })

  describe("Composite Key Matching", () => {
    it("should extract specs and generate composite keys correctly", () => {
      const cases = [
        {
          make: "VW", 
          model: "Golf", 
          variant: "GTI 245 HK DSG", 
          expected: {
            key: "vw|golf|gti|245hp|automatic",
            specs: { horsepower: 245, transmission: "automatic", coreVariant: "GTI" }
          }
        },
        {
          make: "BMW", 
          model: "X3", 
          variant: "xDrive30d 286 HK Automatgear", 
          expected: {
            key: "bmw|x3|30d|286hp|automatic|awd",
            specs: { horsepower: 286, transmission: "automatic", coreVariant: "30d", awd: true }
          }
        }
      ]
      
      cases.forEach(testCase => {
        const specs = extractSpecsFromVariant(testCase.variant)
        assertEquals(specs.horsepower, testCase.expected.specs.horsepower)
        assertEquals(specs.transmission, testCase.expected.specs.transmission)
        assertEquals(specs.coreVariant, testCase.expected.specs.coreVariant)
        
        const key = generateCompositeKey(testCase.make, testCase.model, testCase.variant)
        assertEquals(key, testCase.expected.key)
      })
    })

    it("should handle variants without technical specs", () => {
      const specs = extractSpecsFromVariant("Base")
      assertEquals(specs.coreVariant, "Base")
      assertEquals(specs.horsepower, undefined)
      assertEquals(specs.transmission, undefined)
      assertEquals(specs.awd, false)
    })
  })

  describe("Match Confidence Calculation", () => {
    it("should calculate high confidence for exact technical matches", () => {
      const extracted: ExtractedCar = {
        make: "VW",
        model: "Golf",
        variant: "GTI 245 HK",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
      }
      
      const existing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "Golf",
        variant: "GTI 245 HK DSG",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
        offers: []
      }
      
      const confidence = calculateMatchConfidence(extracted, existing)
      assertEquals(confidence >= 0.9, true) // Should have high confidence
    })

    it("should calculate low confidence for different transmissions", () => {
      const extracted: ExtractedCar = {
        make: "VW",
        model: "Golf",
        variant: "GTI",
        transmission: "manual",
        fuel_type: "benzin",
      }
      
      const existing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "Golf",
        variant: "GTI",
        transmission: "automatic",
        fuel_type: "benzin",
        offers: []
      }
      
      const confidence = calculateMatchConfidence(extracted, existing)
      assertEquals(confidence < 0.85, true) // Should not meet threshold
    })
  })

  describe("Field Change Detection", () => {
    it("should detect no changes for identical data", () => {
      const existing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "Golf",
        variant: "GTI",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
        year: 2024,
        monthly_price: 3999,
        offers: []
      }
      
      const extracted: ExtractedCar = {
        make: "VW",
        model: "Golf",
        variant: "GTI",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
        year: 2024
      }
      
      const changes = detectFieldChanges(extracted, existing)
      assertEquals(changes, null)
    })

    it("should detect specific field changes", () => {
      const existing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "Golf",
        variant: "GTI",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
        year: 2023,
        wltp: 180,
        co2_emission: 150,
        offers: []
      }
      
      const extracted: ExtractedCar = {
        make: "VW",
        model: "Golf",
        variant: "GTI Performance",
        horsepower: 265,
        transmission: "automatic",
        fuel_type: "benzin",
        year: 2024,
        wltp: 190,
        co2_emission: 155
      }
      
      const changes = detectFieldChanges(extracted, existing)
      assertExists(changes)
      assertEquals(changes!.variant.old, "GTI")
      assertEquals(changes!.variant.new, "GTI Performance")
      assertEquals(changes!.horsepower.old, 245)
      assertEquals(changes!.horsepower.new, 265)
      assertEquals(changes!.year.old, 2023)
      assertEquals(changes!.year.new, 2024)
    })
  })

  describe("Edge Cases", () => {
    it("should handle Hyundai equipment variants as separate", () => {
      const existing: ExistingListing[] = []
      const extracted: ExtractedCar[] = [
        { 
          make: "Hyundai",
          model: "IONIQ 5", 
          variant: "Ultimate 325 HK 4WD",
          transmission: "automatic",
          fuel_type: "el",
        },
        { 
          make: "Hyundai",
          model: "IONIQ 5", 
          variant: "Ultimate 325 HK 4WD – 20\" alufælge, soltag",
          transmission: "automatic",
          fuel_type: "el",
        }
      ]
      
      // Generate keys for both
      const key1 = generateExactKey(extracted[0].make, extracted[0].model, extracted[0].variant)
      const key2 = generateExactKey(extracted[1].make, extracted[1].model, extracted[1].variant)
      
      // They should have different keys
      assertEquals(key1 === key2, false)
    })

    it("should normalize offer data correctly", () => {
      const arrayOffer = [2999, 5000, 36, 15000]
      const objectOffer = { monthly_price: 2999, first_payment: 5000, period_months: 36, mileage_per_year: 15000 }
      
      const normalized1 = normalizeOffer(arrayOffer)
      const normalized2 = normalizeOffer(objectOffer)
      
      assertEquals(normalized1.monthly_price, normalized2.monthly_price)
      assertEquals(normalized1.first_payment, normalized2.first_payment)
      assertEquals(normalized1.period_months, normalized2.period_months)
      assertEquals(normalized1.mileage_per_year, normalized2.mileage_per_year)
    })
  })
})