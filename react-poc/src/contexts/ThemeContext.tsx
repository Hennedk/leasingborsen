import React, { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  currentTheme: string
  setTheme: (theme: string) => void
  themes: string[]
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themes = ['light', 'dark', 'synthwave']
  const [currentTheme, setCurrentTheme] = useState('light')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light'
    setCurrentTheme(savedTheme)
  }, [])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem('theme', currentTheme)
  }, [currentTheme])

  const setTheme = (theme: string) => {
    setCurrentTheme(theme)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}