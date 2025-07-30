import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  createTestDatabase, 
  setupDatabaseMocks, 
  addTestListing,
  addTestChange,
  addTestPricing,
  addTestSession,
  type TestDatabase 
} from './helpers/database-setup';

describe('DELETE Operations - Foreign Key Constraint Fixes', () => {
  let db: TestDatabase;
  let mockSupabase: any;
  
  beforeEach(() => {
    db = createTestDatabase();
    mockSupabase = setupDatabaseMocks(db);
  });
  
  test('should handle multiple extraction_listing_changes referencing same listing', async () => {
    // This tests the exact bug we fixed
    const listingId = '22bf5261-322a-47c7-afe0-4e3872841f4b';
    const sessionId = '290915a6-0fc9-4da7-b1c6-1ebd3c86becf';
    
    // Create the listing
    addTestListing(db, {
      id: listingId,
      make: 'Toyota',
      model: 'bZ4X',
      variant: 'Executive',
      dealer_id: 'demo-bilhus',
    });
    
    // Create the session
    addTestSession(db, {
      id: sessionId,
      dealer_id: 'demo-bilhus',
      status: 'pending',
    });
    
    // Create multiple extraction_listing_changes referencing this listing
    const deleteChangeId = 'bd613c0f-cb0d-4215-a2f3-66158d633bfd';
    const otherChangeId = 'other-change-id';
    
    addTestChange(db, {
      id: deleteChangeId,
      session_id: sessionId,
      change_type: 'DELETE',
      existing_listing_id: listingId,
      change_status: 'pending',
    });
    
    // Another change from a different session also referencing this listing
    addTestChange(db, {
      id: otherChangeId,
      session_id: 'different-session',
      change_type: 'UPDATE',
      existing_listing_id: listingId, // Same listing referenced
      change_status: 'pending',
    });
    
    // Verify initial state
    expect(db.extraction_listing_changes.get(deleteChangeId)?.existing_listing_id).toBe(listingId);
    expect(db.extraction_listing_changes.get(otherChangeId)?.existing_listing_id).toBe(listingId);
    
    // Apply the DELETE change
    const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [deleteChangeId],
      p_applied_by: 'test-user',
    });
    
    // Verify ALL references were cleared (the key fix)
    const deleteChangeAfter = db.extraction_listing_changes.get(deleteChangeId);
    const otherChangeAfter = db.extraction_listing_changes.get(otherChangeId);
    
    expect(deleteChangeAfter.existing_listing_id).toBe(null);
    expect(otherChangeAfter.existing_listing_id).toBe(null); // This is the critical fix
    
    // Verify listing was deleted
    expect(db.listings.has(listingId)).toBe(false);
    
    // Verify result
    expect(result.data[0].applied_deletes).toBe(1);
    expect(result.data[0].error_count).toBe(0);
  });
  
  test('should handle DELETE with lease_pricing records', async () => {
    const listingId = 'test-listing-with-pricing';
    const pricingId1 = 'test-pricing-1';
    const pricingId2 = 'test-pricing-2';
    const sessionId = 'test-session';
    
    // Setup listing with multiple lease pricing records
    addTestListing(db, {
      id: listingId,
      make: 'VW',
      model: 'ID.4',
      variant: 'GTX',
    });
    
    addTestPricing(db, {
      id: pricingId1,
      listing_id: listingId,
      monthly_price: 4999,
      period_months: 36,
      mileage_per_year: 15000,
    });
    
    addTestPricing(db, {
      id: pricingId2,
      listing_id: listingId,
      monthly_price: 5499,
      period_months: 24,
      mileage_per_year: 20000,
    });
    
    const changeId = 'delete-change-1';
    addTestChange(db, {
      id: changeId,
      session_id: sessionId,
      change_type: 'DELETE',
      existing_listing_id: listingId,
      change_status: 'pending',
    });
    
    // Verify initial state
    expect(db.lease_pricing.has(pricingId1)).toBe(true);
    expect(db.lease_pricing.has(pricingId2)).toBe(true);
    
    // Apply DELETE
    const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [changeId],
      p_applied_by: 'test-user',
    });
    
    // Verify lease_pricing records were deleted first
    expect(db.lease_pricing.has(pricingId1)).toBe(false);
    expect(db.lease_pricing.has(pricingId2)).toBe(false);
    
    // Verify listing was deleted
    expect(db.listings.has(listingId)).toBe(false);
    
    // Verify result
    expect(result.data[0].applied_deletes).toBe(1);
    expect(result.data[0].error_count).toBe(0);
  });
  
  test('should not fail when listing is already deleted', async () => {
    const listingId = 'non-existent-listing';
    const sessionId = 'test-session';
    
    // Create a DELETE change for a non-existent listing
    const changeId = 'delete-non-existent';
    addTestChange(db, {
      id: changeId,
      session_id: sessionId,
      change_type: 'DELETE',
      existing_listing_id: listingId,
      change_status: 'pending',
    });
    
    // Apply DELETE
    const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [changeId],
      p_applied_by: 'test-user',
    });
    
    // Should report an error but not crash
    expect(result.data[0].applied_deletes).toBe(0);
    expect(result.data[0].error_count).toBe(1);
    expect(result.data[0].errors[0]).toMatchObject({
      change_id: changeId,
      change_type: 'DELETE',
      error: 'Listing not found for deletion',
    });
  });
  
  test('should handle mixed batch operations with DELETE', async () => {
    const sessionId = 'mixed-batch-session';
    
    // Setup existing listings
    const updateListingId = addTestListing(db, {
      make: 'VW',
      model: 'Golf',
      variant: 'GTI',
      monthly_price: 3500,
    });
    
    const deleteListingId = addTestListing(db, {
      make: 'VW',
      model: 'Passat',
      variant: 'Elegance',
    });
    
    // Add another change referencing the delete target
    addTestChange(db, {
      session_id: 'other-session',
      change_type: 'UPDATE',
      existing_listing_id: deleteListingId,
    });
    
    // Create changes
    const createChangeId = addTestChange(db, {
      session_id: sessionId,
      change_type: 'CREATE',
      extracted_data: {
        make: 'VW',
        model: 'ID.5',
        variant: 'GTX',
        monthly_price: 6999,
      },
      change_status: 'pending',
    });
    
    const updateChangeId = addTestChange(db, {
      session_id: sessionId,
      change_type: 'UPDATE',
      existing_listing_id: updateListingId,
      extracted_data: {
        monthly_price: 3999,
      },
      change_status: 'pending',
    });
    
    const deleteChangeId = addTestChange(db, {
      session_id: sessionId,
      change_type: 'DELETE',
      existing_listing_id: deleteListingId,
      change_status: 'pending',
    });
    
    // Apply all changes
    const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
      p_session_id: sessionId,
      p_selected_change_ids: [createChangeId, updateChangeId, deleteChangeId],
      p_applied_by: 'test-user',
    });
    
    // Verify results
    expect(result.data[0].applied_creates).toBe(1);
    expect(result.data[0].applied_updates).toBe(1);
    expect(result.data[0].applied_deletes).toBe(1);
    expect(result.data[0].error_count).toBe(0);
    
    // Verify CREATE worked
    const createdListings = Array.from(db.listings.values()).filter(l => 
      l.make === 'VW' && l.model === 'ID.5'
    );
    expect(createdListings).toHaveLength(1);
    expect(createdListings[0].monthly_price).toBe(6999);
    
    // Verify UPDATE worked
    expect(db.listings.get(updateListingId)?.monthly_price).toBe(3999);
    
    // Verify DELETE worked and cleared all references
    expect(db.listings.has(deleteListingId)).toBe(false);
    const referencingChanges = Array.from(db.extraction_listing_changes.values())
      .filter(c => c.existing_listing_id === deleteListingId);
    expect(referencingChanges).toHaveLength(0);
  });
  
  test('Edge Function integration - should call RPC correctly', async () => {
    const sessionId = 'edge-function-test';
    const listingId = addTestListing(db, {
      make: 'Test',
      model: 'Car',
    });
    
    const changeId = addTestChange(db, {
      session_id: sessionId,
      change_type: 'DELETE',
      existing_listing_id: listingId,
    });
    
    // Test via Edge Function invoke
    const result = await mockSupabase.functions.invoke('apply-extraction-changes', {
      body: {
        sessionId,
        selectedChangeIds: [changeId],
        appliedBy: 'edge-test',
      },
    });
    
    expect(result.data[0].applied_deletes).toBe(1);
    expect(db.listings.has(listingId)).toBe(false);
  });
});