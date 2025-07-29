import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest'
import { server } from './mocks/server'
import { setupSupabaseMocks, resetSupabaseMocks } from './mocks/supabase'

// Set VITEST environment variable to ensure proper environment detection
process.env.VITEST = 'true'

// Setup MSW server
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
  resetSupabaseMocks()
})

afterAll(() => {
  server.close()
})

// Setup Supabase mocks
beforeAll(() => {
  setupSupabaseMocks()
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock confirm dialog
global.confirm = vi.fn(() => true)

// Suppress console.log during tests (but allow errors)
const originalConsoleLog = console.log
beforeEach(() => {
  console.log = vi.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
})