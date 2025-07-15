import { describe, it, expect, beforeEach } from 'vitest'

// Edge Function Integration Tests
// These tests verify the Edge Function works correctly in a Supabase environment

describe('AI Extract Vehicles Edge Function', () => {
  // Note: These tests require a running Supabase instance with the Edge Function deployed
  // They are designed to be run in a testing environment with proper authentication

  const EDGE_FUNCTION_URL = process.env.SUPABASE_URL 
    ? `${process.env.SUPABASE_URL}/functions/v1/ai-extract-vehicles`
    : 'http://localhost:54321/functions/v1/ai-extract-vehicles'

  const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token'

  describe('Authentication and Authorization', () => {
    it('should reject requests without authorization header', async () => {
      if (!process.env.SUPABASE_URL) {
        // console.log('Skipping Edge Function test - no Supabase URL configured')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test text'
        })
      })

      expect(response.status).toBe(401)
      const result = await response.json()
      expect(result.error).toBe('Unauthorized')
    })

    it('should reject requests with invalid authorization', async () => {
      if (!process.env.SUPABASE_URL) {
        // console.log('Skipping Edge Function test - no Supabase URL configured')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test text'
        })
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Request Validation', () => {
    it('should reject requests without text parameter', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN) {
        // console.log('Skipping Edge Function test - missing configuration')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dealerHint: 'volkswagen'
        })
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Text parameter is required')
    })

    it('should reject requests with invalid text parameter', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN) {
        // console.log('Skipping Edge Function test - missing configuration')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 123 // Invalid type
        })
      })

      expect(response.status).toBe(400)
    })
  })

  describe('AI Extraction Logic', () => {
    it('should process Volkswagen vehicle data correctly', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN || !process.env.OPENAI_API_KEY) {
        // console.log('Skipping AI extraction test - missing configuration')
        return
      }

      const testText = `
        ID.3 Life+ 170 hk
        Rækkevidde: 387 km
        Forbrug: 15,3 kWh/100km
        48 mdr. | 10.000 km/år
        Månedlig pris: 3.295 kr.
        Udbetaling: 5.000 kr.
        Total: 163.760 kr.
      `

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          dealerHint: 'volkswagen',
          batchId: 'test-batch-123'
        })
      })

      expect(response.status).toBe(200)
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.vehicles).toBeInstanceOf(Array)
      expect(result.extraction_method).toBe('ai')
      expect(result.tokens_used).toBeGreaterThan(0)
      expect(result.cost_estimate).toBeGreaterThan(0)
      expect(result.processing_time_ms).toBeGreaterThan(0)
      expect(result.confidence_score).toBeGreaterThan(0)

      if (result.vehicles.length > 0) {
        const vehicle = result.vehicles[0]
        expect(vehicle.make).toBeDefined()
        expect(vehicle.model).toBeDefined()
        expect(vehicle.offers).toBeInstanceOf(Array)
        expect(vehicle.offers.length).toBeGreaterThan(0)
      }
    })

    it('should handle generic vehicle data', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN || !process.env.OPENAI_API_KEY) {
        // console.log('Skipping AI extraction test - missing configuration')
        return
      }

      const testText = `
        Toyota Corolla Hybrid
        122 hk
        36 måneder | 15.000 km/år
        Månedlig: 2.800 kr.
        Udbetaling: 3.000 kr.
      `

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          dealerHint: 'generic'
        })
      })

      expect(response.status).toBe(200)
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.vehicles).toBeInstanceOf(Array)
    })
  })

  describe('Cost Tracking and Limits', () => {
    it('should track usage in database', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN || !process.env.OPENAI_API_KEY) {
        // console.log('Skipping cost tracking test - missing configuration')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Short test text for cost tracking',
          batchId: 'cost-test-batch'
        })
      })

      expect(response.status).toBe(200)
      const result = await response.json()

      expect(result.success).toBe(true)
      expect(result.cost_estimate).toBeGreaterThan(0)
      expect(result.tokens_used).toBeGreaterThan(0)

      // Note: In a real test environment, you would verify the usage was logged in the database
      // This requires access to the Supabase client with service role permissions
    })

    it('should respect budget limits', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN) {
        // console.log('Skipping budget limit test - missing configuration')
        return
      }

      // This test would need to be run in an environment where the monthly budget is exceeded
      // or with a very large text that exceeds per-PDF limits
      const veryLargeText = 'Test '.repeat(50000) // Very large text

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: veryLargeText
        })
      })

      // Should either succeed or fail with 429 (budget exceeded)
      expect([200, 429]).toContain(response.status)

      if (response.status === 429) {
        const result = await response.json()
        expect(result.error).toBe('Budget limit exceeded')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN) {
        // console.log('Skipping error handling test - missing configuration')
        return
      }

      // Test with invalid/malformed text that might cause AI API errors
      const problematicText = ''.repeat(1000000) // Empty or very large text

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: problematicText
        })
      })

      // Should handle error gracefully
      if (!response.ok) {
        const result = await response.json()
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      }
    })

    it('should handle malformed requests', async () => {
      if (!process.env.SUPABASE_URL || !TEST_AUTH_TOKEN) {
        // console.log('Skipping malformed request test - missing configuration')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      expect(response.status).toBe(500)
    })
  })

  describe('CORS Handling', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      if (!process.env.SUPABASE_URL) {
        // console.log('Skipping CORS test - no Supabase URL configured')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'OPTIONS'
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
    })
  })
})

// Test utilities for local development
export const testEdgeFunctionLocally = async () => {
  // console.log('Testing Edge Function locally...')
  
  try {
    const response = await fetch('http://localhost:54321/functions/v1/ai-extract-vehicles', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'VW ID.3 Life+ 170 hk',
        dealerHint: 'volkswagen'
      })
    })

    // console.log('Response status:', response.status)
    // console.log('Response body:', await response.text())
  } catch (error) {
    console.error('Local test failed:', error)
  }
}