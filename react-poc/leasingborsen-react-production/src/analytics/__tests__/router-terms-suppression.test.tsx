import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

import { createMockAnalytics } from './test-utils'

// Mock analytics core and tracking guard
vi.mock('../mp', () => ({ analytics: createMockAnalytics() }))
vi.mock('../trackingGuard', () => ({ trackPVIfNew: vi.fn() }))

// Spy on lease terms apply
const trackLeaseTermsApply = vi.fn()
vi.mock('../../analytics', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    trackLeaseTermsApply: (...args: any[]) => trackLeaseTermsApply(...args),
    newConfigSession: () => '00000000-0000-4000-8000-000000000000',
  }
})

// Mock route tree and router
let subscribed: any = null
vi.mock('../../routeTree.gen', () => ({ routeTree: {} }))
vi.mock('@tanstack/react-router', () => ({
  createRouter: () => ({
    subscribe: (_evt: string, cb: any) => { subscribed = cb; return () => {} },
  }),
  RouterProvider: ({ children }: any) => <>{children}</>,
}))

// Suppress devtools component
vi.mock('@tanstack/react-router-devtools', () => ({ TanStackRouterDevtools: () => null }))

import App from '../../App'

describe('Router suppression: terms-only changes', () => {
beforeEach(async () => {
    vi.clearAllMocks()
    cleanup()
    const { analytics } = await import('../mp')
    ;(analytics.hasConsent as any).mockReturnValue(true)
    // Simulate token available and init
    ;(import.meta as any).env = { VITE_MIXPANEL_TOKEN: 't' }
    Object.defineProperty(window, 'location', {
      value: { pathname: '/listing/abc', search: '' }, writable: true,
    })
  })
  afterEach(() => {
    cleanup()
  })

  it('emits lease_terms_apply and suppresses page_view on km/mdr/udb changes', async () => {
    const { trackPVIfNew } = await import('../trackingGuard')
    render(<App />)

    // First resolved event is skipped internally
    subscribed && subscribed({ hrefChanged: true, pathChanged: true, hashChanged: false, fromLocation: null, toLocation: { pathname: '/listing/abc', searchStr: '', href: '/listing/abc' } })
    // Simulate router resolved event with only search change for km
    const event = {
      hrefChanged: true,
      pathChanged: false,
      hashChanged: false,
      fromLocation: { pathname: '/listing/abc', searchStr: '?km=10000&mdr=36&udb=0' },
      toLocation: { pathname: '/listing/abc', searchStr: '?km=15000&mdr=36&udb=0', href: '/listing/abc?km=15000&mdr=36&udb=0' },
    }
    // Call subscribed callback
    subscribed && subscribed(event)

    // Should have called lease_terms_apply
    expect(trackLeaseTermsApply).toHaveBeenCalledTimes(1)
    // Should not call page view tracking for this navigation
    // Initial mount triggers one call; ensure no additional calls from router suppression
    expect(trackPVIfNew).toHaveBeenCalledTimes(1)
  })
})
