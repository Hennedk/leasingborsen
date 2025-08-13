import { useEffect } from 'react'

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return
    
    const scrollY = window.scrollY
    const body = document.body
    
    // Store original styles
    const originalStyle = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow
    }
    
    // Apply scroll lock
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    
    return () => {
      // Restore original styles
      body.style.position = originalStyle.position
      body.style.top = originalStyle.top
      body.style.width = originalStyle.width
      body.style.overflow = originalStyle.overflow
      
      // Restore scroll position
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}