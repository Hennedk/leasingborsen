# Detailed Execution Plan for Weeks 1-2 Implementation

## Overview
This is a step-by-step execution guide for Sonnet to implement the environment setup and testing infrastructure over the next two weeks. Each step includes exact commands, file contents, and verification steps.

---

## Week 1: Immediate Safety - Environment Isolation

### Day 1-2: Supabase Branching Setup

#### Step 1: Install and Configure Supabase CLI
```bash
# 1.1 Install Supabase CLI globally
npm install -g supabase@latest

# 1.2 Verify installation
supabase --version
# Expected: supabase version X.X.X

# 1.3 Login to Supabase (will open browser)
supabase login

# 1.4 Navigate to project root
cd /home/hennedk/projects/leasingborsen/react-poc/leasingborsen-react-production
```

#### Step 2: Initialize Supabase in Project
```bash
# 2.1 Initialize Supabase (creates supabase/ directory)
supabase init

# 2.2 Get your project ref from .env or Supabase dashboard
# Look for the URL: https://[PROJECT-REF].supabase.co

# 2.3 Link to your existing project
supabase link --project-ref [YOUR-PROJECT-REF]
# When prompted, use the database password from your Supabase dashboard
```

#### Step 3: Create Database Branches
```bash
# 3.1 Create testing branch for test suite
supabase db branch create testing
# Note the branch URL and anon key displayed

# 3.2 Create staging branch for preview deployments  
supabase db branch create staging
# Note the branch URL and anon key displayed

# 3.3 List branches to verify
supabase db branch list
# Should show: main, testing, staging
```

#### Step 4: Create Environment Files
Create `.env.test`:
```bash
# Testing environment (for Vitest)
VITE_SUPABASE_TEST_URL=https://[PROJECT-REF]-testing.supabase.co
VITE_SUPABASE_TEST_ANON_KEY=[TESTING-BRANCH-ANON-KEY]
VITEST=true
```

Create `.env.staging`:
```bash
# Staging environment (for Vercel preview)
VITE_SUPABASE_STAGING_URL=https://[PROJECT-REF]-staging.supabase.co
VITE_SUPABASE_STAGING_ANON_KEY=[STAGING-BRANCH-ANON-KEY]
```

Update `.gitignore`:
```
# Environment files
.env.local
.env.test
.env.staging
.env.production
```

### Day 3-4: Environment Configuration Implementation

#### Step 5: Create Environment Configuration System

Create `src/config/environments.ts`:
```typescript
export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
  features: {
    aiExtractionEnabled: boolean;
    debugMode: boolean;
  };
  name: 'local' | 'test' | 'staging' | 'production';
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV;
  const isTest = process.env.VITEST === 'true';
  
  // Testing environment (for test suite)
  if (isTest) {
    return {
      name: 'test',
      supabase: {
        url: process.env.VITE_SUPABASE_TEST_URL!,
        anonKey: process.env.VITE_SUPABASE_TEST_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: false, // Use mocks in tests
        debugMode: true,
      },
    };
  }
  
  // Local development
  if (env === 'development' && !process.env.VERCEL) {
    return {
      name: 'local',
      supabase: {
        url: process.env.VITE_SUPABASE_LOCAL_URL || 
             process.env.VITE_SUPABASE_URL!, // Fallback to prod for now
        anonKey: process.env.VITE_SUPABASE_LOCAL_ANON_KEY || 
                 process.env.VITE_SUPABASE_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: true,
        debugMode: true,
      },
    };
  }
  
  // Vercel preview deployments
  if (process.env.VERCEL_ENV === 'preview') {
    return {
      name: 'staging',
      supabase: {
        url: process.env.VITE_SUPABASE_STAGING_URL!,
        anonKey: process.env.VITE_SUPABASE_STAGING_ANON_KEY!,
      },
      features: {
        aiExtractionEnabled: true,
        debugMode: true,
      },
    };
  }
  
  // Production
  return {
    name: 'production',
    supabase: {
      url: process.env.VITE_SUPABASE_URL!,
      anonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    },
    features: {
      aiExtractionEnabled: true,
      debugMode: false,
    },
  };
};

// Helper to get current environment name
export const getCurrentEnvironment = (): string => {
  return getEnvironmentConfig().name;
};

// Helper to check if in production
export const isProduction = (): boolean => {
  return getEnvironmentConfig().name === 'production';
};
```

