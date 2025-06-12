import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  rootMargin?: string
  threshold?: number
  enabled?: boolean
}

/**
 * Custom hook for infinite scroll using Intersection Observer
 * Automatically loads more content when user scrolls near the bottom
 */
export function useInfiniteScroll({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '100px',
  threshold = 0.1,
  enabled = true
}: UseInfiniteScrollOptions) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (
        target.isIntersecting && 
        hasNextPage && 
        !isFetchingNextPage && 
        enabled
      ) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage, enabled]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element || !enabled) return

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin,
      threshold,
    })

    observer.observe(element)

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [handleObserver, rootMargin, threshold, enabled])

  return { loadMoreRef }
}

/**
 * Hook for manual load more button functionality
 * Provides button state and click handler
 */
export function useLoadMore({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  enabled = true
}: Omit<UseInfiniteScrollOptions, 'rootMargin' | 'threshold'>) {
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && enabled) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, enabled])

  return {
    handleLoadMore,
    canLoadMore: hasNextPage && !isFetchingNextPage && enabled,
    isLoading: isFetchingNextPage
  }
}