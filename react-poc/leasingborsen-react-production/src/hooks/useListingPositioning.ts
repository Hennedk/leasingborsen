import { useState, useLayoutEffect } from 'react'

/**
 * Hook for managing positioning during forward navigation to listing detail pages
 * Ensures scroll to top happens before content is visible
 */
export function useListingPositioning(id: string | undefined) {
  // Start hidden by default to prevent flash of incorrectly positioned content
  const [isPositioned, setIsPositioned] = useState(false)

  useLayoutEffect(() => {
    if (!id) {
      setIsPositioned(true)
      return
    }

    const html = document.documentElement
    const remove = () => html.classList.remove('instant-nav')

    // Add class to hide scrollbars and disable smooth scroll
    html.classList.add('instant-nav')
    
    // Force layout reflow to ensure DOM is ready
    html.offsetHeight

    // Robust scroll to top with verification and fallback
    const scrollToTop = () => {
      // Initial scroll attempt
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      
      // Force another layout reflow
      document.body.offsetHeight
      
      // Verify scroll happened, add fallback if needed
      if (window.scrollY !== 0) {
        // Fallback: Try alternative scroll methods
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        window.scrollTo(0, 0)
      }
    }

    // Execute scroll immediately
    scrollToTop()

    // Wait for next frame to show content, with additional scroll verification
    requestAnimationFrame(() => {
      // Verify scroll position one more time before showing content
      if (window.scrollY !== 0) {
        scrollToTop()
      }
      
      setIsPositioned(true)
      
      // Remove class after content is visible
      requestAnimationFrame(remove)
    })

    // Cleanup on unmount
    return remove
  }, [id])

  return { isPositioned }
}