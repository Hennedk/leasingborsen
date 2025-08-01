import { describe, test, expect, beforeEach } from 'vitest';
import {
  createTestDatabase,
  setupDatabaseMocks,
  addTestListing,
  addTestChange,
  addTestSession,
  addTestPricing,
  type TestDatabase
} from './helpers/database-setup';
import {
  assertBatchResult,
  assertChangeApplied,
  assertSessionStatus,
  assertErrorDetails,
  countChangesByType
} from './helpers/assertion-helpers';
import { extractionSessionFactory } from './fixtures/extraction-sessions';

describe('Apply Extraction Changes - CRUD Operations', () => {
  let db: TestDatabase;
  let mockSupabase: any;
  
  beforeEach(() => {
    db = createTestDatabase();
    mockSupabase = setupDatabaseMocks(db);
  });
  
  describe('CREATE Operations', () => {
    test('should create new listings successfully', async () => {
      const sessionId = 'create-test-session';
      addTestSession(db, { id: sessionId });
      
      const createChange = addTestChange(db, {
        session_id: sessionId,
        change_type: 'CREATE',
        extracted_data: {
          make: 'VW',
          model: 'ID.5',
          variant: 'GTX',
          monthly_price: 6999,
          fuel_type: 'el',
          body_type: 'suv',
        },
        change_status: 'pending',
      });
      
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [createChange],
        p_applied_by: 'test-user',
      });
      
      assertBatchResult(result.data[0], {
        creates: 1,
        updates: 0,
        deletes: 0,
        errors: 0,
      });
      
      // Verify listing was created
      const createdListings = Array.from(db.listings.values())
        .filter(l => l.make === 'VW' && l.model === 'ID.5');
      expect(createdListings).toHaveLength(1);
      expect(createdListings[0].monthly_price).toBe(6999);
      
      // Verify change marked as applied
      assertChangeApplied(db, createChange);
    });
    
    test('should handle multiple CREATE operations', async () => {
      const sessionId = 'multi-create-session';
      addTestSession(db, { id: sessionId });
      
      const vehicles = [
        { make: 'VW', model: 'Golf', variant: 'GTI', monthly_price: 3999 },
        { make: 'BMW', model: 'X3', variant: 'xDrive30d', monthly_price: 6999 },
        { make: 'Toyota', model: 'RAV4', variant: 'Hybrid', monthly_price: 4999 },
      ];
      
      const changeIds = vehicles.map(vehicle => 
        addTestChange(db, {
          session_id: sessionId,
          change_type: 'CREATE',
          extracted_data: vehicle,
          change_status: 'pending',
        })
      );
      
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: changeIds,
        p_applied_by: 'test-user',
      });
      
      assertBatchResult(result.data[0], {
        creates: 3,
        updates: 0,
        deletes: 0,
        errors: 0,
      });
      
      // Verify all listings created
      expect(db.listings.size).toBe(3);
    });
  });
  
  describe('UPDATE Operations', () => {
    test('should update existing listings', async () => {
      const sessionId = 'update-test-session';
      addTestSession(db, { id: sessionId });
      
      // Create existing listing
      const existingId = addTestListing(db, {
        make: 'VW',
        model: 'Golf',
        variant: 'GTI',
        monthly_price: 3500,
        year: 2023,
      });
      
      const updateChange = addTestChange(db, {
        session_id: sessionId,
        change_type: 'UPDATE',
        existing_listing_id: existingId,
        extracted_data: {
          monthly_price: 3999,
          year: 2024,
        },
        change_status: 'pending',
      });
      
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [updateChange],
        p_applied_by: 'test-user',
      });
      
      assertBatchResult(result.data[0], {
        creates: 0,
        updates: 1,
        deletes: 0,
        errors: 0,
      });
      
      // Verify listing was updated
      const updated = db.listings.get(existingId);
      expect(updated?.monthly_price).toBe(3999);
      expect(updated?.year).toBe(2024);
      expect(updated?.make).toBe('VW'); // Unchanged fields preserved
    });
    
    test('should fail UPDATE for non-existent listing', async () => {
      const sessionId = 'update-fail-session';
      addTestSession(db, { id: sessionId });
      
      const updateChange = addTestChange(db, {
        session_id: sessionId,
        change_type: 'UPDATE',
        existing_listing_id: 'non-existent-id',
        extracted_data: {
          monthly_price: 3999,
        },
        change_status: 'pending',
      });
      
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [updateChange],
        p_applied_by: 'test-user',
      });
      
      assertBatchResult(result.data[0], {
        updates: 0,
        errors: 1,
      });
      
      assertErrorDetails(result.data[0].errors, [{
        changeId: updateChange,
        changeType: 'UPDATE',
        errorPattern: /not found/i,
      }]);
    });
  });
  
  describe('Mixed Batch Operations', () => {
    test('should handle CREATE + UPDATE + DELETE in single batch', async () => {
      const session = extractionSessionFactory.withAllChangeTypes();
      
      // Setup database state
      addTestSession(db, {
        id: session.id,
        dealer_id: session.dealer_id,
        status: 'pending',
      });
      
      // Add existing listings for UPDATE and DELETE
      addTestListing(db, {
        id: 'existing-vw-golf',
        make: 'VW',
        model: 'Golf',
        monthly_price: 3500,
      });
      
      addTestListing(db, {
        id: 'existing-vw-passat',
        make: 'VW',
        model: 'Passat',
      });
      
      // Add the changes
      session.changes.forEach(change => {
        addTestChange(db, change);
      });
      
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: session.id,
        p_selected_change_ids: session.changeIds,
        p_applied_by: 'test-user',
      });
      
      assertBatchResult(result.data[0], {
        creates: 1,
        updates: 1,
        deletes: 1,
        errors: 0,
        total: 3,
      });
      
      // Verify each operation
      expect(db.listings.get('existing-vw-golf')?.monthly_price).toBe(3999);
      expect(db.listings.has('existing-vw-passat')).toBe(false);
      
      const newListings = Array.from(db.listings.values())
        .filter(l => l.model === 'ID.5');
      expect(newListings).toHaveLength(1);
      
      assertSessionStatus(db, session.id, 'completed');
    });
    
    test('should handle partial batch failure correctly', async () => {
      const session = extractionSessionFactory.withBatchErrors();
      
      // Setup
      addTestSession(db, { id: session.id });
      addTestListing(db, {
        id: 'existing-listing-to-delete',
        make: 'Test',
        model: 'Car',
      });
      
      session.changes.forEach(change => {
        addTestChange(db, change);
      });
      
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: session.id,
        p_selected_change_ids: session.changes.map(c => c.id),
        p_applied_by: 'test-user',
      });
      
      // Verify expected results
      assertBatchResult(result.data[0], session.expectedResult);
      assertSessionStatus(db, session.id, 'partially_applied');
      
      // Verify specific operations
      const validCreates = Array.from(db.listings.values())
        .filter(l => l.make === 'Valid');
      expect(validCreates).toHaveLength(1);
      
      expect(db.listings.has('existing-listing-to-delete')).toBe(false);
    });
  });
  
  describe('Session State Management', () => {
    test('should update session status on successful completion', async () => {
      const sessionId = 'session-status-test';
      const session = addTestSession(db, {
        id: sessionId,
        status: 'pending',
      });
      
      const changeId = addTestChange(db, {
        session_id: sessionId,
        change_type: 'CREATE',
        extracted_data: { make: 'Test', model: 'Car' },
      });
      
      await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [changeId],
        p_applied_by: 'test-user',
      });
      
      assertSessionStatus(db, sessionId, 'completed');
    });
    
    test('should track change counts by type', async () => {
      const session = extractionSessionFactory.withAllChangeTypes();
      
      addTestSession(db, { id: session.id });
      session.changes.forEach(change => {
        addTestChange(db, change);
      });
      
      const beforeCounts = countChangesByType(db, session.id);
      expect(beforeCounts.pending).toBe(3);
      expect(beforeCounts.applied).toBe(0);
      
      // Apply only some changes
      await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: session.id,
        p_selected_change_ids: [session.changeIds[0], session.changeIds[1]],
        p_applied_by: 'test-user',
      });
      
      const afterCounts = countChangesByType(db, session.id);
      expect(afterCounts.pending).toBe(1);
      expect(afterCounts.applied).toBe(2);
    });
  });
});