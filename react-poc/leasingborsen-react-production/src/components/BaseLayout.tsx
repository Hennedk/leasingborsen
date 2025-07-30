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
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  showFooter = true,
  showHeader = true,
  className = ''
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      {showHeader && <ModernHeader />}
      
      {/* Main Content */}
      <main className={`flex-1 w-full ${className}`}>
        {children}
      </main>
      
      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  )
}

export default BaseLayout