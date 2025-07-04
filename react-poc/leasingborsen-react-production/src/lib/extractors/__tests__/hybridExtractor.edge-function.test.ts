import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { hybridVehicleExtractor } from '../hybridExtractor'
import { supabase } from '@/lib/supabase'

// Mock dependencies
global.fetch = vi.fn()
const mockFetch = fetch as Mock

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}))

vi.mock('../vwPatternMatcher', () => ({
  VWPDFExtractor: class {
    extractVWModels = vi.fn().mockReturnValue([])
  }
}))

vi.mock('@/lib/text/patternAnalyzer', () => ({
  textPatternAnalyzer: {
    analyzeText: vi.fn().mockReturnValue({
      recommendedStrategy: 'ai',
      isStructured: false,
      hasTableFormat: false,
      vehicleCount: 0
    })
  }
}))

vi.mock('@/lib/text/textChunker', () => ({
  smartTextChunker: {
    chunkText: vi.fn().mockReturnValue([
      { index: 0, text: 'chunk 1' },
      { index: 1, text: 'chunk 2' }
    ]),
    filterRelevantChunks: vi.fn().mockImplementation(chunks => chunks),
    mergeChunkResults: vi.fn().mockReturnValue([])
  }
}))

vi.mock('@/lib/ai/costTracker', () => ({
  aiCostTracker: {
    shouldUseAI: vi.fn().mockResolvedValue({
      use_ai: true,
      reason: 'AI processing approved'
    })
  }
}))

const mockGetSession = supabase.auth.getSession as Mock

