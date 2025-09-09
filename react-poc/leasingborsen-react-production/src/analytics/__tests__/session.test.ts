/**
 * Tests for session-based tracking utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { hasSentInitialPV, markInitialPV, resetInitialPV } from '../session'

// Mock sessionStorage
const createMockSessionStorage = () => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() { return store },
    set store(newStore: Record<string, string>) { store = newStore },
    length: 0,
    key: vi.fn()
  }
}

const mockSessionStorage = createMockSessionStorage()

// Mock window object
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

describe('Session tracking utilities', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    mockSessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset after each test (no need to call resetInitialPV as clear() handles it)
    mockSessionStorage.clear()
  })

  describe('hasSentInitialPV', () => {
    it('should return false when no value is stored', () => {
      expect(hasSentInitialPV()).toBe(false)
    })

    it('should return true when value is stored as "1"', () => {
      mockSessionStorage.setItem('analytics.initialPageviewSent', '1')
      expect(hasSentInitialPV()).toBe(true)
    })

    it('should return false when value is stored but not "1"', () => {
      mockSessionStorage.setItem('analytics.initialPageviewSent', '0')
      expect(hasSentInitialPV()).toBe(false)
    })

    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage not available')
      })
      
      expect(() => hasSentInitialPV()).not.toThrow()
      expect(hasSentInitialPV()).toBe(false)
    })
  })

  describe('markInitialPV', () => {
    it('should set the flag to "1"', () => {
      markInitialPV()
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'analytics.initialPageviewSent',
        '1'
      )
    })

    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      expect(() => markInitialPV()).not.toThrow()
    })
  })

  describe('resetInitialPV', () => {
    it('should remove the flag from storage', () => {
      // First set the flag
      markInitialPV()
      expect(hasSentInitialPV()).toBe(true)
      
      // Then reset it
      resetInitialPV()
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'analytics.initialPageviewSent'
      )
    })

    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage not available')
      })
      
      expect(() => resetInitialPV()).not.toThrow()
    })
  })

  describe('Integration test - typical usage pattern', () => {
    it('should work as expected for initial load scenario', () => {
      // Simulate initial app load
      expect(hasSentInitialPV()).toBe(false) // No previous pageview
      
      // Track initial pageview
      if (!hasSentInitialPV()) {
        // trackInitialPageView() would be called here
        markInitialPV()
      }
      
      expect(hasSentInitialPV()).toBe(true) // Now marked as sent
      
      // Simulate router onLoad event arriving after our manual call
      if (!hasSentInitialPV()) {
        // This should not execute since we already marked it
        throw new Error('This should not happen - duplicate pageview would be sent')
      }
      
      // If we reach here, the duplicate was successfully prevented
      expect(true).toBe(true)
    })

    it('should work for router-first scenario (edge case)', () => {
      // Edge case: router onLoad fires before our manual tracking
      expect(hasSentInitialPV()).toBe(false)
      
      // Router onLoad handler
      if (!hasSentInitialPV()) {
        markInitialPV()
        // return early without tracking
      }
      
      expect(hasSentInitialPV()).toBe(true)
      
      // Manual initial tracking (comes later)
      if (!hasSentInitialPV()) {
        // This should not execute
        throw new Error('This should not happen - duplicate pageview would be sent')
      }
      
      // Successfully prevented duplicate
      expect(true).toBe(true)
    })
  })
})