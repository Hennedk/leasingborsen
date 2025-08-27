import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'

interface SafeContentFadeProps {
  children: React.ReactNode
}

/**
 * SafeContentFade provides smooth opacity transitions between routes
 * while respecting page-specific positioning requirements.
 * 
 * - Skips entrance transitions on /listing/ routes (useListingPositioning handles visibility)
 * - Adds brief exit fade when navigating away from listing detail pages
 * - Applies opacity-only fade on other routes (/listings, /about, etc.)
 * - Uses no transforms to avoid stacking context issues with fixed elements
 */
export const SafeContentFade: React.FC<SafeContentFadeProps> = ({ children }) => {
  const location = useLocation()
  const [visible, setVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const prevPathRef = useRef(location.pathname)
  
  // Check if current route is a listing detail page
  const isListingDetail = location.pathname.includes('/listing/')
  
  // Detect when navigating away from listing detail page
  const isLeavingListingDetail = prevPathRef.current.includes('/listing/') && !isListingDetail
  
  useEffect(() => {
    // Handle exit fade when leaving listing detail page
    if (isLeavingListingDetail) {
      setIsExiting(true)
      // Brief exit fade before route change
      const exitTimer = setTimeout(() => {
        setIsExiting(false)
      }, 150)
      
      // Update previous path reference
      prevPathRef.current = location.pathname
      
      return () => clearTimeout(exitTimer)
    }
    
    // Skip entrance transitions on listing detail pages
    // Let useListingPositioning hook handle visibility there
    if (isListingDetail) {
      setIsExiting(false) // Clear any leftover exit state immediately
      setVisible(true)
      prevPathRef.current = location.pathname
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
    
    // Update previous path reference
    prevPathRef.current = location.pathname
    
    return () => {
      cancelAnimationFrame(fadeIn)
    }
  }, [location.pathname, isListingDetail, isLeavingListingDetail])
  
  // Handle listing detail pages with optional exit fade
  if (isListingDetail) {
    return (
      <div 
        className={`${isExiting ? 'transition-opacity duration-150 ease-out opacity-0' : ''}`}
        style={{
          // Ensure no stacking context issues
          transform: 'none',
          willChange: isExiting ? 'opacity' : 'auto'
        }}
      >
        {children}
      </div>
    )
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