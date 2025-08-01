import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock response builders for Supabase queries
export const mockQueryBuilder = () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Make then method properly chainable and always return a promise
    then: vi.fn((onResolve, onReject) => {
      const result = { data: [], error: null };
      return Promise.resolve(result).then(onResolve, onReject);
    }),
    // Add Promise-like methods for better compatibility
    catch: vi.fn((onReject) => Promise.resolve({ data: [], error: null }).catch(onReject)),
    finally: vi.fn((onFinally) => Promise.resolve({ data: [], error: null }).finally(onFinally)),
  };
  
  // Ensure all methods return the builder for chaining
  Object.keys(builder).forEach(key => {
    if (key !== 'then' && key !== 'catch' && key !== 'finally' && key !== 'single' && key !== 'maybeSingle') {
      builder[key] = vi.fn(() => builder);
    }
  });
  
  return builder;
};

// Mock Supabase client with all required methods
export const mockSupabaseClient: Partial<SupabaseClient> = {
  from: vi.fn(() => mockQueryBuilder()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  auth: {
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
      error: null 
    }),
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: { user: { id: 'test-user-id' } } }, 
      error: null 
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: {} },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  } as any,
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  } as any,
};

// Mock Edge Functions with realistic responses
export const mockEdgeFunctions = {
  'pdf-proxy': vi.fn().mockResolvedValue({
    blob: () => Promise.resolve(new Blob(['mock pdf content'], { type: 'application/pdf' })),
    ok: true,
    status: 200,
  }),
  
  'ai-extract-vehicles': vi.fn().mockResolvedValue({
    vehicles: [
      {
        make: 'Volkswagen',
        model: 'ID.4',
        variant: 'GTX Performance',
        monthly_price: 4999,
        retail_price: 475000,
        fuel_type: 'Electric',
        body_type: 'SUV',
        transmission: 'Automatic',
        year: 2024,
      }
    ],
    cost_estimate: 0.05,
    processing_time_ms: 1000,
    session_id: 'mock-session-id',
  }),
  
  'compare-extracted-listings': vi.fn().mockResolvedValue({
    changes: [],
    session_id: 'mock-session-id',
    summary: {
      total_changes: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
    },
  }),
  
  'apply-extraction-changes': vi.fn().mockResolvedValue({
    applied: { 
      created: 0, 
      updated: 0, 
      deleted: 0 
    },
    errors: [],
    sessionStatus: 'completed',
    total_processed: 0,
  }),

  'admin-listing-operations': vi.fn().mockResolvedValue({
    data: { id: 'mock-listing-id' },
    error: null,
  }),

  'admin-seller-operations': vi.fn().mockResolvedValue({
    data: { id: 'mock-seller-id' },
    error: null,
  }),

  'admin-image-operations': vi.fn().mockResolvedValue({
    data: { 
      url: 'https://mock-image-url.com/image.jpg',
      path: 'mock/path/image.jpg'
    },
    error: null,
  }),

  'calculate-lease-score': vi.fn().mockResolvedValue({
    score: 85,
    breakdown: {
      monthlyRateScore: 90,
      mileageScore: 80,
      flexibilityScore: 85,
    },
  }),

  'batch-calculate-lease-scores': vi.fn().mockResolvedValue({
    processed: 10,
    updated: 8,
    errors: [],
  }),
};

// Setup function to configure all mocks
export function setupSupabaseMocks() {
  // Mock the createClient function from @supabase/supabase-js
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabaseClient),
  }));
  
  // Configure Edge Function responses
  (mockSupabaseClient.functions!.invoke as any).mockImplementation(
    async (functionName: string, options?: any) => {
      const handler = mockEdgeFunctions[functionName as keyof typeof mockEdgeFunctions];
      if (!handler) {
        console.warn(`Unhandled edge function in test: ${functionName}`);
        return { data: null, error: new Error(`Unhandled edge function: ${functionName}`) };
      }
      
      const data = await handler(options?.body);
      return { data, error: null };
    }
  );
}

