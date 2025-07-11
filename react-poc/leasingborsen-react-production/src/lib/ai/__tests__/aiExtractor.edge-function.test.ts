import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { aiVehicleExtractor } from '../aiExtractor'
import { supabase } from '@/lib/supabase'

// Mock fetch for Edge Function calls
global.fetch = vi.fn()
const mockFetch = fetch as Mock

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({ error: null }))
    }))
  }
}))

const mockGetSession = supabase.auth.getSession as Mock

// Mock cost tracker to avoid database calls in tests
vi.mock('../costTracker', () => ({
  aiCostTracker: {
    shouldUseAI: vi.fn().mockResolvedValue({
      use_ai: true,
      reason: 'AI processing approved'
    }),
    trackUsage: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('AIVehicleExtractor - Edge Function Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should throw error when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text')
      ).rejects.toThrow('Authentication required for AI extraction')
    })

    it('should throw error when session retrieval fails', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error')
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text')
      ).rejects.toThrow('Authentication required for AI extraction')
    })
  })

  describe('Edge Function Integration', () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: 'test-user' }
    }

    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })
    })

    it('should call Edge Function with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          vehicles: [{
            make: 'Volkswagen',
            model: 'ID.3',
            variant: 'Life+',
            horsepower: 170,
            specifications: {
              is_electric: true,
              fuel_type: 'Elektrisk'
            },
            offers: [{
              duration_months: 48,
              mileage_km: 10000,
              monthly_price: 3295
            }],
            confidence: 0.95
          }],
          tokens_used: 150,
          cost_estimate: 0.003,
          confidence_score: 0.95
        })
      }

      mockFetch.mockResolvedValue(mockResponse)

      const result = await aiVehicleExtractor.extractVehicles(
        'Test PDF text',
        'volkswagen',
        'batch-123',
        'seller-123',
        true
      )

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith('/functions/v1/ai-extract-vehicles', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test PDF text',
          dealerHint: 'volkswagen',
          batchId: 'batch-123',
          sellerId: 'seller-123',
          includeExistingListings: true
        })
      })

      // Verify result structure
      expect(result).toEqual({
        vehicles: expect.any(Array),
        extraction_method: 'ai',
        tokens_used: 150,
        cost_estimate: 0.003,
        processing_time_ms: expect.any(Number),
        confidence_score: 0.95
      })

      expect(result.vehicles).toHaveLength(1)
      expect(result.vehicles[0].make).toBe('Volkswagen')
    })

    it('should handle 401 authentication errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: vi.fn().mockResolvedValue({
          error: 'Unauthorized'
        })
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text', undefined, undefined, undefined, false)
      ).rejects.toThrow('Authentication failed - please log in again')
    })

    it('should handle 429 budget limit errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          error: 'Budget limit exceeded',
          details: 'Monthly budget exceeded'
        })
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text', undefined, undefined, undefined, false)
      ).rejects.toThrow('Budget limit exceeded: Monthly budget exceeded')
    })

    it('should handle generic server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: 'Internal server error'
        })
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text', undefined, undefined, undefined, false)
      ).rejects.toThrow('AI extraction failed: Internal server error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(
        aiVehicleExtractor.extractVehicles('test text', undefined, undefined, undefined, false)
      ).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text', undefined, undefined, undefined, false)
      ).rejects.toThrow('Invalid JSON')
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })
    })

    it('should respect rate limiting for multiple requests', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          vehicles: [],
          tokens_used: 100,
          cost_estimate: 0.002,
          confidence_score: 0.8
        })
      }

      mockFetch.mockResolvedValue(mockResponse)

      // Test that multiple quick requests don't break the system
      const result1 = await aiVehicleExtractor.extractVehicles('text 1', undefined, undefined, undefined, false)
      const result2 = await aiVehicleExtractor.extractVehicles('text 2', undefined, undefined, undefined, false)
      
      expect(result1.extraction_method).toBe('ai')
      expect(result2.extraction_method).toBe('ai')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    }, 10000)
  })

  describe('Cost Tracking Integration', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })
    })

    it('should not call Edge Function when budget is exceeded', async () => {
      // Mock cost tracker to deny AI usage
      const { aiCostTracker } = await import('../costTracker')
      const mockShouldUseAI = aiCostTracker.shouldUseAI as Mock
      mockShouldUseAI.mockResolvedValueOnce({
        use_ai: false,
        reason: 'Monthly budget exceeded'
      })

      await expect(
        aiVehicleExtractor.extractVehicles('test text', undefined, undefined, undefined, false)
      ).rejects.toThrow('AI extraction denied: Monthly budget exceeded')

      expect(mockFetch).not.toHaveBeenCalled()
    }, 10000)
  })

  describe('Test Connection', () => {
    it('should return false when no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await aiVehicleExtractor.testConnection()
      expect(result).toBe(false)
    })

    it('should return true for successful connection test', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200
      })

      const result = await aiVehicleExtractor.testConnection()
      expect(result).toBe(true)
    })

    it('should return true for 400 errors (valid endpoint)', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400
      })

      const result = await aiVehicleExtractor.testConnection()
      expect(result).toBe(true) // 400 means endpoint exists
    })

    it('should return false for 500+ errors', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })

      const result = await aiVehicleExtractor.testConnection()
      expect(result).toBe(false)
    })
  })
})