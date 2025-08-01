import { expect } from 'vitest';
import type { TestDatabase } from './database-setup';

/**
 * Assert that no orphaned references exist for a deleted listing
 */
export function assertNoOrphanReferences(db: TestDatabase, listingId: string) {
  const orphans: string[] = [];
  
  for (const [id, change] of db.extraction_listing_changes) {
    if (change.existing_listing_id === listingId) {
      orphans.push(id);
    }
  }
  
  expect(orphans).toHaveLength(0);
  
  if (orphans.length > 0) {
    console.error('Found orphaned references:', orphans);
  }
}

/**
 * Assert that cascade deletion was performed correctly
 */
export function assertCascadeDeletion(db: TestDatabase, listingId: string) {
  // Check listing deleted
  expect(db.listings.has(listingId)).toBe(false);
  
  // Check lease_pricing deleted
  const pricingRecords = Array.from(db.lease_pricing.values())
    .filter(lp => lp.listing_id === listingId);
  expect(pricingRecords).toHaveLength(0);
  
  // Check references cleared
  assertNoOrphanReferences(db, listingId);
}

/**
 * Assert that a change was applied successfully
 */
export function assertChangeApplied(db: TestDatabase, changeId: string) {
  const change = db.extraction_listing_changes.get(changeId);
  expect(change).toBeDefined();
  expect(change?.change_status).toBe('applied');
  expect(change?.applied_at).toBeDefined();
  expect(change?.applied_by).toBeDefined();
}

/**
 * Assert the state of a batch operation result
 */
export function assertBatchResult(
  result: any,
  expected: {
    creates?: number;
    updates?: number;
    deletes?: number;
    errors?: number;
    total?: number;
  }
) {
  if (expected.creates !== undefined) {
    expect(result.applied_creates).toBe(expected.creates);
  }
  if (expected.updates !== undefined) {
    expect(result.applied_updates).toBe(expected.updates);
  }
  if (expected.deletes !== undefined) {
    expect(result.applied_deletes).toBe(expected.deletes);
  }
  if (expected.errors !== undefined) {
    expect(result.error_count).toBe(expected.errors);
  }
  if (expected.total !== undefined) {
    expect(result.total_processed).toBe(expected.total);
  }
}

/**
 * Assert that specific errors occurred
 */
export function assertErrorDetails(
  errors: any[],
  expectedErrors: Array<{
    changeId?: string;
    changeType?: string;
    errorPattern?: RegExp;
  }>
) {
  expect(errors).toHaveLength(expectedErrors.length);
  
  expectedErrors.forEach((expected, index) => {
    const error = errors[index];
    
    if (expected.changeId) {
      expect(error.change_id).toBe(expected.changeId);
    }
    if (expected.changeType) {
      expect(error.change_type).toBe(expected.changeType);
    }
    if (expected.errorPattern) {
      expect(error.error).toMatch(expected.errorPattern);
    }
  });
}

/**
 * Assert database state after DELETE operation
 */
export function assertDeleteOperationComplete(
  db: TestDatabase,
  listingId: string,
  options: {
    expectListingDeleted?: boolean;
    expectReferencesCleared?: boolean;
    expectPricingDeleted?: boolean;
  } = {}
) {
  const {
    expectListingDeleted = true,
    expectReferencesCleared = true,
    expectPricingDeleted = true,
  } = options;
  
  if (expectListingDeleted) {
    expect(db.listings.has(listingId)).toBe(false);
  }
  
  if (expectReferencesCleared) {
    assertNoOrphanReferences(db, listingId);
  }
  
  if (expectPricingDeleted) {
    const pricingRecords = Array.from(db.lease_pricing.values())
      .filter(lp => lp.listing_id === listingId);
    expect(pricingRecords).toHaveLength(0);
  }
}

/**
 * Helper to count changes by type
 */
export function countChangesByType(db: TestDatabase, sessionId: string) {
  const changes = Array.from(db.extraction_listing_changes.values())
    .filter(c => c.session_id === sessionId);
  
  return {
    total: changes.length,
    creates: changes.filter(c => c.change_type === 'CREATE').length,
    updates: changes.filter(c => c.change_type === 'UPDATE').length,
    deletes: changes.filter(c => c.change_type === 'DELETE').length,
    pending: changes.filter(c => c.change_status === 'pending').length,
    applied: changes.filter(c => c.change_status === 'applied').length,
  };
}

/**
 * Assert session completion status
 */
export function assertSessionStatus(
  db: TestDatabase,
  sessionId: string,
  expectedStatus: 'pending' | 'completed' | 'partially_applied' | 'failed'
) {
  const session = db.extraction_sessions.get(sessionId);
  expect(session).toBeDefined();
  expect(session?.status).toBe(expectedStatus);
  
  if (expectedStatus === 'completed' || expectedStatus === 'partially_applied') {
    expect(session?.applied_at).toBeDefined();
  }
}