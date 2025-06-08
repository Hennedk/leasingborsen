import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useThemeStore, THEMES } from '@/stores/themeStore'

const Header: React.FC = () => {
  const { currentTheme, setTheme } = useThemeStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Leasingbørsen
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex space-x-4 md:space-x-8">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Hjem
            </Link>
            <Link 
              to="/listings" 
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Biler
            </Link>
            <Link 
              to="/about" 
              className="text-foreground hover:text-primary transition-colors font-medium"
            >
              Om os
            </Link>
          </nav>

          {/* Theme Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={currentTheme}
              onChange={(e) => setTheme(e.target.value as typeof THEMES[number])}
              className="bg-background border border-border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {THEMES.map((theme) => (
                <option key={theme} value={theme}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-foreground hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-t border-border">
            <nav className="px-6 py-4 space-y-3">
              <Link 
                to="/" 
                className="block text-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hjem
              </Link>
              <Link 
                to="/listings" 
                className="block text-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Biler
              </Link>
              <Link 
                to="/about" 
                className="block text-foreground hover:text-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Om os
              </Link>
              <div className="pt-2 border-t border-border">
                <select
                  value={currentTheme}
                  onChange={(e) => setTheme(e.target.value as typeof THEMES[number])}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header