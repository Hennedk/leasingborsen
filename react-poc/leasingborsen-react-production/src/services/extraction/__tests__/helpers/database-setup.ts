import { vi } from 'vitest';

export interface TestDatabase {
  listings: Map<string, any>;
  extraction_listing_changes: Map<string, any>;
  lease_pricing: Map<string, any>;
  extraction_sessions: Map<string, any>;
}

export function createTestDatabase(): TestDatabase {
  return {
    listings: new Map(),
    extraction_listing_changes: new Map(),
    lease_pricing: new Map(),
    extraction_sessions: new Map(),
  };
}

export function setupDatabaseMocks(db: TestDatabase) {
  const mockSupabase = {
    rpc: vi.fn().mockImplementation(async (fnName, params) => {
      if (fnName === 'apply_selected_extraction_changes') {
        return mockApplyChangesFunction(db, params);
      }
      throw new Error(`Unhandled RPC function: ${fnName}`);
    }),
    from: vi.fn((table) => createTableMock(db, table)),
    functions: {
      invoke: vi.fn().mockImplementation(async (fnName, options) => {
        if (fnName === 'apply-extraction-changes') {
          // Simulate the Edge Function calling the RPC
          const { sessionId, selectedChangeIds, appliedBy } = options.body;
          return mockSupabase.rpc('apply_selected_extraction_changes', {
            p_session_id: sessionId,
            p_selected_change_ids: selectedChangeIds,
            p_applied_by: appliedBy,
          });
        }
        throw new Error(`Unhandled edge function: ${fnName}`);
      }),
    },
  };
  
  return mockSupabase;
}

function createTableMock(db: TestDatabase, tableName: string) {
  const table = db[tableName as keyof TestDatabase];
  if (!table) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockImplementation((data) => ({
      data: Array.isArray(data) ? data : [data],
      error: null,
    })),
    update: vi.fn().mockImplementation((data) => ({
      data,
      error: null,
    })),
    delete: vi.fn().mockImplementation(() => ({
      data: null,
      error: null,
    })),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const results = Array.from(table.values());
      return { data: results[0] || null, error: null };
    }),
  };
}

function mockApplyChangesFunction(db: TestDatabase, params: any) {
  const { p_session_id, p_selected_change_ids, p_applied_by } = params;
  
  const results = {
    applied_creates: 0,
    applied_updates: 0,
    applied_deletes: 0,
    discarded_count: 0,
    total_processed: p_selected_change_ids.length,
    error_count: 0,
    errors: [] as any[],
    session_id: p_session_id,
    applied_by: p_applied_by,
    applied_at: new Date().toISOString(),
  };
  
  // Process each selected change
  p_selected_change_ids.forEach((changeId: string) => {
    const change = db.extraction_listing_changes.get(changeId);
    if (!change) {
      results.error_count++;
      results.errors.push({
        change_id: changeId,
        change_type: 'unknown',
        error: 'Change not found',
      });
      return;
    }
    
    try {
      switch (change.change_type) {
        case 'CREATE':
          // Simulate creating a new listing
          const newListingId = `created-${Date.now()}-${Math.random()}`;
          db.listings.set(newListingId, {
            id: newListingId,
            ...change.extracted_data,
            created_at: new Date().toISOString(),
          });
          results.applied_creates++;
          break;
          
        case 'UPDATE':
          // Simulate updating an existing listing
          const existingListing = db.listings.get(change.existing_listing_id);
          if (existingListing) {
            db.listings.set(change.existing_listing_id, {
              ...existingListing,
              ...change.extracted_data,
              updated_at: new Date().toISOString(),
            });
            results.applied_updates++;
          } else {
            throw new Error('Listing not found for update');
          }
          break;
          
        case 'DELETE':
          const listingId = change.existing_listing_id;
          
          // CRITICAL: This simulates the FIXED delete logic
          // Clear ALL references to this listing (not just from current session)
          for (const [id, elc] of db.extraction_listing_changes) {
            if (elc.existing_listing_id === listingId) {
              elc.existing_listing_id = null;
            }
          }
          
          // Delete related lease_pricing records
          for (const [id, lp] of db.lease_pricing) {
            if (lp.listing_id === listingId) {
              db.lease_pricing.delete(id);
            }
          }
          
          // Finally delete the listing
          if (db.listings.delete(listingId)) {
            results.applied_deletes++;
          } else {
            throw new Error('Listing not found for deletion');
          }
          break;
          
        default:
          results.discarded_count++;
      }
      
      // Mark change as applied
      change.change_status = 'applied';
      change.applied_at = new Date().toISOString();
      change.applied_by = p_applied_by;
      
    } catch (error) {
      results.error_count++;
      results.errors.push({
        change_id: changeId,
        change_type: change.change_type,
        error: error instanceof Error ? error.message : 'Unknown error',
        listing_id: change.existing_listing_id,
      });
    }
  });
  
  // Update session status
  const session = db.extraction_sessions.get(p_session_id);
  if (session) {
    session.status = results.error_count === 0 ? 'completed' : 'partially_applied';
    session.applied_at = new Date().toISOString();
  }
  
  return { data: [results], error: null };
}

// Helper functions for test assertions
export function addTestListing(db: TestDatabase, listing: any) {
  const id = listing.id || `listing-${Date.now()}-${Math.random()}`;
  db.listings.set(id, { id, ...listing });
  return id;
}

export function addTestChange(db: TestDatabase, change: any) {
  const id = change.id || `change-${Date.now()}-${Math.random()}`;
  db.extraction_listing_changes.set(id, { id, ...change });
  return id;
}

export function addTestPricing(db: TestDatabase, pricing: any) {
  const id = pricing.id || `pricing-${Date.now()}-${Math.random()}`;
  db.lease_pricing.set(id, { id, ...pricing });
  return id;
}

export function addTestSession(db: TestDatabase, session: any) {
  const id = session.id || `session-${Date.now()}-${Math.random()}`;
  db.extraction_sessions.set(id, { id, ...session });
  return id;
}