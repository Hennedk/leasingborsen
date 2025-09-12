/**
 * Test Utilities for Analytics Testing
 * 
 * Provides mocks, fixtures, and helper functions for testing analytics functionality
 */

import { vi, type MockedFunction } from 'vitest'
import type { PageViewEvent, PageViewContext } from '../pageview'
import type { Device } from '../mp'

// Mock the entire mixpanel-browser module
export const mockMixpanel = {
  init: vi.fn(),
  track: vi.fn(),
  opt_in_tracking: vi.fn(),
  opt_out_tracking: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  get_config: vi.fn().mockReturnValue('test-token'),
}

// Mock analytics instance
export interface MockAnalytics {
  init: MockedFunction<any>
  grantConsent: MockedFunction<any>
  revokeConsent: MockedFunction<any>
  track: MockedFunction<any>
  getSessionId: MockedFunction<any>
  getDeviceType: MockedFunction<any>
  getPageLoadType: MockedFunction<any>
  getReferrerHost: MockedFunction<any>
  markAsSpaNavigation: MockedFunction<any>
  hasConsent: MockedFunction<any>
  isInitialized: MockedFunction<any>
}

export function createMockAnalytics(): MockAnalytics {
  return {
    init: vi.fn(),
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
    track: vi.fn(),
    getSessionId: vi.fn().mockReturnValue('s_1234567890_abc123'),
    getDeviceType: vi.fn().mockReturnValue('desktop'),
    getPageLoadType: vi.fn().mockReturnValue('cold'),
    getReferrerHost: vi.fn().mockReturnValue(undefined),
    markAsSpaNavigation: vi.fn(),
    hasConsent: vi.fn().mockReturnValue(true),
    isInitialized: vi.fn().mockReturnValue(true),
  }
}

// Test fixtures for common scenarios
export const testFixtures = {
  // Basic session ID
  sessionId: 's_1704067200_abc123',
  resultsSessionId: 'rs_1704067300_def456',
  
  // Device types
  devices: ['desktop', 'mobile', 'tablet'] as const,
  
  // Page load types
  pageLoadTypes: ['cold', 'warm', 'bfcache', 'spa'] as const,
  
  // Common query parameters
  queries: {
    empty: {},
    simple: { make: 'BMW', fuel_type: 'ev' },
    complex: { make: 'BMW', fuel_type: 'ev', price_max: 5000, sort: 'score_desc' },
    reordered: { fuel_type: 'ev', make: 'BMW', sort: 'score_desc', price_max: 5000 },
    withNulls: { make: 'BMW', fuel_type: null, price_max: undefined },
  },
  
  // Base page view event
  basePageView: {
    schema_version: '1',
    session_id: 's_1704067200_abc123',
    device_type: 'desktop',
    page_load_type: 'cold',
  } as const,
  
  // Page view contexts for different page types
  contexts: {
    home: {
      path: '/',
      pageType: 'home' as const,
      pageName: 'Homepage',
    },
    
    results: {
      path: '/listings',
      pageType: 'results' as const,
      pageName: 'Results',
      query: { make: 'BMW', fuel_type: 'ev', price_max: 5000 },
      resultsCount: 24,
      filters: { make: 'BMW', fuel_type: 'ev', price_max: 5000 },
      latency: 450,
    },
    
    listingDetail: {
      path: '/listing/abc-123-def-456',
      pageType: 'listing_detail' as const,
      pageName: 'Listing Detail',
      listingId: 'abc-123-def-456',
      leaseScore: 85,
      priceMonthly: 4200,
      mileage: 15000,
      termMonths: 36,
      fuelType: 'ev',
      entryMethod: 'internal_grid_click' as const,
    },
  } satisfies Record<string, PageViewContext>,
}

