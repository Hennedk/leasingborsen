import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

const Header: React.FC = () => {
  const { currentTheme, setTheme, themes } = useTheme()

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">Leasingbørsen</h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="/" className="text-foreground hover:text-primary transition-colors">
              Hjem
            </a>
            <a href="/listings" className="text-foreground hover:text-primary transition-colors">
              Biler
            </a>
            <a href="/about" className="text-foreground hover:text-primary transition-colors">
              Om os
            </a>
          </nav>

          {/* Theme Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={currentTheme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header