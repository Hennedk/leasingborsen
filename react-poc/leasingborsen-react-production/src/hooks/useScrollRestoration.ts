import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }
}

export function useScrollRestoration(key: string) {
  const location = useLocation()
  
  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = debounce(() => {
      sessionStorage.setItem(`scroll-${key}`, String(window.scrollY))
    }, 100)
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [key])
  
  // Restore scroll position on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll-${key}`)
    if (saved && parseInt(saved) > 0) {
      // Double RAF for reliability with dynamic content
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved))
        })
      })
    }
  }, [key])
  
  // Save position on unmount
  useEffect(() => {
    return () => {
      sessionStorage.setItem(`scroll-${key}`, String(window.scrollY))
    }
  }, [key])
}