#### Step 6: Update Supabase Client to Use Environment Config

Update `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { getEnvironmentConfig } from '@/config/environments'

const config = getEnvironmentConfig();

// Show current environment in development
if (config.features.debugMode) {
  console.log(`🔧 Supabase Environment: ${config.name}`);
  console.log(`📍 Supabase URL: ${config.supabase.url}`);
}

export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey
)
```

### Day 5: Safety Utilities Implementation

#### Step 7: Create Environment Safety Guards

Create `src/utils/environment-safety.ts`:
```typescript
import { getEnvironmentConfig, isProduction } from '@/config/environments';

export class EnvironmentSafety {
  /**
   * Prevents dangerous operations in production
   */
  static assertNonProduction(operation?: string) {
    if (isProduction()) {
      const message = operation 
        ? `Operation "${operation}" is not allowed in production environment`
        : 'This operation is not allowed in production environment';
      throw new Error(message);
    }
  }
  
  /**
   * Ensures test dealers are used in test operations
   */
  static assertTestDealer(dealerId: string) {
    const config = getEnvironmentConfig();
    
    // Only enforce in production
    if (config.name !== 'production') return;
    
    if (!dealerId.startsWith('TEST_')) {
      throw new Error(
        `Only TEST_ prefixed dealers allowed in test operations. Got: ${dealerId}`
      );
    }
  }
  
  /**
   * Wraps dangerous operations with safety checks
   */
  static wrapDangerousOperation<T extends (...args: any[]) => any>(
    fn: T,
    operationName: string
  ): T {
    return ((...args: Parameters<T>) => {
      this.assertNonProduction(operationName);
      
      const config = getEnvironmentConfig();
      if (config.features.debugMode) {
        console.warn(`⚠️  Dangerous operation: ${operationName}`);
        console.warn(`📍 Environment: ${config.name}`);
      }
      
      return fn(...args);
    }) as T;
  }
  
  /**
   * Checks if we're in a safe testing environment
   */
  static isSafeTestEnvironment(): boolean {
    const config = getEnvironmentConfig();
    return config.name === 'test' || config.name === 'local';
  }
  
  /**
   * Gets safe test dealer ID
   */
  static getTestDealerId(baseName: string): string {
    return this.isSafeTestEnvironment() 
      ? `TEST_${baseName}_${Date.now()}`
      : `TEST_${baseName}`;
  }
}
```

#### Step 8: Add Safety Checks to Critical Operations

Update `src/services/extraction/apply-changes.ts` (or equivalent):
```typescript
import { EnvironmentSafety } from '@/utils/environment-safety';

// Wrap dangerous operations
export const applyExtractionChanges = EnvironmentSafety.wrapDangerousOperation(
  async (sessionId: string, changeIds: string[]) => {
    // Existing apply logic
  },
  'Apply Extraction Changes'
);

// Add to bulk operations
export const bulkDeleteListings = EnvironmentSafety.wrapDangerousOperation(
  async (listingIds: string[]) => {
    // Deletion logic
  },
  'Bulk Delete Listings'
);
```

#### Step 9: Verify Environment Setup

Create `scripts/verify-environment.ts`:
```typescript
import { getEnvironmentConfig } from '../src/config/environments';
import { createClient } from '@supabase/supabase-js';

async function verifyEnvironment() {
  console.log('🔍 Verifying environment setup...\n');
  
  const config = getEnvironmentConfig();
  
  console.log(`Current Environment: ${config.name}`);
  console.log(`Supabase URL: ${config.supabase.url}`);
  console.log(`Debug Mode: ${config.features.debugMode}`);
  console.log(`AI Extraction: ${config.features.aiExtractionEnabled}\n`);
  
  // Test connection
  try {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );
    
    const { count, error } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });
      
    if (error) throw error;
    
    console.log(`✅ Connected successfully!`);
    console.log(`📊 Found ${count} sellers in database\n`);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

verifyEnvironment();
```