// Helper functions for testing
export const testHelpers = {
  /**
   * Create a timestamp for testing session TTL
   */
  createTimestamp: (minutesAgo = 0) => Date.now() - (minutesAgo * 60 * 1000),
  
  /**
   * Create a valid PageView event for testing
   */
  createPageViewEvent: (overrides: Partial<PageViewEvent> = {}): PageViewEvent => ({
    schema_version: '1',
    session_id: 's_1704067200_abc123',
    device_type: 'desktop',
    page_type: 'home',
    path: '/',
    page_load_type: 'cold',
    ...overrides,
  }),
  
  /**
   * Advance time for testing TTL and de-duplication
   * Updated to advance both timers AND system time for Date.now()
   */
  advanceTime: (ms: number) => {
    vi.advanceTimersByTime(ms)
    // Also advance system time so Date.now() returns the advanced time
    const currentTime = Date.now()
    vi.setSystemTime(currentTime + ms)
  },
  
  /**
   * Setup localStorage mock
   */
  mockLocalStorage: () => {
    const store: Record<string, string> = {}
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key]
        }),
        clear: vi.fn(() => {
          Object.keys(store).forEach(key => delete store[key])
        }),
        length: 0,
        key: vi.fn(),
      },
      writable: true,
    })
    
    return store
  },
  
  /**
   * Mock window.performance API
   */
  mockPerformance: (overrides: Partial<Performance> = {}) => {
    const mockPerformance = {
      timing: {
        navigationStart: Date.now() - 2000,
        loadEventEnd: Date.now() - 1000,
        domainLookupStart: Date.now() - 1800,
        domainLookupEnd: Date.now() - 1700,
      },
      getEntriesByType: vi.fn((type: string) => {
        if (type === 'navigation') {
          return [{
            type: 'navigate',
            domainLookupStart: Date.now() - 1800,
            domainLookupEnd: Date.now() - 1700,
          }]
        }
        return []
      }),
      ...overrides,
    }
    
    Object.defineProperty(window, 'performance', {
      value: mockPerformance,
      writable: true,
    })
    
    return mockPerformance
  },
  
  /**
   * Create a valid UUID for testing
   */
  createUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  
  /**
   * Freeze time for consistent testing
   */
  freezeTime: (timestamp = Date.now()) => {
    vi.setSystemTime(timestamp)
    return timestamp
  },
  
  /**
   * Assert that a function was called with specific analytics event
   */
  expectAnalyticsCall: (mockFn: MockedFunction<any>, eventName: string, properties?: Partial<PageViewEvent>) => {
    expect(mockFn).toHaveBeenCalledWith(eventName, properties ? expect.objectContaining(properties) : expect.any(Object))
  },
  
  /**
   * Get the last call arguments from a mock function
   */
  getLastCall: (mockFn: MockedFunction<any>) => {
    const calls = mockFn.mock.calls
    return calls.length > 0 ? calls[calls.length - 1] : null
  },
  
  /**
   * Assert no analytics calls were made
   */
  expectNoAnalyticsCalls: (mockFn: MockedFunction<any>) => {
    expect(mockFn).not.toHaveBeenCalled()
  },
}

// Common test setup and teardown
export const testSetup = {
  /**
   * Setup common mocks before each test
   */
  beforeEach: () => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    testHelpers.mockLocalStorage()
    testHelpers.mockPerformance()
    testHelpers.freezeTime()
  },
  
  /**
   * Cleanup after each test
   */
  afterEach: () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  },
}

// Mock implementations
export const mocks = {
  /**
   * Mock the entire analytics module
   */
  analyticsModule: () => ({
    analytics: createMockAnalytics(),
    trackPageView: vi.fn(),
    resetResultsSession: vi.fn(),
  }),
  
  /**
   * Mock TanStack Router
   */
  router: () => ({
    navigate: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    state: {
      location: {
        pathname: '/',
        search: '',
      },
    },
  }),
  
  /**
   * Mock pageshow event
   */
  pageshowEvent: (persisted = false) => ({
    type: 'pageshow',
    persisted,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
}