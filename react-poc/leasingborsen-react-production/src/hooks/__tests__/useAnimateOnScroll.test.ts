import { renderHook, act } from '@testing-library/react'
import { useAnimateOnScroll, cleanupGlobalAnimationObserver } from '../useAnimateOnScroll'

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()
let mockCallback: any = null

const createMockIntersectionObserver = (callback: any) => {
  mockCallback = callback
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
    callback
  }
}

beforeEach(() => {
  // Reset mocks
  mockObserve.mockClear()
  mockUnobserve.mockClear()
  mockDisconnect.mockClear()
  mockCallback = null

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => 
    createMockIntersectionObserver(callback)
  ) as any

  // Cleanup any existing global observer
  cleanupGlobalAnimationObserver()
})

afterEach(() => {
  cleanupGlobalAnimationObserver()
})

describe('useAnimateOnScroll', () => {
  it('should return element ref and initial isInView state', () => {
    const { result } = renderHook(() => useAnimateOnScroll())
    
    expect(result.current.elementRef).toBeDefined()
    expect(result.current.elementRef.current).toBeNull()
    expect(result.current.isInView).toBe(false)
  })

  it('should create global IntersectionObserver with default options', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll())
    
    // Mock element ref
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    // Re-render to trigger observer setup
    rerender()

    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.1, rootMargin: '50px' }
    )
  })

  it('should use custom threshold and rootMargin options', () => {
    const options = {
      threshold: 0.5,
      rootMargin: '100px'
    }
    
    renderHook(() => useAnimateOnScroll(options))

    expect(global.IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { threshold: 0.5, rootMargin: '100px' }
    )
  })

  it('should observe element when ref is set', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll())
    
    const mockElement = document.createElement('div')
    
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    // Trigger effect by re-rendering
    rerender()

    expect(mockObserve).toHaveBeenCalledWith(mockElement)
  })

  it('should trigger animation when element enters viewport', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll())
    
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    rerender() // Setup observer

    // Trigger intersection
    act(() => {
      mockCallback([{
        target: mockElement,
        isIntersecting: true
      }])
    })

    expect(result.current.isInView).toBe(true)
  })

  it('should unobserve element after first trigger when triggerOnce is true', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll({ triggerOnce: true }))
    
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    rerender()
    
    act(() => {
      mockCallback([{
        target: mockElement,
        isIntersecting: true
      }])
    })

    expect(result.current.isInView).toBe(true)
    expect(mockUnobserve).toHaveBeenCalledWith(mockElement)
  })

  it('should continue observing when triggerOnce is false', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll({ triggerOnce: false }))
    
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    rerender()
    
    act(() => {
      mockCallback([{
        target: mockElement,
        isIntersecting: true
      }])
    })

    expect(result.current.isInView).toBe(true)
    expect(mockUnobserve).not.toHaveBeenCalled()
  })

  it('should not trigger animation when element is not intersecting', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll())
    
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    rerender()
    
    act(() => {
      mockCallback([{
        target: mockElement,
        isIntersecting: false
      }])
    })

    expect(result.current.isInView).toBe(false)
  })

  it('should cleanup observer on unmount', () => {
    const { result, rerender, unmount } = renderHook(() => useAnimateOnScroll())
    
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    rerender()
    unmount()

    expect(mockUnobserve).toHaveBeenCalledWith(mockElement)
  })

  it('should share global observer instance between multiple hooks', () => {
    const { result: result1, rerender: rerender1 } = renderHook(() => useAnimateOnScroll())
    const { result: result2, rerender: rerender2 } = renderHook(() => useAnimateOnScroll())
    
    const mockElement1 = document.createElement('div')
    const mockElement2 = document.createElement('div')
    
    act(() => {
      result1.current.elementRef.current = mockElement1 as any
      result2.current.elementRef.current = mockElement2 as any
    })

    rerender1()
    rerender2()

    // Should only create one IntersectionObserver instance
    expect(global.IntersectionObserver).toHaveBeenCalledTimes(1)
    expect(mockObserve).toHaveBeenCalledTimes(2)
    expect(mockObserve).toHaveBeenCalledWith(mockElement1)
    expect(mockObserve).toHaveBeenCalledWith(mockElement2)
  })

  it('should cleanup global observer when cleanupGlobalAnimationObserver is called', () => {
    const { result, rerender } = renderHook(() => useAnimateOnScroll())
    
    const mockElement = document.createElement('div')
    act(() => {
      result.current.elementRef.current = mockElement as any
    })

    rerender()
    
    cleanupGlobalAnimationObserver()
    
    expect(mockDisconnect).toHaveBeenCalled()
  })
})