Run verification:
```bash
npx tsx scripts/verify-environment.ts
```

---

## Week 2: Testing Infrastructure

### Day 1-2: Vitest Setup and Configuration

#### Step 10: Install Testing Dependencies
```bash
# Core testing framework
npm install -D vitest @vitest/ui @vitest/coverage-v8

# React testing utilities
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# Mocking utilities
npm install -D msw @mswjs/data

# Types
npm install -D @types/node
```

#### Step 11: Create Vitest Configuration

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: {
      // Load test environment by default
      VITEST: 'true',
    },
    envFiles: ['.env.test'], // Load test env file
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockServiceWorker.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Step 12: Create Test Setup File

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Suppress console errors in tests (optional)
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render')
  ) {
    return;
  }
  originalError.call(console, ...args);
};
```

### Day 3-4: Mock Infrastructure

#### Step 13: Create Supabase Mock System

Create `src/test/mocks/supabase.ts`:
```typescript
import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock response builders
export const mockQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
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
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn(),
});

// Mock Supabase client
export const mockSupabaseClient: Partial<SupabaseClient> = {
  from: vi.fn(() => mockQueryBuilder()),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  auth: {
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user-id' } }, 
      error: null 
    }),
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    }),
  } as any,
};

// Mock Edge Functions
export const mockEdgeFunctions = {
  'pdf-proxy': vi.fn().mockResolvedValue({
    blob: () => Promise.resolve(new Blob(['mock pdf content'])),
  }),
  'ai-extract-vehicles': vi.fn().mockResolvedValue({
    vehicles: [],
    cost_estimate: 0.05,
    processing_time_ms: 1000,
  }),
  'compare-extracted-listings': vi.fn().mockResolvedValue({
    changes: [],
    session_id: 'mock-session-id',
  }),
  'apply-extraction-changes': vi.fn().mockResolvedValue({
    applied: { created: 0, updated: 0, deleted: 0 },
    errors: [],
    sessionStatus: 'completed',
  }),
};

// Setup function to configure mocks
export function setupSupabaseMocks() {
  // Mock the createClient function
  vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabaseClient),
  }));
  
  // Configure Edge Function responses
  (mockSupabaseClient.functions!.invoke as any).mockImplementation(
    async (functionName: string, options?: any) => {
      const handler = mockEdgeFunctions[functionName as keyof typeof mockEdgeFunctions];
      if (!handler) {
        throw new Error(`Unhandled edge function: ${functionName}`);
      }
      
      const data = await handler(options?.body);
      return { data, error: null };
    }
  );
}

// Helper to reset all mocks
export function resetSupabaseMocks() {
  vi.clearAllMocks();
}

// Helper to set up specific mock responses
export function mockSupabaseResponse(table: string, operation: string, response: any) {
  const queryBuilder = mockQueryBuilder();
  
  if (operation === 'select') {
    queryBuilder.then = vi.fn((callback) => {
      return callback({ data: response, error: null });
    });
  } else {
    (queryBuilder as any)[operation].mockResolvedValueOnce({
      data: response,
      error: null,
    });
  }
  
  (mockSupabaseClient.from as any).mockReturnValueOnce(queryBuilder);
}
```

#### Step 14: Create Mock Service Worker Setup

Create `src/test/mocks/handlers.ts`:
```typescript
import { http, HttpResponse } from 'msw';

