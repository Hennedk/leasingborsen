import { faker } from '@faker-js/faker';
import { vehicleFactory } from './vehicles';

export const extractionFactory = {
  // Extraction session factory
  session: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: 'test-vw-dealer',
    file_name: 'test-catalog.pdf',
    file_size: faker.number.int({ min: 500000, max: 5000000 }),
    status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
    vehicle_count: faker.number.int({ min: 5, max: 50 }),
    processing_time_ms: faker.number.int({ min: 5000, max: 60000 }),
    cost_estimate: faker.number.float({ min: 0.01, max: 2.50, fractionDigits: 3 }),
    ai_model_used: faker.helpers.arrayElement(['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet-20240229']),
    prompt_version: faker.number.int({ min: 1, max: 20 }),
    extracted_at: faker.date.recent().toISOString(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    metadata: {
      pages_processed: faker.number.int({ min: 3, max: 25 }),
      confidence_score: faker.number.float({ min: 0.7, max: 0.99, fractionDigits: 2 }),
      extraction_quality: faker.helpers.arrayElement(['high', 'medium', 'low']),
    },
    ...overrides,
  }),
  
  // Extraction changes factory
  change: {
    create: (overrides = {}) => ({
      id: faker.string.uuid(),
      session_id: 'test-session-' + faker.string.nanoid(8),
      change_type: 'CREATE',
      extracted_data: vehicleFactory.vwId4(),
      listing_id: null, // No existing listing for creates
      current_data: null, // No current data for creates  
      changes: null, // No specific changes for creates
      confidence_score: faker.number.float({ min: 0.85, max: 0.99, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(['pending', 'applied', 'rejected']),
      applied_at: null,
      applied_by: null,
      rejection_reason: null,
      created_at: faker.date.recent().toISOString(),
      ...overrides,
    }),
    
    update: (existing: any, changes: any, overrides = {}) => ({
      id: faker.string.uuid(),
      session_id: 'test-session-' + faker.string.nanoid(8),
      change_type: 'UPDATE',
      listing_id: existing.id,
      current_data: existing,
      extracted_data: { ...existing, ...changes },
      changes: Object.keys(changes).reduce((acc, key) => ({
        ...acc,
        [key]: {
          old: existing[key],
          new: changes[key],
          change_type: 'field_update',
          confidence: faker.number.float({ min: 0.8, max: 0.95, fractionDigits: 2 }),
        },
      }), {}),
      confidence_score: faker.number.float({ min: 0.80, max: 0.95, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(['pending', 'applied', 'rejected']),
      applied_at: null,
      applied_by: null,
      rejection_reason: null,
      created_at: faker.date.recent().toISOString(),
      ...overrides,
    }),
    
    delete: (existing: any, overrides = {}) => ({
      id: faker.string.uuid(),
      session_id: 'test-session-' + faker.string.nanoid(8),
      change_type: 'DELETE',
      listing_id: existing.id,
      current_data: existing,
      extracted_data: existing, // Copy for UI display
      changes: null, // No specific changes for deletions
      confidence_score: faker.number.float({ min: 0.70, max: 0.90, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(['pending', 'applied', 'rejected']),
      applied_at: null,
      applied_by: null,
      rejection_reason: null,
      created_at: faker.date.recent().toISOString(),
      ...overrides,
    }),

    // Create a mixed batch of changes
    mixedBatch: (existingListings: any[] = []) => {
      const changes = [];
      
      // Add some creates
      for (let i = 0; i < faker.number.int({ min: 2, max: 5 }); i++) {
        changes.push(extractionFactory.change.create());
      }
      
      // Add some updates if we have existing listings
      if (existingListings.length > 0) {
        for (let i = 0; i < Math.min(3, existingListings.length); i++) {
          const existing = existingListings[i];
          const priceChange = faker.number.int({ min: -500, max: 1000 });
          changes.push(extractionFactory.change.update(existing, {
            monthly_price: existing.monthly_price + priceChange,
          }));
        }
      }
      
      // Add some deletes if we have enough existing listings
      if (existingListings.length > 3) {
        for (let i = 0; i < faker.number.int({ min: 1, max: 2 }); i++) {
          const existing = existingListings[existingListings.length - 1 - i];
          changes.push(extractionFactory.change.delete(existing));
        }
      }
      
      return changes;
    },
  },

  // Extraction comparison results
  comparisonResult: (overrides = {}) => ({
    session_id: faker.string.uuid(),
    total_changes: faker.number.int({ min: 5, max: 50 }),
    creates: faker.number.int({ min: 1, max: 20 }),
    updates: faker.number.int({ min: 2, max: 15 }),
    deletes: faker.number.int({ min: 0, max: 10 }),
    processing_time_ms: faker.number.int({ min: 1000, max: 10000 }),
    comparison_strategy: 'fuzzy_matching',
    match_confidence_threshold: 0.85,
    created_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Application results
  applicationResult: (overrides = {}) => ({
    session_id: faker.string.uuid(),
    total_processed: faker.number.int({ min: 5, max: 50 }),
    applied: {
      created: faker.number.int({ min: 1, max: 20 }),
      updated: faker.number.int({ min: 0, max: 15 }),
      deleted: faker.number.int({ min: 0, max: 10 }),
    },
    errors: [], // Usually empty for successful operations
    session_status: faker.helpers.arrayElement(['completed', 'partially_applied', 'failed']),
    processing_time_ms: faker.number.int({ min: 2000, max: 30000 }),
    applied_by: 'test-admin',
    applied_at: faker.date.recent().toISOString(),
    ...overrides,
  }),

  // Error scenarios for testing
  errors: {
    sessionFailed: () => extractionFactory.session({
      status: 'failed',
      error_message: 'PDF processing failed: Unable to extract text from document',
      error_code: 'PDF_EXTRACTION_ERROR',
    }),

    partiallyApplied: () => extractionFactory.applicationResult({
      session_status: 'partially_applied',
      errors: [
        {
          change_id: faker.string.uuid(),
          error: 'Foreign key constraint violation',
          error_code: 'FK_CONSTRAINT_ERROR',
        },
        {
          change_id: faker.string.uuid(),
          error: 'Duplicate listing detected',
          error_code: 'DUPLICATE_LISTING_ERROR',
        },
      ],
    }),

    lowConfidence: () => extractionFactory.change.create({
      confidence_score: 0.45,
      status: 'pending',
      metadata: {
        flags: ['low_confidence', 'manual_review_required'],
        extraction_issues: ['unclear_text', 'incomplete_data'],
      },
    }),
  },

  // Realistic scenarios for different dealers
  scenarios: {
    volkswagen: {
      successfulExtraction: () => ({
        session: extractionFactory.session({
          dealer_id: 'test-vw-dealer',
          file_name: 'vw-q1-2024-prisliste.pdf',
          status: 'completed',
          vehicle_count: 23,
          ai_model_used: 'gpt-4',
        }),
        changes: [
          extractionFactory.change.create({
            extracted_data: vehicleFactory.vwId4(),
          }),
          extractionFactory.change.update(
            vehicleFactory.generic({ make: 'Volkswagen', model: 'Golf', monthly_price: 3500 }),
            { monthly_price: 3699 }
          ),
        ],
      }),
    },

    toyota: {
      transmissionVariants: () => ({
        session: extractionFactory.session({
          dealer_id: 'test-toyota-dealer',
          file_name: 'toyota-aygo-x-prisliste.pdf',
          status: 'completed',
          vehicle_count: 12,
        }),
        changes: [
          extractionFactory.change.create({
            extracted_data: vehicleFactory.toyotaAygo.manual(),
          }),
          extractionFactory.change.create({
            extracted_data: vehicleFactory.toyotaAygo.automatic(),
          }),
        ],
      }),
    },

    ford: {
      merprисHandling: () => ({
        session: extractionFactory.session({
          dealer_id: 'test-ford-dealer',
          file_name: 'ford-prisliste-marts-2024.pdf',
          status: 'completed',
          vehicle_count: 18,
        }),
        changes: [
          extractionFactory.change.create({
            extracted_data: vehicleFactory.fordFiesta(),
          }),
        ],
      }),
    },
  },

  // Utilities for creating test data
  utils: {
    createSessionWithChanges: (changeCount: number = 10) => {
      const session = extractionFactory.session();
      const changes = [];
      
      for (let i = 0; i < changeCount; i++) {
        const changeType = faker.helpers.arrayElement(['create', 'update', 'delete']);
        switch (changeType) {
          case 'create':
            changes.push(extractionFactory.change.create({ session_id: session.id }));
            break;
          case 'update':
            const existing = vehicleFactory.generic();
            changes.push(extractionFactory.change.update(
              existing,
              { monthly_price: existing.monthly_price + faker.number.int({ min: -200, max: 500 }) },
              { session_id: session.id }
            ));
            break;
          case 'delete':
            changes.push(extractionFactory.change.delete(
              vehicleFactory.generic(),
              { session_id: session.id }
            ));
            break;
        }
      }
      
      return { session, changes };
    },

    createRealisticComparison: (existingListings: any[]) => {
      const changes = extractionFactory.change.mixedBatch(existingListings);
      const summary = extractionFactory.comparisonResult({
        total_changes: changes.length,
        creates: changes.filter(c => c.change_type === 'CREATE').length,
        updates: changes.filter(c => c.change_type === 'UPDATE').length,
        deletes: changes.filter(c => c.change_type === 'DELETE').length,
      });
      
      return { changes, summary };
    },
  },
};