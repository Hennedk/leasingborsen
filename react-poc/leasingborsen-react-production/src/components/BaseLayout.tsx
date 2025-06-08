import React from 'react'
import ModernHeader from '@/components/ModernHeader'
import Footer from '@/components/Footer'

interface BaseLayoutProps {
  children: React.ReactNode
  /** Whether to show the footer (default: true) */
  showFooter?: boolean
  /** Whether to show the header (default: true) */
  showHeader?: boolean
  /** Additional CSS classes for the main content area */
  className?: string
  /** Whether to apply container padding to main content (default: true) */
  containerPadding?: boolean
  /** Custom max width for content container */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none'
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  showFooter = true,
  showHeader = true,
  className = '',
  containerPadding = true,
  maxWidth = 'full'
}) => {
  // Map maxWidth prop to Tailwind classes
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[1440px]',
    none: ''
  }

  const maxWidthClass = maxWidthClasses[maxWidth]
  const containerClass = maxWidth !== 'none' ? `mx-auto ${maxWidthClass}` : ''
  const paddingClass = containerPadding ? 'px-6' : ''

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      {showHeader && <ModernHeader />}
      
      {/* Main Content */}
      <main className={`flex-1 w-full ${className}`}>
        <div className={`${containerClass} ${paddingClass}`}>
          {children}
        </div>
      </main>
      
      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  )
}

export default BaseLayout