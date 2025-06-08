import React from 'react'
import ModernHeader from '@/components/ModernHeader'
import Footer from '@/components/Footer'
import Container from '@/components/Container'

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
}

const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  showFooter = true,
  showHeader = true,
  className = '',
  containerPadding = true
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      {showHeader && <ModernHeader />}
      
      {/* Main Content */}
      <main className={`flex-1 w-full ${className}`}>
        <Container padding={containerPadding}>
          {children}
        </Container>
      </main>
      
      {/* Footer */}
      {showFooter && <Footer />}
    </div>
  )
}

export default BaseLayout