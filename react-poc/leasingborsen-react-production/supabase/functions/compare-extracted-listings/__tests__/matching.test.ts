import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { describe, it } from "https://deno.land/std@0.168.0/testing/bdd.ts"
import { 
  extractSpecsFromVariant, 
  generateCompositeKey, 
  calculateMatchConfidence,
  calculateStringSimilarity,
  levenshteinDistance
} from "../utils/matching.ts"
import type { ExtractedCar, ExistingListing } from "../types.ts"

describe("Matching Utilities", () => {
  describe("extractSpecsFromVariant", () => {
    it("should extract horsepower correctly", () => {
      const testCases = [
        { variant: "GTI 245 HK", expected: 245 },
        { variant: "1.5 TSI 150HK", expected: 150 },
        { variant: "Ultimate 325 hp AWD", expected: 325 },
        { variant: "Base", expected: undefined },
      ]
      
      testCases.forEach(({ variant, expected }) => {
        const specs = extractSpecsFromVariant(variant)
        assertEquals(specs.horsepower, expected)
      })
    })

    it("should extract transmission info", () => {
      const testCases = [
        { variant: "GTI DSG", expected: "automatic" },
        { variant: "1.5 TSI S Tronic", expected: "automatic" },
        { variant: "Comfortline Automatgear", expected: "automatic" },
        { variant: "Active Automatik", expected: "automatic" },
        { variant: "Base Manual", expected: "manual" },
        { variant: "Sport Manuel", expected: "manual" },
        { variant: "GTI", expected: undefined },
      ]
      
      testCases.forEach(({ variant, expected }) => {
        const specs = extractSpecsFromVariant(variant)
        assertEquals(specs.transmission, expected)
      })
    })

    it("should detect AWD/4WD indicators", () => {
      const testCases = [
        { variant: "xDrive30d", expected: true },
        { variant: "GTI 4Motion", expected: true },
        { variant: "Ultimate AWD", expected: true },
        { variant: "Sport 4WD", expected: true },
        { variant: "Q5 Quattro", expected: true },
        { variant: "GLE 350d Allrad", expected: true },
        { variant: "GTI", expected: false },
      ]
      
      testCases.forEach(({ variant, expected }) => {
        const specs = extractSpecsFromVariant(variant)
        assertEquals(specs.awd, expected)
      })
    })

    it("should clean variant names properly", () => {
      const testCases = [
        { 
          variant: "GTI 245 HK DSG", 
          expected: "GTI" 
        },
        { 
          variant: "xDrive30d 286 HK Automatgear Mild Hybrid", 
          expected: "30d" 
        },
        { 
          variant: "1.5 TSI 150 HK S Tronic", 
          expected: "1.5" 
        },
      ]
      
      testCases.forEach(({ variant, expected }) => {
        const specs = extractSpecsFromVariant(variant)
        assertEquals(specs.coreVariant, expected)
      })
    })
  })

  describe("generateCompositeKey", () => {
    it("should generate complete keys with all specs", () => {
      const key = generateCompositeKey("BMW", "X3", "xDrive30d 286 HK", 286, "automatic")
      assertEquals(key, "bmw|x3|30d|286hp|automatic|awd")
    })

    it("should extract specs from variant when not provided", () => {
      const key = generateCompositeKey("VW", "Golf", "GTI 245 HK DSG")
      assertEquals(key, "vw|golf|gti|245hp|automatic")
    })

    it("should handle missing specs gracefully", () => {
      const key = generateCompositeKey("Tesla", "Model 3", "Long Range")
      assertEquals(key, "tesla|model 3|long range")
    })
  })

  describe("calculateMatchConfidence", () => {
    it("should give perfect confidence for identical vehicles", () => {
      const car: ExtractedCar = {
        make: "VW",
        model: "Golf",
        variant: "GTI 245 HK",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
      }
      
      const listing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "Golf", 
        variant: "GTI 245 HK",
        horsepower: 245,
        transmission: "automatic",
        fuel_type: "benzin",
        offers: []
      }
      
      const confidence = calculateMatchConfidence(car, listing)
      assertEquals(confidence, 1.0)
    })

    it("should penalize transmission mismatches", () => {
      const car: ExtractedCar = {
        make: "VW",
        model: "Golf",
        variant: "GTI",
        transmission: "manual",
        fuel_type: "benzin",
      }
      
      const listing: ExistingListing = {
        id: "1",
        make: "VW",
        model: "Golf",
        variant: "GTI",
        transmission: "automatic",
        fuel_type: "benzin",
        offers: []
      }
      
      const confidence = calculateMatchConfidence(car, listing)
      // Should have lower confidence due to transmission mismatch
      assertEquals(confidence < 0.8, true)
    })

    it("should handle close horsepower values", () => {
      const car: ExtractedCar = {
        make: "BMW",
        model: "X3",
        variant: "xDrive30d",
        horsepower: 285, // Close to 286
        transmission: "automatic",
        fuel_type: "diesel",
      }
      
      const listing: ExistingListing = {
        id: "1",
        make: "BMW",
        model: "X3",
        variant: "xDrive30d",
        horsepower: 286,
        transmission: "automatic",
        fuel_type: "diesel",
        offers: []
      }
      
      const confidence = calculateMatchConfidence(car, listing)
      // Should have good confidence despite 1HP difference
      assertEquals(confidence > 0.8, true)
    })
  })

  describe("String Similarity", () => {
    it("should calculate Levenshtein distance correctly", () => {
      const testCases = [
        { str1: "kitten", str2: "sitting", expected: 3 },
        { str1: "saturday", str2: "sunday", expected: 3 },
        { str1: "identical", str2: "identical", expected: 0 },
        { str1: "", str2: "test", expected: 4 },
      ]
      
      testCases.forEach(({ str1, str2, expected }) => {
        const distance = levenshteinDistance(str1, str2)
        assertEquals(distance, expected)
      })
    })

    it("should calculate string similarity correctly", () => {
      const testCases = [
        { str1: "GTI", str2: "GTI", expected: 1.0 },
        { str1: "GTI Performance", str2: "GTI", expected: 0.2 }, // 3 chars same out of 15
        { str1: "xDrive30d", str2: "xDrive30i", expected: 8/9 }, // 8 chars same out of 9
      ]
      
      testCases.forEach(({ str1, str2, expected }) => {
        const similarity = calculateStringSimilarity(str1, str2)
        assertEquals(Math.abs(similarity - expected) < 0.01, true)
      })
    })
  })
})