import { TestDatabase } from "./mock-supabase.ts"

export interface RequestData {
  sessionId?: string
  selectedChangeIds?: string[]
  appliedBy?: string
}

export function createRequest(data: RequestData): Request {
  return new Request("http://localhost:54321/functions/v1/apply-extraction-changes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer test-token"
    },
    body: JSON.stringify(data)
  })
}

export function setupTestSession(
  database: TestDatabase, 
  sessionId: string, 
  overrides: Record<string, any> = {}
): void {
  const defaultSession = {
    id: sessionId,
    session_name: "Test Session",
    status: "completed",
    seller_id: "test-seller",
    total_extracted: 1,
    created_at: new Date().toISOString(),
    ...overrides
  }
  
  database.get("extraction_sessions")?.set(sessionId, defaultSession)
}

export function setupTestChange(
  database: TestDatabase,
  changeId: string,
  overrides: Record<string, any> = {}
): void {
  const defaultChange = {
    id: changeId,
    session_id: "default-session",
    change_type: "create",
    change_status: "pending",
    confidence_score: 1.0,
    extracted_data: {},
    match_method: "exact",
    created_at: new Date().toISOString(),
    ...overrides
  }
  
  database.get("extraction_listing_changes")?.set(changeId, defaultChange)
}

export function generateValidUUID(): string {
  return crypto.randomUUID()
}

export function generateInvalidUUID(): string {
  return "not-a-uuid-12345"
}

export function createTestListing(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: crypto.randomUUID(),
    make: "Toyota",
    model: "Corolla",
    variant: "Hybrid",
    year: 2023,
    monthly_price: 3999,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

export function createTestPricing(listingId: string, overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: crypto.randomUUID(),
    listing_id: listingId,
    monthly_price: 3999,
    first_payment: 0,
    period_months: 36,
    mileage_per_year: 15000,
    created_at: new Date().toISOString(),
    ...overrides
  }
}