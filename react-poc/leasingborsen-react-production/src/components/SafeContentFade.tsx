import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'

interface SafeContentFadeProps {
  children: React.ReactNode
}

/**
 * SafeContentFade provides smooth opacity transitions between routes
 * while respecting page-specific positioning requirements.
 * 
 * - Skips transitions on /listing/ routes (useListingPositioning handles visibility)
 * - Applies opacity-only fade on other routes (/listings, /about, etc.)
 * - Uses no transforms to avoid stacking context issues with fixed elements
 */
export const SafeContentFade: React.FC<SafeContentFadeProps> = ({ children }) => {
  const location = useLocation()
  const [visible, setVisible] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Check if current route is a listing detail page
  const isListingDetail = location.pathname.includes('/listing/')
  
  useEffect(() => {
    // Skip transitions on listing detail pages
    // Let useListingPositioning hook handle visibility there
    if (isListingDetail) {
      setVisible(true)
      return
    }
    
    // For all other routes, apply smooth fade transition
    setVisible(false)
    
    // Use requestAnimationFrame to ensure smooth transition
    const fadeIn = requestAnimationFrame(() => {
      setVisible(true)
      
      // Focus management for accessibility
      // Move focus to the main content or first heading
      if (contentRef.current) {
        const focusTarget = contentRef.current.querySelector('h1, [role="main"], main') as HTMLElement
        if (focusTarget && focusTarget.focus) {
          // Use a small delay to ensure content is rendered
          setTimeout(() => {
            focusTarget.focus({ preventScroll: true })
          }, 100)
        }
      }
    })
    
    return () => {
      cancelAnimationFrame(fadeIn)
    }
  }, [location.pathname, isListingDetail])
  
  // No transition wrapper for listing details
  if (isListingDetail) {
    return <>{children}</>
  }
  
  // Opacity-only transition for other routes
  return (
    <div 
      ref={contentRef}
      className={`transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        // Ensure no stacking context issues
        transform: 'none',
        willChange: 'opacity'
      }}
    >
      {children}
    </div>
  )
}

export default SafeContentFade