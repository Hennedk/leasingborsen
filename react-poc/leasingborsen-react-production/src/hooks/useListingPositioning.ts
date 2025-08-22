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

    // Add class and scroll before paint - this makes scroll invisible
    html.classList.add('instant-nav')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    // Wait for next frame to show content, then another to remove class
    requestAnimationFrame(() => {
      setIsPositioned(true)
      requestAnimationFrame(remove)
    })

    // Cleanup on unmount
    return remove
  }, [id])

  return { isPositioned }
}