// Define handlers for external APIs
export const handlers = [
  // Mock PDF download
  http.get('https://vw-dealer.dk/catalogs/*', () => {
    return new HttpResponse('Mock PDF content', {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  }),

  // Mock any external API calls
  http.post('https://api.openai.com/v1/completions', () => {
    return HttpResponse.json({
      choices: [{
        text: JSON.stringify({
          vehicles: [{
            make: 'Volkswagen',
            model: 'ID.4',
            variant: 'GTX',
            monthly_price: 4999,
          }],
        }),
      }],
    });
  }),
];
```

Create `src/test/mocks/server.ts`:
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Day 5: Test Data Factories

#### Step 15: Create Test Data Factories

Create `src/test/factories/dealers.ts`:
```typescript
export const dealerFactory = {
  volkswagen: (overrides = {}) => ({
    id: 'test-vw-dealer-' + Date.now(),
    name: 'TEST_Volkswagen_Denmark',
    email: 'test@vw.dk',
    phone: '+45 12345678',
    address: 'Test Street 123',
    city: 'Copenhagen',
    postal_code: '1000',
    config: {
      pdf_url: 'https://vw-dealer.dk/catalogs/latest.pdf',
      patterns: {
        model: /(?:Golf|Passat|Tiguan|Polo|ID\.\d)/,
        variant: /(TSI|TDI|GTI|GTX|R-Line)/,
        price: /(\d{1,3}[.,]?\d{3})\s*kr/,
      },
    },
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  toyota: (overrides = {}) => ({
    id: 'test-toyota-dealer-' + Date.now(),
    name: 'TEST_Toyota_Denmark',
    email: 'test@toyota.dk',
    phone: '+45 87654321',
    address: 'Test Avenue 456',
    city: 'Aarhus',
    postal_code: '8000',
    config: {
      pdf_url: 'https://toyota-dealer.dk/prisliste.pdf',
      transmission_handling: 'separate_field',
      patterns: {
        variant_cleanup: /\s*(Automatik|Manuel|aut\.)$/,
      },
    },
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  ford: (overrides = {}) => ({
    id: 'test-ford-dealer-' + Date.now(),
    name: 'TEST_Ford_Denmark',
    email: 'test@ford.dk',
    config: {
      merpris_handling: true,
    },
    created_at: new Date().toISOString(),
    ...overrides,
  }),
};
```

Create `src/test/factories/vehicles.ts`:
```typescript
import { faker } from '@faker-js/faker';

export const vehicleFactory = {
  // VW ID.4 with multiple offers
  vwId4: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: 'test-vw-dealer',
    make: 'Volkswagen',
    model: 'ID.4',
    variant: 'GTX Performance',
    year: 2024,
    fuel_type: 'electric',
    transmission: 'automatic',
    body_type: 'suv',
    retail_price: 475000,
    monthly_price: 4999,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    offers: [
      {
        monthly_price: 4999,
        period_months: 36,
        mileage_per_year: 15000,
        first_payment: 35000,
      },
      {
        monthly_price: 5499,
        period_months: 24,
        mileage_per_year: 20000,
        first_payment: 35000,
      },
    ],
    ...overrides,
  }),
  
  // Toyota with transmission variants
  toyotaAygo: {
    manual: (overrides = {}) => ({
      id: faker.string.uuid(),
      dealer_id: 'test-toyota-dealer',
      make: 'Toyota',
      model: 'Aygo X',
      variant: 'Active 72 HK',
      year: 2024,
      fuel_type: 'petrol',
      transmission: 'manual',
      tr: 2, // Manual code
      body_type: 'hatchback',
      monthly_price: 2195,
      status: 'active',
      created_at: new Date().toISOString(),
      ...overrides,
    }),
    
    automatic: (overrides = {}) => ({
      id: faker.string.uuid(),
      dealer_id: 'test-toyota-dealer',
      make: 'Toyota',
      model: 'Aygo X',
      variant: 'Active 72 HK', // Same variant name
      year: 2024,
      fuel_type: 'petrol',
      transmission: 'automatic',
      tr: 1, // Automatic code
      body_type: 'hatchback',
      monthly_price: 2395,
      status: 'active',
      created_at: new Date().toISOString(),
      ...overrides,
    }),
  },
  
  // Ford with merpris
  fordFiesta: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: 'test-ford-dealer',
    make: 'Ford',
    model: 'Fiesta',
    variant: 'Active',
    year: 2024,
    monthly_price: 2495,
    base_mileage: 10000,
    offers: [
      {
        monthly_price: 2495,
        mileage_per_year: 10000,
        period_months: 36,
      },
    ],
    merpris_options: [
      { mileage: 15000, supplement: 200 },
      { mileage: 20000, supplement: 400 },
    ],
    ...overrides,
  }),
  
  // Generic vehicle generator
  generic: (overrides = {}) => ({
    id: faker.string.uuid(),
    dealer_id: faker.string.uuid(),
    make: faker.helpers.arrayElement(['Volkswagen', 'Toyota', 'Ford', 'BMW']),
    model: faker.vehicle.model(),
    variant: faker.helpers.arrayElement(['Base', 'Sport', 'Luxury']),
    year: faker.number.int({ min: 2020, max: 2024 }),
    fuel_type: faker.helpers.arrayElement(['petrol', 'diesel', 'electric', 'hybrid']),
    transmission: faker.helpers.arrayElement(['manual', 'automatic']),
    monthly_price: faker.number.int({ min: 2000, max: 8000 }),
    status: 'active',
    created_at: faker.date.past().toISOString(),
    ...overrides,
  }),
};
```

Create `src/test/factories/extraction.ts`:
```typescript
export const extractionFactory = {
  session: (overrides = {}) => ({
    id: 'test-session-' + Date.now(),
    dealer_id: 'test-vw-dealer',
    file_name: 'test-catalog.pdf',
    status: 'completed',
    vehicle_count: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  }),
  
  change: {
    create: (overrides = {}) => ({
      id: 'change-create-' + Date.now(),
      session_id: 'test-session',
      change_type: 'CREATE',
      extracted_data: vehicleFactory.vwId4(),
      confidence_score: 0.95,
      status: 'pending',
      ...overrides,
    }),
    
    update: (existing: any, changes: any, overrides = {}) => ({
      id: 'change-update-' + Date.now(),
      session_id: 'test-session',
      change_type: 'UPDATE',
      listing_id: existing.id,
      current_data: existing,
      extracted_data: { ...existing, ...changes },
      changes: Object.keys(changes).reduce((acc, key) => ({
        ...acc,
        [key]: {
          old: existing[key],
          new: changes[key],
        },
      }), {}),
      confidence_score: 0.90,
      status: 'pending',
      ...overrides,
    }),
    
    delete: (existing: any, overrides = {}) => ({
      id: 'change-delete-' + Date.now(),
      session_id: 'test-session',
      change_type: 'DELETE',
      listing_id: existing.id,
      current_data: existing,
      extracted_data: existing, // Copy for UI display
      confidence_score: 0.85,
      status: 'pending',
      ...overrides,
    }),
  },
};
```

#### Step 16: Create First Test

Create `src/services/comparison/__tests__/comparison-engine.test.ts`:
```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { setupSupabaseMocks, resetSupabaseMocks } from '@/test/mocks/supabase';
import { vehicleFactory } from '@/test/factories/vehicles';
import { extractionFactory } from '@/test/factories/extraction';

// Mock the comparison logic (create this based on your actual implementation)
const compareListings = (existing: any[], extracted: any[]) => {
  // Simplified comparison logic for testing
  const changes: any[] = [];
  
  // Find updates and deletes
  existing.forEach(existingItem => {
    const match = extracted.find(e => 
      e.model === existingItem.model && e.variant === existingItem.variant
    );
    
    if (!match) {
      changes.push(extractionFactory.change.delete(existingItem));
    } else if (match.monthly_price !== existingItem.monthly_price) {
      changes.push(extractionFactory.change.update(
        existingItem,
        { monthly_price: match.monthly_price }
      ));
    }
  });
  
  // Find creates
  extracted.forEach(extractedItem => {
    const exists = existing.some(e => 
      e.model === extractedItem.model && e.variant === extractedItem.variant
    );
    
    if (!exists) {
      changes.push(extractionFactory.change.create({
        extracted_data: extractedItem,
      }));
    }
  });
  
  return changes;
};

describe('Comparison Engine - Critical Business Logic', () => {
  beforeEach(() => {
    setupSupabaseMocks();
  });
  
  afterEach(() => {
    resetSupabaseMocks();
  });
  
  describe('Change Detection Accuracy', () => {
    test('should not create false updates for identical data', () => {
      const existing = [vehicleFactory.vwId4()];
      const extracted = [{ ...existing[0] }]; // Identical copy
      
      const changes = compareListings(existing, extracted);
      
      expect(changes).toHaveLength(0);
    });
    
    test('should detect real price changes accurately', () => {
      const existing = vehicleFactory.vwId4({ monthly_price: 4999 });
      const extracted = { ...existing, monthly_price: 5499 };
      
      const changes = compareListings([existing], [extracted]);
      
      expect(changes).toHaveLength(1);
      expect(changes[0].change_type).toBe('UPDATE');
      expect(changes[0].changes.monthly_price).toEqual({
        old: 4999,
        new: 5499,
      });
    });
    
    test('should handle CREATE + UPDATE + DELETE in same batch', () => {
      const existing = [
        vehicleFactory.generic({ model: 'Golf', variant: 'GTI' }),
        vehicleFactory.generic({ model: 'Passat', variant: 'Elegance' }),
        vehicleFactory.generic({ model: 'Tiguan', variant: 'R-Line' }),
      ];
      
      const extracted = [
        { ...existing[0], monthly_price: 3999 }, // UPDATE
        vehicleFactory.generic({ model: 'ID.5', variant: 'GTX' }), // CREATE
        // Passat missing = DELETE
        existing[2], // Tiguan NO CHANGE
      ];
      
      const changes = compareListings(existing, extracted);
      
      const updates = changes.filter(c => c.change_type === 'UPDATE');
      const creates = changes.filter(c => c.change_type === 'CREATE');
      const deletes = changes.filter(c => c.change_type === 'DELETE');
      
      expect(updates).toHaveLength(1);
      expect(creates).toHaveLength(1);
      expect(deletes).toHaveLength(1);
      expect(changes).toHaveLength(3);
    });
  });
});
```

#### Step 17: Update package.json Scripts

Add test scripts to `package.json`:
```json
{
  "scripts": {
    // ... existing scripts
    
    // Testing
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    
    // Environment verification
    "env:check": "tsx scripts/verify-environment.ts",
    
    // Development with proper env
    "dev:safe": "VITE_USE_LOCAL_SUPABASE=true vite"
  }
}
```

#### Step 18: Run Tests to Verify Setup

```bash
# Run the test we created
npm test comparison-engine

# Open test UI
npm run test:ui

# Check coverage
npm run test:coverage
```

---

## Verification Checklist

### Week 1 Completion
- [ ] Supabase CLI installed and configured
- [ ] Testing and staging branches created
- [ ] Environment configuration system implemented
- [ ] Safety utilities protecting production
- [ ] All environment files created (.env.test, .env.staging)
- [ ] Verify script confirms proper setup

### Week 2 Completion  
- [ ] Vitest installed and configured
- [ ] Test setup with React Testing Library
- [ ] Supabase mocking system operational
- [ ] Test data factories created
- [ ] First comparison engine test passing
- [ ] Coverage reporting working

### Next Steps
After completing Week 1-2:
1. Begin writing tests for comparison logic (Week 3)
2. Add application engine tests (Week 3)
3. Set up local Supabase with Docker (Week 4)
4. Configure CI/CD pipeline (Week 5)

This detailed plan provides Sonnet with exact steps to implement the testing infrastructure while maintaining safety from production data.