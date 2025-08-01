export const extractionSessionFactory = {
  basic: (overrides = {}) => ({
    id: `session-${Date.now()}`,
    dealer_id: 'test-dealer',
    session_name: 'Test Extraction',
    file_name: 'test-catalog.pdf',
    status: 'pending',
    total_extracted: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  withAllChangeTypes: (overrides = {}) => {
    const sessionId = `session-all-types-${Date.now()}`;
    return {
      id: sessionId,
      dealer_id: 'test-dealer',
      session_name: 'Mixed Changes Test',
      file_name: 'mixed-changes.pdf',
      status: 'pending',
      total_extracted: 15,
      changes: [
        {
          id: `${sessionId}-create-1`,
          session_id: sessionId,
          change_type: 'CREATE',
          extracted_data: {
            make: 'VW',
            model: 'ID.5',
            variant: 'GTX',
            monthly_price: 6999,
          },
          change_status: 'pending',
        },
        {
          id: `${sessionId}-update-1`,
          session_id: sessionId,
          change_type: 'UPDATE',
          existing_listing_id: 'existing-vw-golf',
          extracted_data: {
            monthly_price: 3999,
          },
          change_status: 'pending',
        },
        {
          id: `${sessionId}-delete-1`,
          session_id: sessionId,
          change_type: 'DELETE',
          existing_listing_id: 'existing-vw-passat',
          change_status: 'pending',
        },
      ],
      changeIds: [
        `${sessionId}-create-1`,
        `${sessionId}-update-1`,
        `${sessionId}-delete-1`,
      ],
      ...overrides,
    };
  },
  
  withForeignKeyIssues: (overrides = {}) => {
    const sessionId = `session-fk-issues-${Date.now()}`;
    const targetListingId = 'listing-with-multiple-refs';
    
    return {
      id: sessionId,
      dealer_id: 'test-dealer',
      session_name: 'Foreign Key Test',
      status: 'pending',
      
      // Existing listing that will be deleted
      targetListing: {
        id: targetListingId,
        make: 'Toyota',
        model: 'RAV4',
        variant: 'Hybrid',
        dealer_id: 'test-dealer',
      },
      
      // Multiple changes referencing the same listing
      changes: [
        {
          id: `${sessionId}-delete`,
          session_id: sessionId,
          change_type: 'DELETE',
          existing_listing_id: targetListingId,
          change_status: 'pending',
        },
        {
          id: 'other-session-update',
          session_id: 'different-session',
          change_type: 'UPDATE',
          existing_listing_id: targetListingId,
          change_status: 'pending',
        },
        {
          id: 'another-session-ref',
          session_id: 'another-session',
          change_type: 'UPDATE',
          existing_listing_id: targetListingId,
          change_status: 'applied',
        },
      ],
      
      // Lease pricing records that need to be deleted
      leasePricing: [
        {
          id: 'pricing-1',
          listing_id: targetListingId,
          monthly_price: 4999,
          period_months: 36,
        },
        {
          id: 'pricing-2',
          listing_id: targetListingId,
          monthly_price: 5499,
          period_months: 24,
        },
      ],
      
      ...overrides,
    };
  },
  
  withBatchErrors: (overrides = {}) => {
    const sessionId = `session-batch-errors-${Date.now()}`;
    return {
      id: sessionId,
      dealer_id: 'test-dealer',
      session_name: 'Batch Error Test',
      status: 'pending',
      
      changes: [
        {
          id: `${sessionId}-valid-create`,
          session_id: sessionId,
          change_type: 'CREATE',
          extracted_data: {
            make: 'Valid',
            model: 'Car',
            monthly_price: 2999,
          },
          change_status: 'pending',
        },
        {
          id: `${sessionId}-invalid-update`,
          session_id: sessionId,
          change_type: 'UPDATE',
          existing_listing_id: 'non-existent-listing',
          extracted_data: {
            monthly_price: 3999,
          },
          change_status: 'pending',
        },
        {
          id: `${sessionId}-valid-delete`,
          session_id: sessionId,
          change_type: 'DELETE',
          existing_listing_id: 'existing-listing-to-delete',
          change_status: 'pending',
        },
      ],
      
      expectedResult: {
        applied_creates: 1,
        applied_updates: 0,
        applied_deletes: 1,
        error_count: 1,
        sessionStatus: 'partially_applied',
      },
      
      ...overrides,
    };
  },
};