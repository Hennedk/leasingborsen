import { renderHook, act } from '@testing-library/react'

// Mutable mock location
let mockPathname = '/listing/abc'
let mockState: any = {}

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: mockPathname, state: mockState }),
}))

import { useListingDetailScrollRestoration } from '../useListingDetailScrollRestoration'

describe('useListingDetailScrollRestoration', () => {
  let originalRAF: any
  let originalGetEntriesByType: any
  let scrollYInternal = 0

  beforeAll(() => {
    // Mock scrollY and scrollTo
    Object.defineProperty(window, 'scrollY', {
      get: () => scrollYInternal,
      configurable: true,
    })
    // @ts-ignore
    window.scrollTo = vi.fn((x: number, y: number) => { scrollYInternal = y })
  })

  beforeEach(() => {
    sessionStorage.clear()
    mockPathname = '/listing/abc'
    mockState = {}
    scrollYInternal = 0
    vi.useFakeTimers()

    // Mock requestAnimationFrame to run immediately
    originalRAF = global.requestAnimationFrame
    global.requestAnimationFrame = (cb: FrameRequestCallback): any => {
      cb(16 as any)
      return 1
    }

    // Mock performance.getEntriesByType
    originalGetEntriesByType = performance.getEntriesByType
    performance.getEntriesByType = vi.fn(() => [{ type: 'navigate' } as any]) as any
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    global.requestAnimationFrame = originalRAF
    // @ts-ignore
    performance.getEntriesByType = originalGetEntriesByType
  })

  it('scrolls to top on forward navigation and clears key', () => {
    const { unmount } = renderHook(() => useListingDetailScrollRestoration('abc', true))
    // Forward nav: should scroll to 0
    expect(window.scrollTo).toHaveBeenCalled()
    expect(scrollYInternal).toBe(0)
    // No key should remain for id when none existed
    expect(sessionStorage.getItem('detail-scroll:abc')).toBeNull()
    unmount()
  })

  it('restores saved position on back-like navigation', () => {
    const now = Date.now()
    sessionStorage.setItem('detail-scroll:abc', JSON.stringify({ position: 300, timestamp: now, version: 1 }))
    ;(performance.getEntriesByType as any) = vi.fn(() => [{ type: 'back_forward' }])

    renderHook(() => useListingDetailScrollRestoration('abc', true))

    // rAF runs immediately; debounce clear runs via timers
    expect(window.scrollTo).toHaveBeenCalled()
    expect(scrollYInternal).toBe(300)
  })

  it('saves on scroll with debounce', () => {
    renderHook(() => useListingDetailScrollRestoration('abc', true))
    act(() => {
      scrollYInternal = 150
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(220)
    })
    const raw = sessionStorage.getItem('detail-scroll:abc')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw || '{}')
    expect(parsed.position).toBe(150)
  })
})

