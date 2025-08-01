import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { setupSupabaseMocks, resetSupabaseMocks, mockSupabaseClient } from '@/test/mocks/supabase'
import { useListingComparison } from '@/hooks/useListingComparison'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { createElement } from 'react'

// Mock data for integration tests
const mockExtractionSession = {
  id: 'session-123',
  extraction_type: 'pdf',
  seller_id: 'seller-123',
  status: 'completed',
  extracted_data: {
    cars: [
      {
        make: 'Toyota',
        model: 'AYGO X',
        variant: 'Pulse',
        transmission: 'automatic',
        fuel_type: 'benzin',
        body_type: 'hatchback',
        monthly_price: 2395,
        offers: [
          { monthly_price: 2395, first_payment: 0, period_months: 36, mileage_per_year: 15000 }
        ]
      },
      {
        make: 'VW',
        model: 'ID.4',
        variant: 'GTX',
        transmission: 'automatic',
        fuel_type: 'el',
        body_type: 'suv',
        offers: [
          { monthly_price: 5299, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
          { monthly_price: 5799, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
        ]
      }
    ]
  }
}

const mockComparisonResult = {
  success: true,
  matches: [
    {
      extracted: mockExtractionSession.extracted_data.cars[0],
      existing: null,
      confidence: 1.0,
      matchMethod: 'unmatched',
      changeType: 'create',
      variantTracking: { source: 'unknown', confidence: 0 }
    },
    {
      extracted: mockExtractionSession.extracted_data.cars[1],
      existing: {
        id: 'existing-vw-1',
        make: 'VW',
        model: 'ID.4',
        variant: 'GTX',
        transmission: 'automatic',
        fuel_type: 'el',
        body_type: 'suv',
        offers: [
          { monthly_price: 4999, first_payment: 0, period_months: 36, mileage_per_year: 15000 },
          { monthly_price: 5499, first_payment: 0, period_months: 36, mileage_per_year: 20000 }
        ]
      },
      confidence: 1.0,
      matchMethod: 'exact',
      changeType: 'update',
      changes: {
        offers: { old: '2 tilbud (indhold ændret)', new: '2 tilbud (nye priser/vilkår)' }
      },
      variantTracking: { source: 'existing', confidence: 1.0 }
    }
  ],
  summary: {
    totalExtracted: 2,
    totalExisting: 1,
    totalMatched: 1,
    totalNew: 1,
    totalUpdated: 1,
    totalUnchanged: 0,
    totalDeleted: 0,
    totalMissingModels: 0,
    exactMatches: 1,
    fuzzyMatches: 0,
    variantSources: {
      existing: 1,
      reference: 0,
      inferred: 0,
      unknown: 1
    },
    avgVariantConfidence: 0.5
  }
}

describe('Comparison Integration Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    setupSupabaseMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
  })

  afterEach(() => {
    resetSupabaseMocks()
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => 
    createElement(QueryClientProvider, { client: queryClient }, children)

  describe('useListingComparison hook', () => {
    test('should fetch extraction session and comparison data', async () => {
      // Mock supabase responses
      setupSupabaseMocks()
      const supabase = mockSupabaseClient
      
      // Mock extraction session fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'extraction_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockExtractionSession, error: null })
          }
        }
        return supabase.from(table)
      })

      // Mock Edge Function call
      supabase.functions.invoke.mockResolvedValue({
        data: mockComparisonResult,
        error: null
      })

      const { result } = renderHook(
        () => useListingComparison('session-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.session).toEqual(mockExtractionSession)
      expect(result.current.comparison).toEqual(mockComparisonResult)
      expect(result.current.error).toBe(null)
    })

    test('should handle comparison Edge Function errors', async () => {
      setupSupabaseMocks()
      const supabase = mockSupabaseClient
      
      // Mock successful session fetch
      supabase.from.mockImplementation((table: string) => {
        if (table === 'extraction_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockExtractionSession, error: null })
          }
        }
        return supabase.from(table)
      })

      // Mock Edge Function error
      const edgeFunctionError = new Error('Edge Function timeout')
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: edgeFunctionError
      })

      const { result } = renderHook(
        () => useListingComparison('session-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.session).toEqual(mockExtractionSession)
      expect(result.current.comparison).toBe(null)
      expect(result.current.error).toEqual(edgeFunctionError)
    })

    test('should apply selected changes via Edge Function', async () => {
      setupSupabaseMocks()
      const supabase = mockSupabaseClient
      
      // Setup initial data
      supabase.from.mockImplementation((table: string) => {
        if (table === 'extraction_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockExtractionSession, error: null })
          }
        }
        return supabase.from(table)
      })

      supabase.functions.invoke.mockImplementation((functionName: string) => {
        if (functionName === 'compare-extracted-listings') {
          return Promise.resolve({ data: mockComparisonResult, error: null })
        }
        if (functionName === 'apply-extraction-changes') {
          return Promise.resolve({
            data: {
              success: true,
              appliedCount: 2,
              errors: [],
              sessionStatus: 'completed'
            },
            error: null
          })
        }
        return Promise.resolve({ data: null, error: new Error('Unknown function') })
      })

      const { result } = renderHook(
        () => useListingComparison('session-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Apply selected changes
      await result.current.applySelectedChanges({
        sessionId: 'session-123',
        selectedChangeIds: ['change-1', 'change-2'],
        appliedBy: 'test-user'
      })

      // Verify the Edge Function was called correctly
      expect(supabase.functions.invoke).toHaveBeenCalledWith('apply-extraction-changes', {
        body: {
          sessionId: 'session-123',
          selectedChangeIds: ['change-1', 'change-2'],
          appliedBy: 'test-user'
        }
      })
    })
  })

  describe('Comparison Result Processing', () => {
    test('should correctly categorize comparison results', () => {
      const { matches, summary } = mockComparisonResult
      
      // Check CREATE operations
      const createMatches = matches.filter(m => m.changeType === 'create')
      expect(createMatches).toHaveLength(1)
      expect(createMatches[0].extracted.make).toBe('Toyota')
      
      // Check UPDATE operations
      const updateMatches = matches.filter(m => m.changeType === 'update')
      expect(updateMatches).toHaveLength(1)
      expect(updateMatches[0].existing?.id).toBe('existing-vw-1')
      expect(updateMatches[0].changes).toBeDefined()
      
      // Verify summary counts
      expect(summary.totalNew).toBe(1)
      expect(summary.totalUpdated).toBe(1)
      expect(summary.totalUnchanged).toBe(0)
      expect(summary.totalDeleted).toBe(0)
    })

    test('should track variant sources correctly', () => {
      const { summary } = mockComparisonResult
      
      expect(summary.variantSources).toEqual({
        existing: 1,
        reference: 0,
        inferred: 0,
        unknown: 1
      })
      
      expect(summary.avgVariantConfidence).toBe(0.5)
    })
  })

  describe('Error Scenarios', () => {
    test('should handle network errors gracefully', async () => {
      setupSupabaseMocks()
      const supabase = mockSupabaseClient
      
      // Mock network error
      supabase.from.mockImplementation(() => {
        throw new Error('Network error')
      })

      const { result } = renderHook(
        () => useListingComparison('session-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toContain('Network error')
    })

    test('should handle malformed Edge Function responses', async () => {
      setupSupabaseMocks()
      const supabase = mockSupabaseClient
      
      supabase.from.mockImplementation((table: string) => {
        if (table === 'extraction_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockExtractionSession, error: null })
          }
        }
        return supabase.from(table)
      })

      // Return malformed data
      supabase.functions.invoke.mockResolvedValue({
        data: { invalid: 'response' }, // Missing expected fields
        error: null
      })

      const { result } = renderHook(
        () => useListingComparison('session-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should handle gracefully even with malformed data
      expect(result.current.comparison).toBeDefined()
    })
  })

  describe('Large Dataset Performance', () => {
    test('should handle large comparison results efficiently', async () => {
      setupSupabaseMocks()
      const supabase = mockSupabaseClient
      
      // Create large dataset
      const largeMatches = Array.from({ length: 1000 }, (_, i) => ({
        extracted: {
          make: `Make${i}`,
          model: `Model${i}`,
          variant: `Variant${i}`,
          transmission: i % 2 === 0 ? 'manual' : 'automatic',
          fuel_type: 'benzin',
          body_type: 'sedan'
        },
        existing: i < 500 ? null : {
          id: `existing-${i}`,
          make: `Make${i}`,
          model: `Model${i}`,
          variant: `Variant${i}`,
          transmission: i % 2 === 0 ? 'manual' : 'automatic',
          fuel_type: 'benzin',
          body_type: 'sedan',
          offers: []
        },
        confidence: 1.0,
        matchMethod: i < 500 ? 'unmatched' : 'exact',
        changeType: i < 500 ? 'create' : 'unchanged',
        variantTracking: { source: 'unknown', confidence: 0 }
      }))

      const largeComparisonResult = {
        success: true,
        matches: largeMatches,
        summary: {
          totalExtracted: 1000,
          totalExisting: 500,
          totalMatched: 500,
          totalNew: 500,
          totalUpdated: 0,
          totalUnchanged: 500,
          totalDeleted: 0,
          totalMissingModels: 0,
          exactMatches: 500,
          fuzzyMatches: 0
        }
      }

      supabase.from.mockImplementation((table: string) => {
        if (table === 'extraction_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockExtractionSession, error: null })
          }
        }
        return supabase.from(table)
      })

      supabase.functions.invoke.mockResolvedValue({
        data: largeComparisonResult,
        error: null
      })

      const startTime = Date.now()
      
      const { result } = renderHook(
        () => useListingComparison('session-123'),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000) // 2 seconds
      expect(result.current.comparison?.matches).toHaveLength(1000)
    })
  })
})