describe('HybridVehicleExtractor - Edge Function Integration', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'test-user' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })
  })

  describe('Extraction Strategy Selection', () => {
    it('should use AI strategy when patterns fail', async () => {
      const mockAIResponse = {
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

      mockFetch.mockResolvedValue(mockAIResponse)

      const result = await hybridVehicleExtractor.extractVehicles(
        'Some PDF text without clear patterns',
        'volkswagen',
        'batch-123'
      )

      expect(result.extraction_method).toBe('ai')
      expect(result.vehicles_found).toBe(1)
      expect(result.ai_cost).toBe(0.003)
      expect(result.ai_tokens_used).toBe(150)
    })

    it('should use pattern strategy when patterns are confident', async () => {
      // Mock pattern extractor to return high-confidence results
      const { VWPDFExtractor } = await import('../vwPatternMatcher')
      const mockExtractor = new VWPDFExtractor()
      mockExtractor.extractVWModels = vi.fn().mockReturnValue([{
        model: 'ID.3',
        variant: 'Life+',
        horsepower: 170,
        confidence_score: 0.9,
        pricing_options: [{
          monthly_price: 3295,
          mileage_per_year: 10000,
          period_months: 48
        }],
        line_numbers: [1],
        source_section: 'Pattern Match'
      }])

      const result = await hybridVehicleExtractor.extractVehicles(
        'ID.3 Life+ 170 hk 48 mdr. 3.295 kr.',
        'volkswagen',
        'batch-123'
      )

      expect(result.extraction_method).toBe('pattern')
      expect(result.vehicles_found).toBe(1)
      expect(result.ai_cost).toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should use hybrid strategy for mixed confidence', async () => {
      // Mock pattern extractor to return low-confidence results
      const { VWPDFExtractor } = await import('../vwPatternMatcher')
      const mockExtractor = new VWPDFExtractor()
      mockExtractor.extractVWModels = vi.fn().mockReturnValue([{
        model: 'ID.3',
        variant: 'Life+',
        horsepower: 170,
        confidence_score: 0.5, // Low confidence
        pricing_options: [{
          monthly_price: 3295,
          mileage_per_year: 10000,
          period_months: 48
        }],
        line_numbers: [1],
        source_section: 'Pattern Match'
      }])

      const mockAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          vehicles: [{
            make: 'Volkswagen',
            model: 'ID.4',
            variant: 'GTX+',
            horsepower: 299,
            specifications: {
              is_electric: true,
              fuel_type: 'Elektrisk'
            },
            offers: [{
              duration_months: 36,
              mileage_km: 15000,
              monthly_price: 4500
            }],
            confidence: 0.92
          }],
          tokens_used: 200,
          cost_estimate: 0.004,
          confidence_score: 0.92
        })
      }

      mockFetch.mockResolvedValue(mockAIResponse)

      const result = await hybridVehicleExtractor.extractVehicles(
        'Mixed content with some patterns and complex data',
        'volkswagen',
        'batch-123'
      )

      expect(result.extraction_method).toBe('hybrid')
      expect(result.vehicles_found).toBe(2) // Pattern + AI results merged
      expect(result.ai_cost).toBe(0.004)
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Chunked Processing', () => {
    it('should handle large documents with chunking', async () => {
      const largeText = 'A'.repeat(20000) // Large text > 15000 chars

      const mockAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          vehicles: [{
            make: 'Volkswagen',
            model: 'Golf',
            variant: 'GTI',
            horsepower: 245,
            specifications: {
              is_electric: false,
              fuel_type: 'Benzin'
            },
            offers: [{
              duration_months: 36,
              mileage_km: 12000,
              monthly_price: 3800
            }],
            confidence: 0.88
          }],
          tokens_used: 100,
          cost_estimate: 0.002,
          confidence_score: 0.88
        })
      }

      mockFetch.mockResolvedValue(mockAIResponse)

      const result = await hybridVehicleExtractor.extractVehicles(
        largeText,
        'volkswagen',
        'batch-123'
      )

      // Should call AI extraction multiple times for chunks
      expect(mockFetch).toHaveBeenCalledTimes(2) // 2 chunks
      expect(result.extraction_method).toBe('ai')
      expect(result.ai_tokens_used).toBe(200) // 100 per chunk * 2
      expect(result.ai_cost).toBe(0.004) // 0.002 per chunk * 2
    })
  })

  describe('Error Handling', () => {
    it('should handle AI extraction failures gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({
          error: 'Internal server error'
        })
      })

      await expect(
        hybridVehicleExtractor.extractVehicles(
          'Test text',
          'volkswagen',
          'batch-123'
        )
      ).rejects.toThrow('AI extraction failed: Internal server error')
    })

    it('should fallback to patterns when AI budget is exceeded', async () => {
      // Mock cost tracker to deny AI usage
      const { aiCostTracker } = await import('@/lib/ai/costTracker')
      aiCostTracker.shouldUseAI = vi.fn().mockResolvedValue({
        use_ai: false,
        reason: 'Monthly budget exceeded'
      })

      // Mock pattern extractor to return some results
      const { VWPDFExtractor } = await import('../vwPatternMatcher')
      const mockExtractor = new VWPDFExtractor()
      mockExtractor.extractVWModels = vi.fn().mockReturnValue([{
        model: 'Polo',
        variant: 'Comfortline',
        horsepower: 95,
        confidence_score: 0.6,
        pricing_options: [{
          monthly_price: 2500,
          mileage_per_year: 10000,
          period_months: 48
        }],
        line_numbers: [1],
        source_section: 'Pattern Match'
      }])

      const result = await hybridVehicleExtractor.extractVehicles(
        'Polo Comfortline 95 hk',
        'volkswagen',
        'batch-123'
      )

      expect(result.extraction_method).toBe('pattern')
      expect(result.vehicles_found).toBe(1)
      expect(result.ai_cost).toBeUndefined()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle authentication errors in AI extraction', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(
        hybridVehicleExtractor.extractVehicles(
          'Test text',
          'volkswagen',
          'batch-123'
        )
      ).rejects.toThrow('Authentication required for AI extraction')
    })
  })

  describe('Performance Metrics', () => {
    it('should track processing time correctly', async () => {
      const mockAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          vehicles: [],
          tokens_used: 50,
          cost_estimate: 0.001,
          confidence_score: 0.8
        })
      }

      mockFetch.mockResolvedValue(mockAIResponse)

      const startTime = Date.now()
      const result = await hybridVehicleExtractor.extractVehicles(
        'Test text',
        'volkswagen',
        'batch-123'
      )
      const endTime = Date.now()

      expect(result.processing_time_ms).toBeGreaterThan(0)
      expect(result.processing_time_ms).toBeLessThanOrEqual(endTime - startTime)
    })

    it('should calculate confidence scores correctly', async () => {
      const mockAIResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          vehicles: [{
            make: 'Volkswagen',
            model: 'Tiguan',
            variant: 'Elegance',
            confidence: 0.94
          }],
          tokens_used: 120,
          cost_estimate: 0.003,
          confidence_score: 0.94
        })
      }

      mockFetch.mockResolvedValue(mockAIResponse)

      const result = await hybridVehicleExtractor.extractVehicles(
        'Tiguan Elegance details...',
        'volkswagen',
        'batch-123'
      )

      expect(result.confidence_score).toBeGreaterThan(0.9)
      expect(result.extraction_method).toBe('ai')
    })
  })
})