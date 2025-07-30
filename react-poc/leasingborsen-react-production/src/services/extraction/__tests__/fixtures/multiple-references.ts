export const multipleReferencesScenarios = {
  // Scenario 1: Multiple sessions referencing same listing
  crossSessionReferences: {
    targetListing: {
      id: 'shared-listing-123',
      make: 'Mercedes',
      model: 'GLC',
      variant: '300d',
      dealer_id: 'mercedes-dealer',
    },
    
    references: [
      {
        id: 'ref-session-1',
        session_id: 'session-1',
        change_type: 'DELETE',
        existing_listing_id: 'shared-listing-123',
        change_status: 'pending',
      },
      {
        id: 'ref-session-2',
        session_id: 'session-2',
        change_type: 'UPDATE',
        existing_listing_id: 'shared-listing-123',
        change_status: 'pending',
      },
      {
        id: 'ref-session-3',
        session_id: 'session-3',
        change_type: 'UPDATE',
        existing_listing_id: 'shared-listing-123',
        change_status: 'applied', // Already applied from previous run
      },
    ],
    
    expectedBehavior: {
      allReferencesCleared: true,
      listingDeleted: true,
      clearedCount: 3,
    },
  },
  
  // Scenario 2: Listing with pricing and multiple references
  complexDeletionScenario: {
    targetListing: {
      id: 'complex-listing-456',
      make: 'BMW',
      model: 'X5',
      variant: 'xDrive40i',
      dealer_id: 'bmw-dealer',
      retail_price: 850000,
    },
    
    leasePricing: [
      {
        id: 'pricing-1',
        listing_id: 'complex-listing-456',
        monthly_price: 8999,
        period_months: 36,
        mileage_per_year: 15000,
        first_payment: 75000,
      },
      {
        id: 'pricing-2',
        listing_id: 'complex-listing-456',
        monthly_price: 9999,
        period_months: 24,
        mileage_per_year: 20000,
        first_payment: 75000,
      },
      {
        id: 'pricing-3',
        listing_id: 'complex-listing-456',
        monthly_price: 7999,
        period_months: 48,
        mileage_per_year: 10000,
        first_payment: 100000,
      },
    ],
    
    references: [
      {
        id: 'current-delete',
        session_id: 'current-session',
        change_type: 'DELETE',
        existing_listing_id: 'complex-listing-456',
      },
      {
        id: 'old-update-1',
        session_id: 'old-session-1',
        change_type: 'UPDATE',
        existing_listing_id: 'complex-listing-456',
        applied_at: '2024-12-01',
      },
      {
        id: 'old-update-2',
        session_id: 'old-session-2',
        change_type: 'UPDATE',
        existing_listing_id: 'complex-listing-456',
        applied_at: '2024-11-15',
      },
    ],
    
    deletionOrder: [
      'extraction_listing_changes references cleared',
      'lease_pricing records deleted',
      'listings record deleted',
    ],
  },
  
  // Scenario 3: The exact bug we fixed
  realWorldBugScenario: {
    sessionId: '290915a6-0fc9-4da7-b1c6-1ebd3c86becf',
    
    targetListing: {
      id: '22bf5261-322a-47c7-afe0-4e3872841f4b',
      make: 'Toyota',
      model: 'bZ4X',
      variant: 'Executive',
      dealer_id: 'demo-bilhus',
    },
    
    // The problematic reference that wasn't being cleared
    problematicReferences: [
      {
        id: 'bd613c0f-cb0d-4215-a2f3-66158d633bfd',
        session_id: '290915a6-0fc9-4da7-b1c6-1ebd3c86becf',
        change_type: 'DELETE',
        existing_listing_id: '22bf5261-322a-47c7-afe0-4e3872841f4b',
      },
      {
        // This reference from another session was blocking deletion
        id: 'blocking-reference',
        session_id: 'different-session-xyz',
        change_type: 'UPDATE',
        existing_listing_id: '22bf5261-322a-47c7-afe0-4e3872841f4b',
        change_status: 'pending',
      },
    ],
    
    buggyBehavior: {
      error: 'update or delete on table "listings" violates foreign key constraint',
      reason: 'Only current session references were cleared, not all',
    },
    
    fixedBehavior: {
      allReferencesCleared: true,
      deletionSuccessful: true,
    },
  },
};