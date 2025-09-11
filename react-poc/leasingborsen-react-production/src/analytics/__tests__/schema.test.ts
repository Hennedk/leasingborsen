/**
 * Unit Tests for Schema Validation (schema.ts)
 * 
 * Tests Zod schemas, validation functions, and type constraints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  PageViewSchema,
  validatePageViewOrWarn,
  isValidPageViewEvent,
  getValidationErrors,
  PageTypes,
  PageLoadTypes,
  DeviceTypes,
  FuelTypes,
  LeaseScoreBands,
  EntryMethods,
  ALLOWED_FILTER_KEYS,
  FiltersActiveSchema,
} from '../schema'
import { testSetup, testHelpers } from './test-utils'

describe('Schema Validation (schema.ts)', () => {
  beforeEach(() => {
    testSetup.beforeEach()
  })

  afterEach(() => {
    testSetup.afterEach()
  })

  describe('Base Schema Validation', () => {
    const baseValidEvent = {
      schema_version: '1' as const,
      session_id: 's_1704067200_abc123',
      device_type: 'desktop' as const,
      page_type: 'home' as const,
      path: '/',
      page_load_type: 'cold' as const,
    }

    it('should validate a basic home page event', () => {
      const result = PageViewSchema.safeParse(baseValidEvent)
      expect(result.success).toBe(true)
    })

    it('should require schema_version to be "1"', () => {
      const invalidEvent = { ...baseValidEvent, schema_version: '2' }
      const result = PageViewSchema.safeParse(invalidEvent)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            message: expect.stringContaining('Invalid literal value'),
          })
        )
      }
    })

    it('should validate session_id format', () => {
      const testCases = [
        { value: 's_1704067200_abc123', valid: true },
        { value: 's_123_xyz789', valid: true },
        { value: 'invalid-format', valid: false },
        { value: 'rs_1704067200_abc123', valid: false },
        { value: '', valid: false },
      ]

      testCases.forEach(({ value, valid }) => {
        const event = { ...baseValidEvent, session_id: value }
        const result = PageViewSchema.safeParse(event)
        
        expect(result.success).toBe(valid)
      })
    })

    it('should validate device_type enum', () => {
      DeviceTypes.DESKTOP, DeviceTypes.MOBILE, DeviceTypes.TABLET // Valid values
      
      const validTypes = ['desktop', 'mobile', 'tablet']
      const invalidTypes = ['unknown', 'smart-tv', '']
      
      validTypes.forEach(type => {
        const event = { ...baseValidEvent, device_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidTypes.forEach(type => {
        const event = { ...baseValidEvent, device_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate page_type enum', () => {
      const validTypes = ['home', 'results', 'listing_detail', 'other']
      const invalidTypes = ['invalid', 'admin', 'error']
      
      validTypes.forEach(type => {
        const event = { ...baseValidEvent, page_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidTypes.forEach(type => {
        const event = { ...baseValidEvent, page_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate page_load_type enum', () => {
      const validTypes = Object.values(PageLoadTypes)
      const invalidTypes = ['unknown', 'fast', 'slow']
      
      validTypes.forEach(type => {
        const event = { ...baseValidEvent, page_load_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidTypes.forEach(type => {
        const event = { ...baseValidEvent, page_load_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should require path to be non-empty', () => {
      const validPaths = ['/', '/listings', '/listing/123']
      const invalidPaths = ['', null, undefined]
      
      validPaths.forEach(path => {
        const event = { ...baseValidEvent, path }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidPaths.forEach(path => {
        const event = { ...baseValidEvent, path }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should allow optional fields to be undefined', () => {
      const optionalFields = [
        'page_name',
        'query',
        'referrer_host',
        'feature_flags',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
      ]
      
      optionalFields.forEach(field => {
        const event = { ...baseValidEvent, [field]: undefined }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Results Page Schema', () => {
    const baseResultsEvent = {
      schema_version: '1' as const,
      session_id: 's_1704067200_abc123',
      device_type: 'desktop' as const,
      page_type: 'results' as const,
      path: '/listings',
      page_load_type: 'spa' as const,
      results_session_id: 'rs_1704067300_def456',
    }

    it('should validate results page event', () => {
      const result = PageViewSchema.safeParse(baseResultsEvent)
      expect(result.success).toBe(true)
    })

    it('should validate results_session_id format', () => {
      const testCases = [
        { value: 'rs_1704067300_def456', valid: true },
        { value: 'rs_123_xyz789', valid: true },
        { value: 's_1704067300_def456', valid: false },
        { value: 'invalid-format', valid: false },
        { value: '', valid: false },
      ]

      testCases.forEach(({ value, valid }) => {
        const event = { ...baseResultsEvent, results_session_id: value }
        const result = PageViewSchema.safeParse(event)
        
        expect(result.success).toBe(valid)
      })
    })

    it('should validate results_count range', () => {
      const validCounts = [0, 1, 100, 9999, 10000]
      const invalidCounts = [-1, 10001, 999999, 1.5, '100']
      
      validCounts.forEach(count => {
        const event = { ...baseResultsEvent, results_count: count }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidCounts.forEach(count => {
        const event = { ...baseResultsEvent, results_count: count }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate latency_ms range', () => {
      const validLatencies = [0, 100, 1000, 30000]
      const invalidLatencies = [-1, 30001, 999999, 1.5, '1000']
      
      validLatencies.forEach(latency => {
        const event = { ...baseResultsEvent, latency_ms: latency }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidLatencies.forEach(latency => {
        const event = { ...baseResultsEvent, latency_ms: latency }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate filters_active structure', () => {
      const validFilters = [
        { make: 'BMW', price_max: 5000 },
        { fuel_type: 'ev', sort_option: 'score_desc' },
        {},
      ]
      
      validFilters.forEach(filters => {
        const event = { ...baseResultsEvent, filters_active: filters }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Listing Detail Page Schema', () => {
    const baseListingEvent = {
      schema_version: '1' as const,
      session_id: 's_1704067200_abc123',
      device_type: 'desktop' as const,
      page_type: 'listing_detail' as const,
      path: '/listing/abc-123',
      page_load_type: 'spa' as const,
      listing_id: 'abc-123-def-456',
    }

    it('should validate listing detail page event', () => {
      const result = PageViewSchema.safeParse(baseListingEvent)
      expect(result.success).toBe(true)
    })

    it('should allow listing detail pages without listing_id', () => {
      const eventWithoutId = { ...baseListingEvent }
      delete (eventWithoutId as any).listing_id
      
      const result = PageViewSchema.safeParse(eventWithoutId)
      expect(result.success).toBe(true)
    })

    it('should validate lease_score range', () => {
      const validScores = [0, 50, 85, 100]
      const invalidScores = [-1, 101, 85.5, '85']
      
      validScores.forEach(score => {
        const event = { ...baseListingEvent, lease_score: score }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidScores.forEach(score => {
        const event = { ...baseListingEvent, lease_score: score }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate lease_score_band enum', () => {
      const validBands = Object.values(LeaseScoreBands)
      const invalidBands = ['unknown', 'perfect', 'bad']
      
      validBands.forEach(band => {
        const event = { ...baseListingEvent, lease_score_band: band }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidBands.forEach(band => {
        const event = { ...baseListingEvent, lease_score_band: band }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate price_dkk range', () => {
      const validPrices = [0, 1000, 50000, 1000000]
      const invalidPrices = [-1, 1000001, 1000.5, '5000']
      
      validPrices.forEach(price => {
        const event = { ...baseListingEvent, price_dkk: price }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidPrices.forEach(price => {
        const event = { ...baseListingEvent, price_dkk: price }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate fuel_type enum', () => {
      const validTypes = Object.values(FuelTypes)
      const invalidTypes = ['gasoline', 'diesel', 'unknown']
      
      validTypes.forEach(type => {
        const event = { ...baseListingEvent, fuel_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidTypes.forEach(type => {
        const event = { ...baseListingEvent, fuel_type: type }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate entry_method enum', () => {
      const validMethods = Object.values(EntryMethods)
      const invalidMethods = ['search', 'bookmark', 'unknown']
      
      validMethods.forEach(method => {
        const event = { ...baseListingEvent, entry_method: method }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidMethods.forEach(method => {
        const event = { ...baseListingEvent, entry_method: method }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })

    it('should validate source_event_id UUID format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ]
      const invalidUUIDs = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '',
      ]
      
      validUUIDs.forEach(uuid => {
        const event = { ...baseListingEvent, source_event_id: uuid }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(true)
      })
      
      invalidUUIDs.forEach(uuid => {
        const event = { ...baseListingEvent, source_event_id: uuid }
        const result = PageViewSchema.safeParse(event)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Validation Helpers', () => {
    const validEvent = {
      schema_version: '1' as const,
      session_id: 's_1704067200_abc123',
      device_type: 'desktop' as const,
      page_type: 'home' as const,
      path: '/',
      page_load_type: 'cold' as const,
    }

    describe('validatePageViewOrWarn', () => {
      it('should not throw in production mode', () => {
        // Mock production environment by making import.meta undefined
        const originalImportMeta = (globalThis as any).import
        delete (globalThis as any).import
        
        const invalidEvent = { ...validEvent, schema_version: 'invalid' }
        
        expect(() => validatePageViewOrWarn(invalidEvent)).not.toThrow()
        
        // Restore import.meta
        if (originalImportMeta) {
          (globalThis as any).import = originalImportMeta
        }
      })

      it('should throw in development mode for invalid events', () => {
        // Mock development environment
        const originalImportMeta = (globalThis as any).import
        ;(globalThis as any).import = { meta: { env: { DEV: true } } }
        
        const invalidEvent = { ...validEvent, schema_version: 'invalid' }
        
        expect(() => validatePageViewOrWarn(invalidEvent)).toThrow()
        
        // Restore import.meta
        if (originalImportMeta) {
          (globalThis as any).import = originalImportMeta
        } else {
          delete (globalThis as any).import
        }
      })

      it('should not throw in development mode for valid events', () => {
        // Mock development environment
        const originalImportMeta = (globalThis as any).import
        ;(globalThis as any).import = { meta: { env: { DEV: true } } }
        
        expect(() => validatePageViewOrWarn(validEvent)).not.toThrow()
        
        // Restore import.meta
        if (originalImportMeta) {
          (globalThis as any).import = originalImportMeta
        } else {
          delete (globalThis as any).import
        }
      })
    })

    describe('isValidPageViewEvent', () => {
      it('should return true for valid events', () => {
        expect(isValidPageViewEvent(validEvent)).toBe(true)
      })

      it('should return false for invalid events', () => {
        const invalidEvent = { ...validEvent, schema_version: 'invalid' }
        expect(isValidPageViewEvent(invalidEvent)).toBe(false)
      })

      it('should handle null and undefined', () => {
        expect(isValidPageViewEvent(null)).toBe(false)
        expect(isValidPageViewEvent(undefined)).toBe(false)
      })
    })

    describe('getValidationErrors', () => {
      it('should return empty array for valid events', () => {
        const errors = getValidationErrors(validEvent)
        expect(errors).toEqual([])
      })

      it('should return error messages for invalid events', () => {
        const invalidEvent = { ...validEvent, schema_version: 'invalid' }
        const errors = getValidationErrors(invalidEvent)
        
        expect(errors).toHaveLength(1)
        expect(errors[0]).toContain('Invalid literal value')
      })

      it('should return multiple errors for multiple issues', () => {
        const invalidEvent = {
          ...validEvent,
          schema_version: 'invalid',
          session_id: 'invalid-format',
          device_type: 'invalid-device',
        }
        
        const errors = getValidationErrors(invalidEvent)
        expect(errors.length).toBeGreaterThan(1)
      })
    })
  })

  describe('Filter Schema Validation', () => {
    it('should validate allowed filter keys', () => {
      const validFilters = {
        price_max: 5000,
        make: 'BMW',
        fuel_type: 'ev',
      }
      
      const result = FiltersActiveSchema.safeParse(validFilters)
      expect(result.success).toBe(true)
    })

    it('should reject unknown filter keys', () => {
      const invalidFilters = {
        price_max: 5000,
        unknown_filter: 'value',
      }
      
      const result = FiltersActiveSchema.safeParse(invalidFilters)
      expect(result.success).toBe(false)
    })

    it('should validate filter value types', () => {
      const validValues = {
        price_max: 5000,          // number
        make: 'BMW',             // string
        sort_option: true,       // boolean
      }
      
      const result = FiltersActiveSchema.safeParse(validValues)
      expect(result.success).toBe(true)
    })
  })

  describe('Enum Constants', () => {
    it('should export all required enum constants', () => {
      expect(PageTypes).toBeDefined()
      expect(PageLoadTypes).toBeDefined()
      expect(DeviceTypes).toBeDefined()
      expect(FuelTypes).toBeDefined()
      expect(LeaseScoreBands).toBeDefined()
      expect(EntryMethods).toBeDefined()
    })

    it('should have consistent enum values', () => {
      expect(PageTypes.HOME).toBe('home')
      expect(PageTypes.RESULTS).toBe('results')
      expect(PageTypes.LISTING_DETAIL).toBe('listing_detail')
      expect(PageTypes.OTHER).toBe('other')
    })

    it('should include all allowed filter keys', () => {
      expect(ALLOWED_FILTER_KEYS).toContain('price_max')
      expect(ALLOWED_FILTER_KEYS).toContain('make')
      expect(ALLOWED_FILTER_KEYS).toContain('fuel_type')
      expect(ALLOWED_FILTER_KEYS).toHaveLength(8) // Ensure we have expected number
    })
  })

  describe('Schema Evolution', () => {
    it('should maintain backward compatibility', () => {
      // Test with older event structure
      const legacyEvent = {
        schema_version: '1' as const,
        session_id: 's_1704067200_abc123',
        device_type: 'desktop' as const,
        page_type: 'home' as const,
        path: '/',
        page_load_type: 'cold' as const,
        // Missing newer optional fields
      }
      
      const result = PageViewSchema.safeParse(legacyEvent)
      expect(result.success).toBe(true)
    })

    it('should handle additional properties gracefully', () => {
      const eventWithExtra = {
        schema_version: '1' as const,
        session_id: 's_1704067200_abc123',
        device_type: 'desktop' as const,
        page_type: 'home' as const,
        path: '/',
        page_load_type: 'cold' as const,
        future_field: 'should_be_ignored',
      }
      
      // Zod strips unknown properties by default
      const result = PageViewSchema.safeParse(eventWithExtra)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data).not.toHaveProperty('future_field')
      }
    })
  })
})