// Helper to reset all mocks
export function resetSupabaseMocks() {
  vi.clearAllMocks();
  
  // Reset all query builder mocks
  Object.values(mockQueryBuilder()).forEach(mock => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
}

// Helper to set up specific mock responses for database queries
export function mockSupabaseResponse(table: string, operation: string, response: any) {
  const queryBuilder = mockQueryBuilder();
  
  switch (operation) {
    case 'select':
      queryBuilder.then = vi.fn((callback) => {
        return callback({ data: response, error: null });
      });
      break;
    case 'insert':
      queryBuilder.insert.mockResolvedValueOnce({
        data: response,
        error: null,
      });
      break;
    case 'update':
      queryBuilder.update.mockResolvedValueOnce({
        data: response,
        error: null,
      });
      break;
    case 'delete':
      queryBuilder.delete.mockResolvedValueOnce({
        data: response,
        error: null,
      });
      break;
    case 'single':
      queryBuilder.single.mockResolvedValueOnce({
        data: response,
        error: null,
      });
      break;
    default:
      console.warn(`Unknown operation: ${operation}`);
  }
  
  (mockSupabaseClient.from as any).mockReturnValueOnce(queryBuilder);
}

// Helper to mock database errors
export function mockSupabaseError(table: string, operation: string, error: any) {
  const queryBuilder = mockQueryBuilder();
  
  switch (operation) {
    case 'select':
      queryBuilder.then = vi.fn((callback) => {
        return callback({ data: null, error });
      });
      break;
    case 'insert':
      queryBuilder.insert.mockResolvedValueOnce({
        data: null,
        error,
      });
      break;
    case 'update':
      queryBuilder.update.mockResolvedValueOnce({
        data: null,
        error,
      });
      break;
    case 'delete':
      queryBuilder.delete.mockResolvedValueOnce({
        data: null,
        error,
      });
      break;
    case 'single':
      queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error,
      });
      break;
    default:
      console.warn(`Unknown operation: ${operation}`);
  }
  
  (mockSupabaseClient.from as any).mockReturnValueOnce(queryBuilder);
}

// Helper to mock specific edge function responses
export function mockEdgeFunction(functionName: string, response: any, shouldError = false) {
  if (shouldError) {
    mockEdgeFunctions[functionName as keyof typeof mockEdgeFunctions] = vi.fn().mockRejectedValue(response);
  } else {
    mockEdgeFunctions[functionName as keyof typeof mockEdgeFunctions] = vi.fn().mockResolvedValue(response);
  }
}

// Helper to get call history for debugging
export function getSupabaseMockCalls() {
  return {
    from: (mockSupabaseClient.from as any).mock.calls,
    functions: (mockSupabaseClient.functions!.invoke as any).mock.calls,
    auth: {
      getUser: (mockSupabaseClient.auth!.getUser as any).mock.calls,
      getSession: (mockSupabaseClient.auth!.getSession as any).mock.calls,
    },
  };
}

// Test utilities for common scenarios
export const testUtils = {
  mockListingsQuery: (listings: any[]) => {
    mockSupabaseResponse('full_listing_view', 'select', listings);
  },
  
  mockSellersQuery: (sellers: any[]) => {
    mockSupabaseResponse('sellers', 'select', sellers);
  },
  
  mockReferenceData: (makes: any[], models: any[], bodyTypes: any[]) => {
    mockSupabaseResponse('makes', 'select', makes);
    mockSupabaseResponse('models', 'select', models);
    mockSupabaseResponse('body_types', 'select', bodyTypes);
  },
  
  mockExtractionSession: (sessionData: any) => {
    mockSupabaseResponse('extraction_sessions', 'select', [sessionData]);
  },
};

export default {
  setupSupabaseMocks,
  resetSupabaseMocks,
  mockSupabaseResponse,
  mockSupabaseError,
  mockEdgeFunction,
  getSupabaseMockCalls,
  testUtils,
};