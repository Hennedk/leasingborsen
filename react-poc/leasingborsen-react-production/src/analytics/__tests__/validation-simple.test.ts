/**
 * Simple validation tests without complex mocking
 */

import { describe, it, expect } from 'vitest'
import { PageViewSchema, isValidPageViewEvent, getValidationErrors } from '../schema'

describe('Simple Schema Validation', () => {
  const validHomeEvent = {
    schema_version: '1' as const,
    session_id: 's_1704067200_abc123',
    device_type: 'desktop' as const,
    page_type: 'home' as const,
    path: '/',
    page_load_type: 'cold' as const,
  }

  const validResultsEvent = {
    schema_version: '1' as const,
    session_id: 's_1704067200_abc123',
    device_type: 'mobile' as const,
    page_type: 'results' as const,
    path: '/listings',
    page_load_type: 'spa' as const,
    results_session_id: 'rs_1704067300_def456',
    results_count: 24,
  }

  const validListingEvent = {
    schema_version: '1' as const,
    session_id: 's_1704067200_abc123',
    device_type: 'tablet' as const,
    page_type: 'listing_detail' as const,
    path: '/listing/123',
    page_load_type: 'bfcache' as const,
    listing_id: 'abc-123-def-456',
    lease_score: 85,
  }

  it('should validate all page types correctly', () => {
    expect(PageViewSchema.safeParse(validHomeEvent).success).toBe(true)
    expect(PageViewSchema.safeParse(validResultsEvent).success).toBe(true)
    expect(PageViewSchema.safeParse(validListingEvent).success).toBe(true)
  })

  it('should validate using helper functions', () => {
    expect(isValidPageViewEvent(validHomeEvent)).toBe(true)
    expect(isValidPageViewEvent(validResultsEvent)).toBe(true)
    expect(isValidPageViewEvent(validListingEvent)).toBe(true)
  })

  it('should detect invalid events', () => {
    const invalidEvent = { ...validHomeEvent, schema_version: 'invalid' }
    expect(isValidPageViewEvent(invalidEvent)).toBe(false)
    
    const errors = getValidationErrors(invalidEvent)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('Invalid literal value')
  })

  it('should validate page types correctly', () => {
    const testCases = [
      { ...validHomeEvent, page_type: 'home' as const },
      { ...validHomeEvent, page_type: 'results' as const },
      { ...validHomeEvent, page_type: 'listing_detail' as const },
      { ...validHomeEvent, page_type: 'other' as const },
    ]

    testCases.forEach(testCase => {
      const result = PageViewSchema.safeParse(testCase)
      expect(result.success).toBe(true)
    })
  })
})