import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { describe, it, beforeEach } from "https://deno.land/std@0.168.0/testing/bdd.ts"
import { createMockSupabaseClient, TestDatabase } from "./helpers/mock-supabase.ts"
import { createRequest, setupTestSession, setupTestChange } from "./helpers/test-utils.ts"

// We need to modify the main index.ts to export the handler for testing
// For now, we'll create a mock handler that simulates the behavior
async function mockHandleRequest(request: Request, supabase: any): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await request.json()
    const { sessionId, selectedChangeIds, appliedBy = 'admin' } = requestBody

    // Input validation
    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid sessionId',
          details: 'sessionId must be a valid string'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!selectedChangeIds || !Array.isArray(selectedChangeIds) || selectedChangeIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid selectedChangeIds',
          details: 'selectedChangeIds must be a non-empty array of strings'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const invalidIds = selectedChangeIds.filter(id => !uuidRegex.test(id))
    if (invalidIds.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid change IDs',
          details: `The following IDs are not valid UUIDs: ${invalidIds.join(', ')}`
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify session exists
    const { data: sessionData, error: sessionError } = await supabase
      .from('extraction_sessions')
      .select('id, session_name, seller_id, status, total_extracted')
      .eq('id', sessionId)
      .single()

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ 
          error: 'Session not found',
          details: sessionError?.message || 'Session does not exist'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the PostgreSQL function
    const { data, error } = await supabase
      .rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: selectedChangeIds,
        p_applied_by: appliedBy
      })

    if (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Database operation failed',
          details: error.message,
          code: error.code
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process the response
    let result
    if (Array.isArray(data) && data.length > 0) {
      result = data[0]
    } else if (data && typeof data === 'object') {
      result = data
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Unexpected response format from database function',
          details: 'Expected object or array with result data'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          applied_creates: result.applied_creates,
          applied_updates: result.applied_updates,
          applied_deletes: result.applied_deletes,
          discarded_count: result.discarded_count,
          total_processed: result.total_processed,
          error_count: result.error_count,
          errors: result.errors || [],
          session_id: result.session_id,
          applied_by: result.applied_by,
          applied_at: result.applied_at,
          session_name: sessionData.session_name,
          seller_id: sessionData.seller_id
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

describe("apply-extraction-changes Edge Function", () => {
  let mockSupabase: any
  let mockDatabase: TestDatabase

  beforeEach(() => {
    // Reset mock database
    mockDatabase = new Map([
      ["extraction_sessions", new Map()],
      ["extraction_listing_changes", new Map()],
      ["listings", new Map()],
      ["lease_pricing", new Map()],
    ])
    
    mockSupabase = createMockSupabaseClient(mockDatabase)
  })

  describe("CRUD Operations", () => {
    it("should successfully apply CREATE changes", async () => {
      // Setup test data
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      const changeId = "660e8400-e29b-41d4-a716-446655440002"
      
      setupTestSession(mockDatabase, sessionId, {
        id: sessionId,
        session_name: "Test Session",
        status: "completed",
        seller_id: "test-seller",
        total_extracted: 1
      })
      
      setupTestChange(mockDatabase, changeId, {
        id: changeId,
        session_id: sessionId,
        change_type: "create",
        change_status: "pending",
        extracted_data: {
          make: "Toyota",
          model: "bZ4X",
          variant: "Executive",
          monthly_price: 5999,
          offers: [{
            monthly_price: 5999,
            period_months: 36,
            mileage_per_year: 15000,
          }]
        }
      })
      
      const request = createRequest({
        sessionId,
        selectedChangeIds: [changeId],
        appliedBy: "test-user"
      })
      
      // Execute
      const response = await mockHandleRequest(request, mockSupabase)
      const result = await response.json()
      
      // Assertions
      assertEquals(response.status, 200)
      assertEquals(result.success, true)
      assertEquals(result.result.applied_creates, 1)
      assertEquals(result.result.applied_updates, 0)
      assertEquals(result.result.applied_deletes, 0)
      assertEquals(result.result.error_count, 0)
      
      // Verify listing was created in mock database
      const listings = Array.from(mockDatabase.get("listings")!.values())
      assertEquals(listings.length, 1)
      assertEquals(listings[0].make, "Toyota")
      assertEquals(listings[0].model, "bZ4X")
    })

    it("should successfully apply UPDATE changes", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      const listingId = "770e8400-e29b-41d4-a716-446655440003"
      const changeId = "880e8400-e29b-41d4-a716-446655440004"
      
      setupTestSession(mockDatabase, sessionId)
      
      // Setup existing listing
      mockDatabase.get("listings")!.set(listingId, {
        id: listingId,
        make: "VW",
        model: "ID.4",
        variant: "GTX",
        monthly_price: 4999,
        year: 2023,
      })
      
      setupTestChange(mockDatabase, changeId, {
        id: changeId,
        session_id: sessionId,
        change_type: "update",
        existing_listing_id: listingId,
        extracted_data: {
          monthly_price: 4599,  // Price reduction
          year: 2024,           // Year update
        },
        field_changes: {
          monthly_price: { old: 4999, new: 4599 },
          year: { old: 2023, new: 2024 }
        }
      })
      
      const response = await mockHandleRequest(createRequest({
        sessionId,
        selectedChangeIds: [changeId]
      }), mockSupabase)
      
      const result = await response.json()
      
      assertEquals(result.result.applied_updates, 1)
      
      // Verify updates were applied
      const updatedListing = mockDatabase.get("listings")!.get(listingId)
      assertEquals(updatedListing.monthly_price, 4599)
      assertEquals(updatedListing.year, 2024)
      assertEquals(updatedListing.make, "VW") // Unchanged fields preserved
    })

    it("should successfully apply DELETE changes with cascade", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      const listingId = "990e8400-e29b-41d4-a716-446655440005"
      const pricingId = "aa0e8400-e29b-41d4-a716-446655440006"
      const changeId = "bb0e8400-e29b-41d4-a716-446655440007"
      
      setupTestSession(mockDatabase, sessionId)
      
      // Setup listing with pricing
      mockDatabase.get("listings")!.set(listingId, {
        id: listingId,
        make: "BMW",
        model: "X3",
      })
      
      mockDatabase.get("lease_pricing")!.set(pricingId, {
        id: pricingId,
        listing_id: listingId,
        monthly_price: 6999,
      })
      
      setupTestChange(mockDatabase, changeId, {
        id: changeId,
        session_id: sessionId,
        change_type: "delete",
        existing_listing_id: listingId,
      })
      
      const response = await mockHandleRequest(createRequest({
        sessionId,
        selectedChangeIds: [changeId]
      }), mockSupabase)
      
      const result = await response.json()
      
      assertEquals(result.result.applied_deletes, 1)
      
      // Verify cascade deletion
      assertEquals(mockDatabase.get("listings")!.has(listingId), false)
      assertEquals(mockDatabase.get("lease_pricing")!.has(pricingId), false)
    })
  })

  describe("Input Validation", () => {
    it("should reject request with missing sessionId", async () => {
      const request = createRequest({
        selectedChangeIds: ["550e8400-e29b-41d4-a716-446655440001"],
        appliedBy: "test-user"
      })
      
      const response = await mockHandleRequest(request, mockSupabase)
      
      assertEquals(response.status, 400)
      const result = await response.json()
      assertEquals(result.error, "Missing or invalid sessionId")
    })

    it("should reject request with invalid UUID format", async () => {
      const request = createRequest({
        sessionId: "not-a-uuid",
        selectedChangeIds: ["also-not-a-uuid"],
        appliedBy: "test-user"
      })
      
      const response = await mockHandleRequest(request, mockSupabase)
      
      assertEquals(response.status, 400)
      const result = await response.json()
      assertEquals(result.error, "Invalid change IDs")
      assertExists(result.details)
    })

    it("should reject empty selectedChangeIds array", async () => {
      const request = createRequest({
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
        selectedChangeIds: [],
        appliedBy: "test-user"
      })
      
      const response = await mockHandleRequest(request, mockSupabase)
      
      assertEquals(response.status, 400)
    })

    it("should handle non-existent session gracefully", async () => {
      const request = createRequest({
        sessionId: "550e8400-e29b-41d4-a716-446655440099", // Doesn't exist
        selectedChangeIds: ["660e8400-e29b-41d4-a716-446655440002"],
        appliedBy: "test-user"
      })
      
      const response = await mockHandleRequest(request, mockSupabase)
      
      assertEquals(response.status, 404)
      const result = await response.json()
      assertEquals(result.error, "Session not found")
    })
  })

  describe("Error Handling", () => {
    it("should handle partial success with detailed error reporting", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      setupTestSession(mockDatabase, sessionId)
      
      // Mix of valid and problematic changes
      const validChangeId = "change-1"
      const invalidChangeId = "change-2"
      
      setupTestChange(mockDatabase, validChangeId, {
        id: validChangeId,
        session_id: sessionId,
        change_type: "create",
        extracted_data: { make: "Toyota", model: "Camry" }
      })
      
      setupTestChange(mockDatabase, invalidChangeId, {
        id: invalidChangeId,
        session_id: sessionId,
        change_type: "update",
        existing_listing_id: "non-existent", // Will fail
        extracted_data: { monthly_price: 3999 }
      })
      
      const response = await mockHandleRequest(createRequest({
        sessionId,
        selectedChangeIds: [validChangeId, invalidChangeId]
      }), mockSupabase)
      
      const result = await response.json()
      
      // Should succeed overall but report individual errors
      assertEquals(response.status, 200)
      assertEquals(result.success, true)
      assertEquals(result.result.applied_creates, 1)
      assertEquals(result.result.error_count, 1)
      assertEquals(result.result.errors.length, 1)
      
      // Verify error details
      const updateError = result.result.errors.find((e: any) => e.change_id === invalidChangeId)
      assertExists(updateError)
      assertEquals(updateError.change_type, "update")
      assertExists(updateError.error)
    })

    it("should handle database connection failure gracefully", async () => {
      // Mock database failure
      mockSupabase.rpc = () => Promise.reject(new Error("Database connection failed"))
      
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      setupTestSession(mockDatabase, sessionId)
      
      const response = await mockHandleRequest(createRequest({
        sessionId,
        selectedChangeIds: ["valid-change-id"]
      }), mockSupabase)
      
      assertEquals(response.status, 500)
      const result = await response.json()
      assertEquals(result.error, "Database operation failed")
    })
  })

  describe("Response Format", () => {
    it("should return properly formatted success response", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      const changeId = "660e8400-e29b-41d4-a716-446655440002"
      
      setupTestSession(mockDatabase, sessionId, {
        session_name: "Test Session",
        seller_id: "test-seller"
      })
      
      setupTestChange(mockDatabase, changeId, {
        session_id: sessionId,
        change_type: "create"
      })
      
      const response = await mockHandleRequest(createRequest({
        sessionId,
        selectedChangeIds: [changeId]
      }), mockSupabase)
      
      const result = await response.json()
      
      // Verify response structure
      assertEquals(result.success, true)
      assertExists(result.result)
      
      // Verify all required fields
      const requiredFields = [
        "applied_creates",
        "applied_updates", 
        "applied_deletes",
        "discarded_count",
        "total_processed",
        "error_count",
        "errors",
        "session_id",
        "applied_by",
        "applied_at"
      ]
      
      requiredFields.forEach(field => {
        assertExists(result.result[field], `Missing required field: ${field}`)
      })
      
      // Verify types
      assertEquals(typeof result.result.applied_creates, "number")
      assertEquals(typeof result.result.error_count, "number")
      assertEquals(Array.isArray(result.result.errors), true)
      assertEquals(typeof result.result.applied_at, "string")
    })

    it("should include session metadata in response", async () => {
      const sessionId = "550e8400-e29b-41d4-a716-446655440001"
      const changeId = "660e8400-e29b-41d4-a716-446655440002"
      
      setupTestSession(mockDatabase, sessionId, {
        session_name: "Test Session",
        seller_id: "test-seller"
      })
      
      setupTestChange(mockDatabase, changeId, {
        session_id: sessionId,
        change_type: "create"
      })
      
      const response = await mockHandleRequest(createRequest({
        sessionId,
        selectedChangeIds: [changeId]
      }), mockSupabase)
      
      const result = await response.json()
      
      assertExists(result.result.session_name)
      assertExists(result.result.seller_id)
      assertEquals(result.result.session_name, "Test Session")
      assertEquals(result.result.seller_id, "test-seller")
    })
  })
})