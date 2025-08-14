import { useEffect, useState, useRef, type RefObject } from 'react'

export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false
  }: IntersectionObserverInit & { freezeOnceVisible?: boolean } = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry>()
  const frozen = useRef(false)

  const updateEntry = ([entry]: IntersectionObserverEntry[]): void => {
    if (frozen.current && freezeOnceVisible) return
    setEntry(entry)
    if (entry.isIntersecting && freezeOnceVisible) {
      frozen.current = true
    }
  }

  useEffect(() => {
    const node = elementRef?.current
    if (!node || frozen.current) return

    const observer = new IntersectionObserver(updateEntry, {
      threshold,
      root,
      rootMargin,
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin, freezeOnceVisible])

  return entry
}