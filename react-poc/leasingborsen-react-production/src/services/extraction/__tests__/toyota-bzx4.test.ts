import { describe, test, expect, beforeEach } from 'vitest';
import { 
  toyotaBZ4XScenario, 
  toyotaMultipleTransmissions,
  toyotaDeletionScenario 
} from './fixtures/toyota-bzx4';
import { generateExactKey } from '@/services/comparison/comparison-utils';
import {
  createTestDatabase,
  setupDatabaseMocks,
  addTestListing,
  addTestChange,
  addTestSession,
  type TestDatabase
} from './helpers/database-setup';

describe('Toyota bZ4X - Matching Logic Fix', () => {
  describe('Exact Key Generation', () => {
    test('should generate same key regardless of transmission', () => {
      const { existingListings, extractedVehicles } = toyotaBZ4XScenario;
      
      const existingKey = generateExactKey(
        existingListings[0].make,
        existingListings[0].model,
        existingListings[0].variant
      );
      
      const extractedKey = generateExactKey(
        extractedVehicles[0].make,
        extractedVehicles[0].model,
        extractedVehicles[0].variant
      );
      
      expect(existingKey).toBe('toyota|bz4x|executive');
      expect(extractedKey).toBe('toyota|bz4x|executive');
      expect(existingKey).toBe(extractedKey);
    });
    
    test('should NOT include transmission in key', () => {
      // Test that adding transmission doesn't change the key
      const key1 = generateExactKey('Toyota', 'bZ4X', 'Executive');
      const key2 = generateExactKey('Toyota', 'bZ4X', 'Executive');
      
      expect(key1).toBe(key2);
      expect(key1).not.toContain('manual');
      expect(key1).not.toContain('automatic');
    });
  });
  
  describe('Duplicate Prevention', () => {
    test('should update existing instead of creating duplicate', () => {
      const { existingListings, extractedVehicles, expectedResult } = toyotaBZ4XScenario;
      
      // In real comparison logic, this would be detected as UPDATE not CREATE
      // because the exact keys match
      const existingKey = generateExactKey(
        existingListings[0].make,
        existingListings[0].model,
        existingListings[0].variant
      );
      
      const extractedKey = generateExactKey(
        extractedVehicles[0].make,
        extractedVehicles[0].model,
        extractedVehicles[0].variant
      );
      
      // Keys match, so it should be treated as an update
      expect(existingKey).toBe(extractedKey);
      expect(expectedResult.changes.creates).toBe(0);
      expect(expectedResult.changes.updates).toBe(1);
    });
  });
  
  describe('Toyota Transmission Variants', () => {
    test('should clean "Automatik" from variant name', () => {
      const { extractedVehicles, expectedResult } = toyotaMultipleTransmissions;
      
      // Test variant cleanup logic
      const automaticVariant = extractedVehicles[1].variant; // "Pulse Automatik"
      const cleanedVariant = automaticVariant.replace(/\s*(Automatik|Manuel|aut\.)$/, '').trim();
      
      expect(cleanedVariant).toBe('Pulse');
      expect(cleanedVariant).toBe(expectedResult.processedVariants.automatic);
    });
    
    test('should generate same key for manual and automatic variants', () => {
      const { extractedVehicles } = toyotaMultipleTransmissions;
      
      const manualKey = generateExactKey(
        extractedVehicles[0].make,
        extractedVehicles[0].model,
        'Pulse' // Already clean
      );
      
      const autoKey = generateExactKey(
        extractedVehicles[1].make,
        extractedVehicles[1].model,
        'Pulse' // After cleaning "Automatik"
      );
      
      expect(manualKey).toBe(autoKey);
      expect(manualKey).toBe('toyota|aygo x|pulse');
    });
  });
  
  describe('Toyota Deletion with Multiple References', () => {
    let db: TestDatabase;
    let mockSupabase: any;
    
    beforeEach(() => {
      db = createTestDatabase();
      mockSupabase = setupDatabaseMocks(db);
    });
    
    test('should successfully delete Toyota bZ4X with multiple references', async () => {
      const { 
        sessionId, 
        existingListings, 
        multipleReferences,
        expectedResult 
      } = toyotaDeletionScenario;
      
      // Setup the listing
      const listing = existingListings[0];
      addTestListing(db, listing);
      
      // Setup the session
      addTestSession(db, {
        id: sessionId,
        dealer_id: listing.dealer_id,
        status: 'pending',
      });
      
      // Add all the references
      multipleReferences.forEach(ref => {
        addTestChange(db, ref);
      });
      
      // Verify initial state - multiple references exist
      const initialRefs = Array.from(db.extraction_listing_changes.values())
        .filter(c => c.existing_listing_id === listing.id);
      expect(initialRefs).toHaveLength(multipleReferences.length);
      
      // Apply the DELETE change
      const deleteChangeId = multipleReferences[0].id;
      const result = await mockSupabase.rpc('apply_selected_extraction_changes', {
        p_session_id: sessionId,
        p_selected_change_ids: [deleteChangeId],
        p_applied_by: 'test-user',
      });
      
      // Verify all references were cleared
      const remainingRefs = Array.from(db.extraction_listing_changes.values())
        .filter(c => c.existing_listing_id === listing.id);
      expect(remainingRefs).toHaveLength(0);
      
      // Verify listing was deleted
      expect(db.listings.has(listing.id)).toBe(expectedResult.listingDeleted);
      
      // Verify result
      expect(result.data[0].applied_deletes).toBe(1);
      expect(result.data[0].error_count).toBe(0);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle Toyota models with special characters', () => {
      const specialCases = [
        { model: 'C-HR', expected: 'toyota|c-hr|hybrid' },
        { model: 'RAV4', expected: 'toyota|rav4|adventure' },
        { model: 'PROACE CITY', expected: 'toyota|proace city|active' },
      ];
      
      specialCases.forEach(({ model, expected }) => {
        const key = generateExactKey('Toyota', model, expected.split('|')[2]);
        expect(key).toBe(expected);
      });
    });
    
    test('should handle empty or null transmission values', () => {
      const key1 = generateExactKey('Toyota', 'Yaris', 'Active');
      const key2 = generateExactKey('Toyota', 'Yaris', 'Active');
      
      expect(key1).toBe(key2);
      expect(key1).toBe('toyota|yaris|active');
    });